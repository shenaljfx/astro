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
    console.log('=== KEYS ===');
    console.log(Object.keys(j).join(', '));
    
    console.log('\n=== LAGNA ===');
    console.log(j.lagna.english, '(' + j.lagna.name + ')', 'Lord:', j.lagna.lord, 'Deg:', j.lagna.degree.toFixed(2));
    
    console.log('\n=== NAKSHATRA ===');
    console.log(j.nakshatra.name, 'Pada', j.nakshatra.pada, 'Lord:', j.nakshatra.lord);
    
    console.log('\n=== MOON SIGN ===');
    console.log(j.moonSign.english, '(' + j.moonSign.name + ')', 'Lord:', j.moonSign.lord);
    
    console.log('\n=== SUN SIGN ===');
    console.log(j.sunSign.english, '(' + j.sunSign.name + ')', 'Lord:', j.sunSign.lord);
    
    console.log('\n=== RASHI CHART (Planets in Houses) ===');
    if (j.rashiChart) {
      Object.entries(j.rashiChart).forEach(function(e) {
        if (e[1] && e[1].length > 0) console.log('  Rashi ' + e[0] + ':', e[1].join(', '));
      });
    }
    
    console.log('\n=== HOUSE CHART ===');
    if (j.houseChart && j.houseChart.houses) {
      j.houseChart.houses.forEach(function(h) {
        if (h.planets && h.planets.length > 0) {
          console.log('  House ' + h.house + ' (' + h.sign + '):', h.planets.map(function(p) {
            return p.name + ' ' + p.degree.toFixed(1) + 'deg' + (p.isRetrograde ? '(R)' : '');
          }).join(', '));
        }
      });
    }
    
    console.log('\n=== YOGAS ===');
    if (j.yogas) {
      j.yogas.slice(0, 15).forEach(function(y) {
        console.log('  ' + y.name + ' (' + y.category + ') - ' + y.strength);
      });
      if (j.yogas.length > 15) console.log('  ... and ' + (j.yogas.length - 15) + ' more yogas');
    }

    console.log('\n=== DASHA (Vimshottari) ===');
    if (j.vimshottari) {
      console.log('  Current Maha Dasha:', j.vimshottari.currentMahaDasha);
      if (j.vimshottari.dashas) {
        j.vimshottari.dashas.slice(0, 8).forEach(function(d) {
          console.log('  ', d.planet, ':', d.start, 'to', d.end);
        });
      }
    }

    console.log('\n=== ADVANCED (if available) ===');
    if (j.advanced) {
      console.log('  Keys:', Object.keys(j.advanced).join(', '));
    }
  });
});
r.write(d);
r.end();
