import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { formatSize } from "./utils.js";

export class Scanner extends EventEmitter {
  async scan(directory) {
    const statistics = {
      totalFiles: 0,
      totalSize: 0,
      byType: new Map(),
      byAge: {
        last7Days: 0,
        last30Days: 0,
        olderThan90Days: 0,
      },
      largestFiles: [],
      oldestFile: null,
    };

    const scanDirectory = async (currentDirectory) => {
      const entries = await fs.readdir(currentDirectory, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const filePath = path.join(currentDirectory, entry.name);

        if (entry.isDirectory()) {
          await scanDirectory(filePath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(filePath);

          const fileInfo = {
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
          };

          // Count files and total size
          statistics.totalFiles++;
          statistics.totalSize += stats.size;

          // Group files by extension
          const extension = path.extname(entry.name).toLowerCase() || "(other)";

          if (!statistics.byType.has(extension)) {
            statistics.byType.set(extension, {
              count: 0,
              totalSize: 0,
            });
          }

          const typeStats = statistics.byType.get(extension);

          typeStats.count++;
          typeStats.totalSize += stats.size;

          // Calculate file age
          const now = Date.now();
          const daysOld = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

          if (daysOld >= 0 && daysOld <= 7) {
            statistics.byAge.last7Days++;
          }

          if (daysOld >= 0 && daysOld <= 30) {
            statistics.byAge.last30Days++;
          }

          if (daysOld > 90) {
            statistics.byAge.olderThan90Days++;
          }

          // Find the 3 largest files
          statistics.largestFiles.push(fileInfo);

          statistics.largestFiles.sort((a, b) => b.size - a.size);

          statistics.largestFiles = statistics.largestFiles.slice(0, 3);

          // Find the oldest file
          if (
            !statistics.oldestFile ||
            fileInfo.modified < statistics.oldestFile.modified
          ) {
            statistics.oldestFile = fileInfo;
          }
        }
      }
    };

    try {
      await scanDirectory(directory);

      console.log("\n📊 Scan Results:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      console.log(`Total files: ${statistics.totalFiles}`);
      console.log(`Total size: ${formatSize(statistics.totalSize)}`);

      // Display file types
      console.log("\nBy File Type:");

      for (const [extension, data] of statistics.byType) {
        console.log(
          `  ${extension}    ${data.count} files    ${formatSize(
            data.totalSize
          )}`
        );
      }

      // Display file age
      console.log("\nFile Age:");

      console.log(`  Last 7 days: ${statistics.byAge.last7Days} files`);
      console.log(`  Last 30 days: ${statistics.byAge.last30Days} files`);
      console.log(`  Older than 90: ${statistics.byAge.olderThan90Days} files`);

      // Display the 3 largest files
      console.log("\nLargest Files:");

      for (const file of statistics.largestFiles) {
        console.log(`  ${file.path} — ${formatSize(file.size)}`);
      }

      // Display the oldest file
      console.log("\nOldest File:");

      if (statistics.oldestFile) {
        console.log(`  ${statistics.oldestFile.path}`);
        console.log(
          `  Modified: ${statistics.oldestFile.modified.toLocaleDateString()}`
        );
      } else {
        console.log("  No files found");
      }

      return statistics;
    } catch (error) {
      console.error("Scanning error:", error.message);
      throw error;
    }
  }
}
