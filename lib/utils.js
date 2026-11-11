export function formatSize(bytes) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1
  );

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}
