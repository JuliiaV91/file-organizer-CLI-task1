import { Command } from "commander";
import { Scanner } from "../lib/Scanner.js";

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
    console.log(`📂 Scanning: ${directory}`);

    const scanner = new Scanner();

    await scanner.scan(directory);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error("CLI error:", error.message);
  process.exitCode = 1;
});
