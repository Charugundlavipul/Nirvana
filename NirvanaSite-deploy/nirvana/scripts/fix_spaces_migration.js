const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'property-assets';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixSpaces() {
    console.log("🔍 Fixing 'spaces' JSON URLs in properties table...");
    
    // Fetch all properties with spaces
    const { data: properties, error: fetchErr } = await supabase
        .from('properties')
        .select('id, name, spaces')
        .not('spaces', 'is', null);

    if (fetchErr) {
        console.error("❌ Error fetching properties:", fetchErr);
        return;
    }

    let updatedCount = 0;
    const pubUrlPrefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

    for (const prop of properties) {
        if (!prop.spaces || !Array.isArray(prop.spaces)) continue;

        let spacesStr = JSON.stringify(prop.spaces);
        const originalStr = spacesStr;

        // Replace any mention of .jpg, .jpeg, .png with .webp 
        // ONLY if they belong to our storage bucket
        // Regex: capture the storage URL ending in jpg/jpeg/png
        const regex = new RegExp(pubUrlPrefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '[^"]+\\.(jpg|jpeg|png)', 'gi');
        
        spacesStr = spacesStr.replace(regex, (match) => {
            return match.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        });

        if (spacesStr !== originalStr) {
            const { error: updateErr } = await supabase
                .from('properties')
                .update({ spaces: JSON.parse(spacesStr) })
                .eq('id', prop.id);

            if (updateErr) {
                console.error(`❌ Error updating ${prop.name}:`, updateErr);
            } else {
                console.log(`✅ Fixed URLs in 'spaces' for: ${prop.name}`);
                updatedCount++;
            }
        }
    }

    console.log(`\n🎉 Finished! Fixed 'spaces' URLs for ${updatedCount} properties.`);
}

fixSpaces();
