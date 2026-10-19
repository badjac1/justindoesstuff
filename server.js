const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 80;
const PHOTOS_DIR = path.join(__dirname, 'photos');

// Helper to format folder names into readable titles (e.g. "concert-photos" -> "Concert Photos")
function formatTitle(name) {
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Preset color themes for auto-generated portfolio cases
const LEATHER_COLORS = ['#5a1f1f', '#1f3a2d', '#24344a', '#4a381f', '#3b1f3a'];
const TILTS = ['-3deg', '2.5deg', '-2deg', '3deg', '-1.5deg'];

app.use(express.static(__dirname));

// API Endpoint returning dynamically generated PORTFOLIOS
app.get('/api/portfolios', (req, res) => {
  if (!fs.existsSync(PHOTOS_DIR)) {
    return res.json([]);
  }

  const items = fs.readdirSync(PHOTOS_DIR, { withFileTypes: true });
  const folderNames = items.filter(i => i.isDirectory()).map(i => i.name);

  const portfolios = folderNames.map((folderName, index) => {
    const folderPath = path.join(PHOTOS_DIR, folderName);
    const files = fs.readdirSync(folderPath);

    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|avif)$/i;
    const photoFiles = files.filter(f => imageExtensions.test(f));

    const photos = photoFiles.map(file => ({
      file: file,
      thumb: file,
      title: formatTitle(path.parse(file).name),
      note: 'Local Print'
    }));

    return {
      id: folderName.toLowerCase(),
      title: formatTitle(folderName),
      blurb: `${photos.length} prints in collection`,
      color: LEATHER_COLORS[index % LEATHER_COLORS.length],
      tilt: TILTS[index % TILTS.length],
      folder: `photos/${folderName}/`,
      photos: photos
    };
  });

  res.json(portfolios);
});

app.listen(PORT, () => {
  console.log(`Justin Does Stuff server running on port ${PORT}`);
});