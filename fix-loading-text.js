var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');

// Fix kicker text
f = f.replace("'Porondam Reading'", "'Love Compatibility'");

// Fix loading title
f = f.replace("'Preparing Compatibility'", "'Reading Your Stars'");

// Fix progress label
f = f.replace("'Calculating'", "'Analysing'");

// Fix progress hint
f = f.replace("'This can take a few moments'", "'Good things take a moment'");

fs.writeFileSync('mobile/app/(tabs)/porondam.js', f);
console.log('Done - loading screen text updated');
