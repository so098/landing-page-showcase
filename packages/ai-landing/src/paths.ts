import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// src -> package root in dev, dist -> package root in build
export const packageRoot = path.resolve(here, "..");
export const rulesDir = path.join(packageRoot, "rules");
export const agentsDir = path.join(packageRoot, "agents");
export const scriptsDir = path.join(packageRoot, "scripts");
