/* ══════════════════════════════════════════════════════════════
   SHOOTING STARS — CSS Animation with JS Random Spawning
   Lightweight golden shooting stars at random intervals.
   Inspired by CSS Shooting Stars Animation by Jasur Mirboboyev.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Respect user preference */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  /* ── Timing config (milliseconds) ── */
  var SPAWN_MIN = isMobile ? 4000  : 3000;   /* shortest gap between stars */
  var SPAWN_MAX = isMobile ? 12000 : 9000;   /* longest gap */
  var MAX_ACTIVE = isMobile ? 2 : 3;         /* max stars visible at once */

  /* ── Inject <style> block ── */
  var css = [
    '.shooting-stars-layer{',
    '  position:fixed;top:0;left:0;width:100%;height:100%;',
    '  pointer-events:none;z-index:5;overflow:hidden;',
    '}',
    '.shooting-star{',
    '  position:absolute;',
    '  width:4px;height:4px;',
    '  background:#fff;',
    '  border-radius:50%;',
    '  box-shadow:',
    '    0 0 0 4px rgba(255,215,80,0.08),',
    '    0 0 0 8px rgba(255,200,60,0.06),',
    '    0 0 20px rgba(255,220,100,0.9),',
    '    0 0 40px rgba(255,180,50,0.4);',
    '  opacity:0;',
    '  will-change:transform,opacity;',
    '  animation:shootStar var(--dur) linear forwards;',
    '}',

    /* Glowing trail via ::before */
    '.shooting-star::before{',
    '  content:"";',
    '  position:absolute;',
    '  top:50%;',
    '  transform:translateY(-50%);',
    '  width:var(--tail);',
    '  height:1px;',
    '  background:linear-gradient(90deg,rgba(255,230,130,0.85),rgba(255,200,80,0.4) 40%,transparent);',
    '  box-shadow:0 0 6px rgba(255,210,80,0.3);',
    '}',

    /* Subtle wider outer glow trail via ::after */
    '.shooting-star::after{',
    '  content:"";',
    '  position:absolute;',
    '  top:50%;',
    '  transform:translateY(-50%);',
    '  width:calc(var(--tail) * 0.6);',
    '  height:3px;',
    '  border-radius:2px;',
    '  background:linear-gradient(90deg,rgba(255,210,80,0.35),rgba(255,180,50,0.12) 50%,transparent);',
    '}',

    /* Main animation — rotate 315° then translate diagonally */
    '@keyframes shootStar{',
    '  0%  { transform:rotate(315deg) translateX(0);    opacity:0; }',
    '  5%  { opacity:1; }',
    '  70% { opacity:1; }',
    '  100%{ transform:rotate(315deg) translateX(-1500px); opacity:0; }',
    '}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ── Create container ── */
  var layer = document.createElement('div');
  layer.className = 'shooting-stars-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  /* ── Random helpers ── */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

  /* ── Spawn a single shooting star with random properties ── */
  var activeCount = 0;

  function spawnStar() {
    if (activeCount >= MAX_ACTIVE) {
      scheduleNext();
      return;
    }

    var span = document.createElement('span');
    span.className = 'shooting-star';

    /* Random position — top or right edge */
    var topVal = randInt(0, 300);
    var rightVal = randInt(0, Math.max(window.innerWidth - 200, 400));
    span.style.top = topVal + 'px';
    span.style.right = rightVal + 'px';
    span.style.left = 'initial';

    /* Random duration & tail length */
    var dur = rand(0.8, 2.8);
    var tail = randInt(200, 400);
    span.style.setProperty('--dur', dur.toFixed(2) + 's');
    span.style.setProperty('--tail', tail + 'px');

    layer.appendChild(span);
    activeCount++;

    /* Remove after animation ends */
    var removeDelay = (dur + 0.1) * 1000;
    setTimeout(function () {
      if (span.parentNode) span.parentNode.removeChild(span);
      activeCount--;
    }, removeDelay);

    scheduleNext();
  }

  /* ── Schedule next star at a random interval ── */
  function scheduleNext() {
    var gap = rand(SPAWN_MIN, SPAWN_MAX);
    setTimeout(spawnStar, gap);
  }

  /* ── Kick off — first star after a short random wait ── */
  setTimeout(spawnStar, rand(500, 2000));

  /* Stagger a second spawn stream for variety */
  setTimeout(function () { scheduleNext(); }, rand(2000, 5000));

})();