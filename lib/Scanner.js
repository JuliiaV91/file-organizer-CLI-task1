import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

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
          const daysOld =
            (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

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

          // Emit event when a file is found
          this.emit("file-found", fileInfo);
        }
      }
    };

    try {
      this.emit("scan-start", { directory });

      await scanDirectory(directory);

      this.emit("scan-complete", statistics);

      return statistics;
    } catch (error) {
      // Notify listeners about the error
      this.emit("error", error);

      // Pass the error to the CLI
      throw error;
    }
  }
}
