
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // We'll pick a hub that we know has pool info
  const hubId = '7ace4eba-5cc6-4dbe-bd95-065dfc3930da'; // Summit
  
  const { data: chunks } = await supabase
    .from('knowledge_chunks')
    .select('id, content, embedding')
    .eq('hub_id', hubId)
    .ilike('content', '%pool%');

  if (!chunks?.length) {
    console.log("No pool chunks found in Summit hub.");
    return;
  }

  const targetChunk = chunks[0];
  console.log(`Target Chunk: "${targetChunk.content}"`);

  // Now let's try to match it with a slightly different string
  // Since we can't easily call embedText here without ES modules, 
  // we'll just use the target's own embedding to see how other chunks compare.
  
  const { data: matches, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: targetChunk.embedding,
    match_threshold: 0.1,
    match_count: 10
  });

  if (error) {
    console.error("RPC Error:", error);
    return;
  }

  console.log("\nMatching Results (using the pool chunk's own embedding):");
  matches.forEach((m, i) => {
    console.log(`${i+1}. [Sim: ${m.similarity.toFixed(4)}] Hub: ${m.hub_id} | ${m.content.substring(0, 80)}...`);
  });
}

run().catch(console.error);
