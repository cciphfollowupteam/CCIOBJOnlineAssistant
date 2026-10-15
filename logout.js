const auth = require("../../lib/auth"), { json } = require("../../lib/util");
module.exports = async (req, res) => { res.setHeader("Set-Cookie", auth.cookie("", 0)); return json(res, 200, { ok: true }); };
