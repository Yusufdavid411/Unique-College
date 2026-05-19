import { app } from "./app.js";
import { env } from "./config/env.js";
import { ensureUploadFolders } from "./config/uploads.js";

ensureUploadFolders();

app.listen(env.port, () => {
  console.log(`Unique College API running on port ${env.port}`);
});
