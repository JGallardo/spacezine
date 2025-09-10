/**
 * Static data module - serves cached WordPress posts
 * Posts are pre-fetched during build time via sync-data.js
 */
import postsData from './posts.json';

/**
 * Get all posts from static JSON (no WordPress fetch)
 * @returns {Array} Array of post objects
 */
export function getStaticPosts() {
  return postsData.map(post => ({
    ...post,
    data: {
      ...post.data,
      pubDate: new Date(post.data.pubDate)
    }
  }));
}

/**
 * Get posts by category from static data
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered posts
 */
export function getStaticPostsByCategory(category) {
  return getStaticPosts().filter(post => 
    post.data.categories?.some(cat => 
      cat.name.toLowerCase() === category.toLowerCase()
    )
  );
}

/**
 * Get a single post by slug from static data
 * @param {string} slug - Post slug
 * @returns {Object|null} Post object or null if not found
 */
export function getStaticPostBySlug(slug) {
  return getStaticPosts().find(post => post.slug === slug) || null;
}