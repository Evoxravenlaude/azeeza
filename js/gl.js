/* WebGL scenes: the halftone hero portrait with a colour lens, and the curved photo gallery. */
(function () {
  'use strict';

  function makeRenderer(canvas) {
    if (!window.THREE) return null;
    try {
      const r = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: 'high-performance' });
      if (!r.getContext()) return null;
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.setClearColor(0x000000, 0);
      return r;
    } catch (e) {
      return null;
    }
  }

  function loadTexture(loader, src) {
    return new Promise(function (resolve) {
      loader.load(src, function (t) {
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        resolve(t);
      }, undefined, function () { resolve(null); });
    });
  }

  const COVER = [
    'vec2 cover(vec2 uv, vec2 box, vec2 img, float focusY){',
    '  float rb = box.x / box.y; float ri = img.x / img.y;',
    '  vec2 s = rb > ri ? vec2(1.0, ri / rb) : vec2(rb / ri, 1.0);',
    '  vec2 off = (1.0 - s) * vec2(0.5, focusY);',
    '  return off + uv * s;',
    '}'
  ].join('\n');

  /* ---------------- hero ---------------- */
  const HERO_FRAG = [
    'precision highp float;',
    'uniform sampler2D uTex0; uniform sampler2D uTex1;',
    'uniform float uMix; uniform float uLens; uniform float uDither; uniform float uTime; uniform float uDpr;',
    'uniform vec2 uRes; uniform vec2 uImg0; uniform vec2 uImg1; uniform vec2 uMouse;',
    'uniform vec4 uRect; uniform vec3 uPaper; uniform vec3 uInk;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    COVER,
    'vec3 sampleAt(vec2 uv, bool nxt){',
    '  return nxt ? texture2D(uTex1, cover(uv, uRect.zw, uImg1, 0.66)).rgb : texture2D(uTex0, cover(uv, uRect.zw, uImg0, 0.66)).rgb;',
    '}',
    'void main(){',
    '  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    '  vec2 p = (frag - uRect.xy) / uRect.zw;',
    '  if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) { gl_FragColor = vec4(0.0); return; }',
    '  vec2 uv = vec2(p.x, 1.0 - p.y);',
    '  float cell = 6.0 * uDpr;',
    '  vec2 cid = floor(frag / cell);',
    '  vec2 cc = (cid + 0.5) * cell;',
    '  vec2 pc = clamp((cc - uRect.xy) / uRect.zw, 0.0, 1.0);',
    '  vec2 uvc = vec2(pc.x, 1.0 - pc.y);',
    '  bool nxt = hash(cid) < uMix;',
    '  vec3 colPix = sampleAt(uv, nxt);',
    '  vec3 colCell = sampleAt(uvc, nxt);',
    '  float lum = dot(colCell, vec3(0.299, 0.587, 0.114));',
    '  float rad = (1.0 - lum) * 0.64 * cell + 0.35 * uDpr;',
    '  float d = length(frag - cc);',
    '  float dotMask = 1.0 - smoothstep(rad - uDpr, rad, d);',
    '  vec3 tone = mix(uPaper, uInk, dotMask);',
    '  tone = mix(tone, colCell * 0.85 + uInk * 0.15, dotMask * 0.42);',
    '  float md = length(frag - uMouse);',
    '  float lensR = 120.0 * uDpr;',
    '  float lens = (1.0 - smoothstep(lensR * 0.55, lensR, md)) * uLens;',
    '  float ring = smoothstep(lensR * 0.9, lensR, md) * (1.0 - smoothstep(lensR, lensR * 1.08, md)) * uLens;',
    '  float k = clamp(max(1.0 - uDither, lens), 0.0, 1.0);',
    '  vec3 col = mix(tone, colPix, k);',
    '  col = mix(col, uInk, ring * 0.35 * uDither);',
    '  float scan = 0.035 * sin(frag.y * 0.9 / uDpr + uTime * 6.0) * uDither * (1.0 - k);',
    '  col += scan + (hash(frag + fract(uTime) * 91.0) - 0.5) * 0.05 * uDither;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function hero(canvas, srcs, opts) {
    const renderer = makeRenderer(canvas);
    if (!renderer) return null;
    const dpr = renderer.getPixelRatio();
    const scene = new THREE.Scene();
    const cam = new THREE.Camera();
    const loader = new THREE.TextureLoader();
    const blank = new THREE.DataTexture(new Uint8Array([216, 209, 198, 255]), 1, 1, THREE.RGBAFormat);
    blank.needsUpdate = true;
    const texs = [];
    const u = {
      uTex0: { value: blank }, uTex1: { value: blank }, uMix: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) }, uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
      uImg0: { value: new THREE.Vector2(3, 4) }, uImg1: { value: new THREE.Vector2(3, 4) },
      uMouse: { value: new THREE.Vector2(-9999, -9999) }, uLens: { value: 0 }, uDither: { value: 1 },
      uTime: { value: 0 }, uDpr: { value: dpr },
      uPaper: { value: new THREE.Color(opts.paper) }, uInk: { value: new THREE.Color(opts.ink) }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: HERO_FRAG,
      transparent: true, depthTest: false
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    function resize() {
      const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      u.uRes.value.set(w * dpr, h * dpr);
    }
    resize();

    const get = function (i) {
      if (!texs[i]) texs[i] = loadTexture(loader, srcs[i]);
      return texs[i];
    };
    let idx = 0, lensT = 0, trans = null, running = false, reduce = !!opts.reduce;

    get(0).then(function (t) {
      if (t) { u.uTex0.value = t; u.uImg0.value.set(t.image.width, t.image.height); }
      if (opts.onReady) opts.onReady();
      for (let i = 1; i < srcs.length; i++) get(i);
    });

    function go(n) {
      if (trans || n === idx) return;
      get(n).then(function (t) {
        if (!t) return;
        u.uTex1.value = t;
        u.uImg1.value.set(t.image.width, t.image.height);
        trans = { start: performance.now(), n: n };
        if (!running) frame(performance.now());
      });
    }

    function frame(now) {
      u.uTime.value = now / 1000;
      u.uLens.value += (lensT - u.uLens.value) * (reduce ? 1 : 0.14);
      if (trans) {
        const p = reduce ? 1 : Math.min(1, (now - trans.start) / 950);
        u.uMix.value = p;
        if (p >= 1) {
          idx = trans.n;
          u.uTex0.value = u.uTex1.value;
          u.uImg0.value.copy(u.uImg1.value);
          u.uMix.value = 0;
          trans = null;
          if (opts.onChange) opts.onChange(idx);
        }
      }
      renderer.render(scene, cam);
      if (running) requestAnimationFrame(frame);
    }

    return {
      setRect: function (x, y, w, h) { u.uRect.value.set(x * dpr, y * dpr, Math.max(1, w * dpr), Math.max(1, h * dpr)); },
      setMouse: function (x, y) { u.uMouse.value.set(x * dpr, y * dpr); },
      setLens: function (v) { lensT = v; },
      setDither: function (v) { u.uDither.value = v; },
      next: function () { go((idx + 1) % srcs.length); },
      resize: resize,
      render: function () { if (!running) frame(performance.now()); },
      start: function () { if (!running) { running = true; requestAnimationFrame(frame); } },
      stop: function () { running = false; },
      get index() { return idx; }
    };
  }

  /* ---------------- curved gallery ---------------- */
  const REEL_VERT = [
    'uniform float uCurve; uniform float uHalf; uniform float uVel;',
    'varying vec2 vUv; varying float vBend;',
    'void main(){',
    '  vUv = uv;',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  float nx = wp.x / uHalf;',
    '  float bend = nx * nx;',
    '  wp.z -= bend * uCurve;',
    '  wp.y -= sin(uv.x * 3.14159) * uVel * 34.0;',
    '  vBend = bend;',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}'
  ].join('\n');

  const REEL_FRAG = [
    'precision highp float;',
    'uniform sampler2D uTex; uniform vec2 uImg; uniform vec2 uSize; uniform float uVel; uniform float uHover; uniform float uRadius; uniform float uLoaded;',
    'varying vec2 vUv; varying float vBend;',
    COVER,
    'float rmask(vec2 uv, vec2 size, float r){',
    '  vec2 p = (uv - 0.5) * size;',
    '  vec2 q = abs(p) - size * 0.5 + r;',
    '  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;',
    '  return 1.0 - smoothstep(-1.0, 0.5, d);',
    '}',
    'void main(){',
    '  vec2 uv = cover(vUv, uSize, uImg, 0.62);',
    '  uv = mix(vec2(0.5), uv, 1.0 - uHover * 0.06);',
    '  float sh = uVel * 0.02;',
    '  vec3 c;',
    '  c.r = texture2D(uTex, uv + vec2(sh, 0.0)).r;',
    '  c.g = texture2D(uTex, uv).g;',
    '  c.b = texture2D(uTex, uv - vec2(sh, 0.0)).b;',
    '  c = mix(vec3(0.85, 0.82, 0.78), c, uLoaded);',
    '  c *= 1.0 - vBend * 0.22;',
    '  c = mix(c, c * 1.06 + 0.02, uHover);',
    '  gl_FragColor = vec4(c, rmask(vUv, uSize, uRadius));',
    '}'
  ].join('\n');

  function reel(canvas, items, opts) {
    const renderer = makeRenderer(canvas);
    if (!renderer) return null;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 10, 4000);
    camera.position.z = 1000;
    const loader = new THREE.TextureLoader();
    const geo = new THREE.PlaneGeometry(1, 1, 40, 1);
    const shared = { uCurve: { value: 200 }, uHalf: { value: 600 }, uVel: { value: 0 } };
    const blank = new THREE.DataTexture(new Uint8Array([216, 209, 198, 255]), 1, 1, THREE.RGBAFormat);
    blank.needsUpdate = true;
    const reduce = !!opts.reduce;

    const planes = items.map(function (it, i) {
      const u = {
        uCurve: shared.uCurve, uHalf: shared.uHalf, uVel: shared.uVel,
        uTex: { value: blank }, uImg: { value: new THREE.Vector2(3, 4) }, uSize: { value: new THREE.Vector2(300, 400) },
        uHover: { value: 0 }, uRadius: { value: 16 }, uLoaded: { value: 0 }
      };
      const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: REEL_VERT, fragmentShader: REEL_FRAG, transparent: true }));
      scene.add(m);
      loadTexture(loader, it.src).then(function (t) {
        if (!t) return;
        u.uTex.value = t; u.uImg.value.set(t.image.width, t.image.height);
        const s = performance.now();
        const fade = function (now) { u.uLoaded.value = Math.min(1, (now - s) / 500); if (u.uLoaded.value < 1) requestAnimationFrame(fade); };
        requestAnimationFrame(fade);
      });
      return { mesh: m, u: u, hover: 0 };
    });

    let W = 300, H = 400, gap = 40, spacing = 340, cw = 1, ch = 1;
    let cur = 0, target = 0, prev = 0, vel = 0, index = 0, hovered = -1;
    let running = false, visible = false, dragging = false, moved = 0, startX = 0, startT = 0, lastX = 0, pvel = 0;

    function layout() {
      cw = canvas.clientWidth || 1; ch = canvas.clientHeight || 1;
      renderer.setSize(cw, ch, false);
      camera.aspect = cw / ch;
      camera.fov = 2 * Math.atan(ch / 2 / 1000) * 180 / Math.PI;
      camera.updateProjectionMatrix();
      H = Math.min(ch * 0.78, cw < 700 ? cw * 0.95 : 520);
      W = H * 0.75;
      gap = W * 0.16;
      spacing = W + gap;
      shared.uHalf.value = cw / 2;
      shared.uCurve.value = Math.min(320, cw * 0.22);
      planes.forEach(function (p) {
        p.mesh.scale.set(W, H, 1);
        p.u.uSize.value.set(W, H);
        p.u.uRadius.value = Math.max(10, W * 0.05);
      });
      target = clamp(target, 0, (items.length - 1) * spacing);
      cur = clamp(cur, 0, (items.length - 1) * spacing);
      draw();
    }

    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

    function screenRect(i) {
      const cx = i * spacing - cur;
      const z = -Math.pow(cx / (cw / 2), 2) * shared.uCurve.value;
      const s = 1000 / (1000 - z);
      return { x: cw / 2 + cx * s, y: ch / 2, w: W * s, h: H * s };
    }

    function draw() {
      planes.forEach(function (p, i) {
        p.mesh.position.set(i * spacing - cur, 0, 0);
        p.hover += ((i === hovered ? 1 : 0) - p.hover) * (reduce ? 1 : 0.15);
        p.u.uHover.value = p.hover;
      });
      renderer.render(scene, camera);
      const ni = clamp(Math.round(cur / spacing), 0, items.length - 1);
      if (ni !== index) { index = ni; if (opts.onIndex) opts.onIndex(index); }
    }

    function frame() {
      prev = cur;
      cur += (target - cur) * (reduce ? 1 : 0.1);
      if (Math.abs(target - cur) < 0.05) cur = target;
      vel += ((cur - prev) - vel) * 0.2;
      shared.uVel.value = reduce ? 0 : clamp(vel / 40, -1, 1);
      draw();
      if (running) requestAnimationFrame(frame);
    }
    function start() { if (!running) { running = true; requestAnimationFrame(frame); } }
    function stop() { running = false; }

    function goTo(i) { target = clamp(Math.round(i), 0, items.length - 1) * spacing; }

    function hitTest(x, y) {
      for (let i = 0; i < items.length; i++) {
        const r = screenRect(i);
        if (Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2) return i;
      }
      return -1;
    }

    function local(e) { const b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true; moved = 0; startX = lastX = e.clientX; startT = target; pvel = 0;
      canvas.classList.add('is-drag');
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      const p = local(e);
      hovered = dragging ? -1 : hitTest(p.x, p.y);
      if (opts.onHover) opts.onHover(hovered);
      if (!dragging) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      pvel = e.clientX - lastX; lastX = e.clientX;
      target = clamp(startT - dx * 1.4, -spacing * 0.35, (items.length - 1) * spacing + spacing * 0.35);
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      canvas.classList.remove('is-drag');
      goTo((target - pvel * 8) / spacing);
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', function () { hovered = -1; if (opts.onHover) opts.onHover(-1); });
    canvas.addEventListener('click', function (e) {
      if (moved > 6) return;
      const p = local(e);
      const i = hitTest(p.x, p.y);
      if (i < 0) return;
      if (i === index) { if (opts.onOpen) opts.onOpen(i); } else goTo(i);
    });
    let snapT = null;
    canvas.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      target = clamp(target + e.deltaX * 1.2, 0, (items.length - 1) * spacing);
      clearTimeout(snapT);
      snapT = setTimeout(function () { goTo(target / spacing); }, 160);
    }, { passive: false });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) start(); else stop();
      }, { rootMargin: '100px' }).observe(canvas);
    } else { start(); }
    window.addEventListener('resize', layout);
    layout();

    return {
      next: function () { goTo(Math.round(target / spacing) + 1); },
      prev: function () { goTo(Math.round(target / spacing) - 1); },
      goTo: goTo,
      get index() { return index; }
    };
  }

  window.AOGL = { hero: hero, reel: reel };
})();
