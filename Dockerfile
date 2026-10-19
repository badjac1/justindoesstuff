FROM nginx:alpine

# Server config: serves the site and lists photos/ as JSON
COPY nginx.conf /etc/nginx/conf.d/default.conf

# The whole site (pages, scripts, styles, and every photos/ folder).
# Anything that shouldn't be public is excluded in .dockerignore.
COPY . /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
