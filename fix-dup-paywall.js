var fs = require('fs');
var f = fs.readFileSync('mobile/components/PaywallScreen.js', 'utf8');
var lines = f.split('\n');

// Find and remove the duplicate block (lines with orphan desc + duplicate features after `],`)
// The good block ends at line with `      ],` then immediately there's a duplicate orphan `desc:` line
// Let me find the pattern: `      ],` followed by `          desc:`
for (var i = 0; i < lines.length - 1; i++) {
  if (lines[i].trim() === '],' && lines[i+1].trim().startsWith("desc: '")) {
    // Found the orphan block - remove lines until next `],`
    var endIdx = i + 1;
    while (endIdx < lines.length && !(lines[endIdx].trim() === '],')) {
      endIdx++;
    }
    // Include the ending `],` 
    endIdx++;
    console.log('Found duplicate block at lines ' + (i+2) + '-' + (endIdx) + ', removing ' + (endIdx - i - 1) + ' lines');
    lines.splice(i + 1, endIdx - i - 1);
    break;
  }
}

fs.writeFileSync('mobile/components/PaywallScreen.js', lines.join('\n'));
console.log('Fixed duplicate block.');
