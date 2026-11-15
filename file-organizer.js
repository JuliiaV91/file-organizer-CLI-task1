import { Command } from "commander";
import { Scanner } from "./lib/scanner.js";
import { formatSize, drawProgressBar } from "./lib/utils.js";

const program = new Command();

program
  .name("file-organizer")
  .description("CLI tool for analyzing and organizing files")
  .version("1.0.0");

program
  .command("scan")
  .description("Scan a directory and collect file statistics")
  .argument("<directory>", "Directory to scan")
  .action(async (directory) => {
    const scanner = new Scanner();

    // Event: scanning started
    scanner.on("scan-start", (data) => {
      console.log(`📂 Scanning: ${data.directory}`);
    });

    // Event: file found

    scanner.on("file-found", (file) => {
      process.stdout.write(`\r${drawProgressBar(file.current, file.total)}`);
    });

    // Event: scanning completed
    scanner.on("scan-complete", (statistics) => {
      console.log("\n\n📊 Scan Results:");
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

      // Display largest files
      console.log("\nLargest Files:");

      for (const file of statistics.largestFiles) {
        console.log(`  ${file.path} — ${formatSize(file.size)}`);
      }

      // Display oldest file
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

    // Event: scanning error
    scanner.on("error", (error) => {
      if (error.code === "ENOENT") {
        console.error(
          `\n❌ Error: Directory or file not found: ${error.path ?? directory}`
        );
      } else if (error.code === "EACCES" || error.code === "EPERM") {
        console.error(
          `\n❌ Error: Permission denied: ${error.path ?? directory}`
        );
      } else {
        console.error(`\n❌ Unexpected error: ${error.message}`);
      }

      process.exitCode = 1;
    });

    await scanner.scan(directory);
  });

program.parseAsync(process.argv).catch((error) => {
  process.exitCode = 1;
});
