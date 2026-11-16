import fs from "node:fs/promises";
import path from "node:path";

// Convert bytes to readable file size
export function formatSize(bytes) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;

  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1
  );

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

// Create a progress bar
export function drawProgressBar(current, total, width = 20) {
  if (total === 0) {
    return `${"░".repeat(width)} 0/0`;
  }

  const percentage = current / total;
  const filled = Math.round(percentage * width);

  const bar = "█".repeat(filled) + "░".repeat(width - filled);

  return `${bar} ${current}/${total}`;
}

// Recursively collect all file paths
export async function getAllFiles(directory) {
  const files = [];

  const scanDirectory = async (currentDirectory) => {
    const entries = await fs.readdir(currentDirectory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const filePath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(filePath);
      } else if (entry.isFile()) {
        files.push(filePath);
      }
    }
  };

  await scanDirectory(directory);

  return files;
}

export function handleError(error, directory) {
  if (error.code === "ENOENT") {
    console.error(
      `\n❌ Error: Directory or file not found: ${error.path ?? directory}`
    );
  } else if (error.code === "EACCES" || error.code === "EPERM") {
    console.error(`\n❌ Error: Permission denied: ${error.path ?? directory}`);
  } else {
    console.error(`\n❌ Unexpected error: ${error.message}`);
  }

  process.exitCode = 1;
}
