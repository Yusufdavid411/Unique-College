import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { publicFile } from "./routes/fileRoutes.js";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export const app = express();

app.set("trust proxy", 1);

app.use((req, res, next) => {
  if (process.env.PAYMENT_SANDBOX_RETIRED === "true") return res.status(410).set("Cache-Control", "no-store").json({ success: false, message: "This payment sandbox has been retired. Use the official school portal." });
  next();
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed =
      env.clientUrls.includes(origin) ||
      (env.nodeEnv !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin));

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

app.use("/uploads", publicFile);
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
