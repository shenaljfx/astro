/* Northern Lights — Aurora Borealis (PERFORMANCE OPTIMIZED)
   6 ribbons (down from 14), 50 segments (down from 120),
   2 noise octaves (down from 4), simplified color math,
   smaller canvas, lower DPR
*/
(function () {
  'use strict';

  var canvas = document.getElementById('heroAurora');
  if (!canvas || typeof THREE === 'undefined') return;

  var CONFIG = {
    ribbonCount: 6,           // down from 14
    ribbonSegments: 50,       // down from 120
    ribbonWidth: 0.65,
    waveSpeed: 0.14,
    verticalDrift: 0.06,
    opacity: 0.85
  };

  var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  var dpr = isMobile ? 0.4 : Math.min(window.devicePixelRatio || 1, 0.8);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: false,       // disabled for perf
    powerPreference: 'low-power'
  });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // ─── Simplified Aurora Shader ───
  var auroraVertexShader = [
    'varying vec2 vUv;',
    'varying float vAltitude;',
    'void main() {',
    '  vUv = uv;',
    '  vAltitude = position.y;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var auroraFragmentShader = [
    'precision mediump float;',  // mediump instead of highp
    'uniform float uTime;',
    'uniform float uRibbonIndex;',
    'uniform vec3 uBaseColor;',
    'uniform float uOpacity;',
    'varying vec2 vUv;',
    'varying float vAltitude;',
    '',
    '// Cheaper hash noise instead of simplex',
    'float hash(vec3 p) {',
    '  p = fract(p * vec3(443.897, 441.423, 437.195));',
    '  p += dot(p, p.yzx + 19.19);',
    '  return fract((p.x + p.y) * p.z);',
    '}',
    'float noise3(vec3 p) {',
    '  vec3 i = floor(p); vec3 f = fract(p);',
    '  f = f*f*(3.0-2.0*f);',
    '  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),',
    '    mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),',
    '    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),',
    '    mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);',
    '}',
    '',
    '// 2-octave FBM (down from 4)',
    'float fbm(vec3 p) {',
    '  return noise3(p) * 0.65 + noise3(p * 2.0 + 7.7) * 0.35;',
    '}',
    '',
    'vec3 auroraColor(float alt, float xPos, float time, float idx) {',
    '  vec3 green = vec3(0.05, 1.0, 0.35);',
    '  vec3 cyan  = vec3(0.0, 0.95, 0.9);',
    '  vec3 blue  = vec3(0.15, 0.5, 1.0);',
    '  vec3 violet = vec3(0.55, 0.1, 1.0);',
    '  vec3 pink  = vec3(1.0, 0.15, 0.55);',
    '  float a = clamp(alt * 0.5 + 0.5, 0.0, 1.0);',
    '  float n = fbm(vec3(xPos * 2.5 + time * 0.08, a * 3.0, idx + time * 0.05));',
    '  float pos = clamp(a + n * 0.2, 0.0, 1.0);',
    '  vec3 col = green;',
    '  col = mix(col, cyan, smoothstep(0.0, 0.25, pos));',
    '  col = mix(col, blue, smoothstep(0.18, 0.42, pos));',
    '  col = mix(col, violet, smoothstep(0.35, 0.62, pos));',
    '  col = mix(col, pink, smoothstep(0.55, 0.82, pos));',
    '  return col;',
    '}',
    '',
    'void main() {',
    '  float time = uTime;',
    '  float n1 = fbm(vec3(vUv.x * 2.0 + time * 0.15, vUv.y * 1.5, time * 0.08 + uRibbonIndex));',
    '  float n2 = fbm(vec3(vUv.x * 5.0 - time * 0.12, vUv.y * 3.0, time * 0.04 + uRibbonIndex * 2.0)) * 0.5;',
    '  float combined = n1 + n2;',
    '',
    '  float curtain = sin(vUv.x * 4.712 + time * 0.3 + uRibbonIndex * 2.0);',
    '  curtain = 0.6 + 0.4 * curtain;',
    '  float density = curtain * (0.5 + 0.5 * (0.5 + 0.5 * combined));',
    '',
    '  float vertDist = abs(vUv.y - 0.5) * 2.0;',
    '  float vertCore = exp(-vertDist * vertDist * 3.0);',
    '  vertCore = smoothstep(0.0, 0.3, vertCore);',
    '',
    '  float edgeFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);',
    '',
    '  float rays = 0.6 + 0.4 * sin(vUv.x * 35.0 + combined * 4.0 + time * 0.6);',
    '  rays *= 0.7 + 0.3 * sin(vUv.x * 80.0 + n2 * 3.0 + time * 0.9);',
    '',
    '  float intensity = density * vertCore * edgeFade * rays;',
    '  intensity = pow(clamp(intensity, 0.0, 1.0), 0.85);',
    '',
    '  vec3 color = auroraColor(vAltitude, vUv.x, time, uRibbonIndex);',
    '  color = mix(color, uBaseColor, 0.12);',
    '  color *= 2.0;',
    '  float lum = dot(color, vec3(0.299, 0.587, 0.114));',
    '  color = mix(vec3(lum), color, 1.3);',
    '',
    '  float alpha = intensity * uOpacity;',
    '  color = clamp(color, 0.0, 3.0);',
    '  gl_FragColor = vec4(color * alpha, alpha);',
    '}'
  ].join('\n');

  // ─── Create Aurora Ribbons (6 instead of 14) ───
  var ribbons = [];
  var ribbonColors = [
    new THREE.Color(0.0, 1.0, 0.45),
    new THREE.Color(0.1, 0.75, 1.0),
    new THREE.Color(0.55, 0.1, 1.0),
    new THREE.Color(1.0, 0.2, 0.55),
    new THREE.Color(0.2, 1.0, 0.6),
    new THREE.Color(0.8, 0.3, 1.0)
  ];

  for (var i = 0; i < CONFIG.ribbonCount; i++) {
    var ribbonHeight = CONFIG.ribbonWidth * (0.9 + Math.random() * 0.3);
    // 50 segments, 6 subdivisions (down from 120×12)
    var geometry = new THREE.PlaneGeometry(3.5, ribbonHeight, CONFIG.ribbonSegments, 6);

    var material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRibbonIndex: { value: i * 0.7 + Math.random() * 0.3 },
        uBaseColor: { value: ribbonColors[i % ribbonColors.length] },
        uOpacity: { value: CONFIG.opacity * (0.75 + Math.random() * 0.25) }
      },
      vertexShader: auroraVertexShader,
      fragmentShader: auroraFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    var ribbon = new THREE.Mesh(geometry, material);
    var totalSpread = 1.2;
    var baseY = -totalSpread / 2 + (i / (CONFIG.ribbonCount - 1)) * totalSpread;
    var randomOffset = (Math.random() - 0.5) * 0.15;
    ribbon.position.y = 0.15 + baseY + randomOffset;
    ribbon.position.x = Math.sin(i * 0.7) * 0.15 + (Math.random() - 0.5) * 0.2;
    ribbon.position.z = -0.015 * i;
    ribbon.rotation.z = (Math.random() - 0.5) * 0.03;

    ribbon.userData = {
      baseY: ribbon.position.y,
      phase: i * 0.9 + Math.random() * 3.0,
      speed: 0.4 + Math.random() * 0.6,
      waveAmp: 0.025 + Math.random() * 0.035
    };

    scene.add(ribbon);
    ribbons.push(ribbon);
  }

  // ─── Resize — smaller canvas ───
  function resize() {
    var hero = canvas.parentElement;
    if (!hero) return;
    var width = window.innerWidth;
    // Only cover 1.5 viewport heights (down from 2.8)
    var height = Math.min(window.innerHeight * 1.5, 1200);
    renderer.setSize(width, height);
    var aspect = width / height;
    camera.left = -aspect;
    camera.right = aspect;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }

  var resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 150);
  }, { passive: true });
  resize();

  // ─── Scroll fade ───
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

  // ─── Animation ───
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
    // Skip every other frame on mobile, every 3rd on desktop (was no-skip desktop)
    if (isMobile && frameCount % 3 !== 0) { requestAnimationFrame(animate); return; }
    if (!isMobile && frameCount % 2 !== 0) { requestAnimationFrame(animate); return; }

    var elapsed = (performance.now() - startTime) / 1000;

    for (var i = 0; i < ribbons.length; i++) {
      var ribbon = ribbons[i];
      var data = ribbon.userData;
      ribbon.material.uniforms.uTime.value = elapsed * data.speed;
      ribbon.position.y = data.baseY +
        Math.sin(elapsed * CONFIG.verticalDrift + data.phase) * data.waveAmp;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  // ─── Start ───
  canvas.style.transition = 'opacity 2.5s cubic-bezier(0.16, 1, 0.3, 1)';
  canvas.style.opacity = '0';

  requestAnimationFrame(function () {
    resize();
    updateScrollFade();
    running = true;
    animate();
  });

})();
