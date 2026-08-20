#!/usr/bin/env node
// Simple SEB config generator
// Usage: node tools/generate-seb.js --url "http://127.0.0.1:5174/exam/EXAM_ID" --output exam-EXAM_ID.seb

const fs = require('fs');
const path = require('path');

const argv = require('minimist')(process.argv.slice(2));
const url = argv.url || argv.u;
const output = argv.output || argv.o || `exam.seb`;

if (!url) {
  console.error('Usage: generate-seb.js --url <start_url> [--output <file.seb>]');
  process.exit(2);
}

// Minimal SEB plist example. For production, generate signed/encrypted SEB configs.
const sebTemplate = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>org_safeexambrowser_SEB_startURL</key>\n  <string>${url}</string>\n  <key>org_safeexambrowser_SEB_kiosk</key>\n  <true/>\n  <key>org_safeexambrowser_SEB_allowQuitKeys</key>\n  <false/>\n  <key>org_safeexambrowser_SEB_disableTaskSwitching</key>\n  <true/>\n  <key>org_safeexambrowser_SEB_blockSmartCopyPaste</key>\n  <true/>\n  <key>org_safeexambrowser_SEB_browserWindowType</key>\n  <string>browserWindowTypeFullscreen</string>\n</dict>\n</plist>`;

const outPath = path.resolve(process.cwd(), output);
fs.writeFileSync(outPath, sebTemplate, 'utf8');
console.log('Generated SEB config at', outPath);
