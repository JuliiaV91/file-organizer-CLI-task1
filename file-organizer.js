import { Command } from "commander";
import path from "node:path";

import { Scanner } from "./lib/scanner.js";
import { DuplicateFinder } from "./lib/duplicates.js";
import { Organizer } from "./lib/organizer.js";
import { Cleanup } from "./lib/cleanup.js";

import { formatSize, drawProgressBar, handleError } from "./lib/utils.js";

const program = new Command();

program
  .name("file-organizer")
  .description("CLI tool for analyzing and organizing files")
  .version("1.0.0");

// SCAN COMMAND
program
  .command("scan")
  .description("Scan a directory and collect file statistics")
  .argument("<directory>", "Directory to scan")
  .action(async (directory) => {
    const scanner = new Scanner();

    scanner.on("scan-start", (data) => {
      console.log(`📂 Scanning: ${data.directory}`);
    });

    scanner.on("file-found", (file) => {
      process.stdout.write(`\r${drawProgressBar(file.current, file.total)}`);
    });

    scanner.on("scan-complete", (statistics) => {
      console.log("\n\n📊 Scan Results:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Total files: ${statistics.totalFiles}`);
      console.log(`Total size: ${formatSize(statistics.totalSize)}`);

      console.log("\nBy File Type:");

      for (const [extension, data] of statistics.byType) {
        console.log(
          `  ${extension}    ${data.count} files    ${formatSize(
            data.totalSize
          )}`
        );
      }

      console.log("\nFile Age:");
      console.log(`  Last 7 days: ${statistics.byAge.last7Days} files`);
      console.log(`  Last 30 days: ${statistics.byAge.last30Days} files`);
      console.log(`  Older than 90: ${statistics.byAge.olderThan90Days} files`);

      console.log("\nLargest Files:");

      for (const file of statistics.largestFiles) {
        console.log(`  ${file.path} — ${formatSize(file.size)}`);
      }

      console.log("\nOldest File:");

      if (statistics.oldestFile) {
        console.log(`  ${statistics.oldestFile.path}`);
        console.log(
          `  Modified: ${statistics.oldestFile.modified.toLocaleDateString()}`
        );
      } else {
        console.log("  No files found");
      }

      console.log(`\n✅ Scan completed! Found ${statistics.totalFiles} files.`);
    });

    scanner.on("error", (error) => {
      handleError(error, directory);
    });

    try {
      await scanner.scan(directory);
    } catch {
      // Error already handled by the event listener
    }
  });

// DUPLICATES COMMAND
program
  .command("duplicates")
  .description("Find duplicate files using SHA-256 hashes")
  .argument("<directory>", "Directory to search")
  .action(async (directory) => {
    const finder = new DuplicateFinder();

    console.log(`🔍 Searching for duplicates in: ${directory}`);
    console.log("Calculating hashes...");

    finder.on("file-processed", (file) => {
      process.stdout.write(
        `\r${drawProgressBar(file.current, file.total)} files`
      );
    });

    finder.on("duplicates-found", (results) => {
      console.log("\n");

      const groups = results.duplicateGroups;

      console.log(
        `Found ${groups.length} duplicate groups (${formatSize(
          results.totalWastedSpace
        )} wasted):`
      );

      groups.forEach((group, index) => {
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        console.log(
          `Group ${index + 1} (${group.copies} copies, ${formatSize(
            group.size
          )} each):`
        );

        console.log(`  SHA-256: ${group.hash}`);
        console.log("");

        for (const filePath of group.files) {
          console.log(`  📄 ${filePath}`);
        }

        console.log(`\n  Wasted space: ${formatSize(group.wastedSpace)}`);
      });

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(
        `💾 Total wasted space: ${formatSize(results.totalWastedSpace)}`
      );
    });

    finder.on("error", (error) => {
      handleError(error, directory);
    });

    try {
      await finder.findDuplicates(directory);
    } catch {
      // Error already handled by the event listener
    }
  });

// ORGANIZE COMMAND
program
  .command("organize")
  .description("Copy files into folders based on their categories")
  .argument("<directory>", "Source directory")
  .requiredOption("-o, --output <directory>", "Output directory")
  .action(async (directory, options) => {
    const organizer = new Organizer();

    console.log(`📦 Organizing: ${directory}`);
    console.log(`Target: ${options.output}`);

    organizer.on("copy-complete", (file) => {
      process.stdout.write(`\r${drawProgressBar(file.current, file.total)}`);
    });

    organizer.on("copy-error", (error) => {
      handleError(error, directory);
    });

    try {
      console.log("\nCreating folders...");
      console.log("Copying files...");

      const results = await organizer.organize(directory, options.output);

      console.log("\n\n✅ Organization complete!");
      console.log("\nSummary:");

      for (const [category, count] of Object.entries(results.summary)) {
        console.log(
          `  ${category}: ${count} files → ${options.output}/${category}/`
        );
      }

      console.log(
        `\nTotal copied: ${results.totalCopied} files (${formatSize(
          results.totalSize
        )})`
      );
    } catch (error) {
      if (process.exitCode !== 1) {
        handleError(error, directory);
      }
    }
  });

// CLEANUP COMMAND
program
  .command("cleanup")
  .description("Find and optionally delete old files")
  .argument("<directory>", "Directory to clean")
  .requiredOption(
    "--older-than <days>",
    "Find files older than the specified number of days"
  )
  .option("--confirm", "Actually delete the files")
  .action(async (directory, options) => {
    const cleanup = new Cleanup();

    const olderThan = Number(options.olderThan);

    if (!Number.isFinite(olderThan) || olderThan < 0) {
      console.error("❌ Error: --older-than must be a non-negative number");
      process.exitCode = 1;
      return;
    }

    console.log(`🧹 Cleanup: ${directory}`);
    console.log(`Looking for files older than ${olderThan} days...`);

    cleanup.on("file-found", () => {
      // Old file found; results will be displayed together
    });

    cleanup.on("file-deleted", (file) => {
      process.stdout.write(`\r${drawProgressBar(file.current, file.total)}`);
    });

    cleanup.on("cleanup-complete", (results) => {
      if (options.confirm) {
        console.log("\n\n✅ Cleanup complete!");
        console.log(
          `Deleted: ${results.deletedFiles} files (${formatSize(
            results.freedSpace
          )} freed)`
        );
      }
    });

    cleanup.on("error", (error) => {
      handleError(error, directory);
    });

    try {
      // First: find old files without deleting anything
      const preview = await cleanup.cleanup(directory, olderThan, false);

      console.log(`\nFound ${preview.totalFiles} files to delete:`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      for (const file of preview.files) {
        console.log(`\n${path.basename(file.path)}`);
        console.log(`  Path: ${file.path}`);
        console.log(`  Size: ${formatSize(file.size)}`);
        console.log(
          `  Modified: ${Math.floor(file.daysOld)} days ago (${file.modified
            .toISOString()
            .slice(0, 10)})`
        );
      }

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(
        `Total: ${preview.totalFiles} files (${formatSize(preview.totalSize)})`
      );

      if (!options.confirm) {
        console.log("\n⚠️ DRY RUN MODE: No files were deleted.");
        console.log("To actually delete these files, run with --confirm flag.");
        return;
      }

      if (preview.totalFiles === 0) {
        console.log("\nNo files to delete.");
        return;
      }

      console.log(
        `\n⚠️ DELETING ${preview.totalFiles} files (${formatSize(
          preview.totalSize
        )}). This action cannot be undone!`
      );
      console.log("\nDeleting...");

      // Second: delete old files
      await cleanup.cleanup(directory, olderThan, true);
    } catch {
      // Error already handled by the event listener
    }
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exitCode = 1;
});
