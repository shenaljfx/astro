/* Grahachara Website - Main Interactions */

(function () {
  'use strict';

  /* -- Performance: throttled scroll handler -- */
  var scrollTicking = false;
  var lastScrollY = 0;
  var scrollCallbacks = [];

  function onScrollTick() {
    lastScrollY = window.pageYOffset || window.scrollY || 0;
    for (var i = 0; i < scrollCallbacks.length; i++) {
      scrollCallbacks[i](lastScrollY);
    }
    scrollTicking = false;
  }

  window.addEventListener('scroll', function () {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(onScrollTick);
    }
  }, { passive: true });

  function addScrollCallback(fn) {
    scrollCallbacks.push(fn);
  }

  /* -- Rashi Chakra: fade as user scrolls past hero -- */
  var rcEl = document.querySelector('.rashi-chakra');
  if (rcEl) {
    addScrollCallback(function (sy) {
      var h = window.innerHeight;
      var t = Math.min(sy / h, 1);
      rcEl.style.opacity = (0.5 * (1 - t)).toFixed(3);
    });
  }

  /* -- Navigation: scroll effect + mobile burger -- */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('navBurger');
  var navLinks = document.getElementById('navLinks');

  addScrollCallback(function (sy) {
    if (sy > 40) { nav.classList.add('nav--scrolled'); }
    else { nav.classList.remove('nav--scrolled'); }
  });

  if (burger && navLinks) {
    burger.addEventListener('click', function () {
      var isOpen = burger.classList.toggle('active');
      navLinks.classList.toggle('active');
      document.body.classList.toggle('nav-open', isOpen);
    });
    navLinks.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        burger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('nav-open');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        burger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('nav-open');
      }
    });
    document.addEventListener('click', function (e) {
      if (navLinks.classList.contains('active') &&
          !navLinks.contains(e.target) && !burger.contains(e.target)) {
        burger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('nav-open');
      }
    });
  }

  /* -- Smooth scroll for anchor links -- */
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

  /* -- Scroll-triggered animations (AOS-like) -- */
  var aosElements = document.querySelectorAll('[data-aos]');
  var aosObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var delay = parseInt(entry.target.getAttribute('data-aos-delay') || '0', 10);
        setTimeout(function () { entry.target.classList.add('aos-animate'); }, delay);
        aosObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  aosElements.forEach(function (el) { aosObserver.observe(el); });

  /* -- Screenshots Carousel -- */
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
      if (window.innerWidth < 768) { cardWidth = 200; gap = 16; visibleCards = 1; }
      else { cardWidth = 260; gap = 32; visibleCards = Math.min(Math.floor((track.parentElement.clientWidth) / (cardWidth + gap)), totalCards); }
    }
    function createDots() {
      dotsContainer.innerHTML = '';
      var maxIndex = Math.max(0, totalCards - visibleCards);
      for (var i = 0; i <= maxIndex; i++) {
        var dot = document.createElement('div');
        dot.className = 'screenshots__dot' + (i === currentIndex ? ' active' : '');
        dot.setAttribute('data-index', i);
        dot.addEventListener('click', function () { goTo(parseInt(this.getAttribute('data-index'), 10)); });
        dotsContainer.appendChild(dot);
      }
    }
    function updateDots() {
      dotsContainer.querySelectorAll('.screenshots__dot').forEach(function (d, i) { d.classList.toggle('active', i === currentIndex); });
    }
    function goTo(index) {
      var maxIndex = Math.max(0, totalCards - visibleCards);
      currentIndex = Math.max(0, Math.min(index, maxIndex));
      track.style.transform = 'translateX(-' + (currentIndex * (cardWidth + gap)) + 'px)';
      updateDots();
    }
    prevBtn.addEventListener('click', function () { goTo(currentIndex - 1); });
    nextBtn.addEventListener('click', function () { goTo(currentIndex + 1); });
    function initCarousel() { calcCardWidth(); createDots(); goTo(currentIndex); }
    initCarousel();
    window.addEventListener('resize', initCarousel);

    var startX = 0, startY = 0, isDragging = false;
    var swipeHint = document.getElementById('swipeHint');
    track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; isDragging = true; track.style.transition = 'none'; }, { passive: true });
    track.addEventListener('touchmove', function (e) { if (!isDragging) return; var dx = e.touches[0].clientX - startX; track.style.transform = 'translateX(' + (-(currentIndex * (cardWidth + gap)) + dx * 0.4) + 'px)'; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (!isDragging) return; isDragging = false;
      track.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) { if (dx < 0) goTo(currentIndex + 1); else goTo(currentIndex - 1); } else { goTo(currentIndex); }
      if (swipeHint && Math.abs(dx) > 30) { swipeHint.style.opacity = '0'; setTimeout(function () { swipeHint.style.display = 'none'; }, 400); }
    }, { passive: true });
  }

  /* -- Active nav link highlight -- */
  var sections = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.nav__link');
  addScrollCallback(function (sy) {
    var scrollY = sy + 120;
    sections.forEach(function (section) {
      var top = section.offsetTop, height = section.offsetHeight, id = section.getAttribute('id');
      if (scrollY >= top && scrollY < top + height) {
        navAnchors.forEach(function (a) { a.style.color = ''; if (a.getAttribute('href') === '#' + id) a.style.color = '#FFD666'; });
      }
    });
  });

  /* -- FAQ toggle -- */
  document.querySelectorAll('.faq__item').forEach(function (item) {
    item.querySelector('.faq__question').addEventListener('click', function () {
      document.querySelectorAll('.faq__item').forEach(function (other) { if (other !== item && other.open) other.open = false; });
    });
  });

  /* -- Scroll-linked parallax -- */
  (function () {
    var hero = document.getElementById('hero');
    var heroContent = hero ? hero.querySelector('.hero__content') : null;
    var heroVisual = hero ? hero.querySelector('.hero__visual') : null;
    var heroScrollHint = hero ? hero.querySelector('.hero__scroll-hint') : null;
    var sectionHeaders = document.querySelectorAll('.section-header');
    var isMobile = window.innerWidth < 768;
    function onScrollParallax() {
      var sy = lastScrollY;
      if (heroContent && sy < 800) { heroContent.style.transform = 'translateY(' + (sy * 0.25) + 'px)'; heroContent.style.opacity = Math.max(0, 1 - sy / 600); }
      if (heroVisual && sy < 800) { heroVisual.style.transform = 'translateY(' + (sy * 0.15) + 'px)'; }
      if (heroScrollHint && sy < 300) { heroScrollHint.style.opacity = Math.max(0, 1 - sy / 200); }
      var viewH = window.innerHeight;
      for (var i = 0; i < sectionHeaders.length; i++) {
        var header = sectionHeaders[i], rect = header.getBoundingClientRect();
        if (rect.top < viewH && rect.bottom > 0) { var p = (viewH - rect.top) / (viewH + rect.height); header.style.transform = 'translateY(' + ((p - 0.5) * -15) + 'px)'; }
      }
      if (!isMobile) {
        var fc = document.querySelectorAll('.feature-card.aos-animate');
        for (var j = 0; j < fc.length; j++) { var c = fc[j], cr = c.getBoundingClientRect(); if (cr.top < viewH && cr.bottom > 0) { var cp = (viewH - cr.top) / (viewH + cr.height); c.style.transform = 'perspective(800px) rotateX(' + ((cp - 0.5) * 3) + 'deg) translateY(0)'; } }
      }
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) addScrollCallback(onScrollParallax);
  })();

  /* -- Mouse tilt for cards (desktop) -- */
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.feature-card, .pricing-card--featured').forEach(function (card) {
      card.addEventListener('mousemove', function (e) { var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; card.style.transform = 'perspective(600px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 8) + 'deg) translateY(-4px) scale(1.02)'; });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; card.style.transition = 'transform 0.5s cubic-bezier(0.22,0.61,0.36,1)'; });
    });
  }

  /* -- Magnetic button effect (desktop) -- */
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.btn--glow').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) { var r = btn.getBoundingClientRect(); btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.15) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.15) + 'px)'; });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* -- Counter animation for trust strip -- */
  var trustObserved = false;
  var trustStrip = document.querySelector('.trust-strip');
  if (trustStrip) {
    var trustObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !trustObserved) { trustObserved = true; trustStrip.style.animation = 'trustReveal 0.8s var(--ease) forwards'; trustObs.unobserve(trustStrip); }
    }, { threshold: 0.3 });
    trustObs.observe(trustStrip);
  }

  /* -- Section Scene Activation -- */
  var sceneSections = document.querySelectorAll('.features, .how, .screenshots, .kendara, .porondam, .fullreport, .weekly-lagna, .pricing, .testimonials, .faq, .download');
  if (sceneSections.length) {
    var sceneObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) entry.target.classList.add('scene-active'); });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    sceneSections.forEach(function (section) { sceneObserver.observe(section); });
  }

  /* -- Cursor spotlight glow (desktop) -- */
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.feature-card, .pricing-card, .how__step').forEach(function (card) {
      card.addEventListener('mousemove', function (e) { var r = card.getBoundingClientRect(); card.style.background = 'radial-gradient(600px circle at ' + (e.clientX - r.left) + 'px ' + (e.clientY - r.top) + 'px, rgba(147,51,234,0.06), transparent 50%), var(--bg-card)'; });
      card.addEventListener('mouseleave', function () { card.style.background = ''; });
    });
  }

  /* -- Staggered card entrance -- */
  document.querySelectorAll('.features__grid, .pricing__grid, .testimonials__grid').forEach(function (grid) {
    var cards = grid.children;
    for (var i = 0; i < cards.length; i++) cards[i].style.transitionDelay = (i * 0.1) + 's';
  });

  /* -- Number counter for pricing -- */
  var priceObserved = false;
  var pricingSection = document.getElementById('pricing');
  if (pricingSection) {
    var priceObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !priceObserved) {
        priceObserved = true;
        pricingSection.querySelectorAll('.pricing-card__amount').forEach(function (el) {
          var text = el.textContent, match = text.match(/(\d+)/);
          if (match) {
            var target = parseInt(match[1], 10), prefix = text.substring(0, text.indexOf(match[1])), suffix = text.substring(text.indexOf(match[1]) + match[1].length);
            var startTime = null;
            function animateCount(ts) { if (!startTime) startTime = ts; var p = Math.min((ts - startTime) / 1200, 1); el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix; if (p < 1) requestAnimationFrame(animateCount); }
            requestAnimationFrame(animateCount);
          }
        });
        priceObs.unobserve(pricingSection);
      }
    }, { threshold: 0.3 });
    priceObs.observe(pricingSection);
  }

  /* -- Scroll progress indicator -- */
  var scrollProgressBar = document.createElement('div');
  scrollProgressBar.style.cssText = 'position:fixed;top:0;left:0;height:2px;z-index:9999;pointer-events:none;background:linear-gradient(90deg,#FFB800,#9333EA,#4CC9F0);transition:width 0.15s ease;width:0;border-radius:0 2px 2px 0;';
  document.body.appendChild(scrollProgressBar);
  addScrollCallback(function (sy) { var t = document.documentElement.scrollHeight - window.innerHeight; scrollProgressBar.style.width = (t > 0 ? (sy / t) * 100 : 0) + '%'; });

  /* -- Tilt reset smoothing (desktop) -- */
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.feature-card, .pricing-card--featured, .testimonial-card').forEach(function (card) {
      card.addEventListener('mouseenter', function () { card.style.transition = 'transform 0.1s ease-out'; });
      card.addEventListener('mouseleave', function () { card.style.transition = 'transform 0.6s cubic-bezier(0.22,0.61,0.36,1)'; card.style.transform = ''; });
    });
  }

})();