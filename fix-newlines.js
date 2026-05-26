var fs = require('fs');
var f = fs.readFileSync('mobile/app/(tabs)/porondam.js', 'utf8');
// Replace literal \r\n (4 chars: \ r \ n) with actual CRLF
var result = '';
var i = 0;
while (i < f.length) {
  if (f[i] === '\\' && f[i+1] === 'r' && f[i+2] === '\\' && f[i+3] === 'n') {
    result += '\r\n';
    i += 4;
  } else {
    result += f[i];
    i++;
  }
}
fs.writeFileSync('mobile/app/(tabs)/porondam.js', result);
console.log('Fixed. Lines:', result.split('\n').length);
