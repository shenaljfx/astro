/* ═══════════════════════════════════════════════════════════════════════
   Cosmos Canvas — Animated star field, shooting stars, nebula blobs
   Renders behind the entire website as a fixed canvas background.
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var canvas = document.getElementById('cosmos');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W, H, dpr;
  var stars = [];
  var shootingStars = [];
  var nebulaBlobs = [];
  var mouse = { x: -9999, y: -9999 };

  /* ── Resize ─────────────────────────────────────────────────────── */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── Stars ──────────────────────────────────────────────────────── */
  function createStars(count) {
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.3 + Math.random() * 1.8,
        baseAlpha: 0.1 + Math.random() * 0.7,
        alpha: 0,
        twinkleSpeed: 0.003 + Math.random() * 0.015,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: ['255,255,255', '255,220,130', '200,210,255', '180,200,255', '255,200,180'][Math.floor(Math.random() * 5)],
      });
    }
  }

  function drawStars(t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.alpha = s.baseAlpha * (0.4 + 0.6 * Math.abs(Math.sin(t * s.twinkleSpeed + s.twinkleOffset)));

      // Subtle parallax from mouse
      var dx = (mouse.x - W / 2) * 0.005 * s.r;
      var dy = (mouse.y - H / 2) * 0.005 * s.r;

      ctx.beginPath();
      ctx.arc(s.x + dx, s.y + dy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + s.color + ',' + s.alpha + ')';
      ctx.fill();

      // Glow for larger stars
      if (s.r > 1.2) {
        ctx.beginPath();
        ctx.arc(s.x + dx, s.y + dy, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + s.color + ',' + (s.alpha * 0.08) + ')';
        ctx.fill();
      }
    }
  }

  /* ── Shooting Stars ─────────────────────────────────────────────── */
  function spawnShootingStar() {
    var fromX = Math.random() * W * 0.8 + W * 0.1;
    var fromY = Math.random() * H * 0.3;
    var angle = (20 + Math.random() * 40) * Math.PI / 180;
    var dist = 200 + Math.random() * 300;
    var speed = 3 + Math.random() * 4;
    var sign = Math.random() > 0.5 ? 1 : -1;

    shootingStars.push({
      x: fromX,
      y: fromY,
      vx: Math.cos(angle) * speed * sign,
      vy: Math.sin(angle) * speed,
      dist: dist,
      traveled: 0,
      alpha: 1,
      tailLen: 60 + Math.random() * 80,
      width: 1 + Math.random() * 1.5,
      dying: false,
    });
  }

  function updateShootingStars() {
    for (var i = shootingStars.length - 1; i >= 0; i--) {
      var s = shootingStars[i];
      s.x += s.vx;
      s.y += s.vy;
      s.traveled += Math.sqrt(s.vx * s.vx + s.vy * s.vy);

      if (s.traveled > s.dist * 0.6) {
        s.alpha -= 0.03;
      }
      if (s.alpha <= 0) {
        shootingStars.splice(i, 1);
        continue;
      }

      // Draw trail
      var angle = Math.atan2(s.vy, s.vx);
      var tailX = s.x - Math.cos(angle) * s.tailLen;
      var tailY = s.y - Math.sin(angle) * s.tailLen;

      var grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, 'rgba(255,240,180,0)');
      grad.addColorStop(0.6, 'rgba(255,220,130,' + (s.alpha * 0.3) + ')');
      grad.addColorStop(1, 'rgba(255,250,230,' + (s.alpha * 0.9) + ')');

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,250,220,' + s.alpha + ')';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,230,160,' + (s.alpha * 0.15) + ')';
      ctx.fill();
    }
  }

  /* ── Nebula Blobs ───────────────────────────────────────────────── */
  function createNebula() {
    nebulaBlobs = [
      { x: W * 0.2, y: H * 0.3, r: 250, color: '147,51,234', alpha: 0.03, speed: 0.0003, offset: 0 },
      { x: W * 0.8, y: H * 0.6, r: 200, color: '255,184,0', alpha: 0.025, speed: 0.0004, offset: 2 },
      { x: W * 0.5, y: H * 0.8, r: 300, color: '76,201,240', alpha: 0.015, speed: 0.0002, offset: 4 },
      { x: W * 0.1, y: H * 0.7, r: 180, color: '255,107,157', alpha: 0.015, speed: 0.0005, offset: 1 },
    ];
  }

  function drawNebula(t) {
    for (var i = 0; i < nebulaBlobs.length; i++) {
      var n = nebulaBlobs[i];
      var x = n.x + Math.sin(t * n.speed + n.offset) * 40;
      var y = n.y + Math.cos(t * n.speed * 0.7 + n.offset) * 30;
      var pulse = 0.7 + 0.3 * Math.sin(t * n.speed * 2 + n.offset);

      var grad = ctx.createRadialGradient(x, y, 0, x, y, n.r);
      grad.addColorStop(0, 'rgba(' + n.color + ',' + (n.alpha * pulse) + ')');
      grad.addColorStop(0.5, 'rgba(' + n.color + ',' + (n.alpha * 0.4 * pulse) + ')');
      grad.addColorStop(1, 'rgba(' + n.color + ',0)');

      ctx.fillStyle = grad;
      ctx.fillRect(x - n.r, y - n.r, n.r * 2, n.r * 2);
    }
  }

  /* ── Constellation lines (subtle) ───────────────────────────────── */
  var constellations = [];
  function createConstellations() {
    constellations = [];
    // Create 3 random small constellations
    for (var c = 0; c < 3; c++) {
      var cx = W * 0.15 + Math.random() * W * 0.7;
      var cy = H * 0.1 + Math.random() * H * 0.6;
      var points = [];
      var numPts = 4 + Math.floor(Math.random() * 3);
      for (var p = 0; p < numPts; p++) {
        points.push({
          x: cx + (Math.random() - 0.5) * 120,
          y: cy + (Math.random() - 0.5) * 100,
        });
      }
      constellations.push(points);
    }
  }

  function drawConstellations(t) {
    var alpha = 0.03 + 0.02 * Math.sin(t * 0.001);
    ctx.strokeStyle = 'rgba(180,200,255,' + alpha + ')';
    ctx.lineWidth = 0.5;

    for (var c = 0; c < constellations.length; c++) {
      var pts = constellations[c];
      if (pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var p = 1; p < pts.length; p++) {
        ctx.lineTo(pts[p].x, pts[p].y);
      }
      ctx.stroke();

      // Draw dots at vertices
      for (var p = 0; p < pts.length; p++) {
        ctx.beginPath();
        ctx.arc(pts[p].x, pts[p].y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,210,255,' + (alpha * 4) + ')';
        ctx.fill();
      }
    }
  }

  /* ── Main Loop ──────────────────────────────────────────────────── */
  var lastShootTime = 0;
  var shootInterval = 4000 + Math.random() * 6000;

  function loop(t) {
    ctx.clearRect(0, 0, W, H);

    drawNebula(t);
    drawConstellations(t);
    drawStars(t);

    // Spawn shooting stars periodically
    if (t - lastShootTime > shootInterval) {
      spawnShootingStar();
      lastShootTime = t;
      shootInterval = 3000 + Math.random() * 8000;
    }
    updateShootingStars();

    requestAnimationFrame(loop);
  }

  /* ── Init ───────────────────────────────────────────────────────── */
  function init() {
    resize();
    createStars(Math.min(300, Math.floor(W * H / 5000)));
    createNebula();
    createConstellations();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', function () {
    resize();
    createStars(Math.min(300, Math.floor(W * H / 5000)));
    createNebula();
    createConstellations();
  });

  document.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  init();
})();
