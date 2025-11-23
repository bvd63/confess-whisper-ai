#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, "..", "dist");
const ASSETS_DIR = path.join(DIST_DIR, "assets");
const DEFAULT_LIMIT_KB = 500;

const limitKb = parseFloat(process.env.ADMIN_CHUNK_LIMIT_KB ?? `${DEFAULT_LIMIT_KB}`);
if (Number.isNaN(limitKb) || limitKb <= 0) {
  console.error("ERROR: ADMIN_CHUNK_LIMIT_KB must be a positive number (received:", process.env.ADMIN_CHUNK_LIMIT_KB, ")");
  process.exit(1);
}
const limitBytes = Math.round(limitKb * 1024);

const formatBytes = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;

async function readRecursive(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return readRecursive(fullPath);
      }
      return fullPath;
    })
  );
  return files.flat();
}

async function ensureAssetsDir() {
  try {
    await fs.access(ASSETS_DIR);
  } catch {
    console.error(`ERROR: Expected build output at ${ASSETS_DIR}. Run 'npm run build' (or 'npm run analyze') before executing this guard.`);
    process.exit(1);
  }
}

async function main() {
  await ensureAssetsDir();
  const files = await readRecursive(ASSETS_DIR);
  const adminChunks = files.filter((file) => {
    const filename = path.basename(file);
    return filename.startsWith("admin-tools-") && filename.endsWith(".js");
  });

  if (adminChunks.length === 0) {
    console.error("ERROR: No admin-tools chunks found under dist/assets. Confirm manual chunk configuration is intact.");
    process.exit(1);
  }

  let violation = false;

  console.log("\nAdmin Bundle Guard");
  console.log("=====================");
  console.log(`Budget: ${formatBytes(limitBytes)} (raw)\n`);

  for (const chunkPath of adminChunks) {
    const stats = await fs.stat(chunkPath);
    const size = stats.size;
    const chunkName = path.basename(chunkPath);
    const flag = size > limitBytes ? "[FAIL]" : "[ OK ]";
    console.log(`${flag} ${chunkName.padEnd(40)} ${formatBytes(size)}`);
    if (size > limitBytes) {
      violation = true;
    }
  }

  if (violation) {
    console.error(`\nERROR: Admin chunk exceeded ${formatBytes(limitBytes)}. Trim dependencies or split the bundle before merging.`);
    process.exit(1);
  }

  console.log("\nOK: Admin chunk is within the allowed budget.\n");
}

main().catch((error) => {
  console.error("ERROR: Failed to run admin bundle guard:", error);
  process.exit(1);
});
