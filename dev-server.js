// Local preview:  CCI_DEV=1 node scripts/dev-server.js   then open http://localhost:3000
// Reads environment variables from .env if present (simple KEY=VALUE lines).
const fs = require("fs"), path = require("path"), http = require("http");
try { fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split("\n").forEach(l => { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }); } catch (e) {}
process.env.CCI_DEV = process.env.CCI_DEV || "1";
const routes = { "/api/answer": "../api/answer.js", "/api/db": "../api/db.js", "/api/admin/login": "../api/admin/login.js", "/api/admin/logout": "../api/admin/logout.js", "/api/admin/me": "../api/admin/me.js", "/api/admin/sample": "../api/admin/sample.js" };
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json" };
exports.start = (port = Number(process.env.PORT) || 3000) => new Promise(resolve => {
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://x"); const p = u.pathname.replace(/\/$/, "") || "/";
    if (routes[p]) { try { return await require(routes[p])(req, res); } catch (e) { res.statusCode = 500; return res.end("error"); } }
    let f = p === "/" ? "index.html" : p === "/admin" ? "admin.html" : p.slice(1);
    const file = path.join(__dirname, "..", "public", f);
    if (!file.startsWith(path.join(__dirname, "..", "public")) || !fs.existsSync(file)) { res.statusCode = 404; return res.end("not found"); }
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream"); res.end(fs.readFileSync(file));
  });
  srv.listen(port, () => { if (require.main === module) console.log("CCI chatbot running at http://localhost:" + port + "  (admin: /admin)"); resolve(srv); });
});
if (require.main === module) exports.start();
