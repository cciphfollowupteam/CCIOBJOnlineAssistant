exports.json = (res, code, obj) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
exports.body = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return {}; }
};
exports.ip = (req) => String((req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "ip")).split(",")[0].trim();
exports.baseUrl = (req) => process.env.PUBLIC_URL || (req.headers.host ? "https://" + req.headers.host : "");
