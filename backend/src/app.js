import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { uploadRoot } from "./config/uploads.js";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export const app = express();

app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed =
      env.clientUrls.includes(origin) ||
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin);

    return callback(allowed ? null : new Error(`Origin not allowed by CORS: ${origin}`), allowed);
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-8",
    legacyHeaders: false
  })
);

app.use("/uploads", express.static(uploadRoot));
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);
