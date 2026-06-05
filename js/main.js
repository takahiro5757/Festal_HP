/* =========================================================
   Festal — interactions (Lenis + GSAP/ScrollTrigger)
   ========================================================= */
(function () {
  'use strict';

  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var hasGSAP = !!window.gsap;
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- WebGL flame mounts ---------- */
  var flames = [];
  if (window.FestalFlame) {
    var c1 = document.getElementById('flame');
    var c2 = document.getElementById('flame2');
    if (c1) flames.push(FestalFlame.mount(c1, { intensity: 1.0 }));
    if (c2) flames.push(FestalFlame.mount(c2, { intensity: 0.85 }));
  }
  /* ---------- Mesh gradient mounts ---------- */
  if (window.FestalGradient) {
    var mesh = document.getElementById('meshLight');
    if (mesh) FestalGradient.mount(mesh, { mode: 'mid' });
  }

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    window.__lenis = lenis;
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }
  function scrollToTarget(target) {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: -40, duration: 1.2 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- Loader ---------- */
  var loader = document.getElementById('loader');
  function startSite() {
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    if (loader) {
      if (hasGSAP) {
        gsap.to(loader, { autoAlpha: 0, duration: .6, delay: .15, onComplete: function () { loader.style.display = 'none'; } });
      } else { loader.style.display = 'none'; }
    }
    revealHero();
  }
  // show loader briefly, then start (also guard with load event)
  var booted = false;
  function boot() { if (booted) return; booted = true; startSite(); }
  window.addEventListener('load', function () { setTimeout(boot, reduce ? 0 : 900); });
  setTimeout(boot, 2600); // hard fallback

  /* ---------- Hero entrance ---------- */
  function revealHero() {
    if (!document.querySelector('.hero')) return;
    if (!hasGSAP) { document.querySelectorAll('.hero .line span, .hero .r span').forEach(function(s){ s.style.transform='none'; }); return; }
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__title .line span', { autoAlpha: 0, filter: 'blur(18px)', y: 34, duration: 1.2, stagger: .12 })
      .from('.hero__eyebrow .r span', { autoAlpha: 0, filter: 'blur(10px)', y: 18, duration: .9 }, '-=1.0')
      .from('.hero__lead .r span', { autoAlpha: 0, filter: 'blur(10px)', y: 16, duration: .9, stagger: .08 }, '-=.8')
      .from('.hero__foot', { autoAlpha: 0, filter: 'blur(6px)', y: 14, duration: .8 }, '-=.5');
  }

  /* ---------- Header: mode (dark over hero/recruit/cta) + hide on scroll-down ---------- */
  var hdr = document.getElementById('hdr');
  var darkZones = [];
  function collectDark() {
    darkZones = [];
    ['hero', 'recruit', 'contact'].forEach(function (id) {
      var el = document.getElementById(id); if (el) darkZones.push(el);
    });
    document.querySelectorAll('.subhero, .subcta, .psec--ink').forEach(function (el) { darkZones.push(el); });
  }
  collectDark();
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    hdr.classList.toggle('is-stuck', y > 30);
    // dark mode if header overlaps any dark zone
    var hb = hdr.offsetHeight * 0.6;
    var dark = darkZones.some(function (el) {
      var r = el.getBoundingClientRect();
      return r.top <= hb && r.bottom >= hb;
    });
    hdr.setAttribute('data-mode', dark ? 'dark' : 'light');
    // hide on scroll down, show on scroll up
    if (y > 200 && y > lastY + 4) hdr.classList.add('is-hidden');
    else if (y < lastY - 4) hdr.classList.remove('is-hidden');
    lastY = y;
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(function () { onScroll(); ticking = false; }); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Fullscreen menu ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    if (menu) menu.setAttribute('aria-hidden', String(!open));
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!body.classList.contains('menu-open')); });
  if (menu) menu.querySelectorAll('a[data-no]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      setMenu(false);
      if (t) { e.preventDefault(); setTimeout(function () { scrollToTarget(t); }, 200); }
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && body.classList.contains('menu-open')) setMenu(false); });

  /* ---------- Anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    if (a.hasAttribute('data-no')) return;
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var t = document.querySelector(id); if (!t) return;
      e.preventDefault(); scrollToTarget(t);
    });
  });

  /* ---------- GSAP scroll animations ---------- */
  if (hasGSAP && window.ScrollTrigger && !reduce) {
    // blur-in reveals for section headings
    gsap.utils.toArray('.sec .line span, .vision__head .line span').forEach(function (s) {
      gsap.from(s, {
        autoAlpha: 0, filter: 'blur(16px)', y: 28, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: s, start: 'top 90%' }
      });
    });
    // blur-in reveal blocks
    gsap.utils.toArray('.reveal').forEach(function (el) {
      gsap.from(el, {
        autoAlpha: 0, filter: 'blur(12px)', y: 26, duration: 1.0, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });

    // Unified staggered cascades for grouped / list content (no more block-at-once)
    [['.profile-table', ':scope > div', 16], ['.nlist', 'li', 18], ['.article__body', ':scope > *', 20]].forEach(function (cfg) {
      document.querySelectorAll(cfg[0]).forEach(function (c) {
        var kids = c.querySelectorAll(cfg[1]);
        if (!kids.length) return;
        gsap.from(kids, {
          autoAlpha: 0, filter: 'blur(8px)', y: cfg[2], duration: .8, ease: 'power3.out', stagger: .07,
          scrollTrigger: { trigger: c, start: 'top 86%' }
        });
      });
    });

    // Business photo cards — blur-in together (no vertical offset)
    if (document.querySelector('.biz-grid .bcard')) gsap.from('.biz-grid .bcard', {
      autoAlpha: 0, filter: 'blur(14px)', duration: 1.1, ease: 'power3.out', stagger: .08, clearProps: 'filter',
      scrollTrigger: { trigger: '.biz-grid', start: 'top 84%' }
    });

    // Marquee drift with scroll velocity
    var mt = document.getElementById('marqueeTrack');
    if (mt) {
      gsap.to(mt, { xPercent: -50, repeat: -1, duration: 28, ease: 'none' });
    }

    // Flame energy reacts to scroll velocity
    if (flames.length) {
      var st = ScrollTrigger.create({
        onUpdate: function (self) {
          var e = 1 + Math.min(Math.abs(self.getVelocity()) / 1800, 1.6);
          flames.forEach(function (f) { f && f.setEnergy(e); });
        }
      });
    }

    // subtle parallax for vision head
    if (document.querySelector('.vision__head')) gsap.to('.vision__head', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.vision', start: 'top bottom', end: 'bottom top', scrub: true } });

    // Approach: editorial steps blur-in + numeral fills as it enters
    gsap.utils.toArray('.step').forEach(function (st) {
      gsap.from(st, { autoAlpha: 0, filter: 'blur(12px)', y: 28, duration: 1.0, ease: 'power3.out', scrollTrigger: { trigger: st, start: 'top 86%' } });
      ScrollTrigger.create({ trigger: st, start: 'top 82%', onEnter: function () { st.classList.add('is-seen'); } });
    });
    // Business: draw the strategy trajectory when each panel enters view
    gsap.utils.toArray('.panel').forEach(function (p) {
      ScrollTrigger.create({ trigger: p, start: 'top 88%', onEnter: function () { p.classList.add('is-seen'); } });
    });


    // Business panels: spotlight + subtle 3D tilt
    document.querySelectorAll('.panel').forEach(function (panel) {
      panel.addEventListener('mousemove', function (e) {
        var r = panel.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        panel.style.setProperty('--mx', (px * 100) + '%');
        panel.style.setProperty('--my', (py * 100) + '%');
        gsap.to(panel, { rotateY: (px - 0.5) * 7, rotateX: (0.5 - py) * 7, duration: .5, ease: 'power3.out', transformPerspective: 900 });
      });
      panel.addEventListener('mouseleave', function () {
        gsap.to(panel, { rotateY: 0, rotateX: 0, duration: .7, ease: 'power3.out' });
      });
    });
  } else {
    // no-motion fallback: ensure everything visible
    document.querySelectorAll('.line span, .r span, .reveal').forEach(function (s) { s.style.transform = 'none'; s.style.opacity = 1; });
    document.querySelectorAll('.count').forEach(function (el) { el.textContent = el.getAttribute('data-target'); });
  }

  /* ---------- Custom cursor + magnetic ---------- */
  var cursor = document.getElementById('cursor');
  if (cursor && !isTouch && hasGSAP) {
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2, tx = cx, ty = cy;
    gsap.ticker.add(function () {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      gsap.set(cursor, { x: cx, y: cy });
    });
    window.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    document.querySelectorAll('[data-cursor], a, button').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursor.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('is-hover'); });
    });
    document.addEventListener('mousedown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { cursor.classList.remove('is-down'); });

    // magnetic buttons
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var strength = 0.35;
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: mx * strength, y: my * strength, duration: .4, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', function () { gsap.to(el, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,0.4)' }); });
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* ---------- Page top + year ---------- */
  var toTop = document.getElementById('toTop');
  if (toTop) toTop.addEventListener('click', function () { lenis ? lenis.scrollTo(0, { duration: 1.2 }) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  var y = document.getElementById('year'); if (y) y.textContent = String(new Date().getFullYear());
})();
