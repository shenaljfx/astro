/* Rashi Chakra — Galaxy Swirl Particle System
   Thousands of glowing dots forming swirling orbital rings,
   inspired by cosmic galaxy/nebula visuals.
   Canvas-based for performance. */

(function () {
  'use strict';

  var canvas = document.querySelector('.rashi-sparkle-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var W = 460, H = 460;
  var cx = W / 2, cy = H / 2;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  // Color palettes — cosmic blues, purples, pinks, golds
  var ringColors = [
    ['#E0E7FF', '#C7D2FE', '#A5B4FC', '#FFFFFF', '#DDD6FE'],
    ['#22D3EE', '#67E8F9', '#A5F3FC', '#06B6D4', '#FFFFFF'],
    ['#A78BFA', '#C084FC', '#818CF8', '#DDD6FE', '#E879F9'],
    ['#F472B6', '#FB7185', '#FBCFE8', '#F9A8D4', '#EC4899'],
    ['#FBBF24', '#FCD34D', '#FFE4A0', '#FB923C', '#FDE68A'],
    ['#2DD4BF', '#34D399', '#4ADE80', '#A7F3D0', '#6EE7B7']
  ];

  // Ring definitions: elliptical orbits with tilt
  var ringDefs = [
    { rx: 40,  ry: 25,  tilt: -15, count: 400,  speed: 0.15,  minS: 0.3, maxS: 1.0, minO: 0.3,  maxO: 0.9,  spread: 8 },
    { rx: 75,  ry: 45,  tilt: 10,  count: 600,  speed: -0.10, minS: 0.3, maxS: 1.2, minO: 0.25, maxO: 0.85, spread: 12 },
    { rx: 110, ry: 65,  tilt: -30, count: 700,  speed: 0.08,  minS: 0.2, maxS: 1.0, minO: 0.2,  maxO: 0.8,  spread: 15 },
    { rx: 145, ry: 90,  tilt: 18,  count: 800,  speed: -0.06, minS: 0.3, maxS: 1.3, minO: 0.15, maxO: 0.75, spread: 18 },
    { rx: 180, ry: 110, tilt: -8,  count: 900,  speed: 0.045, minS: 0.2, maxS: 1.1, minO: 0.15, maxO: 0.7,  spread: 22 },
    { rx: 215, ry: 135, tilt: 25,  count: 600,  speed: -0.035,minS: 0.2, maxS: 0.9, minO: 0.1,  maxO: 0.6,  spread: 25 }
  ];

  var particles = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  // Generate particles for each elliptical ring
  for (var r = 0; r < ringDefs.length; r++) {
    var ring = ringDefs[r];
    var palette = ringColors[r];
    var tiltRad = ring.tilt * Math.PI / 180;
    var cosTilt = Math.cos(tiltRad);
    var sinTilt = Math.sin(tiltRad);

    for (var i = 0; i < ring.count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spreadX = (Math.random() - 0.5) * ring.spread * 2;
      var spreadY = (Math.random() - 0.5) * ring.spread * 2;

      particles.push({
        angle: angle,
        rx: ring.rx,
        ry: ring.ry,
        cosTilt: cosTilt,
        sinTilt: sinTilt,
        spreadX: spreadX,
        spreadY: spreadY,
        speed: ring.speed * (0.7 + Math.random() * 0.6),
        size: rand(ring.minS, ring.maxS),
        color: palette[Math.floor(Math.random() * palette.length)],
        baseOpacity: rand(ring.minO, ring.maxO),
        twinkleSpeed: rand(1, 5),
        twinklePhase: Math.random() * 6.2832
      });
    }
  }

  // Scattered ambient particles filling the space
  var ambientColors = ['#FFFFFF', '#E0E7FF', '#C7D2FE', '#FBBF24', '#A78BFA', '#22D3EE', '#F472B6'];
  for (var a = 0; a < 500; a++) {
    var aAngle = Math.random() * Math.PI * 2;
    var aR = rand(10, 230);
    particles.push({
      angle: aAngle,
      rx: aR,
      ry: aR,
      cosTilt: 1,
      sinTilt: 0,
      spreadX: (Math.random() - 0.5) * 40,
      spreadY: (Math.random() - 0.5) * 40,
      speed: rand(-0.02, 0.02),
      size: rand(0.2, 0.7),
      color: ambientColors[Math.floor(Math.random() * ambientColors.length)],
      baseOpacity: rand(0.08, 0.35),
      twinkleSpeed: rand(0.5, 3),
      twinklePhase: Math.random() * 6.2832
    });
  }

  var totalParticles = particles.length;
  var running = true;
  var lastTime = 0;

  function draw(time) {
    if (!running) { requestAnimationFrame(draw); return; }

    var dt = time - lastTime;
    if (dt < 33) { requestAnimationFrame(draw); return; }
    lastTime = time;

    ctx.clearRect(0, 0, W, H);

    var t = time * 0.001;

    for (var i = 0; i < totalParticles; i++) {
      var p = particles[i];

      // Advance orbit
      p.angle += p.speed * dt * 0.001;

      // Elliptical position
      var ex = Math.cos(p.angle) * p.rx + p.spreadX;
      var ey = Math.sin(p.angle) * p.ry + p.spreadY;

      // Apply tilt rotation
      var x = cx + ex * p.cosTilt - ey * p.sinTilt;
      var y = cy + ex * p.sinTilt + ey * p.cosTilt;

      // Twinkle
      var twinkle = Math.sin(t * p.twinkleSpeed + p.twinklePhase);
      var opacity = p.baseOpacity * (0.35 + 0.65 * (twinkle * 0.5 + 0.5));

      if (opacity < 0.03) continue;

      ctx.globalAlpha = opacity;
      ctx.fillStyle = p.color;

      // Draw glowing dot
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, 6.2832);
      ctx.fill();

      // Add glow halo for brighter particles
      if (p.size > 0.8 && opacity > 0.3) {
        ctx.globalAlpha = opacity * 0.15;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 3, 0, 6.2832);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);

  // Pause when off-screen
  var observer = new IntersectionObserver(function (entries) {
    running = entries[0].isIntersecting;
  }, { threshold: 0.01 });

  observer.observe(canvas);
})();
