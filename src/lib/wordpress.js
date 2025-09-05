/**
 * WordPress GraphQL utilities for fetching content at build time
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Vibrant } from 'node-vibrant/node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORDPRESS_URL = process.env.WORDPRESS_URL || 'http://spacezine.local';
const GRAPHQL_ENDPOINT = `${WORDPRESS_URL}/graphql`;

/**
 * Download image from WordPress and save locally, also extract dominant color
 * @param {string} imageUrl - WordPress image URL
 * @returns {Object} Object with localPath and dominantColor
 */
async function downloadImage(imageUrl) {
  if (!imageUrl || (!imageUrl.includes('.local') && !imageUrl.includes('localhost'))) {
    return { localPath: imageUrl, dominantColor: null }; // Return as-is if not local
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return { localPath: null, dominantColor: null };
    
    const imageBuffer = await response.arrayBuffer();
    const fileName = path.basename(new URL(imageUrl).pathname);
    
    // Save to both public (for dev server) and dist (for production build)
    const publicImagesDir = path.join(__dirname, '../../public/images');
    const distImagesDir = path.join(__dirname, '../../dist/images');
    
    // Create images directories if they don't exist
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }
    if (!fs.existsSync(distImagesDir)) {
      fs.mkdirSync(distImagesDir, { recursive: true });
    }
    
    // Write to both locations
    const imageData = Buffer.from(imageBuffer);
    const publicImagePath = path.join(publicImagesDir, fileName);
    const distImagePath = path.join(distImagesDir, fileName);
    
    fs.writeFileSync(publicImagePath, imageData);
    fs.writeFileSync(distImagePath, imageData);
    
    // Extract dominant color
    let dominantColor = null;
    try {
      const palette = await Vibrant.from(publicImagePath).getPalette();
      // Try to get a vibrant color, fallback to dominant muted color
      dominantColor = palette.Vibrant?.hex || palette.DarkVibrant?.hex || palette.Muted?.hex || palette.DarkMuted?.hex || null;
    } catch (colorError) {
      console.warn(`Failed to extract color from ${fileName}:`, colorError);
    }
    
    return { localPath: `/images/${fileName}`, dominantColor };
  } catch (error) {
    console.error(`Failed to download image ${imageUrl}:`, error);
    return { localPath: null, dominantColor: null };
  }
}

/**
 * GraphQL query for fetching posts
 */
const GET_POSTS_QUERY = `
  query GetPosts($first: Int = 100) {
    posts(first: $first, where: { status: PUBLISH }) {
      nodes {
        id
        slug
        title
        content
        excerpt
        date
        featuredImage {
          node {
            sourceUrl
            altText
            mediaDetails {
              width
              height
            }
          }
        }
        author {
          node {
            name
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        tags {
          nodes {
            name
            slug
          }
        }
      }
    }
  }
`;

/**
 * Fetches posts from WordPress GraphQL API
 * @param {Object} options - Query options
 * @param {number} options.first - Number of posts to fetch (default: 100)
 * @returns {Promise<Array>} Array of WordPress posts
 */
export async function fetchWordPressPosts({ first = 100 } = {}) {
  try {
    console.log(`Fetching WordPress posts from: ${GRAPHQL_ENDPOINT}`);
    
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GET_POSTS_QUERY,
        variables: { first },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`GraphQL API error: ${response.status} ${response.statusText}`);
    }
    
    const { data, errors } = await response.json();
    
    if (errors) {
      throw new Error(`GraphQL errors: ${errors.map(e => e.message).join(', ')}`);
    }
    
    const posts = data?.posts?.nodes || [];
    console.log(`Successfully fetched ${posts.length} WordPress posts`);
    
    return posts;
  } catch (error) {
    console.error('Error fetching WordPress posts:', error.message);
    
    // Return empty array if WordPress is not available (e.g., during deployment)
    console.warn('Falling back to empty posts array');
    return [];
  }
}

/**
 * Transforms WordPress post to Astro-compatible format
 * @param {Object} wpPost - WordPress post object from GraphQL
 * @returns {Promise<Object>} Astro-compatible post object
 */
export async function transformWordPressPost(wpPost) {
  // Extract featured image and download it locally
  const originalHeroImage = wpPost.featuredImage?.node?.sourceUrl || null;
  const imageResult = originalHeroImage ? await downloadImage(originalHeroImage) : { localPath: null, dominantColor: null };
  const heroImage = imageResult.localPath;
  const dominantColor = imageResult.dominantColor;
  const imageWidth = wpPost.featuredImage?.node?.mediaDetails?.width || null;
  const imageHeight = wpPost.featuredImage?.node?.mediaDetails?.height || null;

  // Clean up excerpt
  const excerpt = wpPost.excerpt 
    ? wpPost.excerpt.replace(/<[^>]*>/g, '').trim()
    : '';

  // Clean up content and download inline images
  let content = wpPost.content;
  if (content) {
    // Find all image URLs in src attributes and replace with local versions
    const imageRegex = /src="(https?:\/\/[^"]*\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP))"/gi;
    const images = Array.from(content.matchAll(imageRegex));
    
    for (const [fullMatch, imageUrl] of images) {
      const imageResult = await downloadImage(imageUrl);
      if (imageResult.localPath) {
        content = content.replace(fullMatch, `src="${imageResult.localPath}"`);
      } else {
        content = content.replace(fullMatch, 'src=""');
      }
    }

    // Remove srcset attributes entirely as they contain WordPress URLs that break in production
    content = content.replace(/\s*srcset="[^"]*"/gi, '');
    
    // Also remove sizes attribute as it's only needed with srcset
    content = content.replace(/\s*sizes="[^"]*"/gi, '');
    
    // Remove width and height attributes to prevent conflicts with CSS
    content = content.replace(/\s*width="[^"]*"/gi, '');
    content = content.replace(/\s*height="[^"]*"/gi, '');
  }

  return {
    id: wpPost.slug,
    slug: wpPost.slug,
    data: {
      title: wpPost.title,
      description: excerpt,
      pubDate: new Date(wpPost.date),
      heroImage,
      imageWidth,
      imageHeight,
      dominantColor,
      author: wpPost.author?.node?.name,
      categories: wpPost.categories?.nodes || [],
      tags: wpPost.tags?.nodes || [],
      wpId: wpPost.id,
    },
    content,
  };
}

/**
 * Fetches and transforms all WordPress posts for Astro
 * @returns {Promise<Array>} Array of transformed posts
 */
export async function getWordPressPosts() {
  const wpPosts = await fetchWordPressPosts();
  const transformedPosts = await Promise.all(wpPosts.map(transformWordPressPost));
  return transformedPosts;
}