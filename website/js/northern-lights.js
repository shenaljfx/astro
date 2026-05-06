/* Northern Lights — Photo-Realistic Aurora Borealis
   Inspired by real-world aurora physics:
   - 557.7nm oxygen emission → dominant green (lower curtain)
   - 630.0nm oxygen emission → red/pink (upper edges, high altitude)
   - 427.8nm nitrogen emission → blue/violet (bottom rare bands)
   Single full-screen shader (no overlapping ribbons), realistic curtain
   physics: wavy centerline + vertical rays + folding turbulence + altitude
   color mapping that mirrors real atmospheric emission spectra.
*/
(function () {
  'use strict';

  var canvas = document.getElementById('heroAurora');
  if (!canvas || typeof THREE === 'undefined') return;

  var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  var dpr = isMobile ? 0.5 : Math.min(window.devicePixelRatio || 1, 0.9);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power'
  });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  var vertexShader = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var fragmentShader = [
    'precision highp float;',
    'uniform float uTime;',
    'uniform vec2  uResolution;',
    'varying vec2 vUv;',
    '',
    'float hash21(vec2 p){ p = fract(p*vec2(234.34, 435.345)); p += dot(p, p+34.23); return fract(p.x*p.y); }',
    'float noise2(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f*f*(3.0-2.0*f);',
    '  float a = hash21(i);',
    '  float b = hash21(i+vec2(1,0));',
    '  float c = hash21(i+vec2(0,1));',
    '  float d = hash21(i+vec2(1,1));',
    '  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v=0.0, a=0.5;',
    '  for(int i=0;i<6;i++){ v += a*noise2(p); p = p*2.07 + vec2(13.7, 7.3); a *= 0.55; }',
    '  return v;',
    '}',
    '// Domain-warped FBM for chaotic gas swirls',
    'float fbmWarp(vec2 p, float t){',
    '  vec2 q = vec2(fbm(p + vec2(t*0.07, 0.0)), fbm(p + vec2(5.2, t*0.11)));',
    '  vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7, 9.2) + t*0.13), fbm(p + 4.0*q + vec2(8.3, 2.8) - t*0.09));',
    '  return fbm(p + 4.0*r);',
    '}',
    '',
    'float aurora(vec2 uv, float t, float band){',
    '  float scrollX = uv.x * 1.5 + t * 0.05 + band * 11.7;',
    '  // Multi-harmonic wavy centerline (more chaotic)',
    '  float wave1 = sin(scrollX * 1.1 + t * 0.22) * 0.14;',
    '  float wave2 = sin(scrollX * 2.4 - t * 0.18) * 0.09;',
    '  float wave3 = sin(scrollX * 4.8 + t * 0.34) * 0.05;',
    '  float wave4 = sin(scrollX * 9.3 - t * 0.27) * 0.025;',
    '  // Big domain-warped vertical drift — gives that "chaotic gas" billow',
    '  float drift = (fbmWarp(vec2(uv.x*1.8 + band*3.0, t*0.10), t) - 0.5) * 0.22;',
    '  float center = 0.50 + wave1 + wave2 + wave3 + wave4 + drift + band * 0.07;',
    '',
    '  float d = uv.y - center;',
    '',
    '  // Variable thickness — wider, gassier curtain',
    '  float thickness = 0.16 + 0.10 * fbm(vec2(uv.x*2.5 + t*0.06, band*2.0));',
    '  float curtain = exp(-pow(d/thickness, 2.0));',
    '',
    '  // Vertical rays — keep but slightly softer so gas wins',
    '  float rays = 0.55 + 0.45 * sin(uv.x * 70.0 + fbm(vec2(uv.x*6.0, t*0.4+band))*10.0);',
    '  rays *= 0.65 + 0.35 * sin(uv.x * 150.0 + t*0.8);',
    '',
    '  // Heavy gas turbulence using domain-warped noise — THIS is the chaotic gassy feel',
    '  float gas = fbmWarp(vec2(uv.x*3.5 + t*0.10, uv.y*4.0 + t*0.08 + band*4.0), t);',
    '  gas = smoothstep(0.20, 0.85, gas);',
    '',
    '  // Wisps — thin bright streaks that drift',
    '  float wisps = fbm(vec2(uv.x*8.0 - t*0.15, uv.y*15.0 + t*0.20 + band*5.0));',
    '  wisps = smoothstep(0.55, 0.85, wisps) * 0.6;',
    '',
    '  float topFade = smoothstep(1.0, 0.30, uv.y);',
    '  float botFade = smoothstep(0.02, 0.18, uv.y);',
    '',
    '  return (curtain * (gas + 0.2) * (0.5 + rays * 0.5) + wisps * curtain) * topFade * botFade;',
    '}',
    '',
    'void main(){',
    '  vec2 uv = vUv;',
    '  float t = uTime;',
    '',
    '  float a1 = aurora(uv, t, 0.0);',
    '  float a2 = aurora(uv * vec2(1.0, 0.95) + vec2(0.0, 0.05), t * 1.15, 1.0) * 0.65;',
    '  float a3 = aurora(uv * vec2(1.0, 0.92) + vec2(0.0, 0.10), t * 0.85, 2.0) * 0.45;',
    '  float total = a1 + a2 + a3;',
    '',
    '  // Three-shade premium palette: deep indigo → royal purple → soft cyan',
    '  vec3 shadeA = vec3(0.25, 0.30, 0.85);',
    '  vec3 shadeB = vec3(0.65, 0.35, 0.95);',
    '  vec3 shadeC = vec3(0.35, 0.90, 1.00);',
    '',
    '  // Slow shade cycling so the three colors rotate gently across bands',
    '  float c1 = 0.5 + 0.5 * sin(t * 0.06);',
    '',
    '  float yLow  = smoothstep(0.40, 0.15, uv.y);',
    '  float yMid  = smoothstep(0.15, 0.40, uv.y) * smoothstep(0.90, 0.55, uv.y);',
    '  float yHigh = smoothstep(0.50, 0.95, uv.y);',
    '',
    '  // Three distinct shades, gently cross-fading between adjacent ones',
    '  vec3 lowCol  = mix(shadeA, shadeB, c1 * 0.4) * 0.95;',
    '  vec3 midCol  = mix(shadeB, shadeC, 0.4 + c1 * 0.3) * 1.10;',
    '  vec3 highCol = mix(shadeC, shadeB, c1 * 0.35) * 1.00;',
    '',
    '  vec3 col = vec3(0.0);',
    '  col += midCol  * yMid;',
    '  col += highCol * yHigh;',
    '  col += lowCol  * yLow;',
    '',
    '  col *= total;',
    '',
    '  float core = pow(clamp(total, 0.0, 1.0), 3.5);',
    '  col += vec3(0.85, 1.0, 0.95) * core * 0.30;',
    '',
    '  col = col / (1.0 + col * 0.6);',
    '  col = pow(col, vec3(0.85));',
    '',
    '  float alpha = clamp(total * 1.05, 0.0, 1.0);',
    '  alpha = pow(alpha, 0.65);',
    '',
    '  gl_FragColor = vec4(col, alpha);',
    '}'
  ].join('\n');

  var uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) }
  };

  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  var geometry = new THREE.PlaneGeometry(2, 2);
  var mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  function resize() {
    var width = window.innerWidth;
    var height = Math.min(window.innerHeight * 1.5, 1200);
    renderer.setSize(width, height);
    uniforms.uResolution.value.set(width, height);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }

  var resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 150);
  }, { passive: true });
  resize();

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function updateScrollFade() {
    if (prefersReduced) { canvas.style.opacity = '0.15'; return; }
    var scrollY = window.pageYOffset || window.scrollY || 0;
    var vh = window.innerHeight || 800;
    var fadeStart = vh * 0.6;
    var fadeEnd = vh * 1.5;
    var t = Math.max(0, Math.min(1, (scrollY - fadeStart) / (fadeEnd - fadeStart)));
    canvas.style.opacity = Math.max(0, 1.0 - t * t).toFixed(3);
  }

  window.addEventListener('scroll', updateScrollFade, { passive: true });
  updateScrollFade();

  var running = true;
  var startTime = performance.now();
  var frameCount = 0;

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && running) {
      startTime = performance.now() - (frameCount * 16.67);
      requestAnimationFrame(animate);
    }
  });

  if (prefersReduced) canvas.style.opacity = '0.15';

  function animate() {
    if (!running) return;
    frameCount++;
    if (isMobile && frameCount % 2 !== 0) { requestAnimationFrame(animate); return; }

    var elapsed = (performance.now() - startTime) / 1000;
    uniforms.uTime.value = elapsed * 0.45;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  canvas.style.transition = 'opacity 2.5s cubic-bezier(0.16, 1, 0.3, 1)';
  canvas.style.opacity = '0';

  requestAnimationFrame(function () {
    resize();
    updateScrollFade();
    running = true;
    animate();
  });

})();
