const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function importBatch(start, count) {
  console.log(`\n=== BATCH ${start}-${start+count} ===`);
  try {
    const { stdout, stderr } = await execPromise(`node import_shoes.js ${start} ${count}`, {
      cwd: __dirname,
      maxBuffer: 10 * 1024 * 1024
    });
    console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (e) {
    console.error(`❌ Batch failed: ${e.message}`);
    return false;
  }
}

async function run() {
  const BATCH_SIZE = 20;
  const TOTAL = 237;
  
  console.log(`Starting import of ${TOTAL} shoes in batches of ${BATCH_SIZE}...\n`);
  
  let succeeded = 0;
  let failed = 0;
  
  for (let start = 0; start < TOTAL; start += BATCH_SIZE) {
    const ok = await importBatch(start, BATCH_SIZE);
    if (ok) succeeded++;
    else failed++;
    
    // Short break between batches
    if (start + BATCH_SIZE < TOTAL) {
      console.log('Waiting 5s before next batch...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  console.log(`\n✅ DONE! Succeeded: ${succeeded}, Failed: ${failed}`);
}

run();
