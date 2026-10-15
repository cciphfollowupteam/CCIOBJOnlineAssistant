// Usage: npm run hash -- "my password"   -> prints the value to put in ADMIN_USERS
const crypto = require("crypto");
const pw = process.argv[2];
if (!pw) { console.error('Usage: npm run hash -- "password"'); process.exit(1); }
const salt = crypto.randomBytes(16).toString("hex");
console.log("scrypt$" + salt + "$" + crypto.scryptSync(pw, salt, 64).toString("hex"));
