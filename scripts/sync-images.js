#!/usr/bin/env node
/**
 * Image sync script - downloads and converts WordPress images to WebP
 * Run this manually when content changes: npm run sync-images
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORDPRESS_URL = process.env.WORDPRESS_URL || 'http://spacezine.local';
const GRAPHQL_ENDPOINT = `${WORDPRESS_URL}/graphql`;

/**
 * Extract dominant color from image using Sharp
 */
async function extractDominantColor(imagePath) {
  try {
    const { dominant } = await sharp(imagePath).stats();
    const { r, g, b } = dominant;
    
    // Convert RGB to hex
    const hex = '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    return hex;
  } catch (error) {
    console.warn(`Color extraction failed: ${error.message}`);
    return null;
  }
}

/**
 * Download image from WordPress and convert to WebP
 */
async function downloadAndConvertImage(imageUrl) {
  if (!imageUrl || (!imageUrl.includes('.local') && !imageUrl.includes('localhost'))) {
    return { localPath: imageUrl, dominantColor: null };
  }

  try {
    const fileName = path.basename(new URL(imageUrl).pathname);
    const webpFileName = fileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    
    const publicImagesDir = path.join(__dirname, '../public/images');
    const distImagesDir = path.join(__dirname, '../dist/images');
    const webpPublicPath = path.join(publicImagesDir, webpFileName);
    const webpDistPath = path.join(distImagesDir, webpFileName);
    
    // Check if WebP already exists
    if (fs.existsSync(webpPublicPath)) {
      console.log(`✓ WebP already exists: ${webpFileName}`);
      
      // Extract color from existing WebP
      const dominantColor = await extractDominantColor(webpPublicPath);
      
      // Save metadata if color extracted successfully
      if (dominantColor) {
        const metaDir = path.join(__dirname, '../public/images/meta');
        if (!fs.existsSync(metaDir)) {
          fs.mkdirSync(metaDir, { recursive: true });
        }
        
        const metaFile = path.join(metaDir, `${webpFileName}.json`);
        const metadata = { dominantColor };
        fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));
      }
      
      return { localPath: `/images/${webpFileName}`, dominantColor };
    }
    
    console.log(`📥 Downloading: ${fileName}`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`❌ Failed to download ${imageUrl}: ${response.status}`);
      return { localPath: null, dominantColor: null };
    }
    
    const imageBuffer = await response.arrayBuffer();
    
    // Create directories
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }
    if (!fs.existsSync(distImagesDir)) {
      fs.mkdirSync(distImagesDir, { recursive: true });
    }
    
    const metaDir = path.join(__dirname, '../public/images/meta');
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
    }
    
    // Save original temporarily
    const imageData = Buffer.from(imageBuffer);
    const publicImagePath = path.join(publicImagesDir, fileName);
    const distImagePath = path.join(distImagesDir, fileName);
    
    fs.writeFileSync(publicImagePath, imageData);
    fs.writeFileSync(distImagePath, imageData);
    
    // Convert to WebP
    try {
      const { execSync } = await import('child_process');
      execSync(`cwebp -q 85 "${publicImagePath}" -o "${webpPublicPath}"`);
      execSync(`cwebp -q 85 "${distImagePath}" -o "${webpDistPath}"`);
      
      // Remove originals
      fs.unlinkSync(publicImagePath);
      fs.unlinkSync(distImagePath);
      
      console.log(`✅ Converted: ${fileName} → ${webpFileName}`);
    } catch (conversionError) {
      console.error(`❌ WebP conversion failed for ${fileName}:`, conversionError.message);
      return { localPath: `/images/${fileName}`, dominantColor: null };
    }
    
    // Extract dominant color from WebP using Sharp
    const dominantColor = await extractDominantColor(webpPublicPath);
    if (dominantColor) {
      console.log(`🎨 Extracted color: ${dominantColor}`);
    }
    
    // Save metadata
    const metaFile = path.join(metaDir, `${webpFileName}.json`);
    const metadata = { dominantColor };
    fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2));
    
    return { localPath: `/images/${webpFileName}`, dominantColor };
  } catch (error) {
    console.error(`❌ Failed to process ${imageUrl}:`, error.message);
    return { localPath: null, dominantColor: null };
  }
}

/**
 * Fetch WordPress posts
 */
async function fetchWordPressPosts() {
  const GET_POSTS_QUERY = `
    query GetPosts($first: Int = 100) {
      posts(first: $first, where: { status: PUBLISH }) {
        nodes {
          id
          slug
          title
          content
          date
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
        }
      }
    }
  `;

  try {
    console.log(`🔗 Fetching posts from: ${GRAPHQL_ENDPOINT}`);
    
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GET_POSTS_QUERY,
        variables: { first: 100 },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`GraphQL API error: ${response.status}`);
    }
    
    const { data, errors } = await response.json();
    
    if (errors) {
      throw new Error(`GraphQL errors: ${errors.map(e => e.message).join(', ')}`);
    }
    
    const posts = data?.posts?.nodes || [];
    console.log(`📄 Found ${posts.length} posts`);
    return posts;
  } catch (error) {
    console.error('❌ Error fetching WordPress posts:', error.message);
    return [];
  }
}

/**
 * Main sync function
 */
async function syncImages() {
  console.log('🚀 Starting image sync...\n');
  
  const posts = await fetchWordPressPosts();
  if (posts.length === 0) {
    console.log('❌ No posts found. Make sure WordPress is running.');
    process.exit(1);
  }
  
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const post of posts) {
    const heroImage = post.featuredImage?.node?.sourceUrl;
    if (heroImage) {
      console.log(`\n📝 Processing: ${post.title}`);
      const result = await downloadAndConvertImage(heroImage);
      
      if (result && result.localPath && result.localPath.includes('/images/')) {
        processed++;
      } else if (result && result.localPath) {
        skipped++;
      } else {
        failed++;
      }
    }
    
    // Process inline images in content
    if (post.content) {
      const imageRegex = /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP))"/gi;
      const images = Array.from(post.content.matchAll(imageRegex));
      
      for (const [, imageUrl] of images) {
        await downloadAndConvertImage(imageUrl);
      }
    }
  }
  
  console.log('\n✅ Image sync complete!');
  console.log(`📊 Stats: ${processed} processed, ${skipped} skipped, ${failed} failed`);
}

// Run the sync
syncImages().catch(error => {
  console.error('💥 Sync failed:', error);
  process.exit(1);
});