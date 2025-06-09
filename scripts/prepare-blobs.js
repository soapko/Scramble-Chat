const fs = require('fs');
const path = require('path');

const storeName = 'webrtc-signaling';
const blobDir = path.join('.netlify', 'v1', 'blobs', storeName);

console.log(`--- Preparing Netlify Blobs for store: "${storeName}" ---`);

try {
  // Create the directory recursively.
  // This ensures all parts of the path are created.
  fs.mkdirSync(blobDir, { recursive: true });
  console.log(`Successfully created directory: ${blobDir}`);

  // Create a sentinel file to ensure the directory is included in the deploy.
  const sentinelFile = path.join(blobDir, '.gitkeep');
  fs.writeFileSync(sentinelFile, '');
  console.log(`Created sentinel file: ${sentinelFile}`);

  console.log('--- Blob store preparation complete. ---');
  process.exit(0);
} catch (error) {
  console.error('Failed to prepare blob store directory:', error);
  process.exit(1);
}
