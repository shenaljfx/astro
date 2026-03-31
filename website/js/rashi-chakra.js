/* ═══════════════════════════════════════════════════════════════════════
   RASHI CHAKRA — Canvas2D Procedural Sacred Zodiac Mandala
   Fully GPU-composited, layered glow, orbiting Navagraha, 12 Rashis,
   sacred geometry, breathing aura, stardust particles
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('rashiChakra');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  var DPR = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  var TAU = Math.PI * 2;

  // ─── Sizing ──────────────────────────────────────────────────────
  var W, H, CX, CY, R; // canvas width, height, center, base radius

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    CX = canvas.width / 2;
    CY = canvas.height / 2;
    R = Math.min(CX, CY) * 0.92; // base radius
  }
  window.addEventListener('resize', resize);
  resize();

  // ─── Colour Palette ──────────────────────────────────────────────
  var GOLD = '#FFD700';
  var GOLD_DIM = '#DAA520';
  var GOLD_PALE = '#FFE4A0';
  var WHITE = '#FFFFFF';
  var PURPLE = '#9333EA';
  var CYAN = '#22D3EE';

  // Zodiac sign colours (Aries → Pisces)
  var ZODIAC_COLORS = [
    '#FF4444', '#4CAF50', '#FFC107', '#E0E0E0',
    '#FF9800', '#8BC34A', '#00BCD4', '#B71C1C',
    '#7C4DFF', '#795548', '#2196F3', '#9C27B0'
  ];

  // Zodiac Unicode glyphs ♈–♓
  var ZODIAC_GLYPHS = [
    '\u2648', '\u2649', '\u264A', '\u264B',
    '\u264C', '\u264D', '\u264E', '\u264F',
    '\u2650', '\u2651', '\u2652', '\u2653'
  ];

  // Navagraha — name, colour, core colour, orbit speed multiplier, size multiplier
  var GRAHAS = [
    { name: 'Surya',   col: '#FBBF24', core: '#FDE68A', speed: 0.08,  size: 1.0,  offset: 0      },
    { name: 'Chandra', col: '#C7D2FE', core: '#E2E8F0', speed: 0.12,  size: 0.85, offset: 0.698  },
    { name: 'Mangala', col: '#F87171', core: '#FCA5A5', speed: 0.065, size: 0.9,  offset: 1.396  },
    { name: 'Budha',   col: '#34D399', core: '#6EE7B7', speed: 0.14,  size: 0.75, offset: 2.094  },
    { name: 'Guru',    col: '#F59E0B', core: '#FCD34D', speed: 0.04,  size: 1.05, offset: 2.793  },
    { name: 'Shukra',  col: '#EC4899', core: '#F9A8D4', speed: 0.11,  size: 0.88, offset: 3.491  },
    { name: 'Shani',   col: '#818CF8', core: '#A5B4FC', speed: 0.025, size: 0.78, offset: 4.189  },
    { name: 'Rahu',    col: '#64748B', core: '#94A3B8', speed: -0.05, size: 0.7,  offset: 4.887  },
    { name: 'Ketu',    col: '#A78BFA', core: '#C4B5FD', speed: -0.07, size: 0.7,  offset: 5.585  }
  ];

  // ─── Particles ───────────────────────────────────────────────────
  var PARTICLE_COUNT = isMobile ? 60 : 120;
  var particles = [];

  function initParticles() {
    particles.length = 0;
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var angle = Math.random() * TAU;
      var dist = 0.3 + Math.random() * 0.72; // 30%-102% of R
      particles.push({
        angle: angle,
        dist: dist,
        speed: (Math.random() - 0.5) * 0.0003,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * TAU,
        color: Math.random() < 0.5 ? GOLD : Math.random() < 0.5 ? WHITE : CYAN
      });
    }
  }
  initParticles();

  // ─── Energy motes (orbiting sparks in 2 counter-rotating rings) ──
  var MOTE_COUNT = isMobile ? 6 : 10;
  var motes = [];
  function initMotes() {
    motes.length = 0;
    var colors = [GOLD, '#F472B6', CYAN, '#A78BFA', '#34D399', '#FB923C', '#F87171', '#FBBF24', '#818CF8', '#FCD34D'];
    for (var i = 0; i < MOTE_COUNT; i++) {
      var ringIdx = i < MOTE_COUNT / 2 ? 0 : 1;
      motes.push({
        angle: (i / (MOTE_COUNT / 2)) * TAU,
        ring: ringIdx, // 0 = outer CW, 1 = mid CCW
        radius: ringIdx === 0 ? 0.96 : 0.88,
        speed: ringIdx === 0 ? 0.0004 : -0.0003,
        size: 1.5 + Math.random(),
        color: colors[i % colors.length]
      });
    }
  }
  initMotes();

  // ─── Drawing Helpers ─────────────────────────────────────────────

  function drawCircle(x, y, r, fillStyle, alpha) {
    ctx.globalAlpha = alpha || 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  function drawRing(r, lineWidth, strokeStyle, alpha, dash) {
    ctx.globalAlpha = alpha || 1;
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, TAU);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth * DPR;
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    if (dash) ctx.setLineDash([]);
  }

  function drawGlow(x, y, r, color, alpha) {
    var grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.4, color.replace(')', ',0.3)').replace('rgb', 'rgba'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha || 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // ─── Layer 0: Background Aura ────────────────────────────────────
  function drawAura(t) {
    var breathe = Math.sin(t * 0.4) * 0.06 + 0.94;
    var aR = R * 1.05 * breathe;
    var grad = ctx.createRadialGradient(CX, CY, R * 0.2, CX, CY, aR);
    grad.addColorStop(0, 'rgba(255,215,0,0.0)');
    grad.addColorStop(0.5, 'rgba(75,0,130,0.04)');
    grad.addColorStop(0.75, 'rgba(147,51,234,0.03)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(CX, CY, aR, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // ─── Layer 1: Stardust Particles ────────────────────────────────
  function drawParticles(t) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.angle += p.speed;
      var shimmer = Math.sin(t * 2 + p.phase) * 0.3 + 0.7;
      var x = CX + Math.cos(p.angle) * p.dist * R;
      var y = CY + Math.sin(p.angle) * p.dist * R;
      ctx.globalAlpha = p.alpha * shimmer;
      ctx.beginPath();
      ctx.arc(x, y, p.size * DPR, 0, TAU);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  }

  // ─── Layer 2: Sacred Geometry Mandala (12 petals) ───────────────
  function drawMandala(t) {
    var spin = t * 0.02; // very slow CW
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(spin);
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.5 * DPR;
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * TAU;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.92);
      ctx.quadraticCurveTo(R * 0.12, -R * 0.5, 0, -R * 0.38);
      ctx.quadraticCurveTo(-R * 0.12, -R * 0.5, 0, -R * 0.92);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ─── Layer 3: Outer Rings + Tick Marks ──────────────────────────
  function drawOuterRings(t) {
    var spin = -t * 0.012; // faster CCW
    // Triple ring
    drawRing(R * 0.94, 2.5, GOLD, 0.45);
    drawRing(R * 0.93, 0.5, GOLD_DIM, 0.25);
    drawRing(R * 0.91, 0.8, GOLD, 0.18);

    // Tick marks (72)
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(spin);
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 0.5 * DPR;
    for (var i = 0; i < 72; i++) {
      var a = (i / 72) * TAU;
      var inner = R * 0.89;
      var outer = i % 6 === 0 ? R * 0.86 : R * 0.875;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─── Layer 4: Zodiac Wheel ──────────────────────────────────────
  function drawZodiacWheel(t) {
    var spin = t * 0.003; // slow CW
    var outerR = R * 0.86;
    var innerR = R * 0.68;
    var midR = (outerR + innerR) / 2;
    var glyphR = outerR * 0.89;

    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(spin);

    // 12 wedge segments
    for (var i = 0; i < 12; i++) {
      var a0 = (i / 12) * TAU - Math.PI / 2;
      var a1 = ((i + 1) / 12) * TAU - Math.PI / 2;

      // Filled wedge
      ctx.beginPath();
      ctx.arc(0, 0, outerR, a0, a1);
      ctx.arc(0, 0, innerR, a1, a0, true);
      ctx.closePath();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = ZODIAC_COLORS[i];
      ctx.fill();

      // Divider line
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
      ctx.lineTo(Math.cos(a0) * outerR, Math.sin(a0) * outerR);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1 * DPR;
      ctx.globalAlpha = 0.4;
      ctx.stroke();

      // Zodiac glyph
      var glyphAngle = a0 + (a1 - a0) / 2;
      var gx = Math.cos(glyphAngle) * glyphR;
      var gy = Math.sin(glyphAngle) * glyphR;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(glyphAngle + Math.PI / 2);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = GOLD;
      ctx.font = (14 * DPR) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 6 * DPR;
      ctx.fillText(ZODIAC_GLYPHS[i], 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Gem stone at boundary
      var gemX = Math.cos(a0) * (outerR + 4 * DPR);
      var gemY = Math.sin(a0) * (outerR + 4 * DPR);
      drawGlow(gemX, gemY, 8 * DPR, ZODIAC_COLORS[i], 0.15);
      drawCircle(gemX, gemY, 3 * DPR, ZODIAC_COLORS[i], 0.85);
    }

    // Inner & outer border arcs
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2 * DPR;
    ctx.beginPath(); ctx.arc(0, 0, outerR, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = GOLD_DIM;
    ctx.lineWidth = 1.5 * DPR;
    ctx.beginPath(); ctx.arc(0, 0, innerR, 0, TAU); ctx.stroke();

    ctx.restore();
  }

  // ─── Layer 5: Graha Orbit + 9 Navagraha ─────────────────────────
  function drawGrahas(t) {
    var orbitR = R * 0.56;

    // Orbit track (dashed)
    drawRing(orbitR, 0.6, GOLD, 0.25, [4 * DPR, 3 * DPR]);
    drawRing(orbitR - 2 * DPR, 0.3, GOLD_DIM, 0.12);

    // Each graha orbits at its own speed
    for (var i = 0; i < GRAHAS.length; i++) {
      var g = GRAHAS[i];
      var angle = g.offset + t * g.speed;
      var x = CX + Math.cos(angle) * orbitR;
      var y = CY + Math.sin(angle) * orbitR;
      var sz = 4 * g.size * DPR;

      // Outer glow
      drawGlow(x, y, sz * 3, g.col, 0.1);
      // Mid ring
      drawCircle(x, y, sz * 1.3, g.col, 0.25);
      // Core
      drawCircle(x, y, sz, g.core, 0.95);
      // Catchlight
      drawCircle(x - sz * 0.2, y - sz * 0.2, sz * 0.3, WHITE, 0.7);

      // Saturn ring special
      if (g.name === 'Shani') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.35);
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = g.col;
        ctx.lineWidth = 0.5 * DPR;
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 1.6, sz * 0.45, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ─── Layer 6: Sacred Inner Ring + Star of David ─────────────────
  function drawInnerSacred(t) {
    var innerR = R * 0.38;
    var pulse = Math.sin(t * 0.8) * 0.08 + 0.92;

    // Inner rings
    drawRing(innerR * pulse, 1.2, GOLD, 0.35);
    drawRing(innerR * pulse * 0.97, 0.4, GOLD_DIM, 0.18);

    // Star of David — two overlapping triangles
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(t * 0.001);
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.8 * DPR;

    var sR = innerR * 0.92 * pulse;
    // Triangle pointing up
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var a = (i / 3) * TAU - Math.PI / 2;
      var px = Math.cos(a) * sR;
      var py = Math.sin(a) * sR;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    // Triangle pointing down
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var a = (i / 3) * TAU + Math.PI / 6;
      var px = Math.cos(a) * sR;
      var py = Math.sin(a) * sR;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  // ─── Layer 7: Center Sun Orb ────────────────────────────────────
  function drawCenterOrb(t) {
    var pulse = Math.sin(t * 1.2) * 0.08 + 1;
    var orbR = R * 0.22 * pulse;

    // Outer corona
    var coronaGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, orbR);
    coronaGrad.addColorStop(0, 'rgba(255,255,255,1)');
    coronaGrad.addColorStop(0.08, 'rgba(255,247,224,0.95)');
    coronaGrad.addColorStop(0.22, 'rgba(255,215,0,0.6)');
    coronaGrad.addColorStop(0.5, 'rgba(255,140,0,0.2)');
    coronaGrad.addColorStop(0.8, 'rgba(184,84,10,0.05)');
    coronaGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(CX, CY, orbR, 0, TAU);
    ctx.fillStyle = coronaGrad;
    ctx.fill();

    // Lens cross flares
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = GOLD_PALE;
    ctx.lineWidth = 0.8 * DPR;
    var fR = orbR * 0.9;
    for (var i = 0; i < 4; i++) {
      var a = (i / 4) * TAU + t * 0.02;
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(a) * fR * 0.3, CY + Math.sin(a) * fR * 0.3);
      ctx.lineTo(CX + Math.cos(a) * fR, CY + Math.sin(a) * fR);
      ctx.stroke();
    }

    // Rotating rays
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(t * 0.05);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.3 * DPR;
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * TAU;
      var rayLen = orbR * (0.7 + Math.sin(t * 2 + i) * 0.3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * orbR * 0.25, Math.sin(a) * orbR * 0.25);
      ctx.lineTo(Math.cos(a) * rayLen, Math.sin(a) * rayLen);
      ctx.stroke();
    }
    ctx.restore();

    // Core layers
    drawCircle(CX, CY, orbR * 0.45, '#B8540A', 0.12);
    drawCircle(CX, CY, orbR * 0.32, '#D4A84C', 0.25);
    drawCircle(CX, CY, orbR * 0.22, GOLD, 0.45);
    drawCircle(CX, CY, orbR * 0.14, GOLD_PALE, 0.7);
    drawCircle(CX, CY, orbR * 0.08, '#FFF8E1', 0.9);
    drawCircle(CX, CY, orbR * 0.04, WHITE, 1);
    // Catchlight
    drawCircle(CX - orbR * 0.04, CY - orbR * 0.04, orbR * 0.025, WHITE, 0.8);
  }

  // ─── Layer 8: Energy Motes ──────────────────────────────────────
  function drawMotes(t) {
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.angle += m.speed;
      var x = CX + Math.cos(m.angle) * m.radius * R;
      var y = CY + Math.sin(m.angle) * m.radius * R;
      // Glow
      drawGlow(x, y, 6 * DPR, m.color, 0.5);
      drawCircle(x, y, m.size * DPR, m.color, 0.85);
    }
  }

  // ─── Animation Loop ─────────────────────────────────────────────
  var t0 = performance.now();
  var rafId;
  var frameCount = 0;
  var isVisible = true;

  // Only render when visible (IntersectionObserver)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(canvas);
  }

  function render() {
    frameCount++;
    // Throttle: render every 2nd frame (30fps max) to save CPU
    if (frameCount % 2 !== 0 || !isVisible) {
      rafId = requestAnimationFrame(render);
      return;
    }
    var t = (performance.now() - t0) / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    drawAura(t);
    drawParticles(t);
    drawMandala(t);
    drawOuterRings(t);
    drawZodiacWheel(t);
    drawGrahas(t);
    drawInnerSacred(t);
    drawCenterOrb(t);
    drawMotes(t);

    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(render);
  }

  // Start after brief delay
  setTimeout(function () {
    render();
  }, 400);

})();
