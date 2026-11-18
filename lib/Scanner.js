import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { getAllFiles, getFileAge } from "./utils.js";

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

    try {
      // Event: scanning started
      this.emit("scan-start", { directory });

      // Collect all file paths recursively
      const files = await getAllFiles(directory);
      const totalFiles = files.length;

      // Process each file
      for (const filePath of files) {
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
        const extension = path.extname(filePath).toLowerCase() || "(other)";

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
        const daysOld = getFileAge(stats.mtime);

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

        // Event: file processed
        this.emit("file-found", {
          ...fileInfo,
          current: statistics.totalFiles,
          total: totalFiles,
        });
      }

      // Event: scanning completed
      this.emit("scan-complete", statistics);

      return statistics;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
}
