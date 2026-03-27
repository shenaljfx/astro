/* ═══════════════════════════════════════════════════════════════════════
   Grahachara Website — Main Interactions
   Nav scroll, mobile menu, scroll animations, counter, carousel
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Navigation: scroll effect + mobile burger ──────────────────── */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('navBurger');
  var navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', function () {
    if (window.scrollY > 40) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
  });

  if (burger && navLinks) {
    burger.addEventListener('click', function () {
      var isOpen = burger.classList.toggle('active');
      navLinks.classList.toggle('active');
      // Lock body scroll when menu is open
      document.body.classList.toggle('nav-open', isOpen);
    });

    // Close mobile menu on link click
    navLinks.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        burger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('nav-open');
      });
    });

    // Close menu on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        burger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('nav-open');
      }
    });

    // Close menu on click outside (for dropdown style)
    document.addEventListener('click', function (e) {
      if (navLinks.classList.contains('active') &&
          !navLinks.contains(e.target) &&
          !burger.contains(e.target)) {
        burger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('nav-open');
      }
    });
  }

  /* ── Smooth scroll for anchor links ─────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        var offset = nav ? nav.offsetHeight + 10 : 80;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  /* ── Scroll-triggered animations (AOS-like) ─────────────────────── */
  var aosElements = document.querySelectorAll('[data-aos]');
  var aosObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var delay = parseInt(entry.target.getAttribute('data-aos-delay') || '0', 10);
        setTimeout(function () {
          entry.target.classList.add('aos-animate');
        }, delay);
        aosObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  aosElements.forEach(function (el) { aosObserver.observe(el); });

  /* ── Screenshots Carousel ───────────────────────────────────────── */
  var track = document.getElementById('screenshotsTrack');
  var prevBtn = document.getElementById('scrPrev');
  var nextBtn = document.getElementById('scrNext');
  var dotsContainer = document.getElementById('scrDots');

  if (track && prevBtn && nextBtn && dotsContainer) {
    var cards = track.querySelectorAll('.screenshot-card');
    var totalCards = cards.length;
    var currentIndex = 0;
    var cardWidth = 0;
    var gap = 24;
    var visibleCards = 3;

    function calcCardWidth() {
      if (window.innerWidth < 768) {
        cardWidth = 200;
        gap = 16;
        visibleCards = 1;
      } else {
        cardWidth = 260;
        gap = 32;
        visibleCards = Math.min(Math.floor((track.parentElement.clientWidth) / (cardWidth + gap)), totalCards);
      }
    }

    function createDots() {
      dotsContainer.innerHTML = '';
      var maxIndex = Math.max(0, totalCards - visibleCards);
      for (var i = 0; i <= maxIndex; i++) {
        var dot = document.createElement('div');
        dot.className = 'screenshots__dot' + (i === currentIndex ? ' active' : '');
        dot.setAttribute('data-index', i);
        dot.addEventListener('click', function () {
          goTo(parseInt(this.getAttribute('data-index'), 10));
        });
        dotsContainer.appendChild(dot);
      }
    }

    function updateDots() {
      dotsContainer.querySelectorAll('.screenshots__dot').forEach(function (d, i) {
        d.classList.toggle('active', i === currentIndex);
      });
    }

    function goTo(index) {
      var maxIndex = Math.max(0, totalCards - visibleCards);
      currentIndex = Math.max(0, Math.min(index, maxIndex));
      var offset = currentIndex * (cardWidth + gap);
      track.style.transform = 'translateX(-' + offset + 'px)';
      updateDots();
    }

    prevBtn.addEventListener('click', function () { goTo(currentIndex - 1); });
    nextBtn.addEventListener('click', function () { goTo(currentIndex + 1); });

    function initCarousel() {
      calcCardWidth();
      createDots();
      goTo(currentIndex);
    }

    initCarousel();
    window.addEventListener('resize', function () {
      initCarousel();
    });

    // Touch/swipe support with visual drag feedback
    var startX = 0;
    var startY = 0;
    var isDragging = false;
    var dragOffset = 0;
    var swipeHint = document.getElementById('swipeHint');

    track.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
      dragOffset = 0;
      track.style.transition = 'none';
    }, { passive: true });

    track.addEventListener('touchmove', function (e) {
      if (!isDragging) return;
      var dx = e.touches[0].clientX - startX;
      dragOffset = dx;
      var baseOffset = currentIndex * (cardWidth + gap);
      track.style.transform = 'translateX(' + (-baseOffset + dx * 0.4) + 'px)';
    }, { passive: true });

    track.addEventListener('touchend', function (e) {
      if (!isDragging) return;
      isDragging = false;
      track.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
      var endX = e.changedTouches[0].clientX;
      var endY = e.changedTouches[0].clientY;
      var dx = endX - startX;
      var dy = endY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        if (dx < 0) goTo(currentIndex + 1);
        else goTo(currentIndex - 1);
      } else {
        goTo(currentIndex);
      }
      // Hide swipe hint after first swipe
      if (swipeHint && Math.abs(dx) > 30) {
        swipeHint.style.opacity = '0';
        setTimeout(function () { swipeHint.style.display = 'none'; }, 400);
      }
    }, { passive: true });
  }

  /* ── Active nav link highlight ──────────────────────────────────── */
  var sections = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.nav__link');

  window.addEventListener('scroll', function () {
    var scrollY = window.scrollY + 120;
    sections.forEach(function (section) {
      var top = section.offsetTop;
      var height = section.offsetHeight;
      var id = section.getAttribute('id');
      if (scrollY >= top && scrollY < top + height) {
        navAnchors.forEach(function (a) {
          a.style.color = '';
          if (a.getAttribute('href') === '#' + id) {
            a.style.color = '#FFD666';
          }
        });
      }
    });
  });

  /* ── FAQ toggle animation ───────────────────────────────────────── */
  document.querySelectorAll('.faq__item').forEach(function (item) {
    item.querySelector('.faq__question').addEventListener('click', function () {
      // Close others
      document.querySelectorAll('.faq__item').forEach(function (other) {
        if (other !== item && other.open) {
          other.open = false;
        }
      });
    });
  });

  /* ── Scroll-linked parallax for sections ─────────────────────────── */
  (function () {
    var hero = document.getElementById('hero');
    var heroContent = hero ? hero.querySelector('.hero__content') : null;
    var heroVisual = hero ? hero.querySelector('.hero__visual') : null;
    var heroScrollHint = hero ? hero.querySelector('.hero__scroll-hint') : null;

    function onScrollParallax() {
      var sy = window.pageYOffset;

      // Hero parallax — content and visual drift at different speeds
      if (heroContent) {
        var heroOpacity = Math.max(0, 1 - sy / 600);
        var heroShift = sy * 0.25;
        heroContent.style.transform = 'translateY(' + heroShift + 'px)';
        heroContent.style.opacity = heroOpacity;
      }
      if (heroVisual) {
        heroVisual.style.transform = 'translateY(' + (sy * 0.15) + 'px)';
      }
      // Fade out scroll hint
      if (heroScrollHint) {
        heroScrollHint.style.opacity = Math.max(0, 1 - sy / 200);
      }

      // Section titles — subtle parallax
      document.querySelectorAll('.section-header').forEach(function (header) {
        var rect = header.getBoundingClientRect();
        var viewH = window.innerHeight;
        if (rect.top < viewH && rect.bottom > 0) {
          var progress = (viewH - rect.top) / (viewH + rect.height);
          var shift = (progress - 0.5) * -15;
          header.style.transform = 'translateY(' + shift + 'px)';
        }
      });

      // Feature cards — tilt based on scroll position
      document.querySelectorAll('.feature-card.aos-animate').forEach(function (card) {
        var rect = card.getBoundingClientRect();
        var viewH = window.innerHeight;
        if (rect.top < viewH && rect.bottom > 0) {
          var progress = (viewH - rect.top) / (viewH + rect.height);
          var tilt = (progress - 0.5) * 3;
          card.style.transform = 'perspective(800px) rotateX(' + tilt + 'deg) translateY(0)';
        }
      });
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.addEventListener('scroll', onScrollParallax, { passive: true });
    }
  })();

  /* ── Mouse tilt for cards (3D depth effect) ──────────────────────── */
  document.querySelectorAll('.feature-card, .pricing-card--featured').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = 'perspective(600px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 8) + 'deg) translateY(-4px) scale(1.02)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.22,0.61,0.36,1)';
    });
  });

  /* ── Magnetic button effect ──────────────────────────────────────── */
  document.querySelectorAll('.btn--glow').forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var rect = btn.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = 'translate(' + (x * 0.15) + 'px,' + (y * 0.15) + 'px)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = '';
    });
  });

  /* ── Counter animation for trust strip items on scroll ───────────── */
  var trustObserved = false;
  var trustStrip = document.querySelector('.trust-strip');
  if (trustStrip) {
    var trustObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !trustObserved) {
        trustObserved = true;
        trustStrip.style.animation = 'trustReveal 0.8s var(--ease) forwards';
        trustObs.unobserve(trustStrip);
      }
    }, { threshold: 0.3 });
    trustObs.observe(trustStrip);
  }

  /* ── Section Scene Activation — triggers unique background per section ── */
  var sceneSections = document.querySelectorAll('.features, .how, .screenshots, .kendara, .porondam, .fullreport, .pricing, .testimonials, .faq, .download');
  if (sceneSections.length) {
    var sceneObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('scene-active');
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });

    sceneSections.forEach(function (section) {
      sceneObserver.observe(section);
    });
  }

  /* ── Cursor spotlight glow on feature & pricing cards ────────────── */
  document.querySelectorAll('.feature-card, .pricing-card, .how__step').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      card.style.background =
        'radial-gradient(600px circle at ' + x + 'px ' + y + 'px, rgba(147,51,234,0.06), transparent 50%), ' +
        'var(--bg-card)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.background = '';
    });
  });

  /* ── Staggered card entrance — adds sequential delay ─────────────── */
  document.querySelectorAll('.features__grid, .pricing__grid, .testimonials__grid').forEach(function (grid) {
    var cards = grid.children;
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.transitionDelay = (i * 0.1) + 's';
    }
  });

  /* ── Number counter animation for pricing amounts ────────────────── */
  var priceObserved = false;
  var pricingSection = document.getElementById('pricing');
  if (pricingSection) {
    var priceObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !priceObserved) {
        priceObserved = true;
        pricingSection.querySelectorAll('.pricing-card__amount').forEach(function (el) {
          var text = el.textContent;
          var match = text.match(/(\d+)/);
          if (match) {
            var target = parseInt(match[1], 10);
            var prefix = text.substring(0, text.indexOf(match[1]));
            var suffix = text.substring(text.indexOf(match[1]) + match[1].length);
            var start = 0;
            var duration = 1200;
            var startTime = null;
            function animateCount(timestamp) {
              if (!startTime) startTime = timestamp;
              var progress = Math.min((timestamp - startTime) / duration, 1);
              var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
              var current = Math.round(start + (target - start) * eased);
              el.textContent = prefix + current + suffix;
              if (progress < 1) requestAnimationFrame(animateCount);
            }
            requestAnimationFrame(animateCount);
          }
        });
        priceObs.unobserve(pricingSection);
      }
    }, { threshold: 0.3 });
    priceObs.observe(pricingSection);
  }

  /* ── Scroll progress indicator (thin gold line at page top) ──────── */
  var scrollProgressBar = document.createElement('div');
  scrollProgressBar.style.cssText =
    'position:fixed;top:0;left:0;height:2px;z-index:9999;pointer-events:none;' +
    'background:linear-gradient(90deg,#FFB800,#9333EA,#4CC9F0);' +
    'transition:width 0.15s ease;width:0;border-radius:0 2px 2px 0;';
  document.body.appendChild(scrollProgressBar);
  window.addEventListener('scroll', function () {
    var scrolled = window.scrollY;
    var total = document.documentElement.scrollHeight - window.innerHeight;
    var pct = total > 0 ? (scrolled / total) * 100 : 0;
    scrollProgressBar.style.width = pct + '%';
  }, { passive: true });

  /* ── Tilt reset smoothing (makes card tilt feel premium) ─────────── */
  document.querySelectorAll('.feature-card, .pricing-card--featured, .testimonial-card').forEach(function (card) {
    card.addEventListener('mouseenter', function () {
      card.style.transition = 'transform 0.1s ease-out';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transition = 'transform 0.6s cubic-bezier(0.22,0.61,0.36,1)';
      card.style.transform = '';
    });
  });

  /* ═══════════════════════════════════════════════════════════════════
     AURORA STAR LANE — S-shaped aurora ribbon with bright stars,
     comets, and connecting star lanes weaving down the centre.
     Canvas-based, lightweight, scroll-aware.
     ═══════════════════════════════════════════════════════════════════ */
  (function initAuroraLane() {
    var canvas = document.getElementById('auroraLane');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var W, H, pageH, dpr;
    var stars = [];
    var comets = [];
    var time = 0;
    var scrollY = 0;
    var raf;

    /* ── Section anchors for the S-curve waypoints ── */
    var sectionIds = ['hero','features','how-it-works','screenshots',
                      'pricing','testimonials','faq','download'];

    /* ── Aurora colour palette ── */
    var auroraColors = [
      { r: 100, g: 60,  b: 220 },   // deep violet
      { r: 30,  g: 180, b: 220 },   // cyan
      { r: 255, g: 184, b: 0   },   // gold
      { r: 80,  g: 220, b: 160 },   // emerald
      { r: 200, g: 80,  b: 200 }    // magenta
    ];

    /* ── Resize — match full page height ── */
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      pageH = document.documentElement.scrollHeight;
      H = pageH;

      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildStars();
    }

    /* ── Build the S-curve control points through section centres ── */
    function getSCurvePoints() {
      var pts = [];
      var scrollTop = window.pageYOffset || 0;
      var cx = W * 0.5;

      for (var i = 0; i < sectionIds.length; i++) {
        var el = document.getElementById(sectionIds[i]);
        if (!el) continue;
        var rect = el.getBoundingClientRect();
        var yMid = rect.top + scrollTop + rect.height * 0.45;
        // S-shape: alternate left & right of centre
        var amplitude = W < 768 ? W * 0.18 : W * 0.15;
        var xOff = (i % 2 === 0 ? -1 : 1) * amplitude;
        pts.push({ x: cx + xOff, y: yMid });
      }

      // Bookend
      if (pts.length > 0) {
        pts.unshift({ x: cx, y: 0 });
        pts.push({ x: cx, y: pageH });
      }
      return pts;
    }

    /* ── Catmull-Rom interpolation for smooth S path ── */
    function catmullRom(p0, p1, p2, p3, t) {
      var t2 = t * t, t3 = t2 * t;
      return {
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      };
    }

    /* ── Sample the full S path at uniform intervals ── */
    function samplePath(pts, count) {
      var out = [];
      if (pts.length < 2) return out;
      var segs = pts.length - 1;
      for (var i = 0; i < count; i++) {
        var f = i / (count - 1) * (segs - 1);
        var seg = Math.min(Math.floor(f), segs - 2);
        var lt = f - seg;
        var p0 = pts[Math.max(0, seg - 1)];
        var p1 = pts[seg];
        var p2 = pts[Math.min(segs, seg + 1)];
        var p3 = pts[Math.min(segs, seg + 2)];
        out.push(catmullRom(p0, p1, p2, p3, lt));
      }
      return out;
    }

    /* ── Populate lane stars along the S-path ── */
    function buildStars() {
      stars = [];
      var pts = getSCurvePoints();
      var sampled = samplePath(pts, 250);

      for (var i = 0; i < sampled.length; i++) {
        var sp = sampled[i];
        // Scatter around the path
        var spread = W < 768 ? 60 : 110;
        var ox = (Math.random() - 0.5) * spread;
        var oy = (Math.random() - 0.5) * 30;
        var brightness = Math.random();
        var isBright = brightness > 0.88;

        stars.push({
          x: sp.x + ox,
          y: sp.y + oy,
          r: isBright ? 1.5 + Math.random() * 1.8 : 0.4 + Math.random() * 1.0,
          bright: isBright,
          twinkleSpeed: 1.5 + Math.random() * 3,
          twinklePhase: Math.random() * Math.PI * 2,
          color: auroraColors[Math.floor(Math.random() * auroraColors.length)],
          baseAlpha: isBright ? 0.8 + Math.random() * 0.2 : 0.2 + Math.random() * 0.4
        });
      }

      // Seed initial comets
      comets = [];
      for (var c = 0; c < 3; c++) {
        comets.push(spawnComet());
      }
    }

    /* ── Spawn a comet along the S-path ── */
    function spawnComet() {
      var pts = getSCurvePoints();
      var sampled = samplePath(pts, 100);
      var idx = Math.floor(Math.random() * (sampled.length - 10));
      var start = sampled[idx];
      var end   = sampled[Math.min(idx + 8, sampled.length - 1)];
      var dx = end.x - start.x;
      var dy = end.y - start.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var speed = 1.5 + Math.random() * 2.5;

      return {
        x: start.x + (Math.random() - 0.5) * 60,
        y: start.y,
        vx: (dx / len) * speed + (Math.random() - 0.5) * 0.8,
        vy: (dy / len) * speed,
        life: 1.0,
        decay: 0.004 + Math.random() * 0.006,
        tailLen: 25 + Math.random() * 40,
        radius: 1.5 + Math.random() * 1.5,
        color: auroraColors[Math.floor(Math.random() * auroraColors.length)]
      };
    }

    /* ── Draw the aurora glow ribbon along the S-path ── */
    function drawAurora(pts) {
      if (pts.length < 2) return;
      var sampled = samplePath(pts, 120);

      // Draw multiple translucent bands with time-shifted hue
      for (var band = 0; band < 3; band++) {
        ctx.beginPath();
        ctx.moveTo(sampled[0].x, sampled[0].y);
        for (var i = 1; i < sampled.length; i++) {
          var prev = sampled[i - 1];
          var cur  = sampled[i];
          var mx = (prev.x + cur.x) * 0.5;
          var my = (prev.y + cur.y) * 0.5;
          ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
        }
        var last = sampled[sampled.length - 1];
        ctx.lineTo(last.x, last.y);

        var bandWidth = (W < 768 ? 40 : 80) + band * 30;
        var hueShift = time * 0.3 + band * 1.2;
        var ci = Math.floor((hueShift) % auroraColors.length);
        var col = auroraColors[ci];
        var alpha = (0.025 - band * 0.007);

        ctx.strokeStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + alpha + ')';
        ctx.lineWidth = bandWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0.15)';
        ctx.shadowBlur = 40 + band * 20;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    /* ── Draw lane stars with twinkling ── */
    function drawStars() {
      var viewTop = scrollY - 200;
      var viewBot = scrollY + window.innerHeight + 200;

      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        if (s.y < viewTop || s.y > viewBot) continue;

        var twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase);
        var alpha = s.baseAlpha + twinkle * 0.25;
        alpha = Math.max(0.05, Math.min(1, alpha));

        var col = s.color;

        if (s.bright) {
          // Bright star — glow halo
          var grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
          grad.addColorStop(0, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (alpha * 0.8) + ')');
          grad.addColorStop(0.3, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (alpha * 0.3) + ')');
          grad.addColorStop(1, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0)');
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Cross-spike for brightest stars
          ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.5) + ')';
          ctx.lineWidth = 0.5;
          var spikeLen = s.r * 4 + twinkle * 2;
          ctx.beginPath();
          ctx.moveTo(s.x - spikeLen, s.y);
          ctx.lineTo(s.x + spikeLen, s.y);
          ctx.moveTo(s.x, s.y - spikeLen);
          ctx.lineTo(s.x, s.y + spikeLen);
          ctx.stroke();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.fill();
      }
    }

    /* ── Draw comets with glowing tails ── */
    function drawComets() {
      for (var i = comets.length - 1; i >= 0; i--) {
        var c = comets[i];
        c.x += c.vx;
        c.y += c.vy;
        c.life -= c.decay;

        if (c.life <= 0) {
          comets[i] = spawnComet();
          continue;
        }

        var alpha = c.life * 0.9;
        var col = c.color;

        // Comet tail
        var tailX = c.x - c.vx * c.tailLen;
        var tailY = c.y - c.vy * c.tailLen;
        var grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
        grad.addColorStop(0, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + alpha + ')');
        grad.addColorStop(1, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0)');

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(c.x, c.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = c.radius;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Comet head glow
        var headGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius * 4);
        headGrad.addColorStop(0, 'rgba(255,255,255,' + (alpha * 0.9) + ')');
        headGrad.addColorStop(0.4, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (alpha * 0.5) + ')');
        headGrad.addColorStop(1, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0)');
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = headGrad;
        ctx.fill();
      }
    }

    /* ── Draw section node stars — bright anchor points ── */
    function drawNodeStars(pts) {
      // Skip first/last bookend points
      for (var i = 1; i < pts.length - 1; i++) {
        var p = pts[i];

        // Check if near viewport
        var dist = Math.abs(p.y - (scrollY + window.innerHeight * 0.5));
        var nearness = 1 - Math.min(dist / (window.innerHeight * 0.6), 1);
        if (nearness <= 0) continue;

        var pulse = Math.sin(time * 1.5 + i * 0.8) * 0.3 + 0.7;
        var alpha = nearness * pulse;
        var col = auroraColors[i % auroraColors.length];

        // Outer glow
        var r1 = 18 + nearness * 8;
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r1);
        grad.addColorStop(0, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (alpha * 0.4) + ')');
        grad.addColorStop(0.5, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (alpha * 0.1) + ')');
        grad.addColorStop(1, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, r1, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Inner bright core
        var r2 = 3 + nearness * 2;
        var coreGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r2);
        coreGrad.addColorStop(0, 'rgba(255,255,255,' + (alpha * 0.95) + ')');
        coreGrad.addColorStop(1, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (alpha * 0.3) + ')');
        ctx.beginPath();
        ctx.arc(p.x, p.y, r2, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // Cross spikes
        ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.35) + ')';
        ctx.lineWidth = 0.7;
        var spike = 8 + nearness * 10;
        ctx.beginPath();
        ctx.moveTo(p.x - spike, p.y); ctx.lineTo(p.x + spike, p.y);
        ctx.moveTo(p.x, p.y - spike); ctx.lineTo(p.x, p.y + spike);
        ctx.stroke();
      }
    }

    /* ── Connecting star lines between nodes ── */
    function drawConnections(pts) {
      if (pts.length < 3) return;
      var sampled = samplePath(pts, 80);

      // Thin luminous line along the centre of the S
      ctx.beginPath();
      ctx.moveTo(sampled[0].x, sampled[0].y);
      for (var i = 1; i < sampled.length; i++) {
        ctx.lineTo(sampled[i].x, sampled[i].y);
      }

      var scrollFrac = scrollY / Math.max(1, pageH - window.innerHeight);
      var revealLen = sampled.length * Math.min(1, scrollFrac * 1.15 + 0.08);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.lineDashOffset = -time * 8;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* ── Main render loop ── */
    function render() {
      time += 0.016;
      scrollY = window.pageYOffset || 0;

      ctx.clearRect(0, 0, W, H);

      var pts = getSCurvePoints();
      drawAurora(pts);
      drawConnections(pts);
      drawStars();
      drawComets();
      drawNodeStars(pts);

      raf = requestAnimationFrame(render);
    }

    /* ── Scroll listener ── */
    window.addEventListener('scroll', function () {
      scrollY = window.pageYOffset || 0;
    }, { passive: true });

    /* ── Resize handler ── */
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    /* ── Init ── */
    resize();
    render();

    /* Rebuild after full load to get correct section positions */
    window.addEventListener('load', function () {
      setTimeout(function () { resize(); }, 500);
      setTimeout(function () { resize(); }, 2000);
    });
  })();

  /* ═══════════════════════════════════════════════════════════════════════
     Kendara — Realistic Branching Lightning System
     Canvas-based lightning with jagged bolts, branches, ambient glow,
     multiple rapid sub-flashes, and randomised timing.
     ═══════════════════════════════════════════════════════════════════════ */
  (function initKendaraLightning() {
    var canvas = document.getElementById('kendaraLightning');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var section = document.getElementById('kendara');
    if (!section) return;

    var W, H, dpr;
    var bolts = [];
    var ambientAlpha = 0;
    var isActive = false;

    function resize() {
      var rect = section.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function generateBolt(x1, y1, x2, y2, depth) {
      depth = depth || 0;
      var segments = [];
      var dx = x2 - x1, dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.max(4, Math.floor(len / (depth === 0 ? 18 : 30)));
      var jitter = len * (depth === 0 ? 0.12 : 0.08);
      segments.push({ x: x1, y: y1 });
      for (var i = 1; i <= steps; i++) {
        var t = i / steps;
        segments.push({
          x: x1 + dx * t + (Math.random() - 0.5) * jitter * 2,
          y: y1 + dy * t + (Math.random() - 0.5) * jitter * 0.6
        });
      }
      segments[segments.length - 1] = { x: x2, y: y2 };

      var branches = [];
      if (depth < 2) {
        var bc = depth === 0 ? Math.floor(2 + Math.random() * 4) : Math.floor(Math.random() * 2);
        for (var b = 0; b < bc; b++) {
          var si = Math.floor(2 + Math.random() * (segments.length - 4));
          if (si >= segments.length) si = segments.length - 2;
          var sp = segments[si];
          var bAngle = (Math.random() - 0.5) * 1.2 + (dx > 0 ? 0.3 : -0.3);
          var bLen = len * (0.15 + Math.random() * 0.25) / (depth + 1);
          var bx2 = sp.x + Math.cos(bAngle) * bLen * (Math.random() > 0.5 ? 1 : -1);
          var by2 = sp.y + Math.abs(Math.sin(bAngle)) * bLen;
          branches.push(generateBolt(sp.x, sp.y, bx2, by2, depth + 1));
        }
      }
      return { segments: segments, branches: branches, depth: depth };
    }

    function drawBolt(bolt, alpha, progress) {
      var segs = bolt.segments;
      var drawCount = Math.floor(segs.length * Math.min(progress, 1));
      if (drawCount < 2) return;
      var baseW = bolt.depth === 0 ? 2.5 : (bolt.depth === 1 ? 1.2 : 0.6);
      var glowW = bolt.depth === 0 ? 12 : (bolt.depth === 1 ? 6 : 3);

      // Outer glow
      ctx.save();
      ctx.globalAlpha = alpha * 0.4 / (bolt.depth + 1);
      ctx.strokeStyle = 'rgba(160,120,255,1)';
      ctx.lineWidth = glowW; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(140,100,255,0.8)'; ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.moveTo(segs[0].x, segs[0].y);
      for (var i = 1; i < drawCount; i++) ctx.lineTo(segs[i].x, segs[i].y);
      ctx.stroke(); ctx.restore();

      // Core
      ctx.save();
      ctx.globalAlpha = alpha * 0.9 / (bolt.depth * 0.5 + 1);
      ctx.strokeStyle = bolt.depth === 0 ? 'rgba(220,210,255,1)' : 'rgba(180,160,255,1)';
      ctx.lineWidth = baseW; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(200,180,255,1)'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(segs[0].x, segs[0].y);
      for (var j = 1; j < drawCount; j++) ctx.lineTo(segs[j].x, segs[j].y);
      ctx.stroke(); ctx.restore();

      // Hot white centre for main bolt
      if (bolt.depth === 0) {
        ctx.save(); ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(segs[0].x, segs[0].y);
        for (var k = 1; k < drawCount; k++) ctx.lineTo(segs[k].x, segs[k].y);
        ctx.stroke(); ctx.restore();
      }

      for (var bi = 0; bi < bolt.branches.length; bi++) {
        var bp = (progress - 0.2) * 1.5;
        if (bp > 0) drawBolt(bolt.branches[bi], alpha * 0.7, bp);
      }
    }

    function spawnBolt() {
      var ox = W * (0.1 + Math.random() * 0.8);
      var oy = H * (Math.random() * 0.1);
      var ex = ox + (Math.random() - 0.5) * W * 0.3;
      var ey = H * (0.5 + Math.random() * 0.4);
      var tree = generateBolt(ox, oy, ex, ey, 0);
      var fc = 2 + Math.floor(Math.random() * 2);
      var ft = [], dur = 0;
      for (var f = 0; f < fc; f++) {
        var fi = 20 + Math.random() * 30, fh = 30 + Math.random() * 60, fo = 80 + Math.random() * 120;
        var gap = f < fc - 1 ? (40 + Math.random() * 80) : 0;
        ft.push({ start: dur, fadeIn: fi, hold: fh, fadeOut: fo, peak: 0.5 + Math.random() * 0.5 });
        dur += fi + fh + fo + gap;
      }
      ft[ft.length - 1].peak = 0.9 + Math.random() * 0.1;
      bolts.push({ tree: tree, born: performance.now(), duration: dur, flashes: ft, ambientPeak: 0.06 + Math.random() * 0.06 });
    }

    var nextBoltTime = performance.now() + 2000 + Math.random() * 3000;
    function scheduleNext(now) {
      nextBoltTime = now + (Math.random() < 0.2 ? 300 + Math.random() * 500 : 2500 + Math.random() * 5000);
    }

    function getBoltAlpha(bolt, now) {
      var el = now - bolt.born;
      if (el < 0 || el > bolt.duration) return 0;
      var a = 0;
      for (var i = 0; i < bolt.flashes.length; i++) {
        var fl = bolt.flashes[i], ft = el - fl.start;
        if (ft < 0) continue;
        if (ft < fl.fadeIn) a = Math.max(a, (ft / fl.fadeIn) * fl.peak);
        else if (ft < fl.fadeIn + fl.hold) a = Math.max(a, fl.peak);
        else if (ft < fl.fadeIn + fl.hold + fl.fadeOut) a = Math.max(a, fl.peak * (1 - (ft - fl.fadeIn - fl.hold) / fl.fadeOut));
      }
      return a;
    }

    function render() {
      requestAnimationFrame(render);
      if (!isActive) { ctx.clearRect(0, 0, W, H); return; }
      var now = performance.now();
      if (now >= nextBoltTime) { spawnBolt(); scheduleNext(now); }
      ctx.clearRect(0, 0, W, H);
      ambientAlpha = 0;
      var alive = [];
      for (var i = 0; i < bolts.length; i++) {
        var b = bolts[i], a = getBoltAlpha(b, now);
        if (a > 0.001 || now - b.born <= b.duration) {
          alive.push(b);
          ambientAlpha = Math.max(ambientAlpha, a * b.ambientPeak);
        }
      }
      bolts = alive;
      if (ambientAlpha > 0.002) {
        ctx.save(); ctx.globalAlpha = ambientAlpha;
        ctx.fillStyle = 'rgba(100,60,200,1)'; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      for (var j = 0; j < bolts.length; j++) {
        var bolt = bolts[j], al = getBoltAlpha(bolt, now);
        if (al > 0.001) {
          var elapsed = now - bolt.born;
          var dp = Math.min(elapsed / (bolt.flashes[0].fadeIn + bolt.flashes[0].hold), 1);
          drawBolt(bolt.tree, al, dp);
        }
      }
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { isActive = e.isIntersecting; });
    }, { threshold: 0.05 });
    obs.observe(section);
    requestAnimationFrame(render);
  })();

  /* ═══════════════════════════════════════════════════════════════════════
     Porondam — Pink Aurora Ribbons
     Canvas-based swirling aurora ribbons matching the hero style but pink
     ═══════════════════════════════════════════════════════════════════════ */
  (function initPorondamAurora() {
    var canvas = document.getElementById('porondamAurora');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var section = document.getElementById('porondam');
    if (!section) return;

    var W, H, dpr;
    var isActive = false;
    var time = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.parentElement.offsetWidth;
      H = canvas.parentElement.offsetHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    /* Catmull-Rom spline helper */
    function catmullRom(p0, p1, p2, p3, t) {
      var t2 = t * t, t3 = t2 * t;
      return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }

    /* 4 ribbons — pink/magenta aurora */
    var RIBBON_COUNT = 4;
    var ribbons = [];
    for (var r = 0; r < RIBBON_COUNT; r++) {
      ribbons.push({
        yBase: 0.25 + r * 0.15,
        speed: 0.15 + r * 0.05,
        amp: 40 + r * 15,
        hue: 320 + r * 15,       // Pink → Magenta range
        alpha: 0.06 - r * 0.008,
        width: 120 - r * 15
      });
    }

    /* 4 soft nebula glows */
    var NEBULA_COUNT = 4;
    var nebulas = [];
    for (var n = 0; n < NEBULA_COUNT; n++) {
      nebulas.push({
        x: Math.random(), y: Math.random(),
        r: 150 + Math.random() * 200,
        hue: 310 + Math.random() * 40,
        speed: 0.2 + Math.random() * 0.3
      });
    }

    function render() {
      requestAnimationFrame(render);
      if (!isActive) return;
      time += 0.016;
      ctx.clearRect(0, 0, W, H);

      /* Draw nebula glows */
      for (var ni = 0; ni < nebulas.length; ni++) {
        var nb = nebulas[ni];
        var nx = (nb.x + Math.sin(time * nb.speed * 0.5) * 0.1) * W;
        var ny = (nb.y + Math.cos(time * nb.speed * 0.3) * 0.1) * H;
        var grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nb.r);
        grad.addColorStop(0, 'hsla(' + nb.hue + ',70%,50%,0.04)');
        grad.addColorStop(1, 'hsla(' + nb.hue + ',70%,50%,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      /* Draw ribbons */
      for (var ri = 0; ri < ribbons.length; ri++) {
        var rb = ribbons[ri];
        var pts = [];
        var segs = 8;
        for (var s = -1; s <= segs + 2; s++) {
          var px = (s / segs) * W;
          var py = rb.yBase * H + Math.sin(time * rb.speed + s * 0.8) * rb.amp + Math.cos(time * rb.speed * 0.7 + s * 1.2) * rb.amp * 0.5;
          pts.push({ x: px, y: py });
        }

        ctx.beginPath();
        var samples = 60;
        for (var si = 0; si < pts.length - 3; si++) {
          for (var t = 0; t < samples; t++) {
            var frac = t / samples;
            var sx = catmullRom(pts[si].x, pts[si + 1].x, pts[si + 2].x, pts[si + 3].x, frac);
            var sy = catmullRom(pts[si].y, pts[si + 1].y, pts[si + 2].y, pts[si + 3].y, frac);
            if (si === 0 && t === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
        }

        ctx.strokeStyle = 'hsla(' + rb.hue + ',80%,60%,' + rb.alpha + ')';
        ctx.lineWidth = rb.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'hsla(' + rb.hue + ',90%,50%,0.15)';
        ctx.shadowBlur = 40;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { isActive = e.isIntersecting; });
    }, { threshold: 0.05 });
    obs.observe(section);
    requestAnimationFrame(render);
  })();

})();
