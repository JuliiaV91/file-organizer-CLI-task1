import { EventEmitter } from "node:events";
import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { getAllFiles } from "./utils.js";

export class DuplicateFinder extends EventEmitter {
  // Calculate SHA-256 hash using streams
  calculateHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("data", (chunk) => {
        hash.update(chunk);
      });

      stream.on("end", () => {
        resolve(hash.digest("hex"));
      });

      stream.on("error", (error) => {
        reject(error);
      });
    });
  }

  // Find duplicate files in a directory
  async findDuplicates(directory) {
    try {
      // Collect all file paths recursively
      const files = await getAllFiles(directory);

      // Map<hash, Array<filePath>>
      const hashMap = new Map();

      // Store file sizes for calculating wasted space
      const fileSizes = new Map();

      let processedFiles = 0;
      const totalFiles = files.length;

      // Calculate hash for each file
      for (const filePath of files) {
        const stats = await fsPromises.stat(filePath);
        const hash = await this.calculateHash(filePath);

        // Group files by SHA-256 hash
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }

        hashMap.get(hash).push(path.resolve(filePath));

        // Save file size
        fileSizes.set(hash, stats.size);

        // Update progress
        processedFiles++;

        this.emit("file-processed", {
          current: processedFiles,
          total: totalFiles,
          path: filePath,
        });
      }

      // Keep only groups with more than one file
      const duplicateGroups = [];

      let totalWastedSpace = 0;

      for (const [hash, filePaths] of hashMap) {
        if (filePaths.length > 1) {
          const size = fileSizes.get(hash);

          const wastedSpace = size * (filePaths.length - 1);

          duplicateGroups.push({
            hash,
            files: filePaths,
            size,
            copies: filePaths.length,
            wastedSpace,
          });

          totalWastedSpace += wastedSpace;
        }
      }

      const results = {
        totalFiles,
        duplicateGroups,
        totalWastedSpace,
      };

      // Event: duplicates found
      this.emit("duplicates-found", results);

      return results;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
}
