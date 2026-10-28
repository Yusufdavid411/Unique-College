import dotenv from "dotenv";

dotenv.config();

const defaultClientUrls = [
  "http://localhost:5173",
  "https://uniquecollegekwali.com",
  "https://www.uniquecollegekwali.com",
  "https://admin.uniquecollegekwali.com",
  "https://apply.uniquecollegekwali.com",
  "https://uniquecollegekwali.edu.ng",
  "https://www.uniquecollegekwali.edu.ng",
  "https://admin.uniquecollegekwali.edu.ng",
  "https://staff.uniquecollegekwali.edu.ng",
  "https://portal.uniquecollegekwali.edu.ng",
  "https://uniquecollegekwali.vercel.app",
  "https://uniquecollegekwali-yusufdavid411s-projects.vercel.app"
];

if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || ["development_secret_change_me", "replace_with_a_long_random_secret"].includes(process.env.JWT_SECRET))) {
  throw new Error("A unique JWT_SECRET of at least 32 characters is required in production");
}
if (process.env.VERCEL === "1" && !["s3", "blob"].includes(process.env.STORAGE_PROVIDER)) {
  throw new Error("Configure durable object storage before deploying the API on Vercel");
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || defaultClientUrls[0],
  clientUrls: (process.env.CLIENT_URL || defaultClientUrls.join(","))
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || "development_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`
};
