const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Block server-only packages from Metro bundling & watching.
// pdf-parse → pdfjs-dist creates a temp directory during postinstall that
// may not exist by the time Metro's FallbackWatcher calls fs.watch on it,
// causing an ENOENT crash. Blocking these paths prevents that entirely.
config.resolver.blockList = [
  new RegExp(
    path.join(__dirname, "../..", "node_modules/.pnpm/pdfjs-dist[^/]*/.*").replace(/\\/g, "\\\\").replace(/\./g, "\\."),
  ),
  new RegExp(
    path.join(__dirname, "../..", "node_modules/.pnpm/@napi-rs[^/]*/.*").replace(/\\/g, "\\\\").replace(/\./g, "\\."),
  ),
  /.*\/pdfjs-dist\/.*/,
  /.*\/@napi-rs\/.*/,
];

module.exports = config;
