import { ZodError } from "zod";

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(error, req, res, next) {
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
      ? "Uploaded image is too large. Please upload an image below 10 MB."
      : error.message;
    return res.status(400).json({ success: false, message });
  }

  const status = error.statusCode || 500;
  const message = status === 500 ? "Internal server error" : error.message;

  if (status === 500) {
    console.error(error);
  }

  return res.status(status).json({ success: false, message });
}
