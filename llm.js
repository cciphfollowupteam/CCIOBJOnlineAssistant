// One call to the Anthropic Messages API that must return a JSON object.
exports.json = async (prompt, maxTokens = 600) => {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) { const e = new Error("no key"); e.code = "no_key"; throw e; }
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }) });
  if (!r.ok) throw new Error("llm " + r.status);
  const j = await r.json(); const t = (j.content || []).map(c => c.text || "").join("");
  const m = t.match(/\{[\s\S]*\}/); if (!m) throw new Error("no json"); return JSON.parse(m[0]);
};
