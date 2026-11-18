# File Organizer CLI

File Organizer CLI is a command-line application built with Node.js for analyzing files, finding duplicates, organizing files by category, and cleaning up old files.

The application supports four commands:

- `scan` — analyze files in a directory.
- `duplicates` — find duplicate files.
- `organize` — copy files into folders by category.
- `cleanup` — find and optionally delete old files.

## Technologies

- Node.js
- JavaScript (ES Modules)
- Commander.js
- Node.js File System API
- EventEmitter
- Crypto (SHA-256)
- Streams

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/JuliiaV91/file-organizer-CLI-task1.git
cd file-organizer-CLI-task1
```

### 2. Install dependencies

Make sure Node.js and npm are installed.

Run:

```bash
npm install
```

### 3. Run the application

To display all available commands:

```bash
node file-organizer.js --help
```

You can also use:

```bash
npm start -- --help
```

## NPM Scripts

The project provides npm scripts for all four commands.

| Command           | Example                                                    |
| ----------------- | ---------------------------------------------------------- |
| Scan              | `npm run scan -- ./test-data`                              |
| Duplicates        | `npm run duplicates -- ./test-data`                        |
| Organize          | `npm run organize -- ./test-data -o ./organized`           |
| Cleanup (dry run) | `npm run cleanup -- ./organized --older-than 90`           |
| Cleanup (delete)  | `npm run cleanup -- ./organized --older-than 90 --confirm` |

The `--` separator passes the following arguments directly to the Node.js script.

For example:

```bash
npm run scan -- ./test-data
```

is equivalent to:

```bash
node file-organizer.js scan ./test-data
```

## Commands

### 1. Scan

The `scan` command recursively scans a directory and collects file statistics.

It displays:

- Total number of files.
- Total file size.
- Number and size of files grouped by extension.
- File age statistics.
- Three largest files.
- Oldest file.
- Progress bar.

**Usage:**

```bash
node file-organizer.js scan <directory>
```

**Example:**

```bash
node file-organizer.js scan ./test-data
```

Or using npm:

```bash
npm run scan -- ./test-data
```

**Arguments:**

- `<directory>` — path to the directory to scan.

**Example output:**

```text
📂 Scanning: ./test-data
████████████████████ 4/4

📊 Scan Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total files: 4
Total size: 1.25 KB

By File Type:
  .txt    3 files    1.20 KB
  .png    1 files    0.05 KB

File Age:
  Last 7 days: 4 files
  Last 30 days: 4 files
  Older than 90: 0 files

Largest Files:
  ./test-data/text.txt — 1.00 KB
  ./test-data/copytext.txt — 0.20 KB
  ./test-data/foto.png — 0.05 KB

Oldest File:
  ./test-data/text.txt
  Modified: 11/10/2026

✅ Scan completed! Found 4 files.
```

The actual output depends on the files in the directory.

### 2. Duplicates

The `duplicates` command finds files with identical content using SHA-256 hashes.

Files are considered duplicates when their hashes match, even if their names are different.

The command displays:

- Duplicate groups.
- File paths.
- SHA-256 hashes.
- Number of copies.
- Wasted disk space.
- Progress bar.

**Usage:**

```bash
node file-organizer.js duplicates <directory>
```

**Example:**

```bash
node file-organizer.js duplicates ./test-data
```

Or using npm:

```bash
npm run duplicates -- ./test-data
```

**Arguments:**

- `<directory>` — path to the directory where duplicates will be searched.

**Example output:**

```text
🔍 Searching for duplicates in: ./test-data
Calculating hashes...
████████████████████ 4/4 files

Found 1 duplicate groups (15.00 B wasted):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Group 1 (2 copies, 15.00 B each):
  SHA-256: <calculated-hash>

  📄 /path/to/test-data/text.txt
  📄 /path/to/test-data/copytext.txt

  Wasted space: 15.00 B

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Total wasted space: 15.00 B
```

This command only finds duplicates. It does not delete files.

### 3. Organize

The `organize` command copies files into separate folders based on their extensions.

Supported categories:

| Category  | File extensions                            |
| --------- | ------------------------------------------ |
| Documents | .pdf, .docx, .doc, .txt, .md, .xlsx, .pptx |
| Images    | .png, .jpg, .jpeg, .gif, .svg, .webp, .bmp |
| Archives  | .zip, .rar, .tar, .gz, .7z                 |
| Code      | .js, .py, .java, .cpp, .html, .css, .json  |
| Videos    | .mp4, .avi, .mkv, .mov, .webm              |
| Other     | All other extensions                       |

**Usage:**

```bash
node file-organizer.js organize <directory> --output <directory>
```

**Example:**

```bash
node file-organizer.js organize ./test-data --output ./organized
```

You can also use the short option:

```bash
node file-organizer.js organize ./test-data -o ./organized
```

Or using npm:

```bash
npm run organize -- ./test-data -o ./organized
```

**Arguments and options:**

- `<directory>` — source directory containing files.
- `-o, --output <directory>` — required output directory.

**Example output:**

```text
📦 Organizing: ./test-data
Target: ./organized

