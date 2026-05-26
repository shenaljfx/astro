var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');
var lines = f.split(/\r?\n/);

// Sections to remove (by line number of their condition line, 1-indexed)
// Each section starts at the line with the { before the condition,
// and ends at the matching )} at the same indent level
var sectionStarts = [2288, 2239, 2201, 2161, 2124, 2087, 2038, 1951]; // sorted descending

function findSectionRange(lines, condLine) {
  // condLine is 1-indexed. The { is on the previous line or same line.
  // Actually looking at the structure: `            {condition && (` — the { is on the same line
  var startLine = condLine - 1; // 0-indexed
  
  // Check for comment line above
  if (startLine > 0) {
    var prevLine = lines[startLine - 1].trim();
    if (prevLine.startsWith('{/*') && prevLine.endsWith('*/}')) {
      startLine--;
    }
  }
  // Check for blank line above too
  if (startLine > 0 && lines[startLine - 1].trim() === '') {
    startLine--;
  }
  
  // Find indent level of the condition line
  var indent = lines[condLine - 1].match(/^(\s*)/)[1].length;
  
  // Find the closing `)}` at same indent
  var endLine = -1;
  for (var i = condLine; i < lines.length; i++) { // start searching after condition line
    var trimmed = lines[i].trim();
    var lineIndent = lines[i].match(/^(\s*)/)[1].length;
    if (trimmed === ')}' && lineIndent === indent) {
      endLine = i;
      break;
    }
  }
  
  if (endLine === -1) {
    console.log('  CANNOT FIND END for line ' + condLine + ': ' + lines[condLine - 1].trim().substring(0, 60));
    return null;
  }
  
  // Skip trailing blank line
  if (endLine + 1 < lines.length && lines[endLine + 1].trim() === '') {
    endLine++;
  }
  
  return { start: startLine, end: endLine }; // 0-indexed, inclusive
}

// Remove from bottom to top
sectionStarts.forEach(function(lineNum) {
  var range = findSectionRange(lines, lineNum);
  if (range) {
    var removed = range.end - range.start + 1;
    console.log('  Removing lines ' + (range.start + 1) + '-' + (range.end + 1) + ' (' + removed + ' lines): ' + lines[lineNum - 1].trim().substring(0, 60));
    lines.splice(range.start, removed);
  }
});

var result = lines.join('\r\n');
fs.writeFileSync('mobile/app/(tabs)/porondam.js', result);
console.log('\nDone! Lines:', lines.length);
