// docs/07-api-spec.yaml → Prism 목 서버(내부 포트) + Swagger UI + /api/v1 프록시를 한 포트로 제공한다.
// 실행: npm install && npm start  →  http://localhost:4020
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 4020);
const PRISM_PORT = Number(process.env.PRISM_PORT || 4010);
const SPEC = path.resolve(__dirname, '../docs/07-api-spec.yaml');
const UI_DIR = require('swagger-ui-dist').getAbsoluteFSPath();

const prism = spawn(
  process.execPath,
  [require.resolve('@stoplight/prism-cli/dist/index.js'), 'mock', SPEC, '-p', String(PRISM_PORT), '-h', '127.0.0.1'],
  { stdio: 'inherit' }
);
prism.on('exit', (c) => { console.error('Prism 종료 (code ' + c + ')'); process.exit(c || 1); });
process.on('SIGINT', () => { prism.kill(); process.exit(0); });
process.on('SIGTERM', () => { prism.kill(); process.exit(0); });

const INDEX = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>perfumeishuman API (mock)</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/ui/swagger-ui.css"></head><body>
<div id="ui"></div>
<script src="/ui/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({ url: '/openapi.yaml', dom_id: '#ui', deepLinking: true, tryItOutEnabled: true,
  requestInterceptor: (r) => { const m = new URLSearchParams(location.search).get('code'); if (m) r.url += (r.url.includes('?') ? '&' : '?') + '__code=' + m; return r; } });
</script></body></html>`;

const MIME = { '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.html': 'text/html', '.map': 'application/json' };

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' ) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(INDEX); }
  if (url === '/openapi.yaml') { res.writeHead(200, { 'content-type': 'text/yaml; charset=utf-8' }); return fs.createReadStream(SPEC).pipe(res); }
  if (url.startsWith('/ui/')) {
    const f = path.join(UI_DIR, path.basename(url));
    if (fs.existsSync(f)) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); return fs.createReadStream(f).pipe(res); }
  }
  if (url.startsWith('/api/v1')) {
    // Prism은 쿠키 인증(sessionCookie)을 강제하지만 Swagger UI는 쿠키를 보낼 수 없다.
    // 로그인 상태를 흉내 내기 위해 쿠키가 없으면 가짜 세션을 붙인다. 401은 ?__code=401 로 확인한다.
    const headers = { ...req.headers };
    if (!/(^|;\s*)session=/.test(headers.cookie || '')) headers.cookie = ((headers.cookie || '') + '; session=mock').replace(/^; /, '');
    const p = http.request({ host: '127.0.0.1', port: PRISM_PORT, path: req.url.slice('/api/v1'.length) || '/', method: req.method, headers },
      (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    p.on('error', () => { res.writeHead(503, { 'content-type': 'application/json' }); res.end('{"error":{"code":"MOCK_STARTING","message":"Prism 기동 중"}}'); });
    return req.pipe(p);
  }
  res.writeHead(404); res.end('not found');
}).listen(PORT, () => console.log(`Swagger UI: http://localhost:${PORT}   (mock API: http://localhost:${PORT}/api/v1)`));
