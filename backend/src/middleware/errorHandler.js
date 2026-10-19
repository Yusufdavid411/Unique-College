import { ZodError } from "zod";

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (["ENOENT", "NoSuchKey", "NotFound"].includes(error.code || error.name)) return res.status(404).json({ success: false, message: "File not found" });
  if (["P1000", "P1001", "P1002", "P1011"].includes(error.code)) {
    console.error("database_unavailable", { code: error.code });
    return res.status(503).json({ success: false, message: "The service is temporarily unavailable. Please try again shortly." });
  }
  if (error.code === "P2002") return res.status(409).json({ success: false, message: "A record with these details already exists" });
  if (error.code === "P2034") return res.status(409).json({ success: false, message: "The record changed during another request. Refresh before trying again." });
  if (error.code === "P2025") return res.status(404).json({ success: false, message: "Record not found" });
  if (error.message?.startsWith("Origin not allowed by CORS")) {
    return res.status(403).json({
      success: false,
      message: "This website is not allowed to access the API. Please check the backend CLIENT_URL setting."
    });
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: error.flatten().fieldErrors
    });
  }

  if (error.name === "MulterError") {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "The uploaded file exceeds the permitted size. Please choose a smaller file."
      : error.message;
    return res.status(400).json({ success: false, message });
  }

  const status = error.statusCode || 500;
  const message = status === 500 ? "Internal server error" : error.message;

  if (status === 500) {
    console.error("request_failed", { name: error.name, code: error.code });
  }

  return res.status(status).json({ success: false, message });
}
