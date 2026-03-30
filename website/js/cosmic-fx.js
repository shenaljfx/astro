/* ═══════════════════════════════════════════════════════════════════════
   COSMIC FX — Cyan Comet Shower
   Shooting comets with long glowing trails across the weekly-lagna section.
   Canvas-based, IntersectionObserver-paused, mobile-friendly.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  var DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);

  function rand(a, b) { return a + Math.random() * (b - a); }

  var section = document.querySelector('.weekly-lagna');
  if (!section) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'cosmic-fx-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0;transition:opacity 1.5s ease;';
  section.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var running = false, raf;
  var comets = [];
  var dust = [];

  function sizeCanvas() {
    var r = section.getBoundingClientRect();
    var w = Math.floor(r.width * DPR * (isMobile ? 0.5 : 0.7));
    var h = Math.floor(r.height * DPR * (isMobile ? 0.5 : 0.7));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    return { w: w, h: h };
  }

  function makeComet(s) {
    var angle = rand(-0.6, -0.2);
    return {
      x: rand(s.w * 0.3, s.w * 1.2),
      y: rand(-50, s.h * 0.3),
      vx: Math.cos(angle) * rand(1.5, 4),
      vy: Math.sin(angle) * rand(-3, -1),
      tailLen: rand(40, 120),
      size: rand(1, 3),
      hue: rand(170, 200),
      alpha: rand(0.3, 0.8),
      trail: []
    };
  }

  function init() {
    var s = sizeCanvas();
    comets = []; dust = [];
    var cCount = isMobile ? 6 : 14;
    for (var i = 0; i < cCount; i++) {
      comets.push(makeComet(s));
    }
    var dCount = isMobile ? 150 : 400;
    for (var j = 0; j < dCount; j++) {
      dust.push({
        x: rand(0, s.w), y: rand(0, s.h),
        size: rand(0.2, 1),
        alpha: rand(0.05, 0.3),
        twinkle: rand(1, 4),
        phase: rand(0, 6.28)
      });
    }
  }

  function draw(time) {
    if (!running) return;
    var s = sizeCanvas();
    var t = time * 0.001;
    ctx.clearRect(0, 0, s.w, s.h);

    /* Ambient teal haze */
    var g = ctx.createRadialGradient(s.w * 0.3, s.h * 0.4, 0, s.w * 0.3, s.h * 0.4, s.w * 0.5);
    g.addColorStop(0, 'rgba(6,182,212,0.04)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s.w, s.h);

    /* Comets */
    for (var i = 0; i < comets.length; i++) {
      var c = comets[i];
      c.x -= c.vx; c.y -= c.vy;
      c.trail.push({ x: c.x, y: c.y });
      if (c.trail.length > c.tailLen) c.trail.shift();

      /* Trail */
      for (var j = 0; j < c.trail.length; j++) {
        var tp = c.trail[j];
        var progress = j / c.trail.length;
        ctx.globalAlpha = c.alpha * progress * 0.5;
        ctx.fillStyle = 'hsl(' + c.hue + ',80%,' + (60 + progress * 30) + '%)';
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, c.size * progress, 0, 6.2832);
        ctx.fill();
      }

      /* Head glow */
      ctx.globalAlpha = c.alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, 6.2832);
      ctx.fill();
      ctx.globalAlpha = c.alpha * 0.2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size * 4, 0, 6.2832);
      ctx.fill();

      /* Reset if off-screen */
      if (c.x < -100 || c.y > s.h + 100) {
        comets[i] = makeComet(s);
      }
    }

    /* Static dust */
    for (var d = 0; d < dust.length; d++) {
      var dp = dust[d];
      var tw = Math.sin(t * dp.twinkle + dp.phase) * 0.5 + 0.5;
      ctx.globalAlpha = dp.alpha * (0.3 + 0.7 * tw);
      ctx.fillStyle = '#A5F3FC';
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, dp.size, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }

  init();
  window.addEventListener('resize', init);

  /* Pause when off-screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && !running) { running = true; canvas.style.opacity = '1'; raf = requestAnimationFrame(draw); }
      if (!vis && running) { running = false; canvas.style.opacity = '0'; cancelAnimationFrame(raf); }
    }, { threshold: 0.05 }).observe(canvas);
  } else {
    running = true; canvas.style.opacity = '1'; raf = requestAnimationFrame(draw);
  }

})();
