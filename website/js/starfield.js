/* ═══════════════════════════════════════════════════════════════════════
   Grahachara — Enhanced WebGL Starfield
   Realistic flickering/breathing stars + mouse parallax + evolving density
   GPU-driven, performance-optimized
   ═══════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false
  });

  if (!gl) {
    canvas.style.background = 'radial-gradient(ellipse at 50% 30%, #0C0628 0%, #04030C 100%)';
    return;
  }

  // ── Configuration ──
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  const DPR = Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5);
  const STAR_COUNT = isMobile ? 800 : 2000;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;
  let scrollY = 0;
  let animId = null;
  let isVisible = true;

  // ── Resize ──
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * DPR;
    canvas.height = height * DPR;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();
  window.addEventListener('resize', resize);

  // ── Mouse tracking for parallax ──
  document.addEventListener('mousemove', function(e) {
    targetMouseX = (e.clientX / width - 0.5) * 2.0;
    targetMouseY = (e.clientY / height - 0.5) * 2.0;
  });

  window.addEventListener('scroll', function() {
    scrollY = window.pageYOffset;
  }, { passive: true });

  // ── Visibility detection ──
  const observer = new IntersectionObserver(function(entries) {
    isVisible = entries[0].isIntersecting;
    if (isVisible && !animId) animate();
  }, { threshold: 0 });
  observer.observe(canvas);

  // ── Shaders ──
  const vertexSource = `
    attribute vec2 a_position;
    attribute float a_size;
    attribute float a_brightness;
    attribute float a_flickerSpeed;
    attribute float a_flickerPhase;
    attribute float a_colorTemp;
    attribute float a_depth;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_scroll;

    varying float v_brightness;
    varying float v_colorTemp;
    varying float v_alpha;

    void main() {
      // Parallax based on depth layer
      float parallaxStrength = a_depth * 0.015;
      vec2 offset = u_mouse * parallaxStrength;

      // Scroll parallax — stars drift vertically at different speeds based on depth
      float scrollParallax = u_scroll * a_depth * 0.3;
      offset.y += scrollParallax;

      // Scroll fade disabled — stars visible across all sections
      float scrollFade = 1.0;

      // Position with parallax
      vec2 pos = a_position + offset;

      // Wrap around edges
      pos = mod(pos + 1.0, 2.0) - 1.0;

      gl_Position = vec4(pos, 0.0, 1.0);

      // Star size varies by depth
      float baseSize = a_size * (0.5 + a_depth * 0.5);
      gl_PointSize = baseSize * (u_resolution.y / 800.0);

      // Realistic flickering: multiple sine waves for natural variation
      float flicker1 = sin(u_time * a_flickerSpeed + a_flickerPhase) * 0.3;
      float flicker2 = sin(u_time * a_flickerSpeed * 2.3 + a_flickerPhase * 1.7) * 0.15;
      float flicker3 = sin(u_time * a_flickerSpeed * 0.4 + a_flickerPhase * 0.5) * 0.2;
      float breathing = (flicker1 + flicker2 + flicker3);

      // Scintillation (rapid twinkling for brighter stars)
      float scintillation = sin(u_time * a_flickerSpeed * 5.0 + a_flickerPhase * 3.14) * 0.1 * a_brightness;

      v_brightness = a_brightness + breathing * a_brightness + scintillation;
      v_brightness = clamp(v_brightness, 0.05, 1.0);
      v_colorTemp = a_colorTemp;
      v_alpha = scrollFade * v_brightness;
    }
  `;

  const fragmentSource = `
    precision mediump float;

    varying float v_brightness;
    varying float v_colorTemp;
    varying float v_alpha;

    void main() {
      // Circular point with soft edge
      float dist = length(gl_PointCoord - 0.5) * 2.0;
      float alpha = 1.0 - smoothstep(0.0, 1.0, dist);

      // Add glow halo for bright stars
      float glow = exp(-dist * 3.0) * v_brightness * 0.5;
      alpha = alpha + glow;

      // Color temperature: blue-white to warm-white to orange
      vec3 color;
      if (v_colorTemp < 0.33) {
        // Blue-white (hot stars)
        color = mix(vec3(0.7, 0.8, 1.0), vec3(0.9, 0.95, 1.0), v_colorTemp * 3.0);
      } else if (v_colorTemp < 0.66) {
        // White (mid-temp)
        color = mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.98, 0.9), (v_colorTemp - 0.33) * 3.0);
      } else {
        // Warm yellow-orange (cool stars)
        color = mix(vec3(1.0, 0.98, 0.9), vec3(1.0, 0.85, 0.6), (v_colorTemp - 0.66) * 3.0);
      }

      // Brightness affects saturation
      color = mix(color, vec3(1.0), v_brightness * 0.3);

      gl_FragColor = vec4(color * v_brightness, alpha * v_alpha);
    }
  `;

  // ── Compile shaders ──
  function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  const vertShader = compileShader(vertexSource, gl.VERTEX_SHADER);
  const fragShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  // ── Generate star data ──
  const ATTRIBS_PER_STAR = 7; // x, y, size, brightness, flickerSpeed, flickerPhase, colorTemp, depth
  const TOTAL_ATTRIBS = 8;
  const starData = new Float32Array(STAR_COUNT * TOTAL_ATTRIBS);

  for (let i = 0; i < STAR_COUNT; i++) {
    const idx = i * TOTAL_ATTRIBS;

    // Position (clip space -1 to 1)
    starData[idx] = Math.random() * 2 - 1;
    starData[idx + 1] = Math.random() * 2 - 1;

    // Size (pixels) — power distribution: mostly small, few large
    const sizeRand = Math.random();
    starData[idx + 2] = sizeRand < 0.7 ? 1.0 + Math.random() * 1.5 :
                         sizeRand < 0.95 ? 2.5 + Math.random() * 2.0 :
                         4.0 + Math.random() * 2.5;

    // Base brightness — log-normal distribution (realistic)
    const brightRand = Math.random();
    starData[idx + 3] = brightRand < 0.5 ? 0.2 + Math.random() * 0.3 :
                         brightRand < 0.85 ? 0.5 + Math.random() * 0.3 :
                         0.8 + Math.random() * 0.2;

    // Flicker speed (Hz) — slower for dim stars, faster for bright
    starData[idx + 4] = 0.3 + Math.random() * 2.5;

    // Flicker phase offset (prevent synchronization)
    starData[idx + 5] = Math.random() * Math.PI * 2;

    // Color temperature (0=blue-hot, 0.5=white, 1=warm-orange)
    starData[idx + 6] = Math.random();

    // Depth layer (0=far, 1=near) — affects parallax & size
    starData[idx + 7] = Math.random();
  }

  // ── Upload to GPU ──
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);

  const stride = TOTAL_ATTRIBS * 4;

  const aPosition = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);

  const aSize = gl.getAttribLocation(program, 'a_size');
  gl.enableVertexAttribArray(aSize);
  gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, stride, 8);

  const aBrightness = gl.getAttribLocation(program, 'a_brightness');
  gl.enableVertexAttribArray(aBrightness);
  gl.vertexAttribPointer(aBrightness, 1, gl.FLOAT, false, stride, 12);

  const aFlickerSpeed = gl.getAttribLocation(program, 'a_flickerSpeed');
  gl.enableVertexAttribArray(aFlickerSpeed);
  gl.vertexAttribPointer(aFlickerSpeed, 1, gl.FLOAT, false, stride, 16);

  const aFlickerPhase = gl.getAttribLocation(program, 'a_flickerPhase');
  gl.enableVertexAttribArray(aFlickerPhase);
  gl.vertexAttribPointer(aFlickerPhase, 1, gl.FLOAT, false, stride, 20);

  const aColorTemp = gl.getAttribLocation(program, 'a_colorTemp');
  gl.enableVertexAttribArray(aColorTemp);
  gl.vertexAttribPointer(aColorTemp, 1, gl.FLOAT, false, stride, 24);

  const aDepth = gl.getAttribLocation(program, 'a_depth');
  gl.enableVertexAttribArray(aDepth);
  gl.vertexAttribPointer(aDepth, 1, gl.FLOAT, false, stride, 28);

  // ── Uniforms ──
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uResolution = gl.getUniformLocation(program, 'u_resolution');
  const uMouse = gl.getUniformLocation(program, 'u_mouse');
  const uScroll = gl.getUniformLocation(program, 'u_scroll');

  // ── WebGL state ──
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.clearColor(0, 0, 0, 0);

  // ══════════════════════════════════════════════════════════════
  // ── SHOOTING STARS (WebGL integrated) ──
  // ══════════════════════════════════════════════════════════════

  const shootVertSrc = `
    attribute vec2 a_pos;
    attribute float a_alpha;
    uniform vec2 u_res;
    varying float v_alpha;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
      v_alpha = a_alpha;
    }
  `;

  const shootFragSrc = `
    precision mediump float;
    varying float v_alpha;
    void main() {
      vec3 gold = vec3(1.0, 0.88, 0.4);
      vec3 white = vec3(1.0, 1.0, 1.0);
      vec3 color = mix(gold, white, v_alpha * 0.5);
      gl_FragColor = vec4(color, v_alpha * 0.9);
    }
  `;

  const shootVert = compileShader(shootVertSrc, gl.VERTEX_SHADER);
  const shootFrag = compileShader(shootFragSrc, gl.FRAGMENT_SHADER);
  const shootProgram = gl.createProgram();
  gl.attachShader(shootProgram, shootVert);
  gl.attachShader(shootProgram, shootFrag);
  gl.linkProgram(shootProgram);

  const shootAPos = gl.getAttribLocation(shootProgram, 'a_pos');
  const shootAAlpha = gl.getAttribLocation(shootProgram, 'a_alpha');
  const shootURes = gl.getUniformLocation(shootProgram, 'u_res');
  const shootBuffer = gl.createBuffer();

  // Shooting star state
  const MAX_SHOOTERS = isMobile ? 2 : 3;
  const TRAIL_SEGMENTS = 20;
  const shooters = [];

  function spawnShooter(now) {
    if (shooters.length >= MAX_SHOOTERS) return;

    // Random angle between 200-240 degrees (diagonal down-left)
    const angle = (210 + Math.random() * 40) * Math.PI / 180;
    const speed = 0.8 + Math.random() * 1.2; // clip-space units per second

    // Spawn from top-right area
    const startX = -0.3 + Math.random() * 1.3; // -0.3 to 1.0 (clip space)
    const startY = 0.4 + Math.random() * 0.6;  // top half

    const tailLength = 0.08 + Math.random() * 0.12; // trail length in clip space
    const lifetime = 1.0 + Math.random() * 1.5;

    shooters.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      tailLength: tailLength,
      lifetime: lifetime,
      age: 0,
      born: now
    });
  }

  let nextSpawnTime = performance.now() + 1000 + Math.random() * 3000;

  function updateShooters(now, dt) {
    // Spawn new shooters
    if (now >= nextSpawnTime) {
      spawnShooter(now);
      nextSpawnTime = now + (isMobile ? 4000 : 3000) + Math.random() * (isMobile ? 8000 : 6000);
    }

    // Update existing
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // Remove if expired or off-screen
      if (s.age > s.lifetime || s.x < -1.5 || s.y < -1.5) {
        shooters.splice(i, 1);
      }
    }
  }

  function buildShooterGeometry() {
    // Each shooter: TRAIL_SEGMENTS line segments (2 verts each, 3 floats per vert: x, y, alpha)
    const data = new Float32Array(shooters.length * TRAIL_SEGMENTS * 2 * 3);
    let offset = 0;

    for (let i = 0; i < shooters.length; i++) {
      const s = shooters[i];
      // Fade in/out based on age
      const lifeFrac = s.age / s.lifetime;
      const envelope = lifeFrac < 0.1 ? lifeFrac / 0.1 :
                       lifeFrac > 0.6 ? 1.0 - (lifeFrac - 0.6) / 0.4 : 1.0;

      const dirX = s.vx / Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      const dirY = s.vy / Math.sqrt(s.vx * s.vx + s.vy * s.vy);

      for (let seg = 0; seg < TRAIL_SEGMENTS; seg++) {
        const t0 = seg / TRAIL_SEGMENTS;
        const t1 = (seg + 1) / TRAIL_SEGMENTS;

        // Trail goes backwards from head
        const x0 = s.x - dirX * s.tailLength * t0;
        const y0 = s.y - dirY * s.tailLength * t0;
        const x1 = s.x - dirX * s.tailLength * t1;
        const y1 = s.y - dirY * s.tailLength * t1;

        const alpha0 = envelope * (1.0 - t0);
        const alpha1 = envelope * (1.0 - t1);

        data[offset++] = x0;
        data[offset++] = y0;
        data[offset++] = alpha0;
        data[offset++] = x1;
        data[offset++] = y1;
        data[offset++] = alpha1;
      }
    }

    return { data, count: shooters.length * TRAIL_SEGMENTS * 2 };
  }

  // ── Animation ──
  let startTime = performance.now();
  let lastFrameTime = startTime;
  let frameCount = 0;

  function animate() {
    if (!isVisible) {
      animId = null;
      return;
    }

    frameCount++;

    // Frame skip for mobile
    if (isMobile && frameCount % 2 !== 0) {
      animId = requestAnimationFrame(animate);
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;

    // Smooth mouse interpolation
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    const elapsed = (now - startTime) / 1000;

    gl.clear(gl.COLOR_BUFFER_BIT);

    // ── Draw stars ──
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aSize);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(aBrightness);
    gl.vertexAttribPointer(aBrightness, 1, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(aFlickerSpeed);
    gl.vertexAttribPointer(aFlickerSpeed, 1, gl.FLOAT, false, stride, 16);
    gl.enableVertexAttribArray(aFlickerPhase);
    gl.vertexAttribPointer(aFlickerPhase, 1, gl.FLOAT, false, stride, 20);
    gl.enableVertexAttribArray(aColorTemp);
    gl.vertexAttribPointer(aColorTemp, 1, gl.FLOAT, false, stride, 24);
    gl.enableVertexAttribArray(aDepth);
    gl.vertexAttribPointer(aDepth, 1, gl.FLOAT, false, stride, 28);

    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uScroll, scrollY / height);

    gl.drawArrays(gl.POINTS, 0, STAR_COUNT);

    // ── Draw shooting stars ──
    updateShooters(now, dt);

    if (shooters.length > 0) {
      const geo = buildShooterGeometry();

      gl.useProgram(shootProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, shootBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geo.data, gl.DYNAMIC_DRAW);

      // Disable star attribs not used by shooting star shader
      gl.disableVertexAttribArray(aSize);
      gl.disableVertexAttribArray(aBrightness);
      gl.disableVertexAttribArray(aFlickerSpeed);
      gl.disableVertexAttribArray(aFlickerPhase);
      gl.disableVertexAttribArray(aColorTemp);
      gl.disableVertexAttribArray(aDepth);

      gl.enableVertexAttribArray(shootAPos);
      gl.vertexAttribPointer(shootAPos, 2, gl.FLOAT, false, 12, 0);
      gl.enableVertexAttribArray(shootAAlpha);
      gl.vertexAttribPointer(shootAAlpha, 1, gl.FLOAT, false, 12, 8);

      gl.uniform2f(shootURes, canvas.width, canvas.height);

      gl.drawArrays(gl.LINES, 0, geo.count);
    }

    animId = requestAnimationFrame(animate);
  }

  // Start
  animate();

  // ── Cleanup on page hide ──
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      if (animId) cancelAnimationFrame(animId);
      animId = null;
    } else {
      startTime = performance.now() - (startTime ? performance.now() - startTime : 0);
      lastFrameTime = performance.now();
      if (!animId) animate();
    }
  });
})();
