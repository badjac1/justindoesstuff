/* ==================================================================
   ZINE BOOK: shows a PDF zine as a flippable booklet.

   Every PDF page is rendered to an image (PDF.js, vendored in
   vendor/pdfjs/) and the pages are bound into a book that turns like
   a real one. Page size comes from the PDF itself.
   ================================================================== */

const ZINE_PX_PER_INCH = 80;             // pages are laid out at this scale, then fitted to the screen
const ZINE_FLIP_MS = 900;                // keep in sync with --zflip in site.css
const ZINE_MIN_SPREAD_PAGE = 230;        // below this page width, show one page at a time

/** Loads PDF.js the first time a PDF zine is opened. */
let pdfjsReady = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfjsReady) {
    pdfjsReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/pdfjs/pdf.min.js';
      s.onload = () => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      s.onerror = () => { pdfjsReady = null; reject(new Error('Could not load the PDF reader')); };
      document.head.appendChild(s);
    });
  }
  return pdfjsReady;
}

/**
 * Renders every page of the issue's PDF to an image and returns them as
 * page HTML. The issue takes the PDF's page size (points -> inches ->
 * design pixels). Cached on the issue.
 */
async function paginatePdf(issue, onProgress) {
  if (issue.pageHtml) return issue.pageHtml;
  const lib = await loadPdfJs();
  const doc = await lib.getDocument(issue.pdfSrc).promise;
  const first = await doc.getPage(1);
  const base = first.getViewport({ scale: 1 });
  issue.pageW = Math.round(base.width / 72 * ZINE_PX_PER_INCH);
  issue.pageH = Math.round(base.height / 72 * ZINE_PX_PER_INCH);

  // render at about 2x the largest size the page is likely to be shown
  const scale = Math.min(2.5, 1100 / base.width);
  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    if (onProgress) onProgress(n, doc.numPages);
    const page = n === 1 ? first : await doc.getPage(n);
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    out.push(`<div class="zp zp-pdf"><img src="${canvas.toDataURL('image/jpeg', 0.88)}" alt="Page ${n}"></div>`);
  }
  issue.pageHtml = out;
  return out;
}

class ZineBook {
  /**
   * @param {HTMLElement} stage   empty element the book is drawn into
   * @param {object} issue        from loadZines()
   * @param {string[]} content    from paginatePdf()
   * @param {function} onChange   called with { label, canPrev, canNext }
   */
  constructor(stage, issue, content, onChange) {
    this.stage = stage;
    this.issue = issue;
    this.onChange = onChange || (() => {});
    // a PDF already holds its own cover, numbers and back cover
    this.pages = content.map(html => ({ html }));
    if (this.pages.length % 2) this.pages.push({ html: '<div class="zp zp-blank"></div>' });
    this.idx = 0;                         // page shown on the right (spread) or alone (single)

    this.onResize = () => { clearTimeout(this.rt); this.rt = setTimeout(() => this.build(), 150); };
    window.addEventListener('resize', this.onResize);
    this.bindPointer();
    this.build();
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.rt);
    this.stage.innerHTML = '';
  }

  /* ---------- layout ---------- */

  build() {
    const vw = this.stage.clientWidth, vh = this.stage.clientHeight;
    const pad = 24;
    const PW = this.issue.pageW, PH = this.issue.pageH;
    const fromH = (vh - pad) * PW / PH;
    const spreadW = Math.min(fromH, (vw - pad) / 2);
    this.spread = spreadW >= ZINE_MIN_SPREAD_PAGE;
    const pw = Math.max(120, Math.floor(this.spread ? spreadW : Math.min(fromH, vw - pad)));
    const ph = Math.round(pw * PH / PW);

    const n = this.pages.length;
    this.count = this.spread ? n / 2 : n;           // leaves
    // current position from the page we were on
    this.state = this.spread ? Math.ceil(this.idx / 2) : this.idx;

    const book = document.createElement('div');
    book.className = 'zbook no-anim ' + (this.spread ? 'is-spread' : 'is-single');
    book.style.cssText = `--pw:${pw}px;--ph:${ph}px;--s:${pw / PW};--zw:${PW}px;--zh:${PH}px`;

    const face = (i, cls) => `<div class="zface ${cls}">${this.pages[i].html}</div>`;

    let leaves = '';
    for (let i = 0; i < this.count; i++) {
      if (this.spread) {
        leaves += `<div class="zleaf">${face(2 * i, 'zfront')}${face(2 * i + 1, 'zback')}</div>`;
      } else {
        leaves += `<div class="zleaf">${face(i, 'zfront')}<div class="zface zback zblank"></div></div>`;
      }
    }
    book.innerHTML = leaves;
    this.stage.innerHTML = '';
    this.stage.appendChild(book);
    this.book = book;
    this.leaves = Array.from(book.children);
    this.apply();
    requestAnimationFrame(() => requestAnimationFrame(() => book.classList.remove('no-anim')));
  }

  /* ---------- state -> DOM ---------- */

  apply() {
    const N = this.count;
    this.leaves.forEach((leaf, i) => {
      const flipped = i < this.state;
      leaf.classList.toggle('flipped', flipped);
      if (!leaf.classList.contains('turning')) leaf.style.zIndex = flipped ? i + 1 : N - i;
    });
    // spread view: the closed book sits centred on the cover / back cover
    this.book.dataset.at = this.spread ? (this.state === 0 ? 'front' : this.state === N ? 'back' : 'mid') : 'mid';

    if (this.spread) this.idx = this.state === 0 ? 0 : 2 * this.state - 1;
    else this.idx = this.state;
    this.onChange(this.status());
  }

  status() {
    const n = this.pages.length, max = this.count - (this.spread ? 0 : 1);
    let label;
    if (this.spread) {
      label = this.state === 0 ? 'Cover' : this.state === this.count ? 'Back cover'
            : `Pages ${2 * this.state}–${2 * this.state + 1} of ${n}`;
    } else {
      label = this.idx === 0 ? 'Cover' : this.idx === n - 1 ? 'Back cover' : `Page ${this.idx + 1} of ${n}`;
    }
    return { label, canPrev: this.state > 0, canNext: this.state < max };
  }

  go(delta) {
    const max = this.count - (this.spread ? 0 : 1);
    const next = this.state + delta;
    if (next < 0 || next > max) return;
    // the leaf that turns rides on top for the length of the flip
    const leaf = this.leaves[delta > 0 ? this.state : next];
    leaf.classList.add('turning');
    leaf.style.zIndex = this.count + 5;
    setTimeout(() => {
      leaf.classList.remove('turning');
      this.apply();
    }, ZINE_FLIP_MS);
    this.state = next;
    this.apply();
  }
  next() { this.go(1); }
  prev() { this.go(-1); }

  /* ---------- input: click either side, or swipe ---------- */

  bindPointer() {
    let x0 = null;
    this.stage.addEventListener('pointerdown', e => { x0 = e.clientX; });
    this.stage.addEventListener('pointerup', e => {
      if (x0 === null || !this.book) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) { dx < 0 ? this.next() : this.prev(); return; }
      if (Math.abs(dx) > 10 || e.target.closest('a')) return;
      const r = this.book.getBoundingClientRect();
      (e.clientX > r.left + r.width / 2 ? this.next() : this.prev());
    });
    this.stage.addEventListener('pointercancel', () => { x0 = null; });
  }
}
