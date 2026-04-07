const fs = require('fs');
const path = './mobile/services/i18n.js';

let fileContent = fs.readFileSync(path, 'utf8');

// The broken line is literally:   si: {\n    // Handled external\n  }
// We need to replace it with the real si object
const brokenLine = String.raw`si: {\n    // Handled external\n  }`;

if (!fileContent.includes(brokenLine)) {
  console.log('ERROR: Could not find the broken line.');
  console.log('Looking for:', JSON.stringify(brokenLine));
  // Try to find what's actually there
  const match = fileContent.match(/si:\s*\{[^\n]*\}/);
  if (match) {
    console.log('Found instead:', JSON.stringify(match[0]));
  }
  process.exit(1);
}

const newSi = `si: {
    // Common
    appName: '\u0D9C\u0DCA\u200D\u0DBB\u0DC4\u0DA0\u0DCF\u0DBB \u{1F1F1}\u{1F1F0}',
    tagline: '\u0D94\u0DBA\u0DCF\u0D9C\u0DDA \u0DBD\u0D9F\u0DD2\u0DB1\u0DCA\u0DB8 \u0D89\u0DB1\u0DCA\u0DB1 \u0DA2\u0DCA\u200D\u0DBA\u0DDD\u0DA7\u0DD2\u0DC2 \u0DB8\u0DD2\u0DAD\u0DD4\u0DBB\u0DD2\u0DBA \u{1F451}',
    loading: '\u0DB4\u0DDC\u0DA9\u0DCA\u0DA9\u0D9A\u0DCA \u0D89\u0DB1\u0DCA\u0DB1, \u0DAD\u0DBB\u0DD4 \u0DBB\u0DA7\u0DCF \u0D9A\u0DD2\u0DBA\u0DC0\u0DB8\u0DD2\u0DB1\u0DCA... \u{1F31F}',
    readingStars: '\u0D9A\u0DDA\u0DB1\u0DCA\u0DAF\u0DBB\u0DBA \u0DC3\u0D9A\u0DC3\u0DB8\u0DD2\u0DB1\u0DCA... \u{1F31F}',
    error: '\u0D85\u0DB1\u0DDA! \u0DB4\u0DDC\u0DA9\u0DD2 \u0D9C\u0DD0\u0DA7\u0DC5\u0DD4\u0DC0\u0D9A\u0DCA \u0DC0\u0D9C\u0DDA',
    retry: '\u0DB1\u0DD0\u0DC0\u0DAD \u0D8B\u0DAD\u0DCA\u0DC3\u0DCF\u0DC4 \u0D9A\u0DBB\u0DB8\u0DD4',
    share: '\u0DBA\u0DCF\u0DBD\u0DD4\u0DC0\u0DB1\u0DCA\u0DA7\u0DAD\u0DCA \u0DBA\u0DC0\u0DB8\u0DD4',
    close: '\u0DC0\u0DC3\u0DB1\u0DCA\u0DB1',
    cancel: '\u0D85\u0DC0\u0DBD\u0D82\u0D9C\u0DD4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1',
    confirm: '\u0DAD\u0DC4\u0DC0\u0DD4\u0DBB\u0DD4 \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1',
    today: '\u0D85\u0DAF \u0DAF\u0DC0\u0DC3 \u{1F4C5}',
    selectDate: '\u0DAF\u0DD2\u0DB1\u0DBA \u0DAD\u0DDD\u0DBB\u0DB1\u0DCA\u0DB1',
    selectTime: '\u0DC0\u0DDA\u0DBD\u0DCF\u0DC0 \u0DAD\u0DDD\u0DBB\u0DB1\u0DCA\u0DB1',
    selectedDate: '\u0DAD\u0DDD\u0DBB\u0DCF\u0D9C\u0DAD\u0DCA \u0DAF\u0DD2\u0DB1\u0DBA',
    resetToToday: '\u0D85\u0DAF \u0DAF\u0DD2\u0DB1\u0DBA\u0DA7\u0DB8 \u0DBA\u0DB1\u0DCA\u0DB1 \u{1F519}',
    datePickerTitle: '\u0DAF\u0DD2\u0DB1\u0DBA \u0DC3\u0DC4 \u0DC0\u0DDA\u0DBD\u0DCF\u0DC0 \u0DAD\u0DDD\u0DBB\u0DB1\u0DCA\u0DB1',
    am: '\u0DB4\u0DD9.\u0DC0.',
    pm: '\u0DB4.\u0DC0.',
  }`;

// This approach won't work well for Sinhala unicode. Let me use a different strategy.
console.log('Broken line found. Proceeding with replacement...');

// Actually let's just read in a separate file with the si content
// For now, just fix the syntax by writing a proper placeholder
fileContent = fileContent.replace(brokenLine, 'si: {\n    // PLACEHOLDER\n  }');
fs.writeFileSync(path, fileContent);
console.log('Fixed syntax. Now need to apply full si content.');
