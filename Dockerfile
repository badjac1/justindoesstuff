FROM nginxinc/nginx-unprivileged:1.28-alpine

# Config: security headers, caching, tidy defaults
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Serve the whole site, so new pages, photos, JS and CSS work without touching this file
COPY --chown=nginx:nginx . /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null || exit 1