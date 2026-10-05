import dotenv from "dotenv";

dotenv.config();

const defaultClientUrls = [
  "http://localhost:5173",
  "https://uniquecollegekwali.edu.ng",
  "https://www.uniquecollegekwali.edu.ng",
  "https://uniquecollegekwali-yusufdavid411s-projects.vercel.app"
];

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
