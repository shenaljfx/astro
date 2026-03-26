/* ═══════════════════════════════════════════════════════════════════════
   Cosmos 3D v5 — Three.js WebGL Scene
   No sun. Planets distributed across full page and move with scroll.
   Viewport-scaled positions, orbital motion, shooting stars.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var tc = document.createElement('canvas');
  var gl = tc.getContext('webgl') || tc.getContext('experimental-webgl');
  if (!gl) return;

  var THREE;
  var scene, camera, renderer, clock;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var scrollY = 0, scrollMax = 1;
  var bodies = [];
  var shootingStars = [];
  var starField, starFieldFar, milkyWay;
  var auroraMeshes = [];
  var pricingNebulaGroup = null;
  var nebulaStarBirths = [];   // star-birth particle system
  var cosmicDust = null;       // Cosmic Dust System
  var cosmicCloudPlanes = [];  // Full-page drifting cloud planes
  var cosmicEyes = null;       // Cosmic Eyes Group
  var lightningBolts = [];     // Thunder bolts
  var isMobile = window.innerWidth < 768;
  var BG = 0x04030C;
  var pageHeight = 1; // total scrollable height in pixels

  // Cosmic Storm (Thunder Clouds) — Kendara chart section
  var stormGroup = null;       // THREE.Group for the storm
  var stormClouds = null;      // cloud shader mesh
  var stormBolts = [];         // lightning bolt line geometries
  var stormSection = 0.56;     // scroll section — set in createCosmicStorm

  // Viewport scale factor — everything scales to actual screen size
  var vw, vh, vs;
  function calcViewScale() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    vs = Math.min(vw, vh) / 900; // 1.0 at 900px, smaller on mobile
    if (vs < 0.35) vs = 0.35;
    if (vs > 1.5) vs = 1.5;
  }
  calcViewScale();

  // Camera scroll rate — how many 3D Y units per scroll pixel
  // We'll compute this dynamically so planets always fill the page
  var CAM_SCROLL_RATE = 0.12;

  /* ── Procedural helpers ─────────────────────────────────────────── */
  function makeCanvas(size) {
    var c = document.createElement('canvas');
    c.width = c.height = size || 2;
    return { canvas: c, ctx: c.getContext('2d') };
  }

  function noise2D(x, y) {
    var n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function fbm(x, y, oct) {
    var v = 0, a = 0.5, f = 1;
    for (var i = 0; i < oct; i++) { v += a * noise2D(x * f, y * f); a *= 0.5; f *= 2.1; }
    return v;
  }

  /* ── Moon Texture ───────────────────────────────────────────────── */
  function makeMoonTex() {
    var s = 512, d = makeCanvas(s), ctx = d.ctx;
    ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, s, s);
    var img = ctx.getImageData(0, 0, s, s);
    for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
      var nx = x / s * 8, ny = y / s * 8;
      var v = fbm(nx, ny, 6), base = 110 + v * 70;
      var maria = fbm(nx * 0.5 + 10, ny * 0.5, 3);
      if (maria > 0.55) base *= 0.7;
      var ii = (y * s + x) * 4;
      img.data[ii] = img.data[ii + 1] = img.data[ii + 2] = Math.min(255, base);
      img.data[ii + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    for (var c = 0; c < 50; c++) {
      var ccx = Math.random() * s, ccy = Math.random() * s, cr = 3 + Math.random() * 16;
      ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(60,60,60,' + (0.15 + Math.random() * 0.2) + ')'; ctx.fill();
    }
    return new THREE.CanvasTexture(d.canvas);
  }

  /* ── Saturn Texture ─────────────────────────────────────────────── */
  function makeSaturnTex() {
    var s = 512, d = makeCanvas(s), ctx = d.ctx;
    var img = ctx.createImageData(s, s);
    var bands = [
      [210,180,110],[190,160,100],[220,195,130],[180,150,90],
      [230,200,140],[195,165,105],[215,185,120],[185,155,95],
    ];
    for (var y = 0; y < s; y++) {
      var bi = Math.floor((y / s) * bands.length);
      var b1 = bands[bi % bands.length], b2 = bands[(bi + 1) % bands.length];
      var fr = ((y / s) * bands.length) % 1;
      for (var x = 0; x < s; x++) {
        var tb = fbm(x / s * 10, y / s * 2, 4) * 25 - 12;
        var ii = (y * s + x) * 4;
        img.data[ii]   = Math.min(255, Math.max(0, b1[0]*(1-fr)+b2[0]*fr+tb));
        img.data[ii+1] = Math.min(255, Math.max(0, b1[1]*(1-fr)+b2[1]*fr+tb*0.8));
        img.data[ii+2] = Math.min(255, Math.max(0, b1[2]*(1-fr)+b2[2]*fr+tb*0.5));
        img.data[ii+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(d.canvas);
  }

  /* ── Jupiter Texture ────────────────────────────────────────────── */
  function makeJupiterTex() {
    var s = 512, d = makeCanvas(s), ctx = d.ctx;
    var img = ctx.createImageData(s, s);
    var bands = [
      [200,170,130],[180,140,100],[220,190,150],[160,120,85],
      [210,175,135],[170,130,95],[230,200,160],[150,115,80],
    ];
    for (var y = 0; y < s; y++) {
      var bi = Math.floor((y / s) * bands.length);
      var b1 = bands[bi % bands.length], b2 = bands[(bi + 1) % bands.length];
      var fr = ((y / s) * bands.length) % 1;
      for (var x = 0; x < s; x++) {
        var tb = fbm(x / s * 12, y / s * 3, 5) * 30 - 15;
        var ii = (y * s + x) * 4;
        img.data[ii]   = Math.min(255, Math.max(0, b1[0]*(1-fr)+b2[0]*fr+tb));
        img.data[ii+1] = Math.min(255, Math.max(0, b1[1]*(1-fr)+b2[1]*fr+tb*0.7));
        img.data[ii+2] = Math.min(255, Math.max(0, b1[2]*(1-fr)+b2[2]*fr+tb*0.4));
        img.data[ii+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // Great Red Spot
    ctx.beginPath();
    ctx.ellipse(s * 0.65, s * 0.55, 22, 12, 0.1, 0, Math.PI * 2);
    var grd = ctx.createRadialGradient(s*0.65, s*0.55, 0, s*0.65, s*0.55, 22);
    grd.addColorStop(0, 'rgba(190,80,50,0.8)');
    grd.addColorStop(1, 'rgba(170,100,70,0)');
    ctx.fillStyle = grd; ctx.fill();
    return new THREE.CanvasTexture(d.canvas);
  }

  /* ── Mars Texture ───────────────────────────────────────────────── */
  function makeMarsTex() {
    var s = 512, d = makeCanvas(s), ctx = d.ctx;
    var img = ctx.createImageData(s, s);
    for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
      var nx = x/s*8, ny = y/s*8;
      var v = fbm(nx, ny, 5), dk = fbm(nx*0.7+5, ny*0.7+3, 3);
      var r = 160+v*60, g = 70+v*40, b = 30+v*25;
      if (dk > 0.52) { r *= 0.65; g *= 0.6; b *= 0.7; }
      var lat = Math.abs(y/s - 0.5)*2;
      if (lat > 0.85) { r = r*0.6+100; g = g*0.6+100; b = b*0.6+100; }
      var ii = (y*s+x)*4;
      img.data[ii]=Math.min(255,r); img.data[ii+1]=Math.min(255,g);
      img.data[ii+2]=Math.min(255,b); img.data[ii+3]=255;
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(d.canvas);
  }

  /* ── Ring Texture ───────────────────────────────────────────────── */
  function makeRingTex() {
    var w = 1024, h = 64, d = makeCanvas(2);
    d.canvas.width = w; d.canvas.height = h;
    d.ctx = d.canvas.getContext('2d');
    var ctx = d.ctx, img = ctx.createImageData(w, h);
    for (var x = 0; x < w; x++) {
      var t = x / w, a = 0;
      a += Math.max(0, 1-Math.abs(t-0.15)/0.12)*0.9;
      a *= 1-Math.max(0, 1-Math.abs(t-0.32)/0.03)*0.85;
      a += Math.max(0, 1-Math.abs(t-0.5)/0.15)*0.65;
      a *= 1-Math.max(0, 1-Math.abs(t-0.55)/0.01)*0.6;
      a += Math.max(0, 1-Math.abs(t-0.75)/0.015)*0.35;
      var pn = noise2D(x*0.1, 0)*0.12;
      a = Math.max(0, Math.min(1, a + pn));
      var r = 210+t*30+pn*40, g = 185+t*20+pn*30, b2 = 140+t*10+pn*20;
      for (var y = 0; y < h; y++) {
        var ii = (y*w+x)*4;
        img.data[ii]=Math.min(255,r); img.data[ii+1]=Math.min(255,g);
        img.data[ii+2]=Math.min(255,b2); img.data[ii+3]=a*180;
      }
    }
    ctx.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(d.canvas);
  }

  /* ── Generic glow sprite texture ────────────────────────────────── */
  function makeGlowTex(sz) {
    var d = makeCanvas(sz), ctx = d.ctx, h = sz / 2;
    var gr = ctx.createRadialGradient(h, h, 0, h, h, h);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.15, 'rgba(255,255,255,0.5)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.1)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.02)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, sz, sz);
    return new THREE.CanvasTexture(d.canvas);
  }

  /* ══════════════════════════════════════════════════════════════════
     INIT
     ══════════════════════════════════════════════════════════════════ */
  function init() {
    var c2d = document.getElementById('cosmos');
    if (c2d) c2d.style.display = 'none';
    try {
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(BG, 0.00006);

      camera = new THREE.PerspectiveCamera(55, vw / vh, 0.1, 12000);
      camera.position.set(0, 0, 100);

      renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' });
      renderer.setSize(vw, vh);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      renderer.setClearColor(BG, 1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;

      var container = document.getElementById('cosmos3d');
      if (!container) {
        container = document.createElement('div'); container.id = 'cosmos3d';
        container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
        document.body.insertBefore(container, document.body.firstChild);
      }
      container.appendChild(renderer.domElement);
      clock = new THREE.Clock();
      // Initialize scroll bounds
      pageHeight = document.documentElement.scrollHeight;
      scrollMax = Math.max(1, pageHeight - window.innerHeight);
      buildScene(); bindEvents(); animate();
    } catch (err) { console.error('Cosmos3D:', err); showFallback(); }
  }

  function showFallback() {
    var c = document.getElementById('cosmos'); if (c) c.style.display = '';
    var c3 = document.getElementById('cosmos3d'); if (c3) c3.style.display = 'none';
  }

  /* ══════════════════════════════════════════════════════════════════
     BUILD SCENE
     ══════════════════════════════════════════════════════════════════ */
  function buildScene() {
    // Soft ambient — enough to see all planets
    scene.add(new THREE.AmbientLight(0x2a2040, 0.8));

    // Cool directional from upper-right
    var dirL = new THREE.DirectionalLight(0xCCDDFF, 0.5);
    dirL.position.set(1, 0.6, 0.5);
    scene.add(dirL);

    // Warm fill from lower-left
    var warmFill = new THREE.DirectionalLight(0xFFDDBB, 0.2);
    warmFill.position.set(-1, -0.3, 0.3);
    scene.add(warmFill);

    // Subtle purple rim light
    var rim = new THREE.PointLight(0x6B21A8, 0.08, 500);
    rim.position.set(-100 * vs, 40 * vs, -40);
    scene.add(rim);

    createStars();
    createMilkyWayBand();
    createAuroraWaves();
    createNebulae();
    createPricingNebula();
    createCosmicStorm();
    createCosmicEyes();
    createSolarEclipse();
    createCosmicDust();
    createCosmicCloudPlanes();
    createMoon();
    createSaturn();
    createJupiter();
    createMars();
    createRahu();
    createConstellations();
  }

  /* ── STARS ──────────────────────────────────────────────────────── */
  function createStars() {
    var n = isMobile ? 3000 : 10000;
    starField = makeStarLayer(n, 2500); scene.add(starField);
    starFieldFar = makeStarLayer(Math.floor(n * 0.4), 5000); scene.add(starFieldFar);
  }

  function makeStarLayer(count, spread) {
    var g = new THREE.BufferGeometry();
    var p = new Float32Array(count*3), c = new Float32Array(count*3), sz = new Float32Array(count);
    var cols = [[1,1,1],[1,0.9,0.7],[0.8,0.85,1],[0.75,0.8,1],[1,0.82,0.75]];
    for (var i = 0; i < count; i++) {
      p[i*3]=(Math.random()-0.5)*spread; p[i*3+1]=(Math.random()-0.5)*spread; p[i*3+2]=(Math.random()-0.5)*spread;
      var cl = cols[Math.floor(Math.random()*cols.length)], b = 0.3+Math.random()*0.7;
      c[i*3]=cl[0]*b; c[i*3+1]=cl[1]*b; c[i*3+2]=cl[2]*b;
      sz[i] = 0.4+Math.random()*2.8;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    var m = new THREE.ShaderMaterial({
      uniforms: { time: {value:0}, pr: {value: renderer.getPixelRatio()} },
      vertexShader:
        'attribute float size; attribute vec3 color; varying vec3 vc; uniform float time, pr;\n' +
        'void main(){ vc=color; float tw=sin(time*1.5+position.x*0.01+position.y*0.02)*0.3+0.7;\n' +
        'vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*pr*tw*(180.0/-mv.z);\n' +
        'gl_Position=projectionMatrix*mv;}',
      fragmentShader:
        'varying vec3 vc; void main(){ float d=length(gl_PointCoord-0.5);\n' +
        'if(d>0.5)discard; float a=smoothstep(0.5,0.0,d); float g=exp(-d*d*8.0);\n' +
        'gl_FragColor=vec4(vc, a*0.8+g*0.2);}',
      transparent:true, depthWrite:false, blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(g, m);
  }

  /* ── MILKY WAY ──────────────────────────────────────────────────── */
  function createMilkyWayBand() {
    var n = isMobile ? 10000 : 28000;
    var g = new THREE.BufferGeometry();
    var p = new Float32Array(n*3), c = new Float32Array(n*3), sz = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var t = (Math.random()-0.5)*3500, sp = 60+Math.random()*100;
      var ang = Math.random()*6.28, r = sp*Math.sqrt(Math.abs(Math.log(Math.random()+0.001)));
      r = Math.min(r, sp*3);
      p[i*3]=t*0.85+Math.cos(ang)*r*0.25; p[i*3+1]=t*0.25+Math.sin(ang)*r; p[i*3+2]=-700+Math.random()*250;
      var m = Math.random();
      if (m<0.5){c[i*3]=0.75+Math.random()*0.25;c[i*3+1]=0.72+Math.random()*0.2;c[i*3+2]=0.82+Math.random()*0.18;}
      else if(m<0.8){c[i*3]=0.5+Math.random()*0.2;c[i*3+1]=0.35+Math.random()*0.15;c[i*3+2]=0.7+Math.random()*0.3;}
      else{c[i*3]=0.82+Math.random()*0.18;c[i*3+1]=0.65+Math.random()*0.2;c[i*3+2]=0.25+Math.random()*0.2;}
      sz[i]=0.8+Math.random()*2.8;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    var mt = new THREE.ShaderMaterial({
      uniforms:{time:{value:0},pr:{value:renderer.getPixelRatio()},op:{value:0.45}},
      vertexShader:
        'attribute float size;attribute vec3 color;varying vec3 vc;uniform float time,pr;\n'+
        'void main(){vc=color;float tw=sin(time*0.7+position.x*0.004)*0.15+0.85;\n'+
        'vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*pr*tw*(130.0/-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader:
        'varying vec3 vc;uniform float op;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;\n'+
        'float a=smoothstep(0.5,0.08,d)*op;float g=exp(-d*d*5.0)*0.4;gl_FragColor=vec4(vc,a+g*op);}',
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    });
    milkyWay = new THREE.Points(g, mt);
    milkyWay.rotation.set(0.15, 0, 0.4);
    scene.add(milkyWay);
  }

  /* ── AURORA WAVES ───────────────────────────────────────────────── */
  function createAuroraWaves() {
    // Enhanced aurora vertex shader — physical wave displacement
    var auroraVert =
      'uniform float time;\n' +
      'uniform float speed;\n' +
      'uniform float waveFreq;\n' +
      'varying vec2 vUv;\n' +
      'varying float vDisplace;\n' +
      '\n' +
      'void main() {\n' +
      '  vUv = uv;\n' +
      '  vec3 pos = position;\n' +
      '  float t = time * speed;\n' +
      '\n' +
      '  // Multi-frequency wave displacement — simulates magnetic field lines\n' +
      '  float w1 = sin(pos.x * 0.008 * waveFreq + t * 0.7) * 12.0;\n' +
      '  float w2 = sin(pos.x * 0.015 * waveFreq - t * 0.4) * 8.0;\n' +
      '  float w3 = cos(pos.x * 0.005 * waveFreq + t * 0.25) * 15.0;\n' +
      '  float w4 = sin(pos.x * 0.025 * waveFreq + pos.y * 0.01 + t * 1.1) * 5.0;\n' +
      '  pos.y += w1 + w2 + w3 + w4;\n' +
      '\n' +
      '  // Z-axis ripple — depth oscillation\n' +
      '  pos.z += sin(pos.x * 0.01 + t * 0.5) * 8.0 + cos(pos.y * 0.02 + t * 0.3) * 5.0;\n' +
      '\n' +
      '  vDisplace = (w1 + w2 + w3 + w4) / 40.0;\n' +
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);\n' +
      '}\n';

    // Enhanced aurora fragment shader — plasma physics, magnetic shimmers
    var auroraFrag =
      'uniform float time;\n' +
      'uniform vec3 color1;\n' +
      'uniform vec3 color2;\n' +
      'uniform vec3 color3;\n' +
      'uniform float opacity;\n' +
      'uniform float speed;\n' +
      'uniform float waveFreq;\n' +
      'uniform float intensity;\n' +
      'varying vec2 vUv;\n' +
      'varying float vDisplace;\n' +
      '\n' +
      '// Improved noise\n' +
      'float hash(vec2 p) {\n' +
      '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n' +
      '}\n' +
      'float vnoise(vec2 p) {\n' +
      '  vec2 i = floor(p);\n' +
      '  vec2 f = fract(p);\n' +
      '  f = f * f * (3.0 - 2.0 * f);\n' +
      '  float a = hash(i);\n' +
      '  float b = hash(i + vec2(1.0, 0.0));\n' +
      '  float c = hash(i + vec2(0.0, 1.0));\n' +
      '  float d = hash(i + vec2(1.0, 1.0));\n' +
      '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);\n' +
      '}\n' +
      '// Higher-quality FBM with 7 octaves\n' +
      'float fbm(vec2 p) {\n' +
      '  float v = 0.0; float a = 0.5; float f = 1.0;\n' +
      '  for (int i = 0; i < 7; i++) {\n' +
      '    v += a * vnoise(p * f);\n' +
      '    a *= 0.48; f *= 2.05;\n' +
      '  }\n' +
      '  return v;\n' +
      '}\n' +
      '// Curl-like turbulence\n' +
      'float turbulence(vec2 p) {\n' +
      '  float v = 0.0;\n' +
      '  v += abs(vnoise(p) - 0.5) * 2.0;\n' +
      '  v += abs(vnoise(p * 2.1) - 0.5) * 1.0;\n' +
      '  v += abs(vnoise(p * 4.3) - 0.5) * 0.5;\n' +
      '  v += abs(vnoise(p * 8.7) - 0.5) * 0.25;\n' +
      '  return v / 3.75;\n' +
      '}\n' +
      '\n' +
      'void main() {\n' +
      '  vec2 uv = vUv;\n' +
      '  float t = time * speed;\n' +
      '\n' +
      '  // Domain warping — feed noise into itself for plasma-like flow\n' +
      '  vec2 q = vec2(fbm(uv * 3.0 + vec2(t * 0.3, 0.0)),\n' +
      '               fbm(uv * 3.0 + vec2(0.0, t * 0.2)));\n' +
      '  vec2 r = vec2(fbm(uv * 3.0 + q * 4.0 + vec2(t * 0.1, t * 0.15)),\n' +
      '               fbm(uv * 3.0 + q * 4.0 + vec2(t * 0.2, -t * 0.1)));\n' +
      '  float domainWarp = fbm(uv * 3.0 + r * 2.0);\n' +
      '\n' +
      '  // Wavy curtain distortion — enhanced\n' +
      '  float wave1 = sin(uv.x * waveFreq + t * 0.8) * 0.18;\n' +
      '  float wave2 = sin(uv.x * waveFreq * 1.7 - t * 0.5) * 0.12;\n' +
      '  float wave3 = cos(uv.x * waveFreq * 0.5 + t * 0.3) * 0.14;\n' +
      '  float wave4 = sin(uv.x * waveFreq * 3.2 + t * 1.4) * 0.06;\n' +
      '  float waveY = uv.y + wave1 + wave2 + wave3 + wave4;\n' +
      '\n' +
      '  // Flowing plasma noise\n' +
      '  float n1 = fbm(vec2(uv.x * 4.0 + t * 0.5, waveY * 2.5 - t * 0.25));\n' +
      '  float n2 = fbm(vec2(uv.x * 2.5 - t * 0.35, waveY * 3.5 + t * 0.18));\n' +
      '  float turb = turbulence(vec2(uv.x * 2.0 + t * 0.15, waveY * 1.5));\n' +
      '  float noiseMix = n1 * 0.4 + n2 * 0.3 + domainWarp * 0.3;\n' +
      '\n' +
      '  // Vertical fade — strong at top, fading to bottom\n' +
      '  float vertFade = smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.45, uv.y);\n' +
      '  // Enhanced top glow with energy pulses\n' +
      '  float topGlow = smoothstep(0.5, 1.0, uv.y) * 0.7;\n' +
      '  float energyPulse = sin(t * 1.5 + uv.x * 6.0) * 0.5 + 0.5;\n' +
      '  topGlow *= (0.7 + 0.3 * energyPulse);\n' +
      '\n' +
      '  // Horizontal fade\n' +
      '  float hFade = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x);\n' +
      '\n' +
      '  // Color gradient — richer blending with domain warp influence\n' +
      '  float colorPos = uv.x + noiseMix * 0.35 + sin(t * 0.2) * 0.18;\n' +
      '  vec3 col;\n' +
      '  if (colorPos < 0.5) {\n' +
      '    col = mix(color1, color2, colorPos * 2.0);\n' +
      '  } else {\n' +
      '    col = mix(color2, color3, (colorPos - 0.5) * 2.0);\n' +
      '  }\n' +
      '\n' +
      '  // Magnetic field lines — bright filaments\n' +
      '  float fieldLines = pow(abs(sin(uv.x * 50.0 + turb * 8.0 + t * 0.8)), 12.0);\n' +
      '  fieldLines += pow(abs(sin(uv.x * 35.0 - turb * 6.0 + t * 0.5)), 10.0) * 0.5;\n' +
      '  fieldLines *= vertFade * 0.4;\n' +
      '\n' +
      '  // Shimmer rays — enhanced vertical streaks\n' +
      '  float rays = pow(noiseMix, 1.3) * 1.4;\n' +
      '  float shimmer = sin(uv.x * 45.0 + t * 2.5) * 0.5 + 0.5;\n' +
      '  shimmer *= sin(uv.x * 28.0 - t * 1.8) * 0.5 + 0.5;\n' +
      '  rays += shimmer * 0.2 * vertFade;\n' +
      '\n' +
      '  // Vertex displacement brightness boost\n' +
      '  float displaceGlow = abs(vDisplace) * 0.6;\n' +
      '\n' +
      '  float alpha = (rays + topGlow + fieldLines + displaceGlow) * vertFade * hFade * opacity * intensity;\n' +
      '  alpha *= noiseMix * 1.6;\n' +
      '  alpha = clamp(alpha, 0.0, 1.0);\n' +
      '\n' +
      '  // Brighten core + plasma hot spots\n' +
      '  col += vec3(0.15, 0.2, 0.12) * topGlow * noiseMix;\n' +
      '  col += vec3(0.3, 0.25, 0.1) * fieldLines;\n' +
      '  col += vec3(0.1) * displaceGlow;\n' +
      '\n' +
      '  gl_FragColor = vec4(col, alpha);\n' +
      '}\n';

    // Multiple aurora curtains — more intense, better positioned
    var auroraConfigs = [
      // Main green-teal aurora — wide, prominent, intense
      {
        w: isMobile ? 700 : 1500, h: isMobile ? 180 : 380,
        x: 0, y: isMobile ? 30 : 60, z: -220,
        rotX: 0.15, rotZ: 0.05,
        color1: [0.1, 0.95, 0.45],  // vivid green
        color2: [0.05, 0.75, 0.85], // teal
        color3: [0.25, 0.35, 0.95], // blue
        opacity: isMobile ? 0.24 : 0.32,
        speed: 0.18, waveFreq: 4.5, intensity: 1.3,
        segments: 64,
      },
      // Purple-magenta aurora — offset, dramatic
      {
        w: isMobile ? 600 : 1200, h: isMobile ? 150 : 300,
        x: isMobile ? -60 : -100, y: isMobile ? -80 : -140, z: -320,
        rotX: 0.12, rotZ: -0.08,
        color1: [0.55, 0.08, 0.85], // vivid purple
        color2: [0.85, 0.15, 0.6],  // magenta
        color3: [0.25, 0.08, 0.95], // deep violet
        opacity: isMobile ? 0.16 : 0.24,
        speed: 0.13, waveFreq: 3.8, intensity: 1.2,
        segments: 48,
      },
      // Golden-emerald aurora — far back, wider
      {
        w: isMobile ? 800 : 1600, h: isMobile ? 120 : 240,
        x: isMobile ? 40 : 80, y: isMobile ? 100 : 200, z: -450,
        rotX: -0.06, rotZ: 0.12,
        color1: [0.95, 0.75, 0.15], // vivid gold
        color2: [0.35, 0.85, 0.5],  // emerald
        color3: [0.15, 0.55, 0.95], // sky blue
        opacity: isMobile ? 0.1 : 0.18,
        speed: 0.1, waveFreq: 3.2, intensity: 1.1,
        segments: 48,
      },
      // Subtle cyan accent aurora — fills gaps
      {
        w: isMobile ? 500 : 1100, h: isMobile ? 100 : 200,
        x: isMobile ? 80 : 160, y: isMobile ? -40 : -60, z: -380,
        rotX: 0.08, rotZ: 0.15,
        color1: [0.1, 0.8, 0.9],   // cyan
        color2: [0.2, 0.5, 0.95],  // blue
        color3: [0.6, 0.2, 0.8],   // purple
        opacity: isMobile ? 0.08 : 0.14,
        speed: 0.12, waveFreq: 5.0, intensity: 1.0,
        segments: 32,
      },
    ];

    auroraConfigs.forEach(function (cfg) {
      var segs = cfg.segments || 32;
      var geo = new THREE.PlaneGeometry(cfg.w, cfg.h, segs, Math.max(1, Math.floor(segs / 4)));
      var mat = new THREE.ShaderMaterial({
        uniforms: {
          time:      { value: 0 },
          color1:    { value: new THREE.Vector3(cfg.color1[0], cfg.color1[1], cfg.color1[2]) },
          color2:    { value: new THREE.Vector3(cfg.color2[0], cfg.color2[1], cfg.color2[2]) },
          color3:    { value: new THREE.Vector3(cfg.color3[0], cfg.color3[1], cfg.color3[2]) },
          opacity:   { value: cfg.opacity },
          speed:     { value: cfg.speed },
          waveFreq:  { value: cfg.waveFreq },
          intensity: { value: cfg.intensity || 1.0 },
        },
        vertexShader: auroraVert,
        fragmentShader: auroraFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      mesh.rotation.x = cfg.rotX;
      mesh.rotation.z = cfg.rotZ;
      mesh.userData.baseX = cfg.x;
      mesh.userData.baseY = cfg.y;
      mesh.userData.baseIntensity = cfg.intensity || 1.0;
      mesh.userData.baseColors = [cfg.color1.slice(), cfg.color2.slice(), cfg.color3.slice()];
      scene.add(mesh);
      auroraMeshes.push(mesh);
    });
  }

  /* ── NEBULAE ────────────────────────────────────────────────────── */
  function createNebulae() {
    var gt = makeGlowTex(256);
    var data = [
      {x:-180,y:80,z:-350,s:250,c:0x9333EA,o:0.04},
      {x:220,y:-60,z:-450,s:300,c:0xFFB800,o:0.025},
      {x:-80,y:-130,z:-380,s:220,c:0x4CC9F0,o:0.03},
      {x:160,y:100,z:-520,s:320,c:0xFF6B9D,o:0.02},
      {x:0,y:180,z:-650,s:380,c:0x6B21A8,o:0.03},
    ];
    data.forEach(function(n){
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map:gt, color:n.c, transparent:true, opacity:n.o,
        blending:THREE.AdditiveBlending, depthWrite:false,
      }));
      sp.position.set(n.x,n.y,n.z); sp.scale.set(n.s,n.s,1);
      sp.userData={bx:n.x,by:n.y,spd:0.0002+Math.random()*0.0003,off:Math.random()*6.28,bo:n.o};
      scene.add(sp);
    });
  }

  /* ── PRICING NEBULA — Animated gas flows + star births ────────────── */
  function createPricingNebula() {
    pricingNebulaGroup = new THREE.Group();

    var gt = makeGlowTex(256);

    // Multiple layered sprite clouds creating depth
    var clouds = [
      { x: 0,   yOff: 0,   z: -120, s: isMobile ? 350 : 600, c: 0x4B0082, o: 0.07, spd: 0.00015 },
      { x: isMobile ? 60 : 150, yOff: isMobile ? -30 : -60, z: -180, s: isMobile ? 250 : 450, c: 0xFFB800, o: 0.04, spd: 0.0002 },
      { x: isMobile ? -70 : -160, yOff: isMobile ? 20 : 40, z: -200, s: isMobile ? 280 : 500, c: 0x6B21A8, o: 0.055, spd: 0.00018 },
      { x: isMobile ? 30 : 80, yOff: isMobile ? 40 : 80, z: -300, s: isMobile ? 320 : 550, c: 0x06B6D4, o: 0.025, spd: 0.00012 },
      { x: isMobile ? -40 : -100, yOff: isMobile ? -40 : -80, z: -80, s: isMobile ? 180 : 300, c: 0xFF6B9D, o: 0.035, spd: 0.00025 },
      { x: 0,   yOff: 0,   z: -100, s: isMobile ? 200 : 350, c: 0x9333EA, o: 0.06, spd: 0.0001 },
      { x: isMobile ? -20 : -50, yOff: isMobile ? 50 : 100, z: -250, s: isMobile ? 400 : 700, c: 0xFFD666, o: 0.018, spd: 0.00008 },
    ];

    clouds.forEach(function (n, idx) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: gt, color: n.c, transparent: true, opacity: n.o,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      sp.position.set(n.x, n.yOff, n.z);
      sp.scale.set(n.s, n.s, 1);
      // Store base HSL for color cycling
      var baseColor = new THREE.Color(n.c);
      var hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      sp.userData = {
        bx: n.x, byOff: n.yOff, spd: n.spd,
        off: idx * 1.37, bo: n.o, bz: n.z,
        baseScale: n.s,
        baseH: hsl.h, baseS: hsl.s, baseL: hsl.l
      };
      pricingNebulaGroup.add(sp);
    });

    /* ── Advanced gas-flow nebula shader ─────────────────────────── */
    var nebulaVert =
      'varying vec2 vUv;\n' +
      'void main() {\n' +
      '  vUv = uv;\n' +
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n' +
      '}\n';

    var nebulaFrag =
      'uniform float time;\n' +
      'uniform float opacity;\n' +
      'varying vec2 vUv;\n' +
      '\n' +
      'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
      'float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\n' +
      'float vnoise(vec2 p) {\n' +
      '  vec2 i = floor(p); vec2 f = fract(p);\n' +
      '  f = f * f * (3.0 - 2.0 * f);\n' +
      '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),\n' +
      '             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);\n' +
      '}\n' +
      'float fbm(vec2 p) {\n' +
      '  float v=0.0, a=0.5;\n' +
      '  mat2 rot = mat2(0.8,-0.6,0.6,0.8);\n' +
      '  for(int i=0; i<7; i++) { v += a*vnoise(p); p = rot*p*2.1; a *= 0.48; }\n' +
      '  return v;\n' +
      '}\n' +
      '\n' +
      '// Curl-noise inspired flow field for gas motion\n' +
      'vec2 curl(vec2 p, float t) {\n' +
      '  float e = 0.01;\n' +
      '  float n = fbm(p + vec2(t*0.15, 0.0));\n' +
      '  float nx = fbm(p + vec2(e + t*0.15, 0.0));\n' +
      '  float ny = fbm(p + vec2(t*0.15, e));\n' +
      '  return vec2(-(ny - n)/e, (nx - n)/e) * 0.4;\n' +
      '}\n' +
      '\n' +
      'void main() {\n' +
      '  vec2 uv = vUv - 0.5;\n' +
      '  float t = time;\n' +
      '  float slow = t * 0.06;\n' +
      '\n' +
      '  // Gas flow — curl-noise advection\n' +
      '  vec2 flow = curl(uv * 2.5, t * 0.1);\n' +
      '  vec2 flowUv = uv + flow * 0.12;\n' +
      '\n' +
      '  // Swirling distortion — gravitational accretion\n' +
      '  float angle = atan(flowUv.y, flowUv.x);\n' +
      '  float radius = length(flowUv);\n' +
      '  float spiralArm = sin(angle * 3.0 - radius * 8.0 + slow * 2.0) * 0.5 + 0.5;\n' +
      '  float swirl = fbm(vec2(angle*2.0 + slow, radius*4.0 - slow*0.8));\n' +
      '\n' +
      '  // Turbulent gas density — multiple scales\n' +
      '  float n1 = fbm(flowUv * 3.5 + vec2(slow*0.5, -slow*0.3) + swirl*0.35);\n' +
      '  float n2 = fbm(flowUv * 6.0 - vec2(slow*0.3, slow*0.2) + swirl*0.2);\n' +
      '  float n3 = fbm(flowUv * 10.0 + vec2(-slow*0.4, slow*0.35));\n' +
      '\n' +
      '  // Gas compression waves — shock fronts from star births\n' +
      '  float shockwave1 = smoothstep(0.0, 0.03, abs(radius - mod(slow * 0.3, 0.6))) *\n' +
      '                     smoothstep(0.06, 0.03, abs(radius - mod(slow * 0.3, 0.6)));\n' +
      '  float shockwave2 = smoothstep(0.0, 0.025, abs(radius - mod(slow * 0.2 + 0.3, 0.7) - 0.05)) *\n' +
      '                     smoothstep(0.05, 0.025, abs(radius - mod(slow * 0.2 + 0.3, 0.7) - 0.05));\n' +
      '  float shocks = (shockwave1 + shockwave2) * 0.15;\n' +
      '\n' +
      '  // Gas flow ribbons — filamentary structure\n' +
      '  float filaments = pow(abs(sin(angle * 5.0 + n1 * 6.0 + slow)), 8.0) * 0.3;\n' +
      '  filaments += pow(abs(sin(angle * 8.0 - n2 * 4.0 - slow * 0.7)), 10.0) * 0.2;\n' +
      '\n' +
      '  // Combined density field\n' +
      '  float cloud = n1 * 0.45 + n2 * 0.3 + n3 * 0.15 + spiralArm * 0.1;\n' +
      '  cloud = pow(cloud, 1.2);\n' +
      '  cloud += filaments * (0.8 + 0.2 * sin(slow * 3.0));\n' +
      '  cloud += shocks;\n' +
      '\n' +
      '  // Circular falloff with soft edge\n' +
      '  float vignette = 1.0 - smoothstep(0.18, 0.5, radius);\n' +
      '\n' +
      '  // Slowly cycling color palette\n' +
      '  float colorTime = t * 0.012; // very slow cycle\n' +
      '  float phase = mod(colorTime, 6.28);\n' +
      '\n' +
      '  // 4 color themes that blend into each other\n' +
      '  // Theme A: purple/indigo (phase 0)\n' +
      '  vec3 deepA = vec3(0.15, 0.0, 0.35);\n' +
      '  vec3 hotA  = vec3(0.5, 0.08, 0.8);\n' +
      '  vec3 accentA = vec3(0.1, 0.3, 0.9);\n' +
      '  vec3 warmA = vec3(1.0, 0.75, 0.15);\n' +
      '  // Theme B: teal/cyan (phase PI/2)\n' +
      '  vec3 deepB = vec3(0.0, 0.12, 0.25);\n' +
      '  vec3 hotB  = vec3(0.05, 0.6, 0.65);\n' +
      '  vec3 accentB = vec3(0.2, 0.8, 0.9);\n' +
      '  vec3 warmB = vec3(0.4, 0.9, 0.5);\n' +
      '  // Theme C: gold/fire (phase PI)\n' +
      '  vec3 deepC = vec3(0.25, 0.08, 0.0);\n' +
      '  vec3 hotC  = vec3(0.9, 0.45, 0.05);\n' +
      '  vec3 accentC = vec3(1.0, 0.8, 0.2);\n' +
      '  vec3 warmC = vec3(0.95, 0.3, 0.1);\n' +
      '  // Theme D: pink/magenta (phase 3PI/2)\n' +
      '  vec3 deepD = vec3(0.2, 0.0, 0.2);\n' +
      '  vec3 hotD  = vec3(0.85, 0.15, 0.55);\n' +
      '  vec3 accentD = vec3(0.95, 0.4, 0.7);\n' +
      '  vec3 warmD = vec3(0.6, 0.2, 0.9);\n' +
      '\n' +
      '  // Smooth blending weights using sin/cos\n' +
      '  float wA = max(0.0, cos(phase)) * max(0.0, cos(phase));\n' +
      '  float wB = max(0.0, sin(phase)) * max(0.0, sin(phase));\n' +
      '  float wC = max(0.0, -cos(phase)) * max(0.0, -cos(phase));\n' +
      '  float wD = max(0.0, -sin(phase)) * max(0.0, -sin(phase));\n' +
      '  float wSum = wA + wB + wC + wD + 0.001;\n' +
      '  wA /= wSum; wB /= wSum; wC /= wSum; wD /= wSum;\n' +
      '\n' +
      '  vec3 deepPurple = deepA*wA + deepB*wB + deepC*wC + deepD*wD;\n' +
      '  vec3 hotPurple  = hotA*wA  + hotB*wB  + hotC*wC  + hotD*wD;\n' +
      '  vec3 emissionBlue = accentA*wA + accentB*wB + accentC*wC + accentD*wD;\n' +
      '  vec3 gold = warmA*wA + warmB*wB + warmC*wC + warmD*wD;\n' +
      '  vec3 hotPink = mix(vec3(0.9,0.2,0.4), vec3(0.2,0.9,0.6), wB+wC);\n' +
      '  vec3 teal = mix(vec3(0.1,0.7,0.65), vec3(0.7,0.3,0.9), wC+wD);\n' +
      '  vec3 white = vec3(1.0, 0.95, 0.9);\n' +
      '\n' +
      '  vec3 col = mix(deepPurple, hotPurple, cloud);\n' +
      '  col = mix(col, emissionBlue, smoothstep(0.4, 0.7, n2) * 0.35);\n' +
      '  col = mix(col, gold, smoothstep(0.55, 0.75, n1) * 0.3);\n' +
      '  col = mix(col, hotPink, smoothstep(0.6, 0.85, spiralArm * n1) * 0.25);\n' +
      '  col = mix(col, teal, smoothstep(0.6, 0.8, n3) * 0.2);\n' +
      '\n' +
      '  // Shock fronts glow hot\n' +
      '  col += white * shocks * 2.0;\n' +
      '  // Filament emission\n' +
      '  col += hotPink * filaments * 0.6;\n' +
      '\n' +
      '  // Dense core brightening — gas collapsing to form stars\n' +
      '  float coreGlow = pow(cloud * vignette, 3.0) * 2.0;\n' +
      '  col += mix(vec3(0.6,0.3,0.8), hotPurple, 0.5) * coreGlow;\n' +
      '\n' +
      '  // Bright embedded proto-stars — tiny hot spots in dense gas\n' +
      '  float starSeed1 = pow(max(0.0, vnoise(flowUv * 25.0 + slow * 0.2) - 0.88) / 0.12, 3.0);\n' +
      '  float starSeed2 = pow(max(0.0, vnoise(flowUv * 30.0 - slow * 0.15 + 5.0) - 0.9) / 0.1, 3.0);\n' +
      '  float starSeed3 = pow(max(0.0, vnoise(flowUv * 18.0 + slow * 0.25 + 10.0) - 0.87) / 0.13, 3.0);\n' +
      '  float protoStars = (starSeed1 + starSeed2 + starSeed3) * cloud * vignette;\n' +
      '\n' +
      '  // Star birth flash — pulsing bright points\n' +
      '  float flash1 = pow(max(0.0, sin(slow * 1.5 + n1 * 12.0)), 20.0) * starSeed1;\n' +
      '  float flash2 = pow(max(0.0, sin(slow * 1.2 + n2 * 10.0 + 2.0)), 20.0) * starSeed2;\n' +
      '  float flash3 = pow(max(0.0, sin(slow * 0.9 + n3 * 8.0 + 4.0)), 20.0) * starSeed3;\n' +
      '  float starFlash = (flash1 + flash2 + flash3) * 3.0;\n' +
      '\n' +
      '  // Add proto-stars and their birth flashes\n' +
      '  col += white * protoStars * 1.5;\n' +
      '  col += vec3(1.0, 0.9, 0.6) * starFlash;\n' +
      '\n' +
      '  // Ionization glow around newborn stars — color shifts with nebula\n' +
      '  col += mix(vec3(0.3,0.5,1.0), emissionBlue, 0.5) * protoStars * 0.8 * (0.5 + 0.5 * sin(slow * 2.0));\n' +
      '\n' +
      '  float alpha = (cloud + filaments * 0.5 + shocks + protoStars * 0.5) * vignette * opacity;\n' +
      '  alpha = clamp(alpha, 0.0, 1.0);\n' +
      '\n' +
      '  gl_FragColor = vec4(col, alpha);\n' +
      '}\n';

    // Main nebula plane
    var planeSize = isMobile ? 350 : 580;
    var geo = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1);
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: isMobile ? 0.38 : 0.48 },
      },
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    var nebulaMesh = new THREE.Mesh(geo, mat);
    nebulaMesh.position.set(0, 0, -140);
    nebulaMesh.rotation.z = 0.3;
    nebulaMesh.userData.isNebulaShader = true;
    pricingNebulaGroup.add(nebulaMesh);

    // Second plane — offset for depth parallax
    var planeSize2 = isMobile ? 260 : 420;
    var geo2 = new THREE.PlaneGeometry(planeSize2, planeSize2, 1, 1);
    var mat2 = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: isMobile ? 0.22 : 0.3 },
      },
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    var nebulaMesh2 = new THREE.Mesh(geo2, mat2);
    nebulaMesh2.position.set(isMobile ? -40 : -100, isMobile ? 30 : 60, -220);
    nebulaMesh2.rotation.z = -0.5;
    nebulaMesh2.rotation.x = 0.15;
    nebulaMesh2.userData.isNebulaShader = true;
    pricingNebulaGroup.add(nebulaMesh2);

    /* ── Star-birth particle system ──────────────────────────────── */
    var starCount = isMobile ? 40 : 80;
    var sbGeo = new THREE.BufferGeometry();
    var sbPos = new Float32Array(starCount * 3);
    var sbCol = new Float32Array(starCount * 3);
    var sbSize = new Float32Array(starCount);
    var sbPhase = new Float32Array(starCount); // birth phase offset
    var sbLife = new Float32Array(starCount);   // lifecycle speed

    for (var i = 0; i < starCount; i++) {
      // Distribute within the nebula radius, denser toward center
      var ang = Math.random() * Math.PI * 2;
      var rad = Math.pow(Math.random(), 0.6) * (isMobile ? 130 : 220);
      sbPos[i*3]   = Math.cos(ang) * rad;
      sbPos[i*3+1] = Math.sin(ang) * rad;
      sbPos[i*3+2] = -100 - Math.random() * 150;

      // Color — white-hot core with blue/gold tint
      var cRand = Math.random();
      if (cRand < 0.4) {
        sbCol[i*3] = 0.9 + Math.random()*0.1;
        sbCol[i*3+1] = 0.85 + Math.random()*0.15;
        sbCol[i*3+2] = 0.7 + Math.random()*0.2;
      } else if (cRand < 0.7) {
        sbCol[i*3] = 0.5 + Math.random()*0.3;
        sbCol[i*3+1] = 0.6 + Math.random()*0.3;
        sbCol[i*3+2] = 0.95 + Math.random()*0.05;
      } else {
        sbCol[i*3] = 1.0;
        sbCol[i*3+1] = 0.7 + Math.random()*0.2;
        sbCol[i*3+2] = 0.3 + Math.random()*0.2;
      }

      sbSize[i] = 1.0 + Math.random() * 3.0;
      sbPhase[i] = Math.random() * 6.28;
      sbLife[i] = 0.3 + Math.random() * 0.7;
    }

    sbGeo.setAttribute('position', new THREE.BufferAttribute(sbPos, 3));
    sbGeo.setAttribute('color', new THREE.BufferAttribute(sbCol, 3));
    sbGeo.setAttribute('size', new THREE.BufferAttribute(sbSize, 1));
    sbGeo.setAttribute('phase', new THREE.BufferAttribute(sbPhase, 1));
    sbGeo.setAttribute('life', new THREE.BufferAttribute(sbLife, 1));

    var sbMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pr: { value: renderer.getPixelRatio() },
      },
      vertexShader:
        'attribute float size;\n' +
        'attribute vec3 color;\n' +
        'attribute float phase;\n' +
        'attribute float life;\n' +
        'varying vec3 vColor;\n' +
        'varying float vAlpha;\n' +
        'uniform float time, pr;\n' +
        'void main() {\n' +
        '  vColor = color;\n' +
        '  // Star birth lifecycle: dark -> bright flash -> gentle glow -> fade -> repeat\n' +
        '  float cycle = mod(time * life * 0.15 + phase, 6.28);\n' +
        '  // Birth flash — sharp spike at cycle ~PI\n' +
        '  float birthFlash = pow(max(0.0, sin(cycle)), 12.0);\n' +
        '  // Sustained glow after birth\n' +
        '  float sustain = smoothstep(0.4, 0.8, sin(cycle * 0.5)) * 0.3;\n' +
        '  // Occasional intense flare\n' +
        '  float flare = pow(max(0.0, sin(cycle * 3.0 + phase * 2.0)), 30.0) * 0.6;\n' +
        '  vAlpha = birthFlash + sustain + flare;\n' +
        '  vAlpha = clamp(vAlpha, 0.0, 1.0);\n' +
        '  // Size pulses with birth\n' +
        '  float sz = size * (1.0 + birthFlash * 4.0 + flare * 3.0);\n' +
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);\n' +
        '  gl_PointSize = sz * pr * (200.0 / -mv.z);\n' +
        '  gl_Position = projectionMatrix * mv;\n' +
        '}\n',
      fragmentShader:
        'varying vec3 vColor;\n' +
        'varying float vAlpha;\n' +
        'void main() {\n' +
        '  float d = length(gl_PointCoord - 0.5);\n' +
        '  if (d > 0.5) discard;\n' +
        '  // Bright star core with halo\n' +
        '  float core = exp(-d * d * 50.0);\n' +
        '  float halo = exp(-d * d * 8.0) * 0.4;\n' +
        '  float rays = (core + halo) * vAlpha;\n' +
        '  // Cross-shaped diffraction spikes on bright flashes\n' +
        '  vec2 pc = gl_PointCoord - 0.5;\n' +
        '  float spike = exp(-abs(pc.x) * 15.0) * exp(-abs(pc.y) * 2.0) +\n' +
        '                exp(-abs(pc.y) * 15.0) * exp(-abs(pc.x) * 2.0);\n' +
        '  spike *= pow(vAlpha, 2.0) * 0.3;\n' +
        '  float alpha = clamp(rays + spike, 0.0, 1.0);\n' +
        '  vec3 col = vColor * (core * 2.0 + halo) + vec3(0.3, 0.4, 1.0) * spike;\n' +
        '  gl_FragColor = vec4(col, alpha);\n' +
        '}\n',
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    var starBirthPoints = new THREE.Points(sbGeo, sbMat);
    starBirthPoints.userData.isStarBirth = true;
    pricingNebulaGroup.add(starBirthPoints);

    // Position group — will be updated in animate()
    pricingNebulaGroup.position.set(0, 0, 0);
    scene.add(pricingNebulaGroup);
  }

  /* ── Shared helper: add atmosphere glow ─────────────────────────── */
  function addAtmosphere(mesh, radius, color, intensity) {
    var gt = makeGlowTex(128);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: gt, color: color, transparent: true, opacity: intensity,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sp.scale.set(radius * 3.5, radius * 3.5, 1);
    sp.position.copy(mesh.position);
    scene.add(sp);
    return sp;
  }

  /* ── MOON — Hero section (section: 0.0) ──────────────────────────── */
  function createMoon() {
    var r = isMobile ? 4.5 : 5;
    r *= vs;
    var tex = makeMoonTex();
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 48, 48),
      new THREE.MeshStandardMaterial({ map:tex, roughness:0.92, metalness:0, emissive:0x222244, emissiveIntensity:0.12 })
    );
    mesh.position.set(0, 0, -25); scene.add(mesh);
    var atmo = addAtmosphere(mesh, r, 0xAABBDD, 0.1);
    bodies.push({ mesh:mesh, atmo:atmo,
      rot:0.0008, bob:0.15, bobA: isMobile ? 1.5 : 2, par:0.01,
      orbitR: isMobile ? 8 : 14, orbitS:0.06, orbitOff:0,
      section:0.02, sideX: isMobile ? -25 : -45 });
  }

  /* ── SATURN — Features section (section: 0.18) ─────────────────── */
  function createSaturn() {
    var r = isMobile ? 6 : 8;
    r *= vs;
    var tex = makeSaturnTex();
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 64, 64),
      new THREE.MeshStandardMaterial({ map:tex, roughness:0.75, metalness:0.08, emissive:0x3A2800, emissiveIntensity:0.1 })
    );
    mesh.position.set(0, 0, -50); mesh.rotation.z = 0.45;
    scene.add(mesh);

    // Ring
    var ri = r * 1.35, ro = r * 2.7;
    var ringTex = makeRingTex();
    ringTex.wrapS = THREE.ClampToEdgeWrapping;
    var ringGeo = new THREE.RingGeometry(ri, ro, 128);
    var uvs = ringGeo.attributes.uv, rp = ringGeo.attributes.position;
    for (var i = 0; i < uvs.count; i++) {
      var rad = Math.sqrt(rp.getX(i)*rp.getX(i)+rp.getY(i)*rp.getY(i));
      uvs.setXY(i, (rad-ri)/(ro-ri), 0.5);
    }
    var ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      map:ringTex, side:THREE.DoubleSide, transparent:true, opacity:0.8, depthWrite:false,
    }));
    ring.rotation.x = Math.PI * 0.42; ring.position.copy(mesh.position);
    scene.add(ring);

    var atmo = addAtmosphere(mesh, r, 0xDAA520, 0.08);
    bodies.push({ mesh:mesh, ring:ring, atmo:atmo,
      rot:0.001, bob:0.18, bobA: isMobile ? 2 : 2.5, par:0.013,
      orbitR: isMobile ? 10 : 16, orbitS:0.03, orbitOff:1.2,
      section:0.20, sideX: isMobile ? 22 : 50 });
  }

  /* ── JUPITER — How It Works section (section: 0.40) ─────────────── */
  function createJupiter() {
    var r = isMobile ? 8 : 12;
    r *= vs;
    var tex = makeJupiterTex();
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 64, 64),
      new THREE.MeshStandardMaterial({ map:tex, roughness:0.78, metalness:0.08, emissive:0x2A1800, emissiveIntensity:0.1 })
    );
    mesh.position.set(0, 0, -65); scene.add(mesh);
    var atmo = addAtmosphere(mesh, r, 0xC4956A, 0.08);
    bodies.push({ mesh:mesh, atmo:atmo,
      rot:0.0015, bob:0.15, bobA: isMobile ? 2 : 3, par:0.016,
      orbitR: isMobile ? 12 : 20, orbitS:0.02, orbitOff:2.5,
      section:0.40, sideX: isMobile ? -28 : -55 });
  }

  /* ── MARS — Screenshots section (section: 0.60) ─────────────────── */
  function createMars() {
    var r = isMobile ? 3.5 : 4.5;
    r *= vs;
    var tex = makeMarsTex();
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 48, 48),
      new THREE.MeshStandardMaterial({ map:tex, roughness:0.88, metalness:0.05, emissive:0x401000, emissiveIntensity:0.1 })
    );
    mesh.position.set(0, 0, -35); scene.add(mesh);
    var atmo = addAtmosphere(mesh, r, 0xC1440E, 0.1);
    bodies.push({ mesh:mesh, atmo:atmo,
      rot:0.001, bob:0.22, bobA: isMobile ? 1.5 : 2, par:0.02,
      orbitR: isMobile ? 8 : 12, orbitS:0.04, orbitOff:3.8,
      section:0.60, sideX: isMobile ? 20 : 45 });
  }

  /* ── RAHU — Pricing/Footer section (section: 0.80) ──────────────── */
  function createRahu() {
    var r = isMobile ? 3.5 : 4.5;
    r *= vs;
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 40, 40),
      new THREE.MeshStandardMaterial({ color:0x0a0418, roughness:0.25, metalness:0.5, emissive:0x4B0082, emissiveIntensity:0.35 })
    );
    mesh.position.set(0, 0, -25); scene.add(mesh);
    var atmo = addAtmosphere(mesh, r, 0x9333EA, 0.18);
    bodies.push({ mesh:mesh, atmo:atmo,
      rot:0.002, bob:0.28, bobA: isMobile ? 2 : 2.5, par:0.022,
      orbitR: isMobile ? 7 : 10, orbitS:0.04, orbitOff:5.0,
      section:0.80, sideX: isMobile ? -22 : -40 });
  }

  /* ── GRAHA CHAKRAYA — Spectacular Multi-Layer 3D Astral Mandala ──── */
  var grahaChakra, grahaChakra2, grahaChakra3;
  var chakraParticles; // orbiting particle ring

  /* Generate the outer ring texture — sacred geometry + glowing arcs */
  function makeOuterRingTex() {
    var s = 1024, d = makeCanvas(s), ctx = d.ctx;
    var cx = s / 2, cy = s / 2;
    ctx.clearRect(0, 0, s, s);

    // Massive radial glow backdrop
    var bg = ctx.createRadialGradient(cx, cy, s * 0.15, cx, cy, s * 0.5);
    bg.addColorStop(0, 'rgba(147, 51, 234, 0.08)');
    bg.addColorStop(0.5, 'rgba(255, 184, 0, 0.03)');
    bg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, s, s);

    var R1 = s * 0.46, R2 = s * 0.38, R3 = s * 0.28, R4 = s * 0.18, R5 = s * 0.08;

    // Multiple glowing rings with varying intensities
    function glowRing(r, w, col, blur) {
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = blur;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
      ctx.restore();
    }
    glowRing(R1, 1.5, 'rgba(255, 184, 0, 0.6)', 20);
    glowRing(R1 + 4, 0.5, 'rgba(255, 184, 0, 0.15)', 0);
    glowRing(R2, 1.2, 'rgba(180, 122, 255, 0.5)', 15);
    glowRing(R3, 1, 'rgba(255, 140, 0, 0.4)', 12);
    glowRing(R4, 0.8, 'rgba(147, 51, 234, 0.45)', 10);
    glowRing(R5, 0.6, 'rgba(255, 255, 255, 0.2)', 8);

    // Dashed sacred arcs between R1 and R2
    ctx.save();
    ctx.setLineDash([8, 16]);
    ctx.beginPath(); ctx.arc(cx, cy, (R1 + R2) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 214, 102, 0.12)'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.restore();

    // 12 house lines — outer to inner with gradient fade
    for (var i = 0; i < 12; i++) {
      var ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
      var grad = ctx.createLinearGradient(
        cx + Math.cos(ang) * R4, cy + Math.sin(ang) * R4,
        cx + Math.cos(ang) * R1, cy + Math.sin(ang) * R1
      );
      grad.addColorStop(0, 'rgba(147, 51, 234, 0.0)');
      grad.addColorStop(0.3, 'rgba(255, 184, 0, 0.3)');
      grad.addColorStop(1, 'rgba(255, 184, 0, 0.08)');
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * R4, cy + Math.sin(ang) * R4);
      ctx.lineTo(cx + Math.cos(ang) * R1, cy + Math.sin(ang) * R1);
      ctx.strokeStyle = grad; ctx.lineWidth = 0.8; ctx.stroke();
    }

    // Sacred geometry — hexagram star
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (var t = 0; t < 2; t++) {
      ctx.beginPath();
      for (var i = 0; i < 4; i++) {
        var ang = (i / 3) * Math.PI * 2 + t * (Math.PI / 3) - Math.PI / 2;
        var method = i === 0 ? 'moveTo' : 'lineTo';
        ctx[method](cx + Math.cos(ang) * R3, cy + Math.sin(ang) * R3);
      }
      ctx.closePath();
      ctx.strokeStyle = '#B47AFF'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();

    // Navagraha planet glyphs — orbiting in the planet ring
    var grahas = [
      { sym: '☉', col: '#FFB800' },
      { sym: '☽', col: '#E0E0E0' },
      { sym: '♂', col: '#FF4747' },
      { sym: '☿', col: '#4CD964' },
      { sym: '♃', col: '#FFD666' },
      { sym: '♀', col: '#FF9FF3' },
      { sym: '♄', col: '#54A0FF' },
      { sym: '☊', col: '#B47AFF' },
      { sym: '☋', col: '#7C3AED' }
    ];

    var planetR = (R2 + R3) / 2;
    ctx.font = 'bold ' + Math.round(s * 0.04) + 'px "Segoe UI Symbol", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < grahas.length; i++) {
      var ang = (i / grahas.length) * Math.PI * 2 - Math.PI / 2;
      var px = cx + Math.cos(ang) * planetR;
      var py = cy + Math.sin(ang) * planetR;

      // Glow circle behind planet
      var pg = ctx.createRadialGradient(px, py, 0, px, py, s * 0.035);
      pg.addColorStop(0, grahas[i].col.replace(')', ',0.3)').replace('rgb', 'rgba'));
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pg;
      ctx.fillRect(px - s * 0.04, py - s * 0.04, s * 0.08, s * 0.08);

      ctx.save();
      ctx.shadowColor = grahas[i].col; ctx.shadowBlur = 25;
      ctx.fillStyle = grahas[i].col;
      ctx.fillText(grahas[i].sym, px, py);
      ctx.restore();
    }

    // House numbers in outer ring — subtle
    ctx.font = '600 ' + Math.round(s * 0.026) + 'px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(255, 214, 102, 0.35)';
    for (var i = 0; i < 12; i++) {
      var ang = ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
      var tr = (R1 + R2) / 2;
      ctx.fillText((i + 1).toString(), cx + Math.cos(ang) * tr, cy + Math.sin(ang) * tr);
    }

    // Decorative energy dots on outer ring
    for (var i = 0; i < 36; i++) {
      var ang = (i / 36) * Math.PI * 2;
      var dotR = (i % 3 === 0) ? 3.5 : 1.5;
      var dotAlpha = (i % 3 === 0) ? 0.7 : 0.25;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * R1, cy + Math.sin(ang) * R1, dotR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 184, 0, ' + dotAlpha + ')';
      ctx.fill();
    }

    // Inner energy dots
    for (var i = 0; i < 24; i++) {
      var ang = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * R4, cy + Math.sin(ang) * R4, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180, 122, 255, 0.4)';
      ctx.fill();
    }

    // Center — pulsing energy circle (no text)
    var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R5);
    cg.addColorStop(0, 'rgba(255, 184, 0, 0.25)');
    cg.addColorStop(0.5, 'rgba(147, 51, 234, 0.12)');
    cg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, R5, 0, Math.PI * 2); ctx.fill();

    return new THREE.CanvasTexture(d.canvas);
  }

  /* Inner ring — simpler, faster spinning accent ring */
  function makeInnerRingTex() {
    var s = 512, d = makeCanvas(s), ctx = d.ctx;
    var cx = s / 2, cy = s / 2;
    ctx.clearRect(0, 0, s, s);

    var R = s * 0.42;

    // Dashed luminous ring
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.shadowColor = 'rgba(255, 184, 0, 0.6)'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 184, 0, 0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // Inner dashed ring
    ctx.save();
    ctx.setLineDash([3, 12]);
    ctx.shadowColor = 'rgba(147, 51, 234, 0.5)'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(180, 122, 255, 0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();

    // Energy dots on the ring
    for (var i = 0; i < 48; i++) {
      var ang = (i / 48) * Math.PI * 2;
      var sz = (i % 4 === 0) ? 3 : 1.2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, sz, 0, Math.PI * 2);
      ctx.fillStyle = (i % 4 === 0) ? 'rgba(255, 184, 0, 0.6)' : 'rgba(180, 122, 255, 0.3)';
      ctx.fill();
    }

    return new THREE.CanvasTexture(d.canvas);
  }

  /* Orbiting particle ring around the chakra */
  function createChakraParticles(parentBody) {
    var count = isMobile ? 60 : 150;
    var g = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    var cols = new Float32Array(count * 3);
    var sizes = new Float32Array(count);
    var orbitR = isMobile ? 32 : 55;
    orbitR *= vs;

    for (var i = 0; i < count; i++) {
      var ang = (i / count) * Math.PI * 2;
      var r = orbitR + (Math.random() - 0.5) * orbitR * 0.3;
      pos[i * 3] = Math.cos(ang) * r;
      pos[i * 3 + 1] = Math.sin(ang) * r;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;

      var pick = Math.random();
      if (pick < 0.4) { cols[i*3]=1; cols[i*3+1]=0.72; cols[i*3+2]=0; }         // gold
      else if (pick < 0.7) { cols[i*3]=0.7; cols[i*3+1]=0.48; cols[i*3+2]=1; }   // purple
      else { cols[i*3]=0.3; cols[i*3+1]=0.78; cols[i*3+2]=1; }                    // cyan

      sizes[i] = 1 + Math.random() * 3;
    }

    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    var m = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, pr: { value: renderer.getPixelRatio() } },
      vertexShader:
        'attribute float size; attribute vec3 color; varying vec3 vc; varying float va; uniform float time, pr;\n' +
        'void main(){ vc = color;\n' +
        '  float idx = float(gl_VertexID);\n' +
        '  float tw = sin(time * 2.0 + idx * 0.5) * 0.4 + 0.6;\n' +
        '  va = tw;\n' +
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);\n' +
        '  gl_PointSize = size * pr * tw * (100.0 / -mv.z);\n' +
        '  gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'varying vec3 vc; varying float va;\n' +
        'void main(){ float d = length(gl_PointCoord - 0.5);\n' +
        '  if(d > 0.5) discard;\n' +
        '  float a = smoothstep(0.5, 0.0, d) * va;\n' +
        '  float glow = exp(-d * d * 6.0) * 0.5;\n' +
        '  gl_FragColor = vec4(vc, a * 0.7 + glow); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    chakraParticles = new THREE.Points(g, m);
    chakraParticles.position.z = isMobile ? -7 : -18;
    scene.add(chakraParticles);

    // Store orbit data for animation
    chakraParticles.userData = { count: count, orbitR: orbitR, parentSection: 0.05 };
  }

  function createConstellations() {
    var outerTex = makeOuterRingTex();
    var innerTex = makeInnerRingTex();

    // ─── Main Chakra (Hero area) ───
    var size = isMobile ? 140 : 130;
    size *= vs;

    grahaChakra = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: outerTex, side: THREE.DoubleSide,
        transparent: true, opacity: isMobile ? 0.35 : 0.45,
        depthWrite: false, blending: THREE.AdditiveBlending
      })
    );
    // On mobile, center it behind the phone mockup (x=0), closer to camera
    // On desktop, center behind right-column phone mockup, moved up
    grahaChakra.position.set(isMobile ? 0 : 65 * vs, isMobile ? 8 * vs : 14 * vs, isMobile ? -5 : -8);
    grahaChakra.rotation.x = isMobile ? 0.1 : 0.25;
    scene.add(grahaChakra);

    // ─── Inner accent ring (hero, spins faster, counter-direction) ───
    var size1b = size * 0.55;
    grahaChakra2 = new THREE.Mesh(
      new THREE.PlaneGeometry(size1b, size1b),
      new THREE.MeshBasicMaterial({
        map: innerTex, side: THREE.DoubleSide,
        transparent: true, opacity: isMobile ? 0.25 : 0.35,
        depthWrite: false, blending: THREE.AdditiveBlending
      })
    );
    grahaChakra2.position.copy(grahaChakra.position);
    grahaChakra2.rotation.x = isMobile ? 0.1 : 0.25;
    scene.add(grahaChakra2);

    // ─── Second full Chakra (pricing area) ───
    var size3 = isMobile ? 45 : 75;
    size3 *= vs;
    grahaChakra3 = new THREE.Mesh(
      new THREE.PlaneGeometry(size3, size3),
      new THREE.MeshBasicMaterial({
        map: outerTex, side: THREE.DoubleSide,
        transparent: true, opacity: 0.2,
        depthWrite: false, blending: THREE.AdditiveBlending
      })
    );
    grahaChakra3.position.set(isMobile ? -10 * vs : -32 * vs, 0, -22);
    grahaChakra3.rotation.x = -0.25;
    scene.add(grahaChakra3);

    // ─── Orbiting particles around main chakra ───
    createChakraParticles();

    // Register for scroll positioning
    // On mobile, chakra 1 & 2 are NOT in bodies — they're positioned
    // relative to camera in animate() to stay behind the phone mockup.
    if (!isMobile) {
      bodies.push({
        mesh: grahaChakra, rot: 0,
        bob: 0.07, bobA: 2, par: 0.004,
        section: 0.01, sideX: 52
      });
      bodies.push({
        mesh: grahaChakra2, rot: 0,
        bob: 0.07, bobA: 2, par: 0.004,
        section: 0.01, sideX: 52
      });
    }
    bodies.push({
      mesh: grahaChakra3, rot: 0,
      bob: 0.05, bobA: 1.5, par: 0.006,
      section: 0.65, sideX: isMobile ? -10 : -32
    });
  }

  /* ── SHOOTING STARS ─────────────────────────────────────────────── */
  function spawnShooter() {
    var n=30, g=new THREE.BufferGeometry();
    var p=new Float32Array(n*3), a=new Float32Array(n);
    // Spawn near current camera Y position so shooting stars are always visible
    var camY = -scrollY * 0.12;
    var sx=(Math.random()-0.5)*200*vs, sy=camY+30*vs+Math.random()*60*vs, sz=-60-Math.random()*150;
    for(var i=0;i<n;i++){p[i*3]=sx;p[i*3+1]=sy;p[i*3+2]=sz;a[i]=0;}
    g.setAttribute('position',new THREE.BufferAttribute(p,3));
    g.setAttribute('alpha',new THREE.BufferAttribute(a,1));
    var mt=new THREE.ShaderMaterial({
      uniforms:{col:{value:new THREE.Color(0xFFEECC)}},
      vertexShader:'attribute float alpha;varying float va;void main(){va=alpha;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=mix(1.0,5.0,alpha)*(120.0/-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader:'uniform vec3 col;varying float va;void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;gl_FragColor=vec4(col,smoothstep(0.5,0.0,d)*va);}',
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    });
    var pts=new THREE.Points(g,mt); scene.add(pts);
    var ang=(15+Math.random()*35)*Math.PI/180, spd=1.5+Math.random()*2.5, sgn=Math.random()>0.5?1:-1;
    shootingStars.push({pts:pts,geo:g,hx:sx,hy:sy,hz:sz,
      vx:Math.cos(ang)*spd*sgn,vy:-Math.sin(ang)*spd,vz:spd*0.2,n:n,life:1,decay:0.005+Math.random()*0.008});
  }

  function updateShooters() {
    for(var i=shootingStars.length-1;i>=0;i--){
      var s=shootingStars[i]; s.hx+=s.vx;s.hy+=s.vy;s.hz+=s.vz;s.life-=s.decay;
      var p=s.geo.attributes.position.array, a=s.geo.attributes.alpha.array;
      for(var j=s.n-1;j>0;j--){p[j*3]=p[(j-1)*3];p[j*3+1]=p[(j-1)*3+1];p[j*3+2]=p[(j-1)*3+2];a[j]=a[j-1]*0.91;}
      p[0]=s.hx;p[1]=s.hy;p[2]=s.hz;a[0]=s.life;
      s.geo.attributes.position.needsUpdate=true; s.geo.attributes.alpha.needsUpdate=true;
      if(s.life<=0){scene.remove(s.pts);s.geo.dispose();s.pts.material.dispose();shootingStars.splice(i,1);}
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     COSMIC STORM — Volumetric Nebula for Kendara Section
     ══════════════════════════════════════════════════════════════════ */
  function createCosmicStorm() {
    stormGroup = new THREE.Group();
    var sSize = isMobile ? 85 : 140;
    sSize *= vs;

    /* Nebula Cloud — GLSL volumetric shader */
    var cloudMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, intensity: { value: 0.5 } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform float time, intensity;',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);',
        '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
        'float fbm(vec2 p){float v=0.0,a=0.5;mat2 rot=mat2(0.8,-0.6,0.6,0.8);',
        '  for(int i=0;i<5;i++){v+=a*noise(p);p=rot*p*2.0+0.2;a*=0.5;}return v;}',
        'void main(){',
        '  vec2 uv=(vUv-0.5)*2.5;',
        '  vec2 q=vec2(fbm(uv+0.01*time),fbm(uv+vec2(1.0)));',
        '  vec2 r=vec2(fbm(uv+1.0*q+vec2(1.7,9.2)+0.06*time),fbm(uv+1.0*q+vec2(8.3,2.8)+0.04*time));',
        '  vec2 s=vec2(fbm(uv+0.8*r+vec2(5.1,3.7)+0.03*time),fbm(uv+0.8*r+vec2(2.9,6.1)+0.02*time));',
        '  float f=fbm(uv+s);',
        '  vec3 deepVoid=vec3(0.01,0.01,0.04);',
        '  vec3 blueGas=vec3(0.08,0.15,0.45);',
        '  vec3 purpleHaze=vec3(0.25,0.08,0.35);',
        '  vec3 warmCore=vec3(0.95,0.65,0.25);',
        '  vec3 hotWhite=vec3(1.0,0.9,0.8);',
        '  vec3 col=mix(deepVoid,blueGas,clamp(f*1.8,0.0,1.0));',
        '  col=mix(col,purpleHaze,clamp(length(q)*0.8,0.0,1.0));',
        '  float oxyPocket=smoothstep(0.4,0.7,fbm(uv*3.0+r));',
        '  col=mix(col,vec3(0.1,0.35,0.6),oxyPocket*0.5);',
        '  float hAlpha=smoothstep(0.5,0.8,fbm(uv*2.5-s*0.5));',
        '  col=mix(col,vec3(0.5,0.1,0.3),hAlpha*0.4);',
        '  float coreMask=smoothstep(0.6,0.0,length(uv*vec2(0.7,1.5)));',
        '  float coreNoise=smoothstep(0.4,0.9,f*fbm(uv*2.0-time*0.08));',
        '  col=mix(col,warmCore,coreNoise*coreMask*0.85);',
        '  float hotSpots=smoothstep(0.75,0.95,f*fbm(uv*4.0+time*0.05));',
        '  col=mix(col,hotWhite,hotSpots*coreMask*0.6);',
        '  float d=length(uv*vec2(0.45,1.1));',
        '  float mask=smoothstep(1.3,0.2,d);',
        '  float dust=fbm(uv*4.5+r*2.0+vec2(time*0.02,0.0));',
        '  float dustLane=smoothstep(0.35,0.55,dust);',
        '  col*=0.4+0.6*dustLane;',
        '  float fineDust=fbm(uv*8.0+s);',
        '  col*=0.8+0.2*fineDust;',
        '  float rimGlow=smoothstep(0.2,0.8,d)*smoothstep(1.3,0.6,d);',
        '  col+=vec3(0.05,0.08,0.2)*rimGlow*0.8;',
        '  col*=mask*2.0;',
        '  float alpha=smoothstep(0.03,0.3,length(col))*mask*intensity;',
        '  gl_FragColor=vec4(col,alpha);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });

    stormClouds = new THREE.Mesh(
      new THREE.PlaneGeometry(sSize * 4.5, sSize * 2.8), cloudMat
    );
    stormClouds.rotation.z = -0.3;
    stormGroup.add(stormClouds);

    /* Star field particles inside the nebula */
    var pCount = isMobile ? 200 : 450;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(pCount * 3);
    var pCol = new Float32Array(pCount * 3);
    var pSz  = new Float32Array(pCount);
    for (var i = 0; i < pCount; i++) {
      var x = (Math.random() - 0.5) * sSize * 2.8;
      var ySpread = (Math.random() - 0.5) * sSize * 0.9;
      ySpread *= (1.0 - Math.abs(x) / (sSize * 2.8)) * 1.5 + 0.2;
      var y = ySpread, z = (Math.random() - 0.5) * 25;
      var cosR = Math.cos(-0.3), sinR = Math.sin(-0.3);
      pPos[i*3] = x * cosR - y * sinR;
      pPos[i*3+1] = x * sinR + y * cosR;
      pPos[i*3+2] = z;
      var pick = Math.random();
      if (pick < 0.5) { pCol[i*3]=0.95; pCol[i*3+1]=0.95; pCol[i*3+2]=1.0; }
      else if (pick < 0.8) { pCol[i*3]=1.0; pCol[i*3+1]=0.7; pCol[i*3+2]=0.2; }
      else { pCol[i*3]=1.0; pCol[i*3+1]=0.3; pCol[i*3+2]=0.8; }
      pSz[i] = 1.5 + Math.random() * 4.5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    pGeo.setAttribute('size', new THREE.BufferAttribute(pSz, 1));

    var starMat = new THREE.ShaderMaterial({
      uniforms: { time: {value:0}, pr: {value: renderer.getPixelRatio()}, intensity: {value:0.5} },
      vertexShader: [
        'attribute float size;attribute vec3 color;varying vec3 vc;varying float va;',
        'uniform float time,pr,intensity;',
        'void main(){vc=color;float twinkle=sin(time*3.0+float(gl_VertexID)*17.0)*0.3+0.7;',
        'va=twinkle*intensity;vec4 mv=modelViewMatrix*vec4(position,1.0);',
        'gl_PointSize=size*pr*twinkle*(130.0/-mv.z);gl_Position=projectionMatrix*mv;}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vc;varying float va;',
        'void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;',
        'float core=smoothstep(0.5,0.05,d);float glow=exp(-d*d*18.0);',
        'gl_FragColor=vec4(vc,(core*0.9+glow*0.5)*va*1.2);}'
      ].join('\n'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });

    var nebulaStars = new THREE.Points(pGeo, starMat);
    stormGroup.add(nebulaStars);
    nebulaStars.userData.isStormSparks = true;

    /* Position at the Kendara section */
    stormGroup.position.set(0, 0, isMobile ? -35 : -45);
    scene.add(stormGroup);

    var stSection = isMobile ? 0.53 : 0.56;
    stormSection = stSection;

    bodies.push({
      mesh: stormGroup, rot: 0, bob: 0.15,
      bobA: isMobile ? 1.5 : 1.0, par: 0.015,
      orbitR: isMobile ? 2 : 0, orbitS: 0.05, orbitOff: 0,
      sideX: 0, section: stSection
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     COSMIC EYES — Hypnotic Twin Eyes for Porondam Section
     ══════════════════════════════════════════════════════════════════ */
  function createCosmicEyes() {
    cosmicEyes = new THREE.Group();
    var eSize = (isMobile ? 28 : 50) * vs;

    function makeEye(xOff) {
      var eyeMat = new THREE.ShaderMaterial({
        uniforms: { time: {value:0}, intensity: {value:0.5} },
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: [
          'precision highp float;',
          'varying vec2 vUv;uniform float time,intensity;',
          'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
          'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);',
          '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
          'float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.1;a*=0.5;}return v;}',
          'void main(){',
          '  vec2 uv=(vUv-0.5)*2.0;',
          '  float r=length(uv);',
          '  float ang=atan(uv.y,uv.x);',
          '  float pupil=smoothstep(0.18,0.12,r);',
          '  float iris=smoothstep(0.6,0.15,r)-pupil;',
          '  float irisPattern=fbm(vec2(ang*3.0,r*6.0-time*0.3));',
          '  vec3 irisCol=mix(vec3(0.6,0.1,0.8),vec3(0.2,0.6,1.0),irisPattern);',
          '  irisCol+=vec3(1.0,0.8,0.4)*smoothstep(0.25,0.18,r)*0.5;',
          '  float glow=exp(-r*r*4.0);',
          '  vec3 col=irisCol*iris+vec3(0.01)*pupil;',
          '  col+=vec3(0.3,0.2,0.6)*glow*0.3;',
          '  float rays=sin(ang*12.0+time*0.5)*0.5+0.5;',
          '  col+=vec3(0.5,0.3,1.0)*rays*iris*0.3;',
          '  float outer=smoothstep(0.8,0.55,r);',
          '  float alpha=outer*intensity;',
          '  gl_FragColor=vec4(col,alpha);',
          '}'
        ].join('\n'),
        transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
      var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(eSize, eSize), eyeMat
      );
      mesh.position.x = xOff;
      return mesh;
    }

    var leftEye = makeEye(isMobile ? -eSize * 0.6 : -eSize * 0.7);
    var rightEye = makeEye(isMobile ? eSize * 0.6 : eSize * 0.7);
    cosmicEyes.add(leftEye);
    cosmicEyes.add(rightEye);

    cosmicEyes.position.set(0, 0, isMobile ? -30 : -40);
    scene.add(cosmicEyes);

    var eyeSection = isMobile ? 0.63 : 0.66;
    bodies.push({
      mesh: cosmicEyes, rot: 0, bob: 0.1,
      bobA: 1.0, par: 0.01,
      orbitR: 0, orbitS: 0, orbitOff: 0,
      sideX: 0, section: eyeSection
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     SOLAR ECLIPSE — For Full Report Section
     ══════════════════════════════════════════════════════════════════ */
  function createSolarEclipse() {
    var eclipseGroup = new THREE.Group();
    var eSize = (isMobile ? 50 : 85) * vs;

    var eclipseMat = new THREE.ShaderMaterial({
      uniforms: { time: {value:0}, intensity: {value:0.5} },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: [
        'precision highp float;',
        'varying vec2 vUv;uniform float time,intensity;',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
        'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);',
        '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
        'void main(){',
        '  vec2 uv=(vUv-0.5)*2.0;',
        '  float r=length(uv);',
        '  float ang=atan(uv.y,uv.x);',
        '  float moonMask=smoothstep(0.32,0.28,r);',
        '  float corona=exp(-pow(r-0.3,2.0)*15.0)*(1.0-moonMask);',
        '  float rays=noise(vec2(ang*8.0,time*0.2))*0.5+0.5;',
        '  corona*=0.6+0.4*rays;',
        '  float outerCorona=exp(-pow(r-0.3,2.0)*3.0)*(1.0-moonMask);',
        '  outerCorona*=noise(vec2(ang*4.0+time*0.1,r*5.0))*0.6+0.4;',
        '  vec3 col=vec3(0.0);',
        '  col+=vec3(1.0,0.85,0.6)*corona*2.5;',
        '  col+=vec3(0.8,0.4,0.15)*outerCorona*1.2;',
        '  col+=vec3(0.3,0.15,0.05)*exp(-r*r*1.5)*(1.0-moonMask)*0.5;',
        '  float prominence=noise(vec2(ang*6.0+time*0.3,2.0))*exp(-pow(r-0.35,2.0)*20.0);',
        '  col+=vec3(1.0,0.3,0.1)*prominence*(1.0-moonMask);',
        '  float diamondRing=exp(-pow(r-0.3,2.0)*80.0)*smoothstep(0.0,0.1,sin(ang*2.0+time*0.5)*0.5+0.3);',
        '  col+=vec3(1.0,1.0,0.9)*diamondRing*2.0;',
        '  float alpha=smoothstep(1.0,0.3,r)*intensity*(1.0-moonMask*0.95);',
        '  alpha=max(alpha,corona*intensity*0.8);',
        '  gl_FragColor=vec4(col,alpha);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });

    var eclipseMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(eSize * 2.5, eSize * 2.5), eclipseMat
    );
    eclipseGroup.add(eclipseMesh);
    eclipseGroup.position.set(0, 0, isMobile ? -25 : -35);
    scene.add(eclipseGroup);

    var eclipseSection = isMobile ? 0.76 : 0.78;
    bodies.push({
      mesh: eclipseGroup, rot: 0, bob: 0.08,
      bobA: 0.8, par: 0.01,
      orbitR: 0, orbitS: 0, orbitOff: 0,
      sideX: 0, section: eclipseSection
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     COSMIC DUST — Ambient floating particles for depth
     ══════════════════════════════════════════════════════════════════ */
  function createCosmicDust() {
    var count = isMobile ? 300 : 800;
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    var col = new Float32Array(count * 3);
    var sz  = new Float32Array(count);
    var spread = 400 * vs;

    for (var i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * spread;
      pos[i*3+1] = (Math.random() - 0.5) * spread * 2;
      pos[i*3+2] = -10 - Math.random() * 80;
      var c = 0.3 + Math.random() * 0.4;
      var tint = Math.random();
      if (tint < 0.3) { col[i*3]=c*0.7; col[i*3+1]=c*0.8; col[i*3+2]=c*1.2; }
      else if (tint < 0.6) { col[i*3]=c*1.1; col[i*3+1]=c*0.7; col[i*3+2]=c*1.0; }
      else { col[i*3]=c; col[i*3+1]=c; col[i*3+2]=c; }
      sz[i] = 0.5 + Math.random() * 2.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));

    var dustMat = new THREE.ShaderMaterial({
      uniforms: { time: {value:0}, pr: {value: renderer.getPixelRatio()} },
      vertexShader: [
        'attribute float size;attribute vec3 color;varying vec3 vc;varying float va;',
        'uniform float time,pr;',
        'void main(){vc=color;float tw=sin(time*1.5+float(gl_VertexID)*7.3)*0.3+0.7;',
        'va=tw*0.4;vec4 mv=modelViewMatrix*vec4(position,1.0);',
        'gl_PointSize=size*pr*tw*(100.0/-mv.z);gl_Position=projectionMatrix*mv;}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vc;varying float va;',
        'void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;',
        'float a=smoothstep(0.5,0.1,d)*va;gl_FragColor=vec4(vc,a);}'
      ].join('\n'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });

    cosmicDust = new THREE.Points(geo, dustMat);
    scene.add(cosmicDust);
  }

  /* ══════════════════════════════════════════════════════════════════
     COSMIC CLOUD PLANES — Layered translucent fog planes
     ══════════════════════════════════════════════════════════════════ */
  function createCosmicCloudPlanes() {
    cosmicCloudPlanes = [];
    var planeCount = isMobile ? 3 : 6;
    var cloudSize = (isMobile ? 120 : 200) * vs;

    for (var i = 0; i < planeCount; i++) {
      var cMat = new THREE.ShaderMaterial({
        uniforms: { time: {value:0}, seed: {value: i * 17.3}, intensity: {value:0.15} },
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: [
          'precision highp float;',
          'varying vec2 vUv;uniform float time,seed,intensity;',
          'float hash(vec2 p){return fract(sin(dot(p+seed,vec2(127.1,311.7)))*43758.5453);}',
          'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);',
          '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
          'float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<3;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}',
          'void main(){',
          '  vec2 uv=vUv*3.0+time*0.02;',
          '  float f=fbm(uv);',
          '  float d=length(vUv-0.5);',
          '  float mask=smoothstep(0.5,0.15,d);',
          '  vec3 col=mix(vec3(0.05,0.05,0.2),vec3(0.15,0.08,0.25),f);',
          '  float alpha=f*mask*intensity*0.5;',
          '  gl_FragColor=vec4(col,alpha);',
          '}'
        ].join('\n'),
        transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });

      var plane = new THREE.Mesh(
        new THREE.PlaneGeometry(cloudSize, cloudSize * 0.5), cMat
      );
      plane.position.set(
        (Math.random() - 0.5) * 100 * vs,
        (Math.random() - 0.5) * 300 * vs,
        -50 - i * 15
      );
      plane.rotation.z = Math.random() * Math.PI * 0.5;
      scene.add(plane);
      cosmicCloudPlanes.push(plane);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     EVENTS
     ══════════════════════════════════════════════════════════════════ */
  function bindEvents() {
    window.addEventListener('resize', function () {
      calcViewScale();
      isMobile = vw < 768;
      camera.aspect = vw / vh;
      camera.updateProjectionMatrix();
      renderer.setSize(vw, vh);
    });
    window.addEventListener('scroll', function () {
      scrollY = window.pageYOffset || 0;
      scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      pageHeight = document.documentElement.scrollHeight;
    }, { passive: true });
    document.addEventListener('mousemove', function (e) {
      mouse.tx = (e.clientX / vw - 0.5) * 2;
      mouse.ty = (e.clientY / vh - 0.5) * 2;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (e.touches.length) {
        mouse.tx = (e.touches[0].clientX / vw - 0.5) * 2;
        mouse.ty = (e.touches[0].clientY / vh - 0.5) * 2;
      }
    }, { passive: true });
  }

  /* ══════════════════════════════════════════════════════════════════
     ANIMATE
     ══════════════════════════════════════════════════════════════════ */
  var shootT = 0, nextShoot = 0.3 + Math.random() * 0.8;

  // Section-aware fog colors — lerped based on scroll fraction
  var fogColors = [
    { at: 0.00, r: 0.016, g: 0.012, b: 0.047 }, // Hero — deep indigo
    { at: 0.15, r: 0.030, g: 0.015, b: 0.070 }, // Features — purple nebula
    { at: 0.30, r: 0.040, g: 0.028, b: 0.012 }, // How — golden warmth
    { at: 0.45, r: 0.010, g: 0.025, b: 0.045 }, // Screenshots — teal void
    { at: 0.60, r: 0.025, g: 0.010, b: 0.060 }, // Pricing — rich indigo
    { at: 0.75, r: 0.035, g: 0.015, b: 0.030 }, // Testimonials — warm rose
    { at: 0.85, r: 0.015, g: 0.010, b: 0.035 }, // FAQ — calm deep space
    { at: 1.00, r: 0.040, g: 0.025, b: 0.010 }, // Download — golden energy
  ];

  function lerpFogColor(frac) {
    var a = fogColors[0], b = fogColors[fogColors.length - 1];
    for (var i = 0; i < fogColors.length - 1; i++) {
      if (frac >= fogColors[i].at && frac <= fogColors[i + 1].at) {
        a = fogColors[i]; b = fogColors[i + 1]; break;
      }
    }
    var range = b.at - a.at;
    var t = range > 0 ? (frac - a.at) / range : 0;
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t
    };
  }

  function animate() {
    requestAnimationFrame(animate);
    var dt = clock.getDelta(), t = clock.getElapsedTime();
    mouse.x += (mouse.tx - mouse.x) * 0.03;
    mouse.y += (mouse.ty - mouse.y) * 0.03;

    // Scroll progress 0→1
    var scrollFrac = scrollMax > 1 ? scrollY / scrollMax : 0;

    // Dynamic fog color shift based on section
    var fc = lerpFogColor(scrollFrac);
    scene.fog.color.setRGB(fc.r, fc.g, fc.b);
    renderer.setClearColor(scene.fog.color, 1);

    // Total 3D vertical range the camera will travel
    var totalRange = scrollMax * CAM_SCROLL_RATE;

    // Camera follows scroll
    var camScrollY = -scrollY * CAM_SCROLL_RATE;
    camera.position.y = camScrollY;
    camera.position.x = mouse.x * (isMobile ? 2 : 4);
    camera.position.z = 100;
    camera.rotation.x = mouse.y * 0.008;
    camera.rotation.y = mouse.x * 0.008;

    // Stars
    if (starField) { starField.rotation.y = t * 0.005 + mouse.x * 0.03; starField.rotation.x = t * 0.002 + mouse.y * 0.015; starField.material.uniforms.time.value = t; }
    if (starFieldFar) { starFieldFar.rotation.y = t * 0.002 + mouse.x * 0.01; starFieldFar.material.uniforms.time.value = t; }
    if (milkyWay) { milkyWay.rotation.z = 0.4 + t * 0.001; milkyWay.material.uniforms.time.value = t; }

    // Aurora waves — update time + drift + scroll-reactive intensity + color cycling
    var _tmpCol = new THREE.Color(); // reuse to avoid GC
    var _tmpHsl = { h: 0, s: 0, l: 0 };
    // Boost intensity when near hero section (top of page)
    var heroProximity = 1.0 - Math.min(scrollFrac * 3.0, 1.0); // 1.0 at top, fades by 33% scroll
    var intensityBoost = 0.7 + heroProximity * 0.5; // range 0.7 — 1.2

    auroraMeshes.forEach(function (a, idx) {
      a.material.uniforms.time.value = t;

      // More dynamic movement — sinusoidal drift with varying speeds
      var driftX = Math.sin(t * 0.06 + idx * 2.0) * 25 + Math.cos(t * 0.03 + idx) * 10;
      var driftY = Math.sin(t * 0.04 + idx * 1.5) * 8;
      a.position.y = a.userData.baseY + camScrollY * (0.15 + idx * 0.05) + driftY;
      a.position.x = a.userData.baseX + driftX;

      // Gentle rotation oscillation for more organic feel
      a.rotation.z += Math.sin(t * 0.02 + idx * 0.7) * 0.00008;

      // Scroll-reactive intensity
      var baseInt = a.userData.baseIntensity || 1.0;
      a.material.uniforms.intensity.value = baseInt * intensityBoost;

      // Slow color cycling for aurora curtains
      if (a.userData.baseColors) {
        var hueShift = Math.sin(t * 0.012 + idx * 1.5) * 0.22;
        for (var ci = 0; ci < 3; ci++) {
          var bc = a.userData.baseColors[ci];
          _tmpCol.setRGB(bc[0], bc[1], bc[2]);
          _tmpCol.getHSL(_tmpHsl);
          _tmpCol.setHSL((_tmpHsl.h + hueShift + 1.0) % 1.0, Math.min(1.0, _tmpHsl.s * 1.1), _tmpHsl.l);
          var uName = ci === 0 ? 'color1' : ci === 1 ? 'color2' : 'color3';
          a.material.uniforms[uName].value.set(_tmpCol.r, _tmpCol.g, _tmpCol.b);
        }
      }
    });

    // Pricing nebula — position group at the pricing section and animate
    if (pricingNebulaGroup) {
      // Pricing is at section 0.80
      var nebulaY = -(0.80 * totalRange);
      pricingNebulaGroup.position.y = nebulaY;

      // Animate individual children within the group
      pricingNebulaGroup.children.forEach(function (ch) {
        // Sprite cloud drift
        if (ch.isSprite && ch.userData.spd) {
          var u = ch.userData;
          ch.position.x = u.bx + Math.sin(t * u.spd * 600 + u.off) * 15;
          ch.position.y = u.byOff + Math.cos(t * u.spd * 400 + u.off) * 10;
          // Breathing — gas clouds expand and contract
          var breathe = 1.0 + Math.sin(t * u.spd * 200 + u.off) * 0.08;
          var bs = u.baseScale * breathe;
          ch.scale.set(bs, bs, 1);
          ch.material.opacity = u.bo * (0.6 + 0.4 * Math.sin(t * u.spd * 900 + u.off));
          // Slow color cycling — shift hue over time
          var hueShift = Math.sin(t * 0.012 + u.off) * 0.15; // ±15% hue shift
          var newH = (u.baseH + hueShift + 1.0) % 1.0;
          var satBoost = 1.0 + Math.sin(t * 0.008 + u.off * 2.0) * 0.15;
          ch.material.color.setHSL(newH, Math.min(1.0, u.baseS * satBoost), u.baseL);
        }
        // Shader nebula gas — time drives the curl-noise flow
        if (ch.userData.isNebulaShader) {
          ch.material.uniforms.time.value = t;
          ch.rotation.z += 0.00015;
        }
        // Star-birth particle system
        if (ch.userData.isStarBirth) {
          ch.material.uniforms.time.value = t;
          ch.rotation.z = t * 0.008; // slow overall rotation
        }
      });
    }

    // Bodies — Y is computed from section fraction * total camera travel range
    // so planets are always evenly distributed across the actual scrollable page
    bodies.forEach(function (b) {
      var by = Math.sin(t * b.bob) * b.bobA;
      var bx = Math.cos(t * b.bob * 0.7) * b.bobA * 0.4;
      var mx = mouse.x * b.par * (isMobile ? 20 : 60);
      var my = mouse.y * b.par * (isMobile ? 10 : 30);

      // Orbital motion — continuous circular/elliptical orbit
      var ox = 0, oy = 0;
      if (b.orbitR) {
        ox = Math.cos(t * b.orbitS + b.orbitOff) * b.orbitR;
        oy = Math.sin(t * b.orbitS + b.orbitOff) * b.orbitR * 0.5;
      }

      // Horizontal drift tied to scroll — planet slowly crosses from side to side
      var scrollDrift = Math.sin(scrollFrac * Math.PI * 2 + (b.orbitOff || 0)) * (isMobile ? 5 : 15) * vs;

      // Y position: place planet at its section of the total scroll range
      // section 0.0 = top of page, section 1.0 = bottom of page
      var sectionY = -(b.section * totalRange);

      b.mesh.position.x = (b.sideX || 0) * vs + bx + mx + ox + scrollDrift;
      b.mesh.position.y = sectionY + by + my + oy;
      b.mesh.rotation.y += b.rot;
      if (b.ring) b.ring.position.copy(b.mesh.position);
      if (b.atmo) b.atmo.position.copy(b.mesh.position);
    });

    // Graha Chakra rotation — multi-layer spectacular spin
    if (grahaChakra) {
      grahaChakra.rotation.z = t * 0.06;
      // On mobile: lock chakra behind phone mockup, relative to camera
      if (isMobile) {
        // Phone mockup is centered horizontally, near top ~30% of viewport
        // Camera is at (camX, camScrollY, 100), chakra is at z=-5 (95 units in front)
        // At FOV 55, half vertical visible at z=95 is: tan(27.5°) * 95 ≈ 49 units
        // Top 30% of screen ≈ camera.y + 49 * 0.4 ≈ +20 units above center
        var phoneCenterY = camera.position.y + 18 * vs;
        grahaChakra.position.x = camera.position.x * 0.2; // slight parallax
        grahaChakra.position.y = phoneCenterY;
      }
    }
    if (grahaChakra2) {
      grahaChakra2.rotation.z = -t * 0.12; // inner ring counter-spins faster
      grahaChakra2.position.copy(grahaChakra.position); // stay locked to main
    }
    if (grahaChakra3) {
      grahaChakra3.rotation.z = -t * 0.04;
    }
    // Orbiting particles follow main chakra position
    if (chakraParticles && grahaChakra) {
      chakraParticles.position.x = grahaChakra.position.x;
      chakraParticles.position.y = grahaChakra.position.y;
      chakraParticles.rotation.z = t * 0.15;
      chakraParticles.rotation.x = isMobile ? 0.1 : 0.25;
      chakraParticles.material.uniforms.time.value = t;
    }

    // Nebula drift
    scene.children.forEach(function (ch) {
      if (ch.isSprite && ch.userData.spd) {
        var u = ch.userData;
        ch.position.x = u.bx + Math.sin(t * u.spd * 500 + u.off) * 10;
        ch.position.y = u.by + Math.cos(t * u.spd * 300 + u.off) * 6 - scrollY * 0.02;
        ch.material.opacity = u.bo * (0.7 + 0.3 * Math.sin(t * u.spd * 800 + u.off));
      }
    });

    // Shooting stars
    shootT += dt;
    if (shootT > nextShoot) { spawnShooter(); shootT = 0; nextShoot = 0.2 + Math.random() * 0.8; }
    updateShooters();

    // ── Cosmic Storm update ──
    if (stormGroup && stormClouds) {
      var stDist = Math.abs(scrollFrac - stormSection);
      var stInt = 1.0 - Math.min(stDist * 3.5, 1.0);
      stInt = stInt * stInt;
      stormClouds.material.uniforms.time.value = t;
      stormClouds.material.uniforms.intensity.value = stInt * 0.9;
      stormGroup.children.forEach(function(ch) {
        if (ch.userData && ch.userData.isStormSparks) {
          ch.material.uniforms.time.value = t;
          ch.material.uniforms.intensity.value = stInt;
        }
      });
      stormGroup.rotation.z += 0.0001;
      stormGroup.rotation.x = Math.sin(t * 0.3) * 0.015;
    }

    // ── Cosmic Eyes update ──
    if (cosmicEyes) {
      cosmicEyes.children.forEach(function(eye) {
        if (eye.material && eye.material.uniforms) {
          eye.material.uniforms.time.value = t;
          var eyeSec = 0.66;
          var eyeDist = Math.abs(scrollFrac - eyeSec);
          var eyeInt = 1.0 - Math.min(eyeDist * 3.5, 1.0);
          eye.material.uniforms.intensity.value = eyeInt * eyeInt * 0.85;
        }
      });
    }

    // ── Solar Eclipse update ──
    if (scene) {
      scene.children.forEach(function(ch) {
        if (ch.isGroup && ch.children.length === 1 && ch.children[0].material &&
            ch.children[0].material.uniforms && ch.children[0].material.uniforms.time) {
          var m = ch.children[0].material;
          if (m.fragmentShader && typeof m.fragmentShader === 'undefined') return;
          // Eclipse bodies are identified by their section
        }
      });
    }

    // ── Cosmic Dust drift ──
    if (cosmicDust && cosmicDust.material && cosmicDust.material.uniforms) {
      cosmicDust.material.uniforms.time.value = t;
      cosmicDust.position.y = -scrollY * 0.008;
    }

    // ── Cosmic Cloud Planes drift ──
    if (cosmicCloudPlanes) {
      cosmicCloudPlanes.forEach(function(p) {
        if (p.material && p.material.uniforms) {
          p.material.uniforms.time.value = t;
          p.position.y += Math.sin(t * 0.2 + p.position.x * 0.01) * 0.003;
        }
      });
    }

    renderer.render(scene, camera);
  }

  /* ══════════════════════════════════════════════════════════════════
     START
     ══════════════════════════════════════════════════════════════════ */
  function start() {
    THREE = window.THREE;
    if (!THREE) { console.warn('Three.js not available'); showFallback(); return; }
    console.log('Cosmos3D v5 — Three.js r' + THREE.REVISION);
    init();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); }
  else { start(); }
})();
