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
    
    console.log('=== FULL CHART DATA ===\n');
    console.log('LAGNA:', j.lagna.english, '(' + j.lagna.name + ')', 'Lord:', j.lagna.lord, 'Deg:', j.lagna.degree.toFixed(2));
    console.log('NAKSHATRA:', j.nakshatra.name, 'Pada', j.nakshatra.pada, 'Lord:', j.nakshatra.lord);
    console.log('MOON:', j.moonSign.english, j.moonSign.degree.toFixed(2) + ' deg');
    console.log('SUN:', j.sunSign.english, j.sunSign.degree.toFixed(2) + ' deg');
    
    // Planets
    console.log('\n=== PLANETS ===');
    if (j.planets) {
      console.log(JSON.stringify(j.planets, null, 2).substring(0, 3000));
    }
    
    // Rashi chart
    console.log('\n=== RASHI CHART ===');
    console.log(JSON.stringify(j.rashiChart, null, 2).substring(0, 2000));
    
    // House chart
    console.log('\n=== HOUSE CHART ===');
    console.log(JSON.stringify(j.houseChart, null, 2).substring(0, 3000));
    
    // Report / personality
    console.log('\n=== PERSONALITY ===');
    if (j.personality) console.log(JSON.stringify(j.personality, null, 2).substring(0, 1000));
    
    console.log('\n=== REPORT (career/marriage/children/siblings) ===');
    if (j.report) {
      var rk = Object.keys(j.report);
      console.log('Report keys:', rk.join(', '));
      // Print relevant sections
      ['career', 'marriage', 'children', 'siblings', 'health', 'family'].forEach(function(k) {
        if (j.report[k]) console.log('\n[' + k + ']:', JSON.stringify(j.report[k]).substring(0, 500));
      });
    }
    
    // Dasa
    console.log('\n=== DASA PERIODS ===');
    if (j.dasaPeriods) console.log(JSON.stringify(j.dasaPeriods, null, 2).substring(0, 2000));
    
    // Yogas
    console.log('\n=== YOGAS ===');
    if (j.yogas) console.log(JSON.stringify(j.yogas, null, 2).substring(0, 2000));
    
    // Advanced
    console.log('\n=== ADVANCED ===');
    if (j.advancedAnalysis) {
      console.log('Advanced keys:', Object.keys(j.advancedAnalysis).join(', '));
      console.log(JSON.stringify(j.advancedAnalysis, null, 2).substring(0, 3000));
    }
    
    // Gender prediction
    console.log('\n=== GENDER PREDICTION ===');
    if (j.genderPrediction) console.log(JSON.stringify(j.genderPrediction, null, 2));
  });
});
r.write(d);
r.end();
