# Space Zine

A curated archive of space-related photography discovered in old textbooks and scanned for digital preservation. This project combines Astro's static site generation with WordPress as a headless CMS to create a fast, modern web experience.

**🌐 Live Demo:** [spacezine.net](https://spacezine.net)

![Space Zine Screenshot](src/assets/screenshot.png)

## About

Space Zine demonstrates how to build a secure, modern blog architecture that eliminates the security vulnerabilities of traditional WordPress installations. By using WordPress as a headless CMS with local-only access, this project shows how to maintain the content management benefits of WordPress while completely removing it from production infrastructure.

This approach eliminates common WordPress security concerns:
- **No admin login endpoints** exposed to the internet
- **No plugin vulnerabilities** in production
- **No database attacks** possible on live site
- **No brute force attempts** on WordPress login
- **No server-side code** that can be exploited

The result is a lightning-fast, completely static site that's immune to the security breaches that plague traditional WordPress installations, while still providing content creators with a familiar editing experience.

## Features

- ✅ WordPress headless CMS integration via WPGraphQL
- ✅ Static site generation with Astro
- ✅ Automatic image downloading and optimization during build
- ✅ Masonry-style archive layout
- ✅ RSS feed support
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Responsive design with 4px grid system
- ✅ Self-contained deployments (no runtime WordPress dependency)

## 🚀 Project Structure

```text
├── public/
│   └── images/           # WordPress images downloaded during build
├── src/
│   ├── assets/           # Static images and assets
│   ├── components/       # Reusable Astro components
│   │   ├── Button.astro  # Reusable button component
│   │   ├── Header.astro  # Site navigation
│   │   └── Footer.astro  # Site footer
│   ├── layouts/          # Page layouts
│   │   └── BlogPost.astro # Post layout with 4:1 hero images
│   ├── lib/              # Utilities and integrations
│   │   └── wordpress.js  # WordPress GraphQL integration
│   ├── pages/            # File-based routing
│   │   ├── archive/      # Archive pages (/archive/)
│   │   │   ├── index.astro      # Archive listing with masonry layout
│   │   │   └── [...slug].astro  # Individual post pages
│   │   ├── about.astro   # About page
│   │   ├── index.astro   # Homepage with hero section
│   │   └── rss.xml.js    # RSS feed generator
│   ├── styles/           
│   │   └── global.css    # Global styles with 4px grid system
│   └── consts.ts         # Site constants
├── dist/                 # Built site (committed for Netlify deployment)
├── astro.config.mjs      # Astro configuration
├── netlify.toml          # Netlify deployment configuration
└── package.json
```

## WordPress Setup

This project requires a local WordPress installation with:

1. **WPGraphQL plugin** installed and activated
2. **WordPress running locally** (e.g., via Local by WPEngine)
3. **Posts with featured images** for the archive

### Environment Variables

Set your WordPress URL in your environment or update `src/lib/wordpress.js`:

```javascript
const WORDPRESS_URL = process.env.WORDPRESS_URL || 'http://spacezine.local';
```

## Build Process

The build process fetches content from WordPress and downloads all images locally:

1. **Content Fetching**: Retrieves posts via GraphQL from WordPress
2. **Image Processing**: Downloads WordPress images to both `public/images/` (dev) and `dist/images/` (production)
3. **Static Generation**: Creates static HTML files for all posts and pages
4. **Self-Contained Output**: The `dist/` folder contains everything needed for deployment

### Why dist/ is Committed

Unlike typical projects, the `dist/` folder is committed to git because:

- **Security**: No WordPress installation needed on production or build servers
- **WordPress Independence**: Eliminates need for WordPress during deployment
- **Image Assets**: Contains downloaded WordPress images that can't be rebuilt without local WordPress access
- **Build Efficiency**: Skips build process on Netlify, reducing deployment time
- **Minimal Edits Use Case**: Perfect for sites with infrequent content updates

## 🧞 Commands

All commands are run from the root of the project:

| Command | Action |
|:--------|:-------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | **Build with WordPress running** - fetches content and images |
| `npm run preview` | Preview built site locally |

## Development Workflow

1. **Start WordPress**: Ensure your local WordPress site is running
2. **Development**: `npm run dev` for live development
3. **Content Updates**: When WordPress content changes, run `npm run build`
4. **Deployment**: Commit the updated `dist/` folder and push to trigger Netlify deployment

## WordPress-Free Operation

After building, you can:
- Turn off WordPress for regular development
- Deploy the site without any WordPress dependency
- Only start WordPress when you need to rebuild with content changes

## Security & Deployment Model

This project uses a **"build locally, deploy statically"** approach that's ideal for:

- **High-security environments**: No server-side code or databases in production
- **Low-maintenance sites**: Content updates are infrequent and controlled
- **WordPress isolation**: Keep WordPress completely separate from public infrastructure
- **Version control**: All content changes are tracked in git via the committed `dist/` folder

### Netlify Deployment Process

The site deploys automatically via Netlify's git integration:

1. **Local Build**: Run `npm run build` with WordPress running locally
2. **Commit & Push**: Commit the updated `dist/` folder and push to your main branch
3. **Netlify Detection**: Netlify detects the git push via webhook
4. **Automatic Deployment**: Netlify skips the build process and deploys the committed `dist/` folder directly

#### Netlify Configuration

In your Netlify dashboard:

- **Build Command**: Leave empty (uses committed `dist/` folder)
- **Publish Directory**: `dist`
- **Branch**: `main` (or your default branch)
- **Deploy Context**: Production deploys automatically from main branch

The `netlify.toml` file tells Netlify to use the pre-built files:

```toml
[build]
  publish = "dist"
  command = "echo 'Using pre-built dist folder'"
```

This approach means:
- No build environment needed on Netlify
- No WordPress credentials or access required in production
- Faster deployments (just file copying, no build process)
- Complete isolation between content management and public site

## Design System

The project follows a **4px grid system**:
- All spacing uses multiples of 4px (4px, 8px, 16px, 32px, 48px, 64px)
- Major padding values: 16px, 32px, 64px
- Consistent visual rhythm throughout the site

