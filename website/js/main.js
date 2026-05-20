/* ═══════════════════════════════════════════════════════════════════════
   Grahachara — Main Interactions
   Scroll reveals, hero fan carousel, nav transition, metrics counters, FAQ
   ═══════════════════════════════════════════════════════════════════════ */

// ── Loading Screen ──
(function() {
  var loader = document.getElementById('loader');
  if (!loader) return;

  function dismissLoader() {
    loader.classList.add('loaded');
    document.body.style.overflow = '';
  }

  // Prevent scroll while loading
  document.body.style.overflow = 'hidden';

  // Dismiss after page load with minimum display time
  var minTime = 2000;
  var startTime = Date.now();

  window.addEventListener('load', function() {
    var elapsed = Date.now() - startTime;
    var remaining = Math.max(0, minTime - elapsed);
    setTimeout(dismissLoader, remaining);
  });

  // Safety fallback - dismiss after 5s regardless
  setTimeout(dismissLoader, 5000);
})();

(function() {
  'use strict';

  // ── Utilities ──
  function debounce(fn, ms) {
    let timer;
    return function() {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // NAVIGATION: Transparent → Solid on scroll
  // ══════════════════════════════════════════════════════════════════════
  const nav = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  const mobileNav = document.getElementById('mobileNav');
  const scrollProgress = document.getElementById('scrollProgress');

  let lastScroll = 0;
  let ticking = false;

  function handleScroll() {
    const scrollY = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Nav solid state
    if (scrollY > 80) {
      nav.classList.add('nav--solid');
    } else {
      nav.classList.remove('nav--solid');
    }

    // Scroll progress bar
    if (scrollProgress) {
      const progress = Math.min((scrollY / docHeight) * 100, 100);
      scrollProgress.style.width = progress + '%';
    }

    // Hero fade-out on scroll with 3D depth
    const hero = document.querySelector('.hero');
    if (hero) {
      const heroH = hero.offsetHeight;
      const fade = Math.max(1 - (scrollY / (heroH * 0.6)), 0);
      hero.style.opacity = fade;
      hero.style.transform = 'translateY(' + (scrollY * 0.15) + 'px) scale(' + (0.95 + fade * 0.05) + ')';

      // Parallax layers at different speeds
      const heroText = hero.querySelector('.hero__text');
      const heroShowcase = hero.querySelector('.hero__showcase');
      if (heroText) {
        heroText.style.transform = 'translateZ(60px) translateY(' + (scrollY * 0.3) + 'px)';
      }
      if (heroShowcase) {
        heroShowcase.style.transform = 'translateZ(-20px) translateY(' + (scrollY * 0.08) + 'px)';
      }
    }

    lastScroll = scrollY;
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }, { passive: true });

  // ── Mobile burger menu ──
  if (burger && mobileNav) {
    var navEl = document.getElementById('nav');

    var closeNav = function() {
      burger.classList.remove('active');
      mobileNav.classList.remove('active');
      if (navEl) navEl.classList.remove('nav--mobile-open');
      document.body.style.overflow = '';
    };

    var openNav = function() {
      burger.classList.add('active');
      mobileNav.classList.add('active');
      if (navEl) navEl.classList.add('nav--mobile-open');
      document.body.style.overflow = 'hidden';
    };

    burger.addEventListener('click', function() {
      if (mobileNav.classList.contains('active')) {
        closeNav();
      } else {
        openNav();
      }
    });

    // Close mobile nav on link click
    mobileNav.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', closeNav);
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
        closeNav();
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // HERO 3D MOUSE PARALLAX
  // ══════════════════════════════════════════════════════════════════════
  const heroSection = document.querySelector('.hero');
  const heroFan = document.getElementById('heroFan');

  if (heroSection && heroFan) {
    heroSection.addEventListener('mousemove', function(e) {
      const rect = heroSection.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const rotateY = x * 8;
      const rotateX = -y * 5;

      heroFan.style.transform = 'rotateY(' + rotateY + 'deg) rotateX(' + rotateX + 'deg)';
    });

    heroSection.addEventListener('mouseleave', function() {
      heroFan.style.transform = 'rotateY(0deg) rotateX(0deg)';
      heroFan.style.transition = 'transform 0.6s ease-out';
      setTimeout(function() { heroFan.style.transition = ''; }, 600);
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // SCROLL REVEAL ANIMATIONS
  // ══════════════════════════════════════════════════════════════════════
  const revealElements = document.querySelectorAll('[data-reveal]');

  const revealObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseInt(el.dataset.delay || '0', 10);

        setTimeout(function() {
          el.classList.add('revealed');
        }, delay);

        revealObserver.unobserve(el);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(function(el) {
    revealObserver.observe(el);
  });

  // ══════════════════════════════════════════════════════════════════════
  // FEATURE IMAGES EXPAND ON SCROLL
  // ══════════════════════════════════════════════════════════════════════
  var featureSections = document.querySelectorAll('.feature');

  if (featureSections.length) {
    var featureObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        } else {
          entry.target.classList.remove('in-view');
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '0px 0px -80px 0px'
    });

    featureSections.forEach(function(section) {
      featureObserver.observe(section);
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // METRICS COUNTER ANIMATION
  // ══════════════════════════════════════════════════════════════════════
  const metricNumbers = document.querySelectorAll('.metrics__number');
  let metricsAnimated = false;

  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const isDecimal = el.dataset.decimal === 'true';
    const duration = 2000;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Eased progress (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      if (isDecimal) {
        el.textContent = current.toFixed(1);
      } else if (target >= 1000) {
        el.textContent = Math.floor(current).toLocaleString();
      } else {
        el.textContent = Math.floor(current);
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        if (isDecimal) {
          el.textContent = target.toFixed(1);
        } else if (target >= 1000) {
          el.textContent = target.toLocaleString();
        } else {
          el.textContent = target;
        }
      }
    }

    requestAnimationFrame(update);
  }

  const metricsObserver = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting && !metricsAnimated) {
      metricsAnimated = true;
      metricNumbers.forEach(function(el) {
        animateCounter(el);
      });
      metricsObserver.disconnect();
    }
  }, { threshold: 0.5 });

  const metricsSection = document.getElementById('metrics');
  if (metricsSection) {
    metricsObserver.observe(metricsSection);
  }

  // ══════════════════════════════════════════════════════════════════════
  // SMOOTH SCROLL FOR ANCHOR LINKS
  // ══════════════════════════════════════════════════════════════════════
  document.querySelectorAll('a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const navHeight = nav.offsetHeight;
        const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;

        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // FAQ ACCORDION (native <details> enhancement)
  // ══════════════════════════════════════════════════════════════════════
  const faqItems = document.querySelectorAll('.faq__item');

  faqItems.forEach(function(item) {
    item.addEventListener('toggle', function() {
      if (this.open) {
        // Close others
        faqItems.forEach(function(other) {
          if (other !== item && other.open) {
            other.open = false;
          }
        });
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // FEATURE SCREENSHOT PARALLAX (subtle)
  // ══════════════════════════════════════════════════════════════════════
  const featureVisuals = document.querySelectorAll('.feature__visuals');

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.innerWidth > 768) {
    window.addEventListener('scroll', function() {
      if (!ticking) {
        requestAnimationFrame(function() {
          featureVisuals.forEach(function(visual) {
            const rect = visual.getBoundingClientRect();
            const inView = rect.top < window.innerHeight && rect.bottom > 0;

            if (inView) {
              const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
              const offset = (progress - 0.5) * 20;

              const mainImg = visual.querySelector('.feature__img--main');
              if (mainImg) {
                mainImg.style.transform = `rotate(-2deg) translateY(${offset * 0.5}px)`;
              }
            }
          });
        });
      }
    }, { passive: true });
  }

})();
