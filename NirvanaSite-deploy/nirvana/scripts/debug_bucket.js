const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'property-assets';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugBucket() {
    console.log(`🔍 Debugging bucket: ${BUCKET}...`);
    
    // First, list root
    const { data: rootFiles, error: rootError } = await supabase.storage.from(BUCKET).list('');
    if (rootError) {
        console.error("❌ Root error:", rootError);
    } else {
        console.log("Root contents:", rootFiles.map(f => f.name));
    }

    // Try recursive list if possible (v2 support)
    const { data: allFiles, error: allError } = await supabase.storage.from(BUCKET).list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
        recursive: true
    });

    if (allError) {
        console.error("❌ Recursive error:", allError);
    } else {
        console.log(`Found ${allFiles?.length || 0} total items recursively.`);
        allFiles?.forEach(f => {
            console.log(` - ${f.name} (${f.metadata?.mimetype || 'folder'})`);
        });
    }
}

debugBucket();
