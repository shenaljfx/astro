var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');

// Remove sections by finding the {condition && ( ... )} pattern
// The structure is:  {condition && (\n  <Animated.View ...>\n  ...\n  </Animated.View>\n)}
function removeJSXBlock(file, conditionText) {
  var idx = file.indexOf(conditionText);
  if (idx === -1) { console.log('  NOT FOUND: ' + conditionText.substring(0, 60)); return file; }
  
  // Go back to find the opening { for this expression
  var searchBack = idx;
  while (searchBack > 0 && file[searchBack] !== '{') searchBack--;
  // Also check for comment line before (like {/* ... */})
  var lineStart = file.lastIndexOf('\n', searchBack) + 1;
  var prevLineEnd = lineStart - 1;
  if (prevLineEnd > 0) {
    var prevLineStart = file.lastIndexOf('\n', prevLineEnd - 1) + 1;
    var prevLine = file.substring(prevLineStart, prevLineEnd).trim();
    if (prevLine.startsWith('{/*') && prevLine.endsWith('*/}')) {
      searchBack = prevLineStart;
    }
  }
  var blockStart = file.lastIndexOf('\n', searchBack);
  if (blockStart === -1) blockStart = 0; else blockStart++; // start of the line
  
  // Now find the matching closing )} by counting braces
  var braceDepth = 0;
  var pos = searchBack;
  var blockEnd = -1;
  while (pos < file.length) {
    var ch = file[pos];
    if (ch === '{') braceDepth++;
    else if (ch === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        blockEnd = pos + 1;
        // Skip trailing newlines
        while (blockEnd < file.length && (file[blockEnd] === '\r' || file[blockEnd] === '\n')) blockEnd++;
        break;
      }
    }
    pos++;
  }
  
  if (blockEnd > blockStart) {
    console.log('  REMOVED: ' + conditionText.substring(0, 60) + ' (lines ' + file.substring(0, blockStart).split('\n').length + '-' + file.substring(0, blockEnd).split('\n').length + ')');
    return file.substring(0, blockStart) + file.substring(blockEnd);
  }
  console.log('  FAILED END: ' + conditionText.substring(0, 60));
  return file;
}

// Remove sections from bottom to top to avoid index shifting
var sections = [
  'data.advancedPorondam?.advanced?.marriagePlanetStrength && (',
  'data.advancedPorondam?.advanced?.mangalaDosha && data.advancedPorondam.advanced.mangalaDosha.severity',
  'data.advancedPorondam?.advanced?.navamshaCompatibility && (',
  'data.advancedPorondam?.advanced?.dashaCompatibility && data.advancedPorondam.advanced.dashaCompatibility.harmony',
  'data.advancedPorondam?.combined && (',
  '(data.brideAdvanced?.tier1?.jaimini?.upapadaLagna || data.groomAdvanced?.tier1?.jaimini?.upapadaLagna) && (',
  '(data.brideAdvanced?.tier1?.advancedYogas?.items?.length > 0 || data.groomAdvanced?.tier1?.advancedYogas?.items?.length > 0) && (',
  '(data.brideAdvanced || data.groomAdvanced) && (',
];

// Sort by position (reverse) to remove from bottom first
sections.sort(function(a, b) {
  return f.indexOf(b) - f.indexOf(a);
});

sections.forEach(function(s) {
  f = removeJSXBlock(f, s);
});

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('\nDone! File size:', f.length);
