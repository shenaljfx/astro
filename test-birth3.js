var http = require('http');
var d = JSON.stringify({
  birthDate: '1961-09-25T07:20:00',
  lat: 6.9271,
  lng: 79.8612,
  language: 'en'
});
var o = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/horoscope/birth-chart',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) }
};

var r = http.request(o, function(s) {
  var b = '';
  s.on('data', function(c) { b += c; });
  s.on('end', function() {
    var j = JSON.parse(b).data;
    
    // Print the full report
    console.log('=== REPORT SECTIONS ===');
    if (j.report) {
      Object.entries(j.report).forEach(function(e) {
        console.log('\n--- ' + e[0].toUpperCase() + ' ---');
        console.log(e[1]);
      });
    }
    
    // Print advanced tier2 and tier3
    console.log('\n=== ADVANCED TIER2 ===');
    if (j.advancedAnalysis && j.advancedAnalysis.tier2) {
      console.log(JSON.stringify(j.advancedAnalysis.tier2, null, 2).substring(0, 3000));
    }
    
    console.log('\n=== ADVANCED TIER3 ===');
    if (j.advancedAnalysis && j.advancedAnalysis.tier3) {
      console.log(JSON.stringify(j.advancedAnalysis.tier3, null, 2).substring(0, 3000));
    }
    
    // Print lagnaDetails
    console.log('\n=== LAGNA DETAILS ===');
    if (j.lagnaDetails) {
      console.log(JSON.stringify(j.lagnaDetails, null, 2).substring(0, 2000));
    }
  });
});
r.write(d);
r.end();
