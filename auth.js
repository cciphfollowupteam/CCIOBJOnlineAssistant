const crypto = require("crypto");
const SECRET = () => process.env.SESSION_SECRET || "dev-only-secret-change-me";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function sign(p) { const b = b64(p); return b + "." + crypto.createHmac("sha256", SECRET()).update(b).digest("base64url"); }
function verify(t) {
  if (!t || !t.includes(".")) return null; const [b, h] = t.split(".");
  const e = crypto.createHmac("sha256", SECRET()).update(b).digest("base64url");
  const A = Buffer.from(h), B = Buffer.from(e); if (A.length !== B.length || !crypto.timingSafeEqual(A, B)) return null;
  try { return JSON.parse(Buffer.from(b, "base64url").toString("utf8")); } catch { return null; }
}
function cookies(req) { const o = {}; String(req.headers.cookie || "").split(";").forEach(c => { const i = c.indexOf("="); if (i > 0) o[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); }); return o; }
exports.getAdmin = (req) => { const p = verify(cookies(req).cci_admin); return p && p.exp > Date.now() ? p : null; };
exports.users = () => { try { return JSON.parse(process.env.ADMIN_USERS || "[]"); } catch { return []; } };
exports.checkPassword = (user, pw) => {
  const [alg, salt, hash] = String(user.hash || "").split("$"); if (alg !== "scrypt" || !salt || !hash) return false;
  const a = Buffer.from(crypto.scryptSync(String(pw), salt, 64).toString("hex")), b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
exports.session = (user) => sign({ id: user.email.toLowerCase(), name: user.name || user.email, isOwner: !!user.owner, exp: Date.now() + 12 * 3600e3 });
exports.cookie = (value, maxAge) => `cci_admin=${encodeURIComponent(value)}; Path=/; HttpOnly; ${process.env.CCI_DEV === "1" ? "" : "Secure; "}SameSite=Strict; Max-Age=${maxAge}`;
