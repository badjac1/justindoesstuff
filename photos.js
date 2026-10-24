/* ==================================================================
   PORTFOLIOS ARE FOUND AUTOMATICALLY.

   ADD A PORTFOLIO   Make a new folder inside photos/
                     (e.g. photos/Ducks/). It shows up on the shelf.
   ADD A PHOTO       Drop an image (.jpg .jpeg .png .webp .gif .avif)
                     into that folder. That's it.

   ORDER             Photos are sorted by file name, so prefix them
                     01-, 02-, ... to choose the order.
                     A file named cover.jpg (any image type) is the
                     cover on the shelf; otherwise the first photo is.
   TITLES            Photos have no titles by default. Add a caption
                     in EXTRAS below if you ever want one.

   OPTIONAL EXTRAS   Want a blurb, a colour, or a caption? Add an
                     entry to EXTRAS below, keyed by the folder name.
                     Anything you leave out gets a sensible default.

   This works because the web server (nginx.conf) is set to list the
   contents of photos/ as JSON. Resize photos to ~2000px on the long
   edge before uploading so the page loads fast.
   ================================================================== */

const EXTRAS = {
  'street': {
    title: 'Street',
    blurb: 'Portland, after dark',
    color: '#5a1f1f',            // leather colour of the case
    tilt: '-3deg',               // how the cover print leans
    // order: 1,                 // lower numbers sit further left
    // photos: {                 // per-photo captions, keyed by file name
    //   '01-midnight-alley.jpg': { title: 'Midnight Alley Shadows', note: 'Digital Monochrome • Portland, OR' },
    // },
  },
  'concerts': {
    title: 'Concerts',
    blurb: 'Sessions & stages',
    color: '#1f3a2d',
    tilt: '2.5deg',
  },
  'Animal Photography': {
    title: 'Animals',
  },
  'Ducks': {
    blurb: 'Feathered friends',
  },
  'Portland Meetup': {
    blurb: 'Photo walks around town',
  },
};

/* ---------- discovery (no need to edit below here) ---------- */
const PHOTO_ROOT = 'photos/';
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
const LEATHERS = ['#5a1f1f', '#1f3a2d', '#24344a', '#4a2a14', '#3b1f2d', '#2d3728', '#3d2b1f'];
const TILTS = ['-3deg', '2.5deg', '-2deg', '1.5deg', '-1deg', '3deg'];

async function listDir(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(path + ' → HTTP ' + res.status);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(path + ' did not return a folder listing');
  return data;
}

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'portfolio';
}

function titleFromFile(name) {
  const base = name.replace(/\.[^.]+$/, '');
  if (/^(img|dsc[fn]?|pxl|p|dji|gopr|mvimg)[_-]?\d/i.test(base) || /^\d+$/.test(base)) return '';
  return base
    .replace(/^\d+[\s._-]+/, '')              // "03-" ordering prefix
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function findExtras(folderName) {
  if (EXTRAS[folderName]) return EXTRAS[folderName];
  const key = Object.keys(EXTRAS).find(k => k.toLowerCase() === folderName.toLowerCase());
  return key ? EXTRAS[key] : {};
}

const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

async function loadPortfolio(dirName, index, id) {
  const extra = findExtras(dirName);
  const folder = PHOTO_ROOT + encodeURIComponent(dirName) + '/';
  // thumbs/ holds small copies made by make_thumbs.py; without it the full photos are used.
  // Fetched together with the folder listing so the page doesn't wait on them one by one.
  const [listing, thumbList, sizes] = await Promise.all([
    listDir(folder),
    listDir(folder + 'thumbs/').catch(() => []),
    fetch(folder + 'thumbs/sizes.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
  ]);
  const files = listing
    .filter(e => e.type === 'file' && IMAGE_RE.test(e.name))
    .map(e => e.name)
    .sort(byName);

  // cover.* goes first so it becomes the shelf cover
  const coverIdx = files.findIndex(f => /^cover\./i.test(f));
  if (coverIdx > 0) files.unshift(files.splice(coverIdx, 1)[0]);

  const thumbs = new Set(thumbList.filter(e => e.type === 'file').map(e => e.name));

  const captions = extra.photos || {};

  return {
    id,
    title: extra.title || dirName,
    blurb: extra.blurb || '',
    color: extra.color || LEATHERS[index % LEATHERS.length],
    tilt: extra.tilt || TILTS[index % TILTS.length],
    order: extra.order != null ? extra.order : 1000,
    folder,
    photos: files.map(f => ({
      file: encodeURIComponent(f),
      thumb: thumbs.has(f) ? 'thumbs/' + encodeURIComponent(f) : '',
      ratio: sizes[f] && sizes[f][1] ? sizes[f][0] / sizes[f][1] : 0, // width / height, 0 = unknown
      title: (captions[f] && captions[f].title) || '',
      note: (captions[f] && captions[f].note) || '',
    })),
  };
}

let _portfoliosPromise = null;
/** Returns a promise of every portfolio found in photos/. */
function loadPortfolios() {
  if (!_portfoliosPromise) {
    _portfoliosPromise = (async () => {
      const dirs = (await listDir(PHOTO_ROOT))
        .filter(e => e.type === 'directory' && !e.name.startsWith('.') && !e.name.startsWith('_'))
        .map(e => e.name)
        .sort(byName);
      const usedIds = new Set();
      // ids are claimed in folder order up front, then every folder loads at once
      const ids = dirs.map(d => { let id = slugify(d); while (usedIds.has(id)) id += '-2'; usedIds.add(id); return id; });
      const list = (await Promise.all(dirs.map((d, i) =>
        loadPortfolio(d, i, ids[i]).catch(err => { console.warn('Skipping portfolio', d, err); return null; })
      ))).filter(Boolean);
      return list.sort((a, b) => (a.order - b.order) || byName(a.title, b.title));
    })();
  }
  return _portfoliosPromise;
}

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
