"""Makes small copies of every photo for the site to show in grids and on the shelf.

    python make_thumbs.py          (needs: pip install pillow)

For photos/<Portfolio>/pic.jpg it writes photos/<Portfolio>/thumbs/pic.jpg.
The site uses a thumbnail when one exists and the full photo otherwise, and the
full photo is still what opens in the viewer. It also writes thumbs/sizes.json (each thumbnail's size, for page layout).
Re-run it after adding photos;
thumbnails that are already up to date are skipped.
Not part of the deployed site (see .dockerignore).
"""
import json
import os
from PIL import Image, ImageOps

ROOT = 'photos'
LONG_EDGE = 900
QUALITY = 80
IMAGE_EXT = ('.jpg', '.jpeg', '.png', '.webp')

made = skipped = 0
for folder in sorted(os.listdir(ROOT)):
    src_dir = os.path.join(ROOT, folder)
    if not os.path.isdir(src_dir) or folder.startswith(('.', '_')):
        continue
    out_dir = os.path.join(src_dir, 'thumbs')
    for name in sorted(os.listdir(src_dir)):
        src = os.path.join(src_dir, name)
        if not os.path.isfile(src) or not name.lower().endswith(IMAGE_EXT):
            continue
        dst = os.path.join(out_dir, name)
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            skipped += 1
            continue
        os.makedirs(out_dir, exist_ok=True)
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)  # keep phone photos upright
            im.thumbnail((LONG_EDGE, LONG_EDGE), Image.LANCZOS)
            if name.lower().endswith('.png'):
                im.save(dst, optimize=True)
            else:
                im.convert('RGB').save(dst, quality=QUALITY, optimize=True, progressive=True)
        made += 1
    # sizes.json lets the site lay out the grid before any image has downloaded
    if os.path.isdir(out_dir):
        sizes = {}
        for name in sorted(os.listdir(out_dir)):
            if name.lower().endswith(IMAGE_EXT):
                with Image.open(os.path.join(out_dir, name)) as im:
                    sizes[name] = list(im.size)
        with open(os.path.join(out_dir, 'sizes.json'), 'w') as f:
            json.dump(sizes, f)
print(f'{made} thumbnails made, {skipped} already up to date')
