/**
 * Server entry point.
 *
 * Importing ./config/env.js (via ./app.js) validates required environment
 * variables at startup — a misconfigured deployment fails fast here instead
 * of serving traffic with insecure defaults. The Express app itself is
 * configured and exported from app.ts so tests can import it without
 * binding a port.
 */

import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${env.PORT} (${env.NODE_ENV})`);
});
