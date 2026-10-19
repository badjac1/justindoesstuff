/* ==================================================================
   YOUR PHOTOS LIVE HERE.  This is the only file you need to edit
   to add photos or portfolios.

   ADD A PHOTO
     1. Drop the image file into that portfolio's folder
        (e.g. photos/street/).
     2. Add one line to that portfolio's `photos` list:
          { file: 'my-photo.jpg', title: 'Nice Title', note: 'Camera • Place' },
     That's it. The first photo in the list is the cover on the shelf.

   ADD A PORTFOLIO
     Copy a whole { id: ... } block below, give it a new unique `id`
     (lowercase, no spaces), a new `folder`, and make the folder.

   TIPS
     - `file` can also be a full web address (https://...).
     - Optional per photo: `thumb: 'small-version.jpg'` for a lighter
       grid image (the grid falls back to `file`).
     - Resize photos to ~2000px on the long edge before uploading so
       the page loads fast.
   ================================================================== */

const PORTFOLIOS = [
  {
    id: 'street',
    title: 'Street',
    blurb: 'Portland, after dark',
    color: '#5a1f1f',          // leather colour of the case
    tilt: '-3deg',             // how the cover print leans
    folder: 'photos/street/',
    photos: [
      { file: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80',
        thumb: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=80',
        title: 'Midnight Alley Shadows', note: 'Digital Monochrome • Portland, OR' },
      // { file: 'next-photo.jpg', title: 'Title', note: 'Camera • Place' },
    ]
  },
  {
    id: 'concerts',
    title: 'Concerts',
    blurb: 'Sessions & stages',
    color: '#1f3a2d',
    tilt: '2.5deg',
    folder: 'photos/concerts/',
    photos: [
      { file: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80',
        thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=700&q=80',
        title: 'Acoustic Stage Lights', note: '35mm Film • Traditional Irish Session' },
    ]
  },
  {
    id: 'nature',
    title: 'Nature',
    blurb: 'Pacific Northwest',
    color: '#24344a',
    tilt: '-2deg',
    folder: 'photos/nature/',
    photos: [
      { file: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=700&q=80',
        title: 'Misty River Valley', note: 'Medium Format • Pacific Northwest' },
    ]
  }
];

/* ---------- helpers used by index.html and portfolio.html ---------- */
function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function resolvePath(p, path) {
  return /^(https?:)?\/\//.test(path) || path.startsWith('/') ? path : (p.folder || '') + path;
}
function photoUrl(p, ph)  { return resolvePath(p, ph.file); }
function thumbUrl(p, ph)  { return resolvePath(p, ph.thumb || ph.file); }
function coverOf(p)       { return p.photos[0]; }
