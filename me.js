const auth = require("../../lib/auth"), { json } = require("../../lib/util");
module.exports = async (req, res) => {
  const a = auth.getAdmin(req); if (!a) return json(res, 401, { error: "auth" });
  return json(res, 200, { id: a.id, name: a.name, isOwner: a.isOwner, canEdit: true });
};
