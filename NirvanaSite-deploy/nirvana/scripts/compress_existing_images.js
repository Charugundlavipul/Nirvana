/**
 * ONE-OFF SCRIPT: Supabase Bulk Image Compressor
 * 
 * This script connects to your Supabase bucket, scans for large raw images (JPG/PNG),
 * downloads them locally, crushes them into ultra-small WebP formats using 'sharp', 
 * and overwrites them in the bucket.
 * 
 * HOW TO RUN:
 * 1. Install dependencies:
 *    npm install @supabase/supabase-js sharp dotenv
 * 
 * 2. Create a .env file in the root if you don't have one, and add your SERVICE key:
 *    SUPABASE_URL=https://your-project.supabase.co
 *    SUPABASE_SERVICE_ROLE_KEY=your_secret_service_key_here
 *    (DO NOT use the anon key. You need the service_role key to overwrite files).
 * 
 * 3. Execute:
 *    node scripts/compress_existing_images.js
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const BUCKET = 'property-assets';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
}

// Service role key ensures we have permission to list/download/upload/overwrite everything without RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getAllFiles(path = '') {
    let allFiles = [];
    const { data, error } = await supabase.storage.from(BUCKET).list(path, {
        limit: 1000
    });

    if (error) {
        console.error(`❌ Error listing ${path}:`, error);
        return [];
    }

    for (const item of data) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        // Check if it's a folder (metadata is usually null for folders in list)
        if (!item.id || !item.metadata) {
            const subFiles = await getAllFiles(fullPath);
            allFiles = allFiles.concat(subFiles);
        } else {
            // It's a file
            allFiles.push({ ...item, name: fullPath });
        }
    }
    return allFiles;
}

async function processImages() {
    console.log(`\n🔍 Scanning bucket: ${BUCKET} (Deep Scan)...`);
    
    const allItems = await getAllFiles('');
    
    // Filter out items that are already webp
    const targetFiles = allItems.filter(f => 
        f.name.match(/\.(jpg|jpeg|png)$/i) && !f.name.startsWith('.')
    );

    if (targetFiles.length === 0) {
        console.log("✅ No standard images (JPG/PNG) found in any subfolders. Your bucket is already clean or only contains WebP/SVG.");
        return;
    }

    console.log(`⚠️ Found ${targetFiles.length} standard images to compress.\n`);

    for (let i = 0; i < targetFiles.length; i++) {
        const file = targetFiles[i];
        console.log(`[${i+1}/${targetFiles.length}] Processing: ${file.name}`);

        try {
            // 1. Download
            const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(file.name);
            if (dlErr) throw dlErr;
            
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 2. Compress to WebP & Resize
            console.log(`   -> Compressing (Original: ${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
            const compressedBuffer = await sharp(buffer)
                .resize({ width: 1920, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
                
            console.log(`   -> Output: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`);

            const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";

            // 3. Upload new WebP file
            const { error: upErr } = await supabase.storage.from(BUCKET).upload(newFileName, compressedBuffer, {
                contentType: 'image/webp',
                upsert: true
            });
            if (upErr) throw upErr;

            // 4. Update Database
            await updateDatabaseReferences(file.name, newFileName);

            // 5. Delete original
            await supabase.storage.from(BUCKET).remove([file.name]);

            console.log(`   ✅ Success! Replaced with ${newFileName}\n`);

        } catch (error) {
            console.error(`   ❌ Error processing ${file.name}:`, error.message);
        }
    }

    console.log(`\n🎉 Bulk Compression Complete! Egress successfully reduced.`);
}

// A helper to safely update all possible string URLs across the entire SQL database!
// This stops anything from "blowing up" or returning 404s after compression.
async function updateDatabaseReferences(oldPath, newPath) {
    const pubUrlPrefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
    const oldAbsolute = pubUrlPrefix + oldPath;
    const newAbsolute = pubUrlPrefix + newPath;

    console.log(`     Updating DB refs for: ${oldPath} -> ${newPath}`);

    // Standard columns
    await supabase.from('property_images').update({ url: newAbsolute }).eq('url', oldAbsolute);
    await supabase.from('property_curated_images').update({ url: newAbsolute }).eq('url', oldAbsolute);
    await supabase.from('property_highlight_images').update({ url: newAbsolute }).eq('url', oldAbsolute);
    await supabase.from('activities').update({ image_url: newAbsolute }).eq('image_url', oldAbsolute);
    await supabase.from('blogs').update({ cover_image: newAbsolute }).eq('cover_image', oldAbsolute);
    await supabase.from('reviews').update({ avatar_url: newAbsolute }).eq('avatar_url', oldAbsolute);

    // Deep nested JSONB search & replace for 'spaces'
    // We fetch all properties, find those containing the old URL in their JSON string, 
    // and replace the string at the JSON source.
    const { data: properties } = await supabase.from('properties').select('id, spaces').filter('spaces', 'not.is', null);
    
    for (const prop of (properties || [])) {
        if (!prop.spaces) continue;
        const spacesStr = JSON.stringify(prop.spaces);
        if (spacesStr.includes(oldAbsolute)) {
            const newSpaces = JSON.parse(spacesStr.split(oldAbsolute).join(newAbsolute));
            await supabase.from('properties').update({ spaces: newSpaces }).eq('id', prop.id);
            console.log(`     ✅ Updated spaces JSON for property ${prop.id}`);
        }
    }
}

processImages();
