import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { getAllFiles } from "./utils.js";

const categories = {
  Documents: [".pdf", ".docx", ".doc", ".txt", ".md", ".xlsx", ".pptx"],
  Images: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"],
  Archives: [".zip", ".rar", ".tar", ".gz", ".7z"],
  Code: [".js", ".py", ".java", ".cpp", ".html", ".css", ".json"],
  Videos: [".mp4", ".avi", ".mkv", ".mov", ".webm"],
  Other: [],
};

const LARGE_FILE_SIZE = 10 * 1024 * 1024;

export class Organizer extends EventEmitter {
  // Determine category by file extension
  getCategory(filePath) {
    const extension = path.extname(filePath).toLowerCase();

    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }

    return "Other";
  }

  // Generate a unique filename if the target already exists
  async getUniquePath(targetPath) {
    const directory = path.dirname(targetPath);
    const extension = path.extname(targetPath);
    const name = path.basename(targetPath, extension);

    let newPath = targetPath;
    let counter = 1;

    while (true) {
      try {
        await fs.access(newPath);

        newPath = path.join(directory, `${name}(${counter})${extension}`);

        counter++;
      } catch (error) {
        if (error.code === "ENOENT") {
          return newPath;
        }

        throw error;
      }
    }
  }

  // Copy small files with copyFile and large files with streams
  async copyFile(sourcePath, targetPath, size) {
    if (size < LARGE_FILE_SIZE) {
      await fs.copyFile(sourcePath, targetPath);
    } else {
      await pipeline(
        createReadStream(sourcePath),
        createWriteStream(targetPath)
      );
    }
  }

  // Organize files into category folders
  async organize(sourceDirectory, outputDirectory) {
    const summary = {};

    for (const category of Object.keys(categories)) {
      summary[category] = 0;
    }

    const results = {
      summary,
      totalCopied: 0,
      totalSize: 0,
      output: path.resolve(outputDirectory),
    };

    // Find all files recursively
    const files = await getAllFiles(sourceDirectory);

    // Create category folders
    for (const category of Object.keys(categories)) {
      const categoryPath = path.join(outputDirectory, category);

      await fs.mkdir(categoryPath, { recursive: true });
    }

    // Copy files
    for (const sourcePath of files) {
      try {
        const stats = await fs.stat(sourcePath);
        const category = this.getCategory(sourcePath);

        const targetDirectory = path.join(outputDirectory, category);
        const targetPath = path.join(
          targetDirectory,
          path.basename(sourcePath)
        );

        const uniquePath = await this.getUniquePath(targetPath);

        this.emit("copy-start", {
          source: sourcePath,
          target: uniquePath,
        });

        await this.copyFile(sourcePath, uniquePath, stats.size);

        // Update statistics
        results.summary[category]++;
        results.totalCopied++;
        results.totalSize += stats.size;

        this.emit("copy-complete", {
          source: sourcePath,
          target: uniquePath,
          current: results.totalCopied,
          total: files.length,
        });
      } catch (error) {
        this.emit("copy-error", error);
        throw error;
      }
    }

    return results;
  }
}
