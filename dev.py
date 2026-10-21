"""Local preview server, so you can see changes without redeploying.

    python dev.py          then open http://localhost:8080

Serves the site and mimics nginx's JSON folder listings for photos/ and zines/.
Not part of the deployed site (see .dockerignore).
"""
import http.server
import json
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
LISTED = ('/photos/', '/zines/')


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?', 1)[0]
        fs = self.translate_path(path)
        if path.startswith(LISTED) and path.endswith('/') and os.path.isdir(fs):
            entries = [
                {'name': n, 'type': 'directory' if os.path.isdir(os.path.join(fs, n)) else 'file'}
                for n in sorted(os.listdir(fs))
            ]
            body = json.dumps(entries).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def guess_type(self, path):
        return 'text/markdown; charset=utf-8' if path.endswith('.md') else super().guess_type(path)


socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), Handler) as httpd:
    print(f'Serving on http://localhost:{PORT}  (Ctrl+C to stop)')
    httpd.serve_forever()