Creating folders...
Copying files...
████████████████████ 4/4

✅ Organization complete!

Summary:
  Documents: 3 files → ./organized/Documents/
  Images: 1 files → ./organized/Images/
  Archives: 0 files → ./organized/Archives/
  Code: 0 files → ./organized/Code/
  Videos: 0 files → ./organized/Videos/
  Other: 0 files → ./organized/Other/

Total copied: 4 files (1.25 KB)
```

**Important:**

- Original files are not deleted or moved.
- Files are copied to the output directory.
- If a file with the same name already exists, a number is added to the new filename.
- Large files are copied using streams.

### 4. Cleanup

The `cleanup` command finds files older than a specified number of days.

File age is calculated using the last modification date (`mtime`).

The command supports two modes:

- **Dry run** — display old files without deleting them.
- **Confirm** — delete matching files.

#### Dry run mode

By default, the command does not delete any files.

**Usage:**

```bash
node file-organizer.js cleanup <directory> --older-than <days>
```

**Example:**

```bash
node file-organizer.js cleanup ./organized --older-than 90
```

Or using npm:

```bash
npm run cleanup -- ./organized --older-than 90
```

This command finds files modified more than 90 days ago.

**Example output:**

```text
🧹 Cleanup: ./organized
Looking for files older than 90 days...

Found 2 files to delete:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

old-report.txt
  Path: organized/Documents/old-report.txt
  Size: 2.00 KB
  Modified: 120 days ago (2025-01-01)

old-image.png
  Path: organized/Images/old-image.png
  Size: 5.00 KB
  Modified: 150 days ago (2024-12-02)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 2 files (7.00 KB)

⚠️ DRY RUN MODE: No files were deleted.
To actually delete these files, run with --confirm flag.
```

#### Confirm mode

To delete old files, add the `--confirm` option.

**Example:**

```bash
node file-organizer.js cleanup ./organized --older-than 90 --confirm
```

Or using npm:

```bash
npm run cleanup -- ./organized --older-than 90 --confirm
```

**Example output:**

```text
⚠️ DELETING 2 files (7.00 KB). This action cannot be undone!

Deleting...
████████████████████ 2/2

✅ Cleanup complete!
Deleted: 2 files (7.00 KB freed)
```

**Arguments and options:**

- `<directory>` — directory to clean.
- `--older-than <days>` — required number of days.
- `--confirm` — optional flag that enables file deletion.

**Warning:** Deleted files are not moved to the trash. This action cannot be undone.

Always run the command without `--confirm` first to review the list of files.

## Project Structure

```text
file-organizer-CLI-task1/
├── lib/
│   ├── scanner.js
│   ├── duplicates.js
│   ├── organizer.js
│   ├── cleanup.js
│   └── utils.js
├── .gitignore
├── file-organizer.js
├── package.json
├── package-lock.json
└── README.md
```

### File descriptions

**file-organizer.js**

Main entry point of the application. Uses Commander.js to parse command-line arguments and display results.

**lib/scanner.js**

Contains the `Scanner` class. Recursively scans files and collects statistics.

**lib/duplicates.js**

Contains the `DuplicateFinder` class. Calculates SHA-256 hashes and identifies duplicate files.

**lib/organizer.js**

Contains the `Organizer` class. Copies files into category folders and handles filename conflicts.

**lib/cleanup.js**

Contains the `Cleanup` class. Finds old files and optionally deletes them.

**lib/utils.js**

Contains shared helper functions:

- `formatSize()` — formats file sizes.
- `drawProgressBar()` — creates a progress bar.
- `getAllFiles()` — recursively collects file paths.
- `getFileAge()` — calculates file age in days.
- `handleError()` — handles filesystem errors.

## EventEmitter

Each main class extends `EventEmitter` to report progress and operation results.

| Class           | Events                                     |
| --------------- | ------------------------------------------ |
| Scanner         | scan-start, file-found, scan-complete      |
| DuplicateFinder | file-processed, duplicates-found           |
| Organizer       | copy-start, copy-complete, copy-error      |
| Cleanup         | file-found, file-deleted, cleanup-complete |

Events allow the CLI to display progress bars and results separately from the file-processing logic.

## Error Handling

The application handles common filesystem errors, including:

- `ENOENT` — file or directory does not exist.
- `EACCES` — permission denied.
- `EPERM` — operation not permitted.

When an error occurs, the application displays an error message and sets the process exit code to `1`.

## Help

To display general help:

```bash
node file-organizer.js --help
```

To display help for a specific command:

```bash
node file-organizer.js scan --help
node file-organizer.js duplicates --help
node file-organizer.js organize --help
node file-organizer.js cleanup --help
```
