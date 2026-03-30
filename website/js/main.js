/* Grahachara Website - Main Interactions */

(function () {
  'use strict';

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Performance: throttled scroll handler Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
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
  /* Ã¢â€â‚¬Ã¢â€â‚¬ Navigation: scroll effect + mobile burger Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
  var nav = document.getElementById('nav');
  var burger = document.getElementById('navBurger');
  var navLinks = document.getElementById('navLinks');

  addScrollCallback(function (sy) {
    if (sy > 40) {
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

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Smooth scroll for anchor links Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
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

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Scroll-triggered animations (AOS-like) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
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

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Screenshots Carousel Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
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

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Active nav link highlight Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
  var sections = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.nav__link');

  addScrollCallback(function (sy) {
    var scrollY = sy + 120;
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

  /* Ã¢â€â‚¬Ã¢â€â‚¬ FAQ toggle animation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
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

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Scroll-linked parallax for sections Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
  (function () {
    var hero = document.getElementById('hero');
    var heroContent = hero ? hero.querySelector('.hero__content') : null;
    var heroVisual = hero ? hero.querySelector('.hero__visual') : null;
    var heroScrollHint = hero ? hero.querySelector('.hero__scroll-hint') : null;
    // Cache section headers Ã¢â‚¬â€ avoid repeated querySelectorAll on scroll
    var sectionHeaders = document.querySelectorAll('.section-header');
    // Skip feature card parallax on mobile
    var isMobile = window.innerWidth < 768;

    function onScrollParallax() {
      var sy = lastScrollY;

      // Hero parallax Ã¢â‚¬â€ content and visual drift at different speeds
      if (heroContent && sy < 800) {
        var heroOpacity = Math.max(0, 1 - sy / 600);
        var heroShift = sy * 0.25;
        heroContent.style.transform = 'translateY(' + heroShift + 'px)';
        heroContent.style.opacity = heroOpacity;
      }
      if (heroVisual && sy < 800) {
        heroVisual.style.transform = 'translateY(' + (sy * 0.15) + 'px)';
      }
      // Fade out scroll hint
      if (heroScrollHint && sy < 300) {
        heroScrollHint.style.opacity = Math.max(0, 1 - sy / 200);
      }

      // Section titles Ã¢â‚¬â€ subtle parallax (only when near viewport)
      var viewH = window.innerHeight;
      for (var i = 0; i < sectionHeaders.length; i++) {
        var header = sectionHeaders[i];
        var rect = header.getBoundingClientRect();
        if (rect.top < viewH && rect.bottom > 0) {
          var progress = (viewH - rect.top) / (viewH + rect.height);
          var shift = (progress - 0.5) * -15;
          header.style.transform = 'translateY(' + shift + 'px)';
        }
      }

      // Feature cards tilt Ã¢â‚¬â€ skip on mobile for perf
      if (!isMobile) {
        var featureCards = document.querySelectorAll('.feature-card.aos-animate');
        for (var j = 0; j < featureCards.length; j++) {
          var card = featureCards[j];
          var crect = card.getBoundingClientRect();
          if (crect.top < viewH && crect.bottom > 0) {
            var cprogress = (viewH - crect.top) / (viewH + crect.height);
            var tilt = (cprogress - 0.5) * 3;
            card.style.transform = 'perspective(800px) rotateX(' + tilt + 'deg) translateY(0)';
          }
        }
      }
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      addScrollCallback(onScrollParallax);
    }
  })();

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Mouse tilt for cards (3D depth effect) Ã¢â‚¬â€ desktop only Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
  if (window.innerWidth >= 768) {
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
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Magnetic button effect Ã¢â‚¬â€ desktop only Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
  if (window.innerWidth >= 768) {
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
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Counter animation for trust strip items on scroll Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
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

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Section Scene Activation Ã¢â‚¬â€ triggers unique background per section Ã¢â€â‚¬Ã¢â€â‚¬ */
  var sceneSections = document.querySelectorAll('.features, .how, .screenshots, .kendara, .porondam, .fullreport, .weekly-lagna, .pricing, .testimonials, .faq, .download');
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

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Cursor spotlight glow on feature & pricing cards Ã¢â‚¬â€ desktop only Ã¢â€â‚¬Ã¢â€â‚¬ */
  if (window.innerWidth >= 768) {
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
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Staggered card entrance Ã¢â‚¬â€ adds sequential delay Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
  document.querySelectorAll('.features__grid, .pricing__grid, .testimonials__grid').forEach(function (grid) {
    var cards = grid.children;
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.transitionDelay = (i * 0.1) + 's';
    }
  });

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Number counter animation for pricing amounts Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
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

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Scroll progress indicator (thin gold line at page top) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
  var scrollProgressBar = document.createElement('div');
  scrollProgressBar.style.cssText =
    'position:fixed;top:0;left:0;height:2px;z-index:9999;pointer-events:none;' +
    'background:linear-gradient(90deg,#FFB800,#9333EA,#4CC9F0);' +
    'transition:width 0.15s ease;width:0;border-radius:0 2px 2px 0;';
  document.body.appendChild(scrollProgressBar);
  addScrollCallback(function (sy) {
    var total = document.documentElement.scrollHeight - window.innerHeight;
    var pct = total > 0 ? (sy / total) * 100 : 0;
    scrollProgressBar.style.width = pct + '%';
  });

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Tilt reset smoothing Ã¢â‚¬â€ desktop only Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
  if (window.innerWidth >= 768) {
    document.querySelectorAll('.feature-card, .pricing-card--featured, .testimonial-card').forEach(function (card) {
      card.addEventListener('mouseenter', function () {
        card.style.transition = 'transform 0.1s ease-out';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform 0.6s cubic-bezier(0.22,0.61,0.36,1)';
        card.style.transform = '';
      });
    });
  }

  /* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
     Kendara Ã¢â‚¬â€ Realistic Storm with Volumetric Clouds & Natural Lightning
     Multi-layer Perlin-noise clouds, cloud-internal illumination,
     natural forked bolts with glow halos, sheet lightning, smooth timing.
     Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */
  (function initKendaraStorm() {
    var canvas = document.getElementById('kendaraLightning');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var section = document.getElementById('kendara');
    if (!section) return;

    var W, H, dpr;
    var isActive = false;
    var isMobile = window.innerWidth < 768;

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Simple 2D value noise (smooth randomness for clouds) Ã¢â€â‚¬Ã¢â€â‚¬ */
    var PERM = new Uint8Array(512);
    (function seedNoise() {
      var p = [];
      for (var i = 0; i < 256; i++) p[i] = i;
      for (var j = 255; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var tmp = p[j]; p[j] = p[k]; p[k] = tmp;
      }
      for (var n = 0; n < 512; n++) PERM[n] = p[n & 255];
    })();

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function grad(hash, x, y) {
      var h = hash & 3;
      return ((h & 1) === 0 ? x : -x) + ((h & 2) === 0 ? y : -y);
    }
    function noise2D(x, y) {
      var xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
      var xf = x - Math.floor(x), yf = y - Math.floor(y);
      var u = fade(xf), v = fade(yf);
      var aa = PERM[PERM[xi] + yi], ab = PERM[PERM[xi] + yi + 1];
      var ba = PERM[PERM[xi + 1] + yi], bb = PERM[PERM[xi + 1] + yi + 1];
      return lerp(
        lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
        lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
        v
      );
    }
    function fbm(x, y, octaves) {
      var val = 0, amp = 0.5, freq = 1;
      for (var i = 0; i < octaves; i++) {
        val += amp * noise2D(x * freq, y * freq);
        amp *= 0.5; freq *= 2.1;
      }
      return val;
    }

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Cloud layers (pre-rendered to off-screen canvases) Ã¢â€â‚¬Ã¢â€â‚¬ */
    var cloudLayers = [];
    var cloudDrift = 0;

    function buildCloudLayer(scale, yBias, opacity, tint) {
      var cw = Math.ceil(W / 3), ch = Math.ceil(H / 3);
      var offscreen = document.createElement('canvas');
      offscreen.width = cw; offscreen.height = ch;
      var c = offscreen.getContext('2d');
      var imgData = c.createImageData(cw, ch);
      var d = imgData.data;
      var ox = Math.random() * 1000, oy = Math.random() * 1000;
      for (var py = 0; py < ch; py++) {
        var ny = py / ch;
        /* Clouds concentrated in top 55% with soft falloff */
        var yMask = ny < 0.15 ? ny / 0.15 : (ny < 0.45 ? 1 : Math.max(0, 1 - (ny - 0.45) / 0.15));
        yMask = yMask * yMask * (3 - 2 * yMask); /* smoothstep */
        yMask *= (0.6 + 0.4 * yBias);
        for (var px = 0; px < cw; px++) {
          var nx = px / cw;
          var n = fbm(ox + nx * scale, oy + ny * scale * 0.7, 4);
          n = (n + 1) * 0.5; /* normalise 0..1 */
          n = Math.pow(n, 1.3); /* contrast boost */
          var a = n * yMask * opacity;
          var idx = (py * cw + px) * 4;
          d[idx]     = tint[0];
          d[idx + 1] = tint[1];
          d[idx + 2] = tint[2];
          d[idx + 3] = Math.min(255, a * 255) | 0;
        }
      }
      c.putImageData(imgData, 0, 0);
      return { canvas: offscreen, opacity: opacity, drift: (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1) };
    }

    function rebuildClouds() {
      cloudLayers = [];
      if (isMobile) {
        cloudLayers.push(buildCloudLayer(4.0, 0.9, 0.6, [20, 14, 40]));
        cloudLayers.push(buildCloudLayer(6.0, 1.0, 0.4, [32, 22, 55]));
      } else {
        cloudLayers.push(buildCloudLayer(3.5, 0.9, 0.65, [18, 12, 38]));
        cloudLayers.push(buildCloudLayer(5.5, 1.0, 0.45, [30, 20, 55]));
      }
    }

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Resize Ã¢â€â‚¬Ã¢â€â‚¬ */
    function resize() {
      var rect = section.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      isMobile = window.innerWidth < 768;
      rebuildClouds();
    }
    resize();
    window.addEventListener('resize', resize);

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Natural lightning bolt generator Ã¢â€â‚¬Ã¢â€â‚¬ */
    function generateBolt(x1, y1, x2, y2, depth) {
      depth = depth || 0;
      var segs = [];
      var dx = x2 - x1, dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 3) return { segments: [{x:x1,y:y1},{x:x2,y:y2}], branches: [], depth: depth };

      /* Midpoint displacement algorithm for natural look */
      var points = [{x: x1, y: y1}, {x: x2, y: y2}];
      var displace = len * (depth === 0 ? 0.28 : 0.18);
      for (var pass = 0; pass < (depth === 0 ? 5 : 3); pass++) {
        var newPts = [points[0]];
        for (var i = 0; i < points.length - 1; i++) {
          var a = points[i], b = points[i + 1];
          var mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * displace;
          var my = (a.y + b.y) / 2 + (Math.random() - 0.5) * displace * 0.4;
          newPts.push({x: mx, y: my});
          newPts.push(b);
        }
        points = newPts;
        displace *= 0.52;
      }
      segs = points;

      /* Branches */
      var branches = [];
      if (depth < 3) {
        var bc = depth === 0 ? (2 + Math.floor(Math.random() * 4))
               : depth === 1 ? Math.floor(1 + Math.random() * 2)
               : (Math.random() < 0.4 ? 1 : 0);
        for (var b = 0; b < bc; b++) {
          var si = Math.floor(segs.length * (0.15 + Math.random() * 0.6));
          if (si >= segs.length) si = segs.length - 2;
          var sp = segs[si];
          var mainAngle = Math.atan2(dy, dx);
          var spread = depth === 0 ? 0.8 : 0.6;
          var bAngle = mainAngle + (Math.random() - 0.5) * spread + (Math.random() > 0.5 ? 0.3 : -0.3);
          var bLen = len * (0.12 + Math.random() * 0.22) / (depth * 0.7 + 1);
          var bx2 = sp.x + Math.cos(bAngle) * bLen;
          var by2 = sp.y + Math.sin(bAngle) * bLen;
          branches.push(generateBolt(sp.x, sp.y, bx2, by2, depth + 1));
        }
      }
      return { segments: segs, branches: branches, depth: depth };
    }

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Draw a bolt with efficient 2-pass glow Ã¢â€â‚¬Ã¢â€â‚¬ */
    function drawBolt(bolt, alpha) {
      var segs = bolt.segments;
      if (segs.length < 2) return;

      var d = bolt.depth;
      var depthFade = 1 / (d * 0.6 + 1);
      var a = alpha * depthFade;

      /* Pass 1: Glow halo (only for main bolt and first-level branches) */
      if (d < 2) {
        ctx.save();
        ctx.globalAlpha = a * 0.25;
        ctx.strokeStyle = d === 0 ? 'rgba(160,140,255,1)' : 'rgba(140,120,220,1)';
        ctx.lineWidth = d === 0 ? 14 : 7;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = d === 0 ? 'rgba(140,110,255,0.8)' : 'rgba(120,100,200,0.6)';
        ctx.shadowBlur = d === 0 ? 25 : 12;
        ctx.beginPath(); ctx.moveTo(segs[0].x, segs[0].y);
        for (var g = 1; g < segs.length; g++) ctx.lineTo(segs[g].x, segs[g].y);
        ctx.stroke();
        ctx.restore();
      }

      /* Pass 2: Bright core */
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = d === 0 ? 'rgba(230,225,255,1)' : (d === 1 ? 'rgba(200,190,255,1)' : 'rgba(170,160,230,1)');
      ctx.lineWidth = d === 0 ? 2.2 : (d === 1 ? 1.2 : 0.6);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(220,210,255,0.7)';
      ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.moveTo(segs[0].x, segs[0].y);
      for (var c = 1; c < segs.length; c++) ctx.lineTo(segs[c].x, segs[c].y);
      ctx.stroke();
      ctx.restore();

      /* Draw branches */
      for (var bi = 0; bi < bolt.branches.length; bi++) {
        drawBolt(bolt.branches[bi], alpha * 0.65);
      }
    }

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Cloud illumination Ã¢â‚¬â€ radial glow at bolt origin Ã¢â€â‚¬Ã¢â€â‚¬ */
    function drawCloudIllumination(x, y, intensity) {
      var radius = W * 0.35;
      var grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, 'rgba(140,120,255,' + (intensity * 0.25) + ')');
      grad.addColorStop(0.3, 'rgba(100,70,200,' + (intensity * 0.12) + ')');
      grad.addColorStop(0.6, 'rgba(60,40,150,' + (intensity * 0.04) + ')');
      grad.addColorStop(1, 'rgba(30,20,80,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      ctx.restore();
    }

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Sheet lightning (distant cloud-to-cloud flash) Ã¢â€â‚¬Ã¢â€â‚¬ */
    function drawSheetLightning(x, y, intensity) {
      var rw = W * (0.2 + Math.random() * 0.3);
      var rh = H * (0.08 + Math.random() * 0.1);
      var grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rw, rh));
      grad.addColorStop(0, 'rgba(130,110,220,' + (intensity * 0.18) + ')');
      grad.addColorStop(0.5, 'rgba(80,60,170,' + (intensity * 0.06) + ')');
      grad.addColorStop(1, 'rgba(40,30,100,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Storm state Ã¢â€â‚¬Ã¢â€â‚¬ */
    var bolts = [];
    var sheetFlashes = [];

    function spawnBolt() {
      /* Origin in cloud band (top 10-35% of section) */
      var ox = W * (0.08 + Math.random() * 0.84);
      var oy = H * (0.1 + Math.random() * 0.2);
      /* End point lower down */
      var ex = ox + (Math.random() - 0.5) * W * 0.25;
      var ey = H * (0.5 + Math.random() * 0.35);
      var tree = generateBolt(ox, oy, ex, ey, 0);

      /* Natural multi-pulse flash envelope (2-4 rapid re-strokes) */
      var pulseCount = 2 + Math.floor(Math.random() * 3);
      var pulses = [];
      var t = 0;
      for (var p = 0; p < pulseCount; p++) {
        var attack = 15 + Math.random() * 25;
        var hold = 20 + Math.random() * 40;
        var decay = 60 + Math.random() * 120;
        var peak = p === pulseCount - 1 ? (0.85 + Math.random() * 0.15) : (0.3 + Math.random() * 0.4);
        pulses.push({ start: t, attack: attack, hold: hold, decay: decay, peak: peak });
        t += attack + hold + decay + (p < pulseCount - 1 ? (20 + Math.random() * 60) : 0);
      }
      bolts.push({
        tree: tree,
        born: performance.now(),
        duration: t + 200, /* extra tail for glow decay */
        pulses: pulses,
        ox: ox, oy: oy
      });
    }

    function spawnSheet() {
      var sx = W * (0.1 + Math.random() * 0.8);
      var sy = H * (0.05 + Math.random() * 0.25);
      var attack = 30 + Math.random() * 50;
      var hold = 40 + Math.random() * 80;
      var decay = 150 + Math.random() * 300;
      sheetFlashes.push({
        born: performance.now(),
        duration: attack + hold + decay,
        attack: attack, hold: hold, decay: decay,
        peak: 0.3 + Math.random() * 0.4,
        x: sx, y: sy
      });
    }

    var nextBoltTime = performance.now() + 1500 + Math.random() * 2500;
    var nextSheetTime = performance.now() + 800 + Math.random() * 1500;

    function scheduleNextBolt(now) {
      nextBoltTime = now + (Math.random() < 0.15 ? (200 + Math.random() * 400) : (3000 + Math.random() * 5000));
    }
    function scheduleNextSheet(now) {
      nextSheetTime = now + (1000 + Math.random() * 3000);
    }

    function getEnvelopeAlpha(item, now) {
      var el = now - item.born;
      if (el < 0) return 0;
      /* For bolts with pulses */
      if (item.pulses) {
        var a = 0;
        for (var i = 0; i < item.pulses.length; i++) {
          var p = item.pulses[i], pt = el - p.start;
          if (pt < 0) continue;
          var val = 0;
          if (pt < p.attack) val = (pt / p.attack) * p.peak;
          else if (pt < p.attack + p.hold) val = p.peak;
          else if (pt < p.attack + p.hold + p.decay) {
            var dt = (pt - p.attack - p.hold) / p.decay;
            val = p.peak * (1 - dt) * (1 - dt); /* quadratic ease-out for smooth decay */
          }
          a = Math.max(a, val);
        }
        return a;
      }
      /* For sheet flashes */
      if (el < item.attack) return (el / item.attack) * item.peak;
      if (el < item.attack + item.hold) return item.peak;
      if (el < item.attack + item.hold + item.decay) {
        var dd = (el - item.attack - item.hold) / item.decay;
        return item.peak * (1 - dd) * (1 - dd);
      }
      return 0;
    }

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Draw clouds (composited from pre-rendered layers) Ã¢â€â‚¬Ã¢â€â‚¬ */
    function drawClouds(now, flashIntensity) {
      var elapsed = now * 0.00003;
      for (var i = 0; i < cloudLayers.length; i++) {
        var layer = cloudLayers[i];
        if (!layer.canvas) continue;
        var drift = (elapsed * layer.drift * 40) % W;
        ctx.save();
        /* Base dark clouds */
        ctx.globalAlpha = layer.opacity * 0.85;
        ctx.drawImage(layer.canvas, drift, 0, W, H);
        ctx.drawImage(layer.canvas, drift - W, 0, W, H);

        /* Lightning illumination overlay Ã¢â‚¬â€ brighter when flashing */
        if (flashIntensity > 0.01) {
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = flashIntensity * layer.opacity * 0.5;
          ctx.drawImage(layer.canvas, drift, 0, W, H);
          ctx.drawImage(layer.canvas, drift - W, 0, W, H);
        }
        ctx.restore();
      }
    }

    /* Ã¢â€â‚¬Ã¢â€â‚¬ Main render loop Ã¢â€â‚¬Ã¢â€â‚¬ */
    var lastCloudFrame = 0;
    function render() {
      requestAnimationFrame(render);
      if (!isActive) return;
      var now = performance.now();

      /* Spawn events */
      if (now >= nextBoltTime) { spawnBolt(); scheduleNextBolt(now); }
      if (now >= nextSheetTime) { spawnSheet(); scheduleNextSheet(now); }

      /* Calculate peak flash intensity for cloud illumination */
      var peakFlash = 0;
      for (var bi = 0; bi < bolts.length; bi++) {
        peakFlash = Math.max(peakFlash, getEnvelopeAlpha(bolts[bi], now));
      }
      for (var si = 0; si < sheetFlashes.length; si++) {
        peakFlash = Math.max(peakFlash, getEnvelopeAlpha(sheetFlashes[si], now) * 0.5);
      }

      /* Skip frames when idle (clouds drift very slowly Ã¢â‚¬â€ 10fps is enough) */
      var hasActivity = peakFlash > 0.005 || bolts.length > 0 || sheetFlashes.length > 0;
      if (!hasActivity && now - lastCloudFrame < 100) return;
      lastCloudFrame = now;

      ctx.clearRect(0, 0, W, H);

      /* 1. Draw cloud layers (with illumination) */
      drawClouds(now, peakFlash);

      /* 2. Ambient sky flash */
      if (peakFlash > 0.01) {
        ctx.save();
        ctx.globalAlpha = peakFlash * 0.05;
        ctx.fillStyle = 'rgba(120,100,200,1)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      /* 3. Sheet lightning */
      var aliveSheets = [];
      for (var sj = 0; sj < sheetFlashes.length; sj++) {
        var sh = sheetFlashes[sj];
        var sa = getEnvelopeAlpha(sh, now);
        if (sa > 0.001 || now - sh.born < sh.duration) {
          aliveSheets.push(sh);
          if (sa > 0.01) drawSheetLightning(sh.x, sh.y, sa);
        }
      }
      sheetFlashes = aliveSheets;

      /* 4. Lightning bolts with cloud glow */
      var aliveBolts = [];
      for (var bj = 0; bj < bolts.length; bj++) {
        var bolt = bolts[bj];
        var ba = getEnvelopeAlpha(bolt, now);
        if (ba > 0.001 || now - bolt.born < bolt.duration) {
          aliveBolts.push(bolt);
          if (ba > 0.01) {
            /* Cloud illumination at bolt origin */
            drawCloudIllumination(bolt.ox, bolt.oy, ba);
            /* The bolt itself */
            drawBolt(bolt.tree, ba);
          }
        }
      }
      bolts = aliveBolts;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { isActive = e.isIntersecting; });
    }, { threshold: 0.05 });
    obs.observe(section);
    requestAnimationFrame(render);
  })();

})();

