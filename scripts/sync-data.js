#!/usr/bin/env node
/**
 * Data sync script - fetches WordPress posts and saves as static JSON
 * Run this manually when content changes: npm run sync-data
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getWordPressPosts } from '../src/lib/wordpress.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main sync function
 */
async function syncData() {
  console.log('🚀 Starting data sync...\n');

  try {
    // Fetch all WordPress posts
    console.log('📄 Fetching WordPress posts...');
    const posts = await getWordPressPosts();
    console.log(`✅ Successfully fetched ${posts.length} posts\n`);

    // Ensure src/data directory exists
    const dataDir = path.join(__dirname, '../src/data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created src/data directory');
    }

    // Save posts as JSON
    const dataFile = path.join(dataDir, 'posts.json');
    fs.writeFileSync(dataFile, JSON.stringify(posts, null, 2));
    console.log(`💾 Saved ${posts.length} posts to src/data/posts.json`);

    console.log('\n✅ Data sync complete!');
  } catch (error) {
    console.error('❌ Data sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncData().catch(error => {
  console.error('💥 Sync failed:', error);
  process.exit(1);
});