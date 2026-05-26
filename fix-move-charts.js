var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');
var lines = f.split('\r\n');

// Chart block: lines 1876 (blank) through 1924 (</View>})
// That's 0-indexed 1875 to 1923 inclusive (49 lines)
var chartBlock = lines.splice(1875, 49);

// After splice, wedding )} is now at a different position. 
// Find it: look for the line with just `            )}` after weddingTitle
var insertIdx = -1;
for (var i = 1875; i < lines.length; i++) {
  if (lines[i].includes('FadeInUp.delay(1300)')) {
    insertIdx = i;
    break;
  }
}
if (insertIdx === -1) { console.log('ERROR: cannot find report section'); process.exit(1); }

// Insert chart block before report
for (var i = 0; i < chartBlock.length; i++) {
  lines.splice(insertIdx + i, 0, chartBlock[i]);
}

fs.writeFileSync('mobile/app/(tabs)/porondam.js', lines.join('\r\n'));
console.log('Done. Charts moved to line', insertIdx + 1, '. Total:', lines.length);
