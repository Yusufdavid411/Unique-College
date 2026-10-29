import fs from "node:fs/promises";
import dotenv from "dotenv";

const secrets = dotenv.parse(await fs.readFile(new URL("../.env.bootstrap.local", import.meta.url)));
await fs.writeFile(new URL("../../admin-access.local.md", import.meta.url), [
  "# Unique College admin access",
  "",
  "Admin login: https://admin.uniquecollegekwali.com/",
  "Email: " + secrets.ADMIN_EMAIL,
  "Password: " + secrets.ADMIN_PASSWORD,
  "",
  "News management: https://admin.uniquecollegekwali.com/news",
  "Public news: https://www.uniquecollegekwali.com/news",
  "",
  "Keep this file private. It is excluded from GitHub and deployment uploads."
].join("\n"), { flag: "wx", mode: 0o600 });
console.log("Created admin-access.local.md with the admin login details.");
