const auth = require("../../lib/auth"), kv = require("../../lib/kv"), { json, body, ip } = require("../../lib/util");
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  if (await kv.limited("rl:login:" + ip(req), 8, 600)) return json(res, 429, { error: "Too many attempts. Please wait a few minutes." });
  const { email, password } = await body(req);
  const u = auth.users().find(x => String(x.email).toLowerCase() === String(email || "").trim().toLowerCase());
  if (!u || !auth.checkPassword(u, password || "")) return json(res, 401, { error: "Incorrect email or password." });
  res.setHeader("Set-Cookie", auth.cookie(auth.session(u), 12 * 3600));
  return json(res, 200, { ok: true, name: u.name || u.email });
};
