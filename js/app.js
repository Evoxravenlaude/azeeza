/* Azeeza Omipidan portfolio: orchestration of the scroll scenes and interactions. */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap && window.ScrollTrigger ? window.gsap : null;
  const ST = window.ScrollTrigger;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n) => String(n).padStart(2, '0');
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const COLORS = { paper: '#E4DED5', ink: '#171513', rose: '#DDA39B', sage: '#ACB797' };
  const motion = !!G && !reduce;

  /* Always open at the top. The browser's own scroll memory is switched off in the
     <head> (before ScrollTrigger loads, because ScrollTrigger puts back whatever
     setting it found when it loaded), and again here as a fallback. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  if (G) {
    G.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });
    if (ST.clearScrollMemory) ST.clearScrollMemory('manual');
  }

  /* ---------------- smooth scroll ---------------- */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ST.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  const lock = (on) => {
    if (lenis) { if (on) lenis.stop(); else lenis.start(); }
    document.body.style.overflow = on ? 'hidden' : '';
  };
  const toTop = () => {
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  };
  // Back/forward cache brings the page back exactly as it was left: start at the top again.
  addEventListener('pageshow', (e) => { if (e.persisted) { toTop(); if (ST) ST.update(); } });
  const scrollToTarget = (t) => {
    if (lenis) { lenis.scrollTo(t, { duration: 1.6 }); return; }
    if (typeof t === 'number') window.scrollTo({ top: t, behavior: reduce ? 'auto' : 'smooth' });
    else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  /* ---------------- sound (off until switched on) ---------------- */
  const sound = (function () {
    let ctx = null, on = false;
    const btn = $('#sound');
    function blip(f, d, v, type) {
      if (!on || !ctx) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + d + 0.02);
    }
    if (btn) btn.addEventListener('click', () => {
      on = !on;
      try {
        if (on && !ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx && ctx.state === 'suspended') ctx.resume();
      } catch (e) { on = false; }
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
      blip(880, 0.14, 0.05, 'triangle');
    });
    return {
      hover: () => blip(1750, 0.03, 0.012),
      click: () => blip(320, 0.09, 0.05, 'triangle'),
      sweep: () => { blip(480, 0.18, 0.03); setTimeout(() => blip(960, 0.12, 0.02), 70); }
    };
  })();
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest('a, button');
    if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) sound.hover();
  });
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('a, button') && e.target.id !== 'sound') sound.click(); });

  /* ---------------- text scramble ---------------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=/';
  function scramble(el, text) {
    if (!el) return;
    if (reduce) { el.textContent = text; return; }
    clearInterval(el._sc);
    let f = 0;
    el._sc = setInterval(() => {
      f++;
      el.textContent = Array.from(text).map((c, i) => (i < f / 2 || c === ' ') ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('');
      if (f / 2 >= text.length) { clearInterval(el._sc); el.textContent = text; }
    }, 26);
  }

  /* ---------------- cursor ---------------- */
  const cursor = (function () {
    if (!fine) return { label() {} };
    const el = document.createElement('div');
    el.className = 'cursor';
    el.innerHTML = '<div class="cursor__ring"><span class="cursor__label"></span></div><div class="cursor__dot"></div>';
    document.body.appendChild(el);
    const dot = el.querySelector('.cursor__dot');
    const lab = el.querySelector('.cursor__label');
    let mx = -100, my = -100, rx = -100, ry = -100, forced = null, lastTarget = document.body;
    function update(t) {
      lastTarget = t || lastTarget;
      const c = lastTarget.closest ? lastTarget.closest('[data-cursor]') : null;
      const lbl = forced || (c ? c.dataset.cursor : null);
      const link = lastTarget.closest ? lastTarget.closest('a, button, select, label, [role="slider"]') : null;
      el.classList.toggle('is-label', !!lbl);
      el.classList.toggle('is-link', !lbl && !!link);
      el.classList.toggle('is-light', !!(lastTarget.closest && lastTarget.closest('.lb')));
      if (lbl) lab.textContent = lbl;
    }
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      el.classList.add('is-on');
      update(e.target);
    }, { passive: true });
    document.addEventListener('pointerleave', () => el.classList.remove('is-on'));
    (function loop() {
      rx += (mx - rx) * (reduce ? 1 : 0.2);
      ry += (my - ry) * (reduce ? 1 : 0.2);
      el.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      dot.style.transform = 'translate3d(' + (mx - rx).toFixed(1) + 'px,' + (my - ry).toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
    return { label(t) { forced = t || null; update(); } };
  })();

  /* ---------------- magnetic elements ---------------- */
  if (fine && !reduce) {
    $$('.magnetic').forEach((m) => {
      m.style.transition = 'transform .35s cubic-bezier(.2,.7,.2,1)';
      m.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect();
        m.style.transform = 'translate(' + ((e.clientX - (r.left + r.width / 2)) * 0.28).toFixed(1) + 'px,' + ((e.clientY - (r.top + r.height / 2)) * 0.4).toFixed(1) + 'px)';
      });
      m.addEventListener('pointerleave', () => { m.style.transform = ''; });
    });
  }

  /* ---------------- section label in the pill ---------------- */
  const pillLabel = $('#section-label');
  let currentLabel = 'Index';
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      const t = en.target.dataset.label;
      if (t && t !== currentLabel) { currentLabel = t; scramble(pillLabel, t); }
    }), { rootMargin: '-50% 0px -50% 0px' });
    $$('[data-label]').forEach((s) => io.observe(s));
  }

  /* ---------------- menu ---------------- */
  const menu = $('#menu'), tog = $('#menu-toggle'), peek = $('.menu__peek'), peekImg = peek.querySelector('img');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    tog.setAttribute('aria-expanded', String(open));
    tog.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    lock(open);
    if (open && motion) G.fromTo('.menu__list li', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.05, duration: 0.8, ease: 'expo.out', delay: 0.25 });
    if (!open) peek.classList.remove('is-on');
  }
  tog.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); tog.focus(); } });
  if (fine) {
    $$('.menu__list a').forEach((a) => {
      a.addEventListener('pointerenter', () => { peekImg.src = a.dataset.peek; peek.classList.add('is-on'); });
      a.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
    });
    menu.addEventListener('pointermove', (e) => { peek.style.left = e.clientX + 'px'; peek.style.top = e.clientY + 'px'; });
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const t = id === '#top' ? 0 : $(id);
    if (t === null) return;
    e.preventDefault();
    if (menu.classList.contains('is-open')) setMenu(false);
    scrollToTarget(t);
  }));

  /* ---------------- clocks ---------------- */
  const HER = 'Africa/Lagos';
  const viewerTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
  const hhmm = (tz) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(new Date());
  const offsetMin = (tz) => {
    const d = new Date(), parts = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(d).forEach((p) => { parts[p.type] = p.value; });
    return Math.round((Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second) - d.getTime()) / 60000);
  };
  const started = Date.now();
  function tick() {
    const her = hhmm(HER), you = hhmm(viewerTz);
    $$('.clock-her').forEach((c) => { c.textContent = her; });
    $$('.clock-you').forEach((c) => { c.textContent = you; });
    const s = Math.floor((Date.now() - started) / 1000);
    const tc = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
    $$('.timecode').forEach((c) => { c.textContent = tc; });
  }
  tick();
  setInterval(tick, 1000);

  /* ---------------- hero ---------------- */
  $$('[data-split]').forEach((el) => {
    el.innerHTML = Array.from(el.textContent).map((c) => '<span class="ch">' + c + '</span>').join('');
  });
  const hero = $('.hero'), heroPin = $('.hero__pin'), slot = $('.hero__slot');
  const topName = $('.hero__name--top'), botName = $('.hero__name--bot');
  const parens = $$('.hero__paren'), sides = $$('.hero__side'), bar = $('.hero__bar'), hint = $('.hero__hint');
  const HERO_SRC = ['img/a1.jpg', 'img/a2.jpg', 'img/a3.jpg', 'img/a4.jpg'];
  const heroState = { p: 0, intro: motion ? 0 : 1 };
  let slotR = { x: 0, y: 0, w: 1, h: 1 }, pinR = { w: innerWidth, h: innerHeight }, curRect = { x: 0, y: 0, w: 0, h: 0 };
  let heroGL = null, heroMedia = null, heroImgEl = null, heroIdx = 0, lensOn = false;

  if (window.AOGL) heroGL = AOGL.hero($('#hero-gl'), HERO_SRC, { paper: COLORS.paper, ink: COLORS.ink, reduce: reduce });
  if (heroGL) {
    hero.classList.add('hero--live');
    heroGL.start();
  } else {
    $('#hero-gl').style.display = 'none';
    if (motion) {
      heroMedia = document.createElement('div');
      heroMedia.className = 'hero__media';
      heroImgEl = document.createElement('img');
      heroImgEl.src = HERO_SRC[0]; heroImgEl.alt = '';
      heroMedia.appendChild(heroImgEl);
      heroPin.appendChild(heroMedia);
      hero.classList.add('hero--live');
    }
  }
  function heroNext() {
    if (heroGL) { heroGL.next(); return; }
    heroIdx = (heroIdx + 1) % HERO_SRC.length;
    if (heroImgEl) heroImgEl.src = HERO_SRC[heroIdx];
    else slot.querySelector('img').src = HERO_SRC[heroIdx];
  }
  function measureHero() {
    const pr = heroPin.getBoundingClientRect(), sr = slot.getBoundingClientRect();
    slotR = { x: sr.left - pr.left, y: sr.top - pr.top, w: sr.width, h: sr.height };
    pinR = { w: pr.width, h: pr.height };
  }
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function applyHero() {
    const e = easeIO(heroState.p);
    let x = lerp(slotR.x, 0, e), y = lerp(slotR.y, 0, e), w = lerp(slotR.w, pinR.w, e), h = lerp(slotR.h, pinR.h, e);
    const s = heroState.intro;
    if (s < 1) { const cx = x + w / 2, cy = y + h / 2; w *= s; h *= s; x = cx - w / 2; y = cy - h / 2; }
    curRect = { x: x, y: y, w: w, h: h };
    if (heroGL) { heroGL.setRect(x, y, w, h); heroGL.setDither(1 - smooth(0.3, 0.9, heroState.p)); }
    else if (heroMedia) { heroMedia.style.left = x + 'px'; heroMedia.style.top = y + 'px'; heroMedia.style.width = w + 'px'; heroMedia.style.height = h + 'px'; }
    topName.style.transform = 'translate3d(0,' + (-e * 110).toFixed(2) + '%,0)';
    botName.style.transform = 'translate3d(0,' + (e * 110).toFixed(2) + '%,0)';
    parens[0].style.transform = 'translate3d(' + (-e * pinR.w * 0.45).toFixed(1) + 'px,0,0)';
    parens[1].style.transform = 'translate3d(' + (e * pinR.w * 0.45).toFixed(1) + 'px,0,0)';
    const fade = String(1 - Math.min(1, e * 3));
    sides.forEach((sd) => { sd.style.opacity = fade; });
    hint.style.opacity = String(1 - Math.min(1, e * 5));
    bar.classList.toggle('is-on-photo', e > 0.8);
  }
  measureHero();
  applyHero();
  if (motion) {
    ST.create({
      trigger: hero, start: 'top top', end: '+=170%', pin: heroPin, scrub: true,
      onUpdate: (self) => { heroState.p = self.progress; applyHero(); },
      onRefresh: () => { measureHero(); applyHero(); }
    });
  }
  addEventListener('resize', () => { if (heroGL) heroGL.resize(); measureHero(); applyHero(); });
  if (heroGL && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => { if (es[0].isIntersecting) heroGL.start(); else heroGL.stop(); }).observe(hero);
  }
  function insideRect(e) {
    const pr = heroPin.getBoundingClientRect();
    const x = e.clientX - pr.left, y = e.clientY - pr.top, m = 30;
    return { x: x, y: y, inside: x > curRect.x - m && x < curRect.x + curRect.w + m && y > curRect.y - m && y < curRect.y + curRect.h + m };
  }
  heroPin.addEventListener('pointermove', (e) => {
    const r = insideRect(e);
    lensOn = r.inside;
    if (heroGL) { heroGL.setMouse(r.x, r.y); heroGL.setLens(r.inside ? 1 : 0); }
    cursor.label(r.inside && heroState.p < 0.5 ? 'Next' : null);
  });
  heroPin.addEventListener('pointerleave', () => { lensOn = false; if (heroGL) heroGL.setLens(0); cursor.label(null); });
  heroPin.addEventListener('click', (e) => { if (insideRect(e).inside) { heroNext(); sound.sweep(); } });
  setInterval(() => {
    if (!reduce && !lensOn && heroState.p < 0.04 && heroState.intro >= 1 && !document.hidden) heroNext();
  }, 3800);

  if (fine && !reduce) {
    const letters = $$('.hero__name .ch');
    let raf = 0, px = -1e4, py = -1e4;
    const paint = () => {
      raf = 0;
      letters.forEach((ch) => {
        const r = ch.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const k = clamp(1 - d / 320, 0, 1);
        ch.style.fontWeight = String(Math.round(800 - 640 * k * k));
      });
    };
    heroPin.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint); });
    heroPin.addEventListener('pointerleave', () => { px = py = -1e4; if (!raf) raf = requestAnimationFrame(paint); });
  }

  function intro() {
    if (!motion) { heroState.intro = 1; applyHero(); return; }
    G.timeline()
      .to('.hero__name .ch', { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: { each: 0.045, from: 'center' } }, 0)
      .to(heroState, { intro: 1, duration: 1.4, ease: 'expo.out', onUpdate: applyHero }, 0.15)
      .fromTo('.hero__bar', { opacity: 0 }, { opacity: 1, duration: 0.9 }, 0.5)
      .fromTo('.hero__paren', { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 0.2)
      .fromTo(['.brand', '.chrome-r'], { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: 'expo.out' }, 0.35)
      .fromTo('.pill', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.45);
  }

  /* ---------------- preloader ---------------- */
  const pre = $('.pre');
  $$('.ring__spin').forEach((r) => {
    const chars = Array.from(r.dataset.ring.toUpperCase());
    const R = +r.dataset.radius;
    const step = 360 / chars.length;
    r.innerHTML = chars.map((c, i) => '<span class="ring__ch" style="transform:rotateY(' + (i * step).toFixed(2) + 'deg) translateZ(' + R + 'px)">' + (c === ' ' ? '&nbsp;' : c) + '</span>').join('');
  });
  if (motion) G.set('.hero__name .ch', { yPercent: 110 });
  lock(true);
  const toLoad = HERO_SRC.concat(['img/s/a2.jpg', 'img/s/a3.jpg', 'img/s/a4.jpg']);
  let loaded = 0;
  toLoad.forEach((src) => { const im = new Image(); im.onload = im.onerror = () => { loaded++; }; im.src = src; });
  const preImg = $('.pre__img');
  let pi = 0;
  const preCycle = setInterval(() => { pi = (pi + 1) % HERO_SRC.length; preImg.src = HERO_SRC[pi].replace('img/', 'img/s/'); }, 240);
  const num = $('.pre__num');
  const t0 = performance.now();
  let shown = 0, preDone = false;
  function preTick(now) {
    if (preDone) return;
    const target = Math.min(loaded / toLoad.length, clamp((now - t0) / 2200, 0, 1));
    shown += (target - shown) * 0.12;
    if (target >= 1 && (shown > 0.97 || now - t0 > 2600)) shown = 1;
    num.textContent = String(Math.round(shown * 100)).padStart(3, '0');
    if (shown >= 1 || now - t0 > 8000) { finishPre(); return; }
    requestAnimationFrame(preTick);
  }
  // If the page finishes loading while the preloader is still up, make sure it is at the top.
  addEventListener('load', () => { if (!preDone) toTop(); });
  function finishPre() {
    preDone = true;
    num.textContent = '100';
    clearInterval(preCycle);
    pre.classList.add('is-fast');
    toTop();
    lock(false);
    if (motion) {
      G.timeline({ onComplete: () => { pre.remove(); ST.refresh(); } })
        .to(['.pre__stage', '.pre__num', '.pre__note'], { opacity: 0, duration: 0.4, ease: 'power2.in', delay: 0.2 })
        .to('.pre__cols span', { yPercent: -100, duration: 1.05, ease: 'expo.inOut', stagger: 0.06 }, '-=0.1')
        .add(intro, '-=0.8');
    } else {
      pre.remove();
      intro();
    }
  }
  if (motion) requestAnimationFrame(preTick); else finishPre();

  /* ---------------- manifesto ---------------- */
  const mText = $('.manifesto__text');
  mText.innerHTML = mText.textContent.trim().split(/\s+/).map((w) => '<span class="w">' + Array.from(w).map((c) => '<span class="c">' + c + '</span>').join('') + '</span>').join(' ');
  if (motion) {
    root.classList.add('anim');
    G.timeline({ scrollTrigger: { trigger: '.manifesto', start: 'top top', end: '+=230%', pin: '.manifesto__pin', scrub: 0.6 } })
      .to('.manifesto__text .w', { color: COLORS.ink, stagger: 0.12, duration: 0.4, ease: 'none' })
      .to({}, { duration: 0.8 })
      .to('.manifesto__text .c', {
        x: () => G.utils.random(-0.55, 0.55) * innerWidth,
        y: () => G.utils.random(-0.7, 0.5) * innerHeight,
        rotation: () => G.utils.random(-160, 160),
        opacity: 0, ease: 'power2.in', duration: 1.2, stagger: { each: 0.004, from: 'random' }
      })
      .to(['.manifesto__foot', '.manifesto__label'], { opacity: 0, y: -40, duration: 0.6 }, '<');
  }

  /* ---------------- marquee ---------------- */
  if (!reduce) {
    const tracks = $$('.marquee__track').map((t) => ({ el: t, g: t.querySelector('.marquee__group'), dir: +t.dataset.dir, x: 0, slow: 1, w: 1 }));
    const measureM = () => tracks.forEach((t) => { t.w = t.g.offsetWidth || 1; });
    measureM();
    addEventListener('resize', measureM);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureM);
    tracks.forEach((t) => {
      t.el.addEventListener('pointerenter', () => { t.slow = 0.2; });
      t.el.addEventListener('pointerleave', () => { t.slow = 1; });
    });
    let lastY = scrollY, boost = 0, sdir = 1, mVisible = true;
    addEventListener('scroll', () => {
      const dy = scrollY - lastY; lastY = scrollY;
      if (dy) sdir = dy > 0 ? 1 : -1;
      boost = clamp(boost + Math.abs(dy) * 0.05, 0, 16);
    }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { mVisible = es[0].isIntersecting; }).observe($('.marquee'));
    (function loop() {
      if (mVisible) tracks.forEach((t) => {
        t.x -= (0.6 + boost) * t.dir * sdir * t.slow;
        if (t.x <= -t.w) t.x += t.w;
        if (t.x > 0) t.x -= t.w;
        t.el.style.transform = 'translate3d(' + t.x.toFixed(2) + 'px,0,0)';
      });
      boost *= 0.92;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------- work: pinned timeline and trading cards ---------------- */
  const work = $('#work'), track = $('.work__track');
  let velT = 0, vel = 0;
  if (G) {
    G.matchMedia().add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
      work.classList.add('hscroll');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      G.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.work__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (self) => { velT = clamp(self.getVelocity() / -400, -5, 5); }
        }
      });
      G.to('.work__bgtitle', { x: () => -dist() * 0.3, ease: 'none', scrollTrigger: { trigger: '.work__pin', start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true } });
      return () => { work.classList.remove('hscroll'); G.set(track, { clearProps: 'transform' }); };
    });
    if (!reduce) G.ticker.add(() => { vel += (velT - vel) * 0.1; velT *= 0.9; track.style.setProperty('--vel', vel.toFixed(2)); });
  }
  $$('.tcard').forEach((card) => {
    const hit = card.querySelector('.tcard__hit');
    if (fine && !reduce) {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', ((nx - 0.5) * 30).toFixed(1) + 'deg');
        card.style.setProperty('--rx', ((0.5 - ny) * 24).toFixed(1) + 'deg');
        card.style.setProperty('--mx', (nx * 100).toFixed(0) + '%');
        card.style.setProperty('--my', (ny * 100).toFixed(0) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        ['--rx', '--ry', '--mx', '--my'].forEach((p) => card.style.removeProperty(p));
      });
    }
    hit.addEventListener('click', () => {
      const f = card.classList.toggle('is-flipped');
      hit.setAttribute('aria-pressed', String(f));
      hit.dataset.cursor = f ? 'Back' : 'Flip';
      cursor.label(null);
      sound.sweep();
    });
  });

  /* ---------------- services ---------------- */
  const svc = $('.svc');
  const words = $$('.stack__word');
  const setActive = (col) => {
    if (col) svc.dataset.active = col; else delete svc.dataset.active;
    words.forEach((w) => w.setAttribute('aria-pressed', String(w.dataset.col === col)));
  };
  words.forEach((w) => {
    w.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setActive(w.dataset.col); });
    w.addEventListener('focus', () => setActive(w.dataset.col));
    w.addEventListener('click', () => setActive(svc.dataset.active === w.dataset.col ? null : w.dataset.col));
  });
  $$('.svc__col').forEach((c) => c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setActive(c.dataset.col); }));
  svc.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') setActive(null); });

  /* ---------------- lightbox ---------------- */
  const lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  let lbList = [], lbIdx = 0, lbRet = null;
  function lbShow() {
    const it = lbList[lbIdx];
    lbImg.src = it.src; lbImg.alt = it.alt || '';
    lbCap.textContent = pad(lbIdx + 1) + ' / ' + pad(lbList.length) + '   ' + (it.cap || '');
    if (motion) G.fromTo(lbImg, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
  }
  function openLB(list, i, ret) {
    lbList = list; lbIdx = i; lbRet = ret || null;
    lbShow();
    lock(true);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
  }
  const lbStep = (d) => { lbIdx = (lbIdx + d + lbList.length) % lbList.length; lbShow(); };
  $('#lb-prev').addEventListener('click', () => lbStep(-1));
  $('#lb-next').addEventListener('click', () => lbStep(1));
  $('#lb-close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__fig')) lb.close(); });
  lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') lbStep(-1); if (e.key === 'ArrowRight') lbStep(1); });
  lb.addEventListener('close', () => { lock(false); if (lbRet) lbRet.focus(); });

  const tileEls = $$('.tile--pic');
  const tileItems = tileEls.map((t) => ({ src: t.dataset.full, cap: t.dataset.cap, alt: t.querySelector('img').alt }));
  tileEls.forEach((t, i) => t.addEventListener('click', () => openLB(tileItems, i, t)));

  /* ---------------- gallery ---------------- */
  const reelBtns = $$('#reel-items button');
  const reelItems = reelBtns.map((b) => ({ src: b.dataset.full, cap: b.dataset.cap, alt: b.querySelector('img').alt }));
  const reelCount = $('.reel__count'), reelCap = $('#reel-cap'), reelStage = $('#reel-stage');
  let reelGL = null, reelIdx = 0;
  function setReelIdx(i) {
    reelIdx = i;
    reelCount.textContent = pad(i + 1) + ' / ' + pad(reelItems.length);
    scramble(reelCap, reelItems[i].cap);
  }
  function initReel() {
    if (reelGL || !window.AOGL) return;
    root.classList.add('gl-reel');
    reelGL = AOGL.reel($('#reel-gl'), reelItems, {
      reduce: reduce,
      onIndex: setReelIdx,
      onOpen: (i) => openLB(reelItems, i, reelStage),
      onHover: (i) => cursor.label(i < 0 ? null : (i === reelIdx ? 'Open' : 'Go'))
    });
    if (!reelGL) root.classList.remove('gl-reel');
  }
  if ('IntersectionObserver' in window) {
    const rio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { initReel(); rio.disconnect(); } }, { rootMargin: '900px 0px' });
    rio.observe(reelStage);
  } else initReel();
  const reelStep = (d) => {
    if (reelGL) { if (d > 0) reelGL.next(); else reelGL.prev(); return; }
    const n = clamp(reelIdx + d, 0, reelItems.length - 1);
    reelBtns[n].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    setReelIdx(n);
  };
  $('#reel-prev').addEventListener('click', () => reelStep(-1));
  $('#reel-next').addEventListener('click', () => reelStep(1));
  reelStage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); reelStep(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); reelStep(-1); }
    if (e.key === 'Enter' && reelGL) { e.preventDefault(); openLB(reelItems, reelIdx, reelStage); }
  });
  reelBtns.forEach((b, i) => b.addEventListener('click', () => openLB(reelItems, i, b)));

  /* ---------------- about: viewfinder ---------------- */
  const vf = $('.vf'), vfImg = vf.querySelector('img'), vfCount = $('#vf-count');
  const paras = $$('.about__text p');
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      const i = paras.indexOf(en.target);
      paras.forEach((p, j) => p.classList.toggle('is-dim', j !== i));
      vfCount.textContent = 'Take ' + (i + 1) + ' / ' + paras.length;
      const src = en.target.dataset.pic;
      if (vfImg.getAttribute('src') !== src) {
        vfImg.src = src;
        if (!reduce) { vf.classList.remove('is-static'); void vf.offsetWidth; vf.classList.add('is-static'); sound.hover(); }
      }
    }), { rootMargin: '-45% 0px -45% 0px' });
    paras.forEach((p) => vio.observe(p));
  }

  /* ---------------- time zones dial ---------------- */
  const dial = $('#dial');
  const NS = 'http://www.w3.org/2000/svg', C = 190;
  const mk = (tag, attrs) => { const el = document.createElementNS(NS, tag); Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k])); dial.appendChild(el); return el; };
  const pt = (m, r) => { const a = m / 1440 * Math.PI * 2 - Math.PI / 2; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
  const arcPath = (m0, len, r) => {
    if (len <= 0) return '';
    if (len >= 1440) len = 1439.5;
    const a = pt(m0, r), b = pt(m0 + len, r);
    return 'M ' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + (len > 720 ? 1 : 0) + ' 1 ' + b[0].toFixed(2) + ' ' + b[1].toFixed(2);
  };
  const mm = (m) => { const n = ((Math.round(m) % 1440) + 1440) % 1440; return pad(Math.floor(n / 60)) + ':' + pad(n % 60); };
  mk('circle', { cx: C, cy: C, r: 150, fill: 'none', stroke: 'rgba(23,21,19,.12)', 'stroke-width': 14 });
  mk('circle', { cx: C, cy: C, r: 126, fill: 'none', stroke: 'rgba(23,21,19,.08)', 'stroke-width': 14 });
  for (let h = 0; h < 24; h++) {
    const a = pt(h * 60, 161), b = pt(h * 60, h % 6 ? 166 : 171);
    mk('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: COLORS.ink, 'stroke-width': h % 6 ? 1 : 1.5, opacity: h % 6 ? 0.4 : 0.9 });
  }
  ['00', '06', '12', '18'].forEach((t, i) => { const p = pt(i * 360, 181); mk('text', { x: p[0], y: p[1] + 3.5, 'text-anchor': 'middle' }).textContent = t; });
  const arcYou = mk('path', { fill: 'none', stroke: COLORS.ink, 'stroke-width': 14 });
  const arcHer = mk('path', { fill: 'none', stroke: COLORS.rose, 'stroke-width': 14 });
  const arcOv = mk('path', { fill: 'none', stroke: COLORS.sage, 'stroke-width': 8, 'stroke-linecap': 'round' });
  const hand = mk('line', { x1: C, y1: C, stroke: COLORS.ink, 'stroke-width': 1.5 });
  mk('circle', { cx: C, cy: C, r: 4, fill: COLORS.ink });
  const knob = mk('circle', { r: 11, fill: COLORS.paper, stroke: COLORS.ink, 'stroke-width': 2, class: 'dial__knob' });
  const tLabel = mk('text', { x: C, y: C - 40, 'text-anchor': 'middle' });
  const tBig = mk('text', { x: C, y: C + 14, 'text-anchor': 'middle', class: 'dial__big' });
  const tHer = mk('text', { x: C, y: C + 42, 'text-anchor': 'middle', class: 'dial__small' });
  let tzSel = 'auto', cityName = 'Your', selMin = null;
  const inDay = (m) => { const n = ((m % 1440) + 1440) % 1440; return n >= 540 && n < 1020; };
  function tzUpdate() {
    const tz = tzSel === 'auto' ? viewerTz : tzSel;
    let off = 0;
    try { off = offsetMin(tz); } catch (e) { off = 0; }
    const shift = off - offsetMin(HER);
    let vm;
    if (selMin === null) { const p = hhmm(tz).split(':').map(Number); vm = p[0] * 60 + p[1]; } else vm = selMin;
    const hm = vm - shift, hs = 540 + shift;
    arcYou.setAttribute('d', arcPath(540, 480, 150));
    arcHer.setAttribute('d', arcPath(hs, 480, 126));
    let ov = 0, ovStart = 0;
    [-1440, 0, 1440].forEach((k) => { const s = Math.max(540, hs + k), e = Math.min(1020, hs + 480 + k); if (e - s > ov) { ov = e - s; ovStart = s; } });
    arcOv.setAttribute('d', arcPath(ovStart, ov, 104));
    const k = pt(vm, 150);
    hand.setAttribute('x2', k[0]); hand.setAttribute('y2', k[1]);
    knob.setAttribute('cx', k[0]); knob.setAttribute('cy', k[1]);
    tLabel.textContent = (tzSel === 'auto' ? 'YOUR TIME' : cityName.toUpperCase());
    tBig.textContent = mm(vm);
    tHer.textContent = 'AZEEZA ' + mm(hm);
    $('#tz-you-label').textContent = tzSel === 'auto' ? 'Your time' : cityName + ' time';
    $('#tz-you').textContent = mm(vm);
    $('#tz-her').textContent = mm(hm);
    const hrs = ov / 60;
    $('#tz-overlap').textContent = (Number.isInteger(hrs) ? hrs : hrs.toFixed(1)) + ' h';
    const a = inDay(vm), b = inDay(hm);
    let msg = a && b ? 'Inside both working days.' : a ? "Inside your working day, outside Azeeza's." : b ? "Outside your working day, inside Azeeza's." : 'Outside both working days.';
    if (ov === 0) msg += ' Your business hours do not overlap.';
    $('#tz-status').textContent = msg;
    dial.setAttribute('aria-valuenow', String(((vm % 1440) + 1440) % 1440));
    dial.setAttribute('aria-valuetext', mm(vm) + ' ' + (tzSel === 'auto' ? 'your time' : cityName + ' time') + ', ' + mm(hm) + " Azeeza's time");
  }
  const angleToMin = (e) => {
    const r = dial.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 380 - C, y = (e.clientY - r.top) / r.height * 380 - C;
    let a = Math.atan2(y, x) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    return (Math.round(a / (Math.PI * 2) * 1440 / 15) * 15) % 1440;
  };
  let dragDial = false;
  dial.addEventListener('pointerdown', (e) => { dragDial = true; try { dial.setPointerCapture(e.pointerId); } catch (err) {} selMin = angleToMin(e); tzUpdate(); });
  dial.addEventListener('pointermove', (e) => { if (!dragDial) return; const m = angleToMin(e); if (m !== selMin) { selMin = m; tzUpdate(); sound.hover(); } });
  ['pointerup', 'pointercancel'].forEach((t) => dial.addEventListener(t, () => { dragDial = false; }));
  dial.addEventListener('keydown', (e) => {
    const steps = { ArrowRight: 15, ArrowUp: 15, ArrowLeft: -15, ArrowDown: -15, PageUp: 60, PageDown: -60 };
    if (e.key in steps) {
      e.preventDefault();
      if (selMin === null) { const p = hhmm(tzSel === 'auto' ? viewerTz : tzSel).split(':').map(Number); selMin = p[0] * 60 + p[1]; }
      selMin = ((selMin + steps[e.key]) % 1440 + 1440) % 1440;
      tzUpdate();
    }
    if (e.key === 'Home') { e.preventDefault(); selMin = null; tzUpdate(); }
  });
  $('#tz-now').addEventListener('click', () => { selMin = null; tzUpdate(); });
  const chips = $$('.chips-tz button'), sel = $('#tz-city');
  chips.forEach((c) => c.addEventListener('click', () => {
    tzSel = c.dataset.tz; cityName = c.textContent; selMin = null;
    chips.forEach((o) => o.setAttribute('aria-pressed', String(o === c)));
    sel.value = '';
    tzUpdate();
  }));
  sel.addEventListener('change', () => {
    if (!sel.value) return;
    tzSel = sel.value; cityName = sel.options[sel.selectedIndex].textContent; selMin = null;
    chips.forEach((o) => o.setAttribute('aria-pressed', 'false'));
    tzUpdate();
  });
  tzUpdate();
  setInterval(() => { if (selMin === null) tzUpdate(); }, 30000);

  /* ---------------- contact ---------------- */
  const copyBtn = $('#copy-email'), emailEl = $('#email-text');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(emailEl.textContent.trim());
      copyBtn.textContent = 'Copied';
    } catch (err) {
      const range = document.createRange();
      range.selectNodeContents(emailEl);
      const s = getSelection(); s.removeAllRanges(); s.addRange(range);
      copyBtn.textContent = 'Address selected';
    }
    setTimeout(() => { copyBtn.textContent = 'Copy email'; }, 2200);
  });
  const wm = $('.wordmark');
  wm.innerHTML = Array.from(wm.textContent).map((c) => '<span class="wm">' + c + '</span>').join('');
  const wms = $$('.wm', wm);
  if (fine && !reduce) {
    let raf = 0, px = -1e4, py = -1e4;
    const paint = () => {
      raf = 0;
      wms.forEach((s) => {
        const r = s.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const k = clamp(1 - d / 420, 0, 1);
        s.style.fontWeight = String(Math.round(500 + 400 * k));
        s.style.fontStretch = (100 + 25 * k).toFixed(1) + '%';
      });
    };
    const sec = $('.contact');
    sec.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint); });
    sec.addEventListener('pointerleave', () => { px = py = -1e4; if (!raf) raf = requestAnimationFrame(paint); });
  }

  /* ---------------- scroll reveals ---------------- */
  if (motion) {
    const reveal = (targets, trigger, vars) => G.from(targets, Object.assign({ yPercent: 40, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: trigger, start: 'top 85%' } }, vars || {}));
    reveal('.stack__row', '.stack', { yPercent: 70, stagger: 0.12 });
    reveal(['.svc__lead', '.svc__col'], '.svc__lead');
    reveal('.reel__title', '.reel');
    reveal('.tile', '.tiles', { yPercent: 20, stagger: 0.04 });
    reveal(['.tz__intro > *'], '.tz', { yPercent: 30, stagger: 0.05 });
    reveal('.dial', '.tz', { yPercent: 0, scale: 0.85, rotation: -40 });
    reveal(['.contact__main > *'], '.contact', { yPercent: 50 });
    G.from('.wm', { yPercent: 100, duration: 1.3, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.wordmark', start: 'top 98%' } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
    addEventListener('load', () => ST.refresh());
  }
})();
