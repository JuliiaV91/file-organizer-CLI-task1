import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { getAllFiles, getFileAge } from "./utils.js";

export class Cleanup extends EventEmitter {
  async cleanup(directory, olderThan, confirm = false) {
    try {
      const files = await getAllFiles(directory);
      const oldFiles = [];

      // Find files older than the specified number of days
      for (const filePath of files) {
        const stats = await fs.stat(filePath);
        const daysOld = getFileAge(stats.mtime);

        if (daysOld > olderThan) {
          const fileInfo = {
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
            daysOld,
          };

          oldFiles.push(fileInfo);

          this.emit("file-found", fileInfo);
        }
      }

      // Calculate total size of old files
      const totalSize = oldFiles.reduce((sum, file) => sum + file.size, 0);

      const results = {
        files: oldFiles,
        totalFiles: oldFiles.length,
        totalSize,
        deletedFiles: 0,
        freedSpace: 0,
        confirm,
      };

      // Delete files only when --confirm is provided
      if (confirm) {
        for (const file of oldFiles) {
          await fs.unlink(file.path);

          results.deletedFiles++;
          results.freedSpace += file.size;

          this.emit("file-deleted", {
            ...file,
            current: results.deletedFiles,
            total: oldFiles.length,
          });
        }
      }

      // Event: cleanup completed
      this.emit("cleanup-complete", results);

      return results;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
}
