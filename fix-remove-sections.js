var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');

function removeSection(file, marker) {
  var mIdx = file.indexOf(marker);
  if (mIdx === -1) { console.log('  NOT FOUND: ' + marker.substring(0, 60)); return file; }
  
  // Look back up to 600 chars for <Animated.View
  var lookback = 600;
  var startSearch = Math.max(0, mIdx - lookback);
  var before = file.substring(startSearch, mIdx);
  var animPos = before.lastIndexOf('<Animated.View');
  if (animPos === -1) { 
    // Maybe it's wrapped in {/* comment */}\n{expr && ( — try finding the { before the marker
    // Try a more direct approach: find the indented start line
    var lineStart = file.lastIndexOf('\n', mIdx);
    // Go back to the blank line before this section 
    var prev2 = file.lastIndexOf('\n\n', mIdx);
    var prev2r = file.lastIndexOf('\r\n\r\n', mIdx);
    var prevBlank = Math.max(prev2, prev2r);
    if (prevBlank > startSearch) {
      // Check if there's <Animated.View between prevBlank and mIdx
      var chunk = file.substring(prevBlank, mIdx);
      animPos = chunk.lastIndexOf('<Animated.View');
      if (animPos !== -1) {
        startSearch = prevBlank;
        // realStart = prevBlank + animPos; -- need to recalculate
      }
    }
    if (animPos === -1) {
      console.log('  NO ANIMATED.VIEW: ' + marker.substring(0, 60)); 
      return file; 
    }
  }
  var realStart = startSearch + animPos;
  
  // Count nested Animated.View
  var depth = 0;
  var pos = realStart;
  var sectionEnd = -1;
  while (pos < file.length) {
    if (file.substring(pos, pos + 15) === '<Animated.View') { depth++; pos += 15; }
    else if (file.substring(pos, pos + 16) === '</Animated.View>') {
      depth--;
      if (depth === 0) {
        // Find the line with )} after this close
        var afterTag = pos + 16;
        // Look for )}\n pattern
        var nextNewline = file.indexOf('\n', afterTag);
        // Check if next lines have )}
        var afterLines = file.substring(afterTag, afterTag + 50);
        var closeParen = afterLines.indexOf(')}');
        if (closeParen !== -1) {
          sectionEnd = afterTag + closeParen + 2;
          // Skip trailing newline
          if (file[sectionEnd] === '\r') sectionEnd++;
          if (file[sectionEnd] === '\n') sectionEnd++;
        } else {
          sectionEnd = nextNewline + 1;
        }
        break;
      }
      pos += 16;
    }
    else { pos++; }
  }
  
  if (sectionEnd > realStart) {
    // Also remove blank line before
    if (file[realStart - 1] === '\n' && (file[realStart - 2] === '\n' || file[realStart - 2] === '\r')) {
      realStart--;
      if (file[realStart - 1] === '\r') realStart--;
    }
    console.log('  REMOVED: ' + marker.substring(0, 60) + ' (' + (sectionEnd - realStart) + ' chars)');
    return file.substring(0, realStart) + file.substring(sectionEnd);
  }
  console.log('  COULD NOT FIND END: ' + marker.substring(0, 60));
  return file;
}

// Remove combined score
f = removeSection(f, '{data.advancedPorondam?.combined && (');

// Remove advanced sub-sections
f = removeSection(f, 'data.advancedPorondam?.advanced?.dashaCompatibility && data.advancedPorondam.advanced.dashaCompatibility.harmony');
f = removeSection(f, 'data.advancedPorondam?.advanced?.navamshaCompatibility && (');
f = removeSection(f, 'data.advancedPorondam?.advanced?.mangalaDosha && data.advancedPorondam.advanced.mangalaDosha.severity');
f = removeSection(f, 'data.advancedPorondam?.advanced?.marriagePlanetStrength && (');

// Remove advanced challenge review and yoga comparison
f = removeSection(f, '(data.brideAdvanced || data.groomAdvanced) && (');
f = removeSection(f, '(data.brideAdvanced?.tier1?.advancedYogas?.items?.length > 0 || data.groomAdvanced?.tier1?.advancedYogas?.items?.length > 0) && (');
f = removeSection(f, '(data.brideAdvanced?.tier1?.jaimini?.upapadaLagna || data.groomAdvanced?.tier1?.jaimini?.upapadaLagna) && (');

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('\nDone! File size:', f.length);
