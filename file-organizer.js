import { Command } from "commander";
import { Scanner } from "./lib/scanner.js";
import { DuplicateFinder } from "./lib/duplicates.js";

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

program.parseAsync(process.argv).catch((error) => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exitCode = 1;
});
