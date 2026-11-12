/**
 * 模拟后端 HTTP 服务：把 contracts 里的参考实现包成真实接口，端口 3000。
 * 用途：小程序真机/开发者工具联调；给验收脚本当“标准答案”。
 * 启动：npm run mock（根目录）
 */
const http = require('node:http');
const { createMock, matchRoute, PORTS } = require('../dist');

const mock = createMock();
const port = Number(process.env.PORT || PORTS.api);
const send = (res, status, body, cors) => {
  res.writeHead(status, { ...cors, 'content-type': status >= 400 ? 'application/problem+json; charset=utf-8' : 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const cors = {
    'access-control-allow-origin': req.headers.origin || '*',
    'access-control-allow-headers': 'content-type,authorization,x-purpose-code,idempotency-key,x-request-id',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    const m = matchRoute(req.method, url.pathname);
    if (!m) return send(res, 404, { type: 'about:blank', title: '接口不存在', status: 404, code: 'NOT_FOUND' }, cors);
    let body;
    try { body = raw ? JSON.parse(raw) : undefined; } catch { return send(res, 422, { type: 'about:blank', title: '请求体不是合法 JSON', status: 422, code: 'VALIDATION_FAILED' }, cors); }
    const out = mock.call(m.name, { token: req.headers.authorization, purpose: req.headers['x-purpose-code'], params: m.params, query: Object.fromEntries(url.searchParams), body });
    send(res, out.status, out.body, cors);
  });
}).listen(port, () => console.log(`[mock] http://localhost:${port}/api/v1  （内存数据，重启即还原）`));
