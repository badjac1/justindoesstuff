/* ==================================================================
   ZINE ISSUES ARE FOUND AUTOMATICALLY.

   ADD AN ISSUE   Make a new folder inside zines/ and put an issue.md
                  in it, e.g. zines/05-winter-sessions/issue.md
   ADD IMAGES     Drop them in the same folder and reference them from
                  the text with ![caption](pic.jpg).
                  A file named cover.jpg (any image type) is shown at
                  the top of the issue.

   ORDER          By folder name, oldest first: prefix 01-, 02-, ...
                  The number is also the "Vol" on the spine.

   PDF ZINES      Instead of issue.md, drop a PDF in the issue folder
                  (e.g. zines/05-winter/winter.pdf). Every PDF page becomes
                  a page of a flip-through booklet, exactly as you designed
                  it: page 1 is the front cover, the last page the back
                  cover, and the page size comes from the PDF. The reader
                  gets a Download PDF button, so your PDF is also the print
                  master. An optional issue.md next to it can still set
                  title, kicker, date and color (its text is ignored).

   issue.md       Starts with an optional header between --- lines,
                  then the text in Markdown (blank line = new paragraph,
                  **bold**, *italic*, ## heading, [link](https://...)):

                    ---
                    title: Resonance, Reeds, and Timber
                    kicker: Sound & Wood
                    date: 2026-10
                    color: "#2d3728"
                    ---
                    Playing a tenor banjo in traditional sessions...

                  Everything in the header is optional:
                    title   defaults to the folder name
                    kicker  the small label above the title
                    date    YYYY-MM (or YYYY-MM-DD)
                    color   spine colour, defaults to a rotating palette
                    type    what it is about, e.g. Travel. Becomes a filter
                            button on the shelf. Several: type: Travel, Music

   Needs photos.js loaded first (shares its folder-listing helpers).
   ================================================================== */

const ZINE_ROOT = 'zines/';
const ZINE_COLORS = ['#3b1f2d', '#1f2d3d', '#3d2b1f', '#2d3728', '#5a1f1f', '#1f3a2d', '#24344a', '#4a2a14'];
const ZINE_HEIGHTS = ['21rem', '22.5rem', '21.5rem', '23rem', '22rem'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];

/** Split "---\nkey: value\n---\nbody" into { meta, body }. */
function parseFrontmatter(text) {
  text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = text.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  m[1].split('\n').forEach(line => {
    const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].replace(/^(["'])(.*)\1$/, '$2');
  });
  return { meta, body: text.slice(m[0].length) };
}

function zineTitleFromFolder(name) {
  return name.replace(/^\d+[\s._-]+/, '').replace(/[_-]+/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase()) || name;
}

function zineDates(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{1,2})/);
  if (!m || m[2] < 1 || m[2] > 12) return { date: '', dateLong: '' };
  const month = +m[2];
  return {
    date: String(month).padStart(2, '0') + '/' + m[1].slice(2),
    dateLong: MONTHS[month - 1] + ' ' + m[1],
  };
}

/** "Travel, music" -> ['Travel', 'music'] (empty entries dropped, repeats ignored). */
function parseTypes(value) {
  const seen = new Set();
  return String(value || '').split(',').map(t => t.trim()).filter(t => {
    const key = t.toLowerCase();
    if (!t || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Markdown -> sanitized HTML, with relative images pointed at the issue folder. */
function renderZineBody(markdown, folder) {
  if (!window.marked || !window.DOMPurify) {
    // Libraries failed to load: show the text plainly rather than nothing.
    return markdown.split(/\n{2,}/).map(p => '<p>' + esc(p) + '</p>').join('');
  }
  const dirty = marked.parse(markdown);
  const frag = DOMPurify.sanitize(dirty, { RETURN_DOM_FRAGMENT: true });

  frag.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (!/^(https?:)?\/\//.test(src) && !src.startsWith('/')) {
      img.setAttribute('src', folder + src.split('/').map(encodeURIComponent).join('/'));
    }
    img.setAttribute('loading', 'lazy');
    img.className = 'mx-auto max-w-full max-h-[60vh] w-auto h-auto object-contain rounded-sm border border-stone-400 shadow-md';
  });
  frag.querySelectorAll('a').forEach(a => {
    a.className = 'underline decoration-amber-700 hover:text-amber-800';
    a.setAttribute('rel', 'noopener noreferrer');
  });
  frag.querySelectorAll('h1, h2, h3, h4').forEach(h => {
    h.className = 'font-display font-bold text-xl md:text-2xl text-stone-900 pt-2';
  });
  frag.querySelectorAll('ul, ol').forEach(l => {
    l.className = (l.tagName === 'UL' ? 'list-disc' : 'list-decimal') + ' pl-6 space-y-1';
  });
  frag.querySelectorAll('blockquote').forEach(q => {
    q.className = 'border-l-4 border-amber-700/60 pl-4 italic text-stone-700';
  });
  const firstP = frag.querySelector('p');
  if (firstP && !firstP.querySelector('img')) firstP.classList.add('zine-dropcap');

  const box = document.createElement('div');
  box.appendChild(frag);
  return box.innerHTML;
}

async function loadZine(dirName, index) {
  const folder = ZINE_ROOT + encodeURIComponent(dirName) + '/';
  const [res, files] = await Promise.all([
    fetch(folder + 'issue.md', { cache: 'no-cache' }),
    listDir(folder).catch(() => []),
  ]);
  const pdf = files
    .filter(e => e.type === 'file' && /\.pdf$/i.test(e.name))
    .map(e => e.name)
    .sort((a, b) => (/^issue\.pdf$/i.test(b) - /^issue\.pdf$/i.test(a)) || byName(a, b))[0];
  if (!res.ok && !pdf) throw new Error(folder + 'issue.md → HTTP ' + res.status);
  const { meta, body } = res.ok ? parseFrontmatter(await res.text()) : { meta: {}, body: '' };

  const num = dirName.match(/^(\d+)/);
  const dates = zineDates(meta.date);
  const cover = files.find(e => e.type === 'file' && /^cover\.(jpe?g|png|webp|gif|avif)$/i.test(e.name));
  const coverMd = cover ? '![](' + encodeURIComponent(cover.name) + ')\n\n' : '';

  return {
    id: dirName,
    vol: num ? num[1].padStart(2, '0') : String(index + 1).padStart(2, '0'),
    title: meta.title || zineTitleFromFolder(dirName),
    kicker: meta.kicker || 'Journal',
    types: parseTypes(meta.type || meta.types),
    date: dates.date,
    dateLong: dates.dateLong,
    color: /^#[0-9a-f]{3,8}$/i.test(meta.color || '') ? meta.color : ZINE_COLORS[index % ZINE_COLORS.length],
    height: ZINE_HEIGHTS[index % ZINE_HEIGHTS.length],
    pdfSrc: pdf ? folder + encodeURIComponent(pdf) : '',
    html: pdf ? '' : renderZineBody(coverMd + body, folder),
  };
}

/** Returns a promise of every issue found in zines/, oldest first. */
async function loadZines() {
  const dirs = (await listDir(ZINE_ROOT))
    .filter(e => e.type === 'directory' && !e.name.startsWith('.') && !e.name.startsWith('_'))
    .map(e => e.name)
    .sort(byName);
  const issues = [];
  for (let i = 0; i < dirs.length; i++) {
    try { issues.push(await loadZine(dirs[i], i)); }
    catch (err) { console.warn('Skipping zine', dirs[i], err); }
  }
  return issues;
}
