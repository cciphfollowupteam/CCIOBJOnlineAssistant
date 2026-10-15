// Admin-only: lets the Worker assistant ask Claude. Body {prompt}. Returns {value}
const auth = require("../../lib/auth"), llm = require("../../lib/llm"), kv = require("../../lib/kv"), { json, body, ip } = require("../../lib/util");
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  if (!auth.getAdmin(req)) return json(res, 401, { error: "auth" });
  if (await kv.limited("rl:wk:" + ip(req), 40, 60)) return json(res, 429, { error: "rate_limited" });
  const { prompt } = await body(req); if (!prompt || String(prompt).length > 14000) return json(res, 400, { error: "bad_prompt" });
  try { return json(res, 200, { value: await llm.json(String(prompt), 700) }); }
  catch (e) { return json(res, 503, { error: e.code === "no_key" ? "no_key" : "llm_error" }); }
};
