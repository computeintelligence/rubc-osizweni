# Public Directory

This directory contains static assets that are served directly by Vite without processing.

## Structure

```
public/
├── logo.jpg              # Church logo (referenced as /logo.jpg)
├── images/               # Image assets for the website
│   ├── gallery/         # Gallery images
│   ├── events/          # Event-related images
│   └── other/           # Other images
```

## Usage

Files in this directory are served at the root path `/`. Reference them in your code like:

```jsx
<img src="/logo.jpg" alt="Logo" />
<img src="/images/gallery/photo.jpg" alt="Gallery" />
```

## Notes

- Keep file sizes optimized for web (compress images before adding)
- Supported formats: JPG, PNG, GIF, SVG, WebP
- All files here are publicly accessible
- Vite will serve these files as-is without any processing
