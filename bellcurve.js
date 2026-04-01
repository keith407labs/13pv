/* ============================================
   Bell Curve Particle Animation — Hero Background
   "Snow globe" effect: particles start scattered
   and swirling, then settle into a Gaussian curve
   with standard deviation bands. Runs once.
   ============================================ */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  if (!hero) return;

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;';
  hero.prepend(canvas);
  var ctx = canvas.getContext('2d');

  var W, H, dpr;

  function resize() {
    var rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildSprites();
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      if (finished) { computeTargets(); snapToTargets(); draw(); }
    }, 200);
  });

  // --- Config ---
  var COLORS = ['#D4785A', '#E8A87C', '#C46849', '#F0C9A8'];
  var COLOR_WEIGHTS = [0.4, 0.25, 0.25, 0.1];
  var isMobile = window.innerWidth < 768;
  var isSmall = window.innerWidth < 480;
  var POOL_SIZE = isSmall ? 600 : isMobile ? 900 : 1800;
  var MAX_ALPHA = 0.28;
  var SPRITE_SIZE = 2;

  // Gaussian curve — tuned per breakpoint
  var CURVE_HEIGHT = isSmall ? 0.22 : isMobile ? 0.25 : 0.30;
  var CURVE_SIGMA = isSmall ? 0.20 : isMobile ? 0.18 : 0.16;
  var CURVE_FLOOR = 1.0;

  // Snow globe timing
  var CHAOS_DURATION = 1500;
  var SETTLE_DURATION = 4000;
  var TOTAL_DURATION = CHAOS_DURATION + SETTLE_DURATION;

  // Initial velocity scaled to screen size
  var INIT_SPEED_MIN = isSmall ? 0.8 : isMobile ? 1.0 : 1.5;
  var INIT_SPEED_MAX = isSmall ? 1.8 : isMobile ? 2.0 : 2.5;

  function pickColor() {
    var r = Math.random(), cum = 0;
    for (var i = 0; i < COLORS.length; i++) {
      cum += COLOR_WEIGHTS[i];
      if (r < cum) return COLORS[i];
    }
    return COLORS[0];
  }

  // --- Sprites ---
  var sprites = [];
  function buildSprites() {
    sprites = COLORS.map(function (color) {
      var r = Math.round(SPRITE_SIZE * dpr);
      var s = r * 2 + 2;
      var off = document.createElement('canvas');
      off.width = s; off.height = s;
      var c = off.getContext('2d');
      // Crisp solid circle — no gradient at this size
      c.beginPath();
      c.arc(s / 2, s / 2, r, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
      return off;
    });
  }

  function spriteFor(color) {
    var idx = COLORS.indexOf(color);
    return sprites[idx >= 0 ? idx : 0];
  }

  // --- Gaussian helpers ---
  function gaussianVal(x, mu, sigma) {
    var d = (x - mu) / sigma;
    return Math.exp(-0.5 * d * d);
  }

  function randGaussian() {
    var u1 = Math.random(), u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // --- Particle pool ---
  var pool = [];
  for (var i = 0; i < POOL_SIZE; i++) {
    pool.push({
      x: 0, y: 0, vx: 0, vy: 0,
      tx: 0, ty: 0,
      alpha: 0, targetAlpha: 0,
      color: '', sprite: null, size: 0
    });
  }

  function computeTargets() {
    var baseY = CURVE_FLOOR * H;
    var sigma = CURVE_SIGMA * W;
    var peak = CURVE_HEIGHT * H;

    for (var i = 0; i < POOL_SIZE; i++) {
      var p = pool[i];
      var gx = randGaussian() * sigma + W / 2;
      gx = Math.max(0, Math.min(W, gx));
      var g = gaussianVal(gx, W / 2, sigma);
      var curveTop = baseY - g * peak;
      var gy = curveTop + Math.random() * (baseY - curveTop);
      p.tx = gx;
      p.ty = gy;
    }
  }

  function initParticles() {
    for (var i = 0; i < POOL_SIZE; i++) {
      var p = pool[i];
      p.x = Math.random() * W;
      p.y = Math.random() * H;
      var angle = Math.random() * Math.PI * 2;
      var speed = INIT_SPEED_MIN + Math.random() * (INIT_SPEED_MAX - INIT_SPEED_MIN);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = pickColor();
      p.sprite = spriteFor(p.color);
      p.size = SPRITE_SIZE * (0.6 + Math.random() * 0.8);
      p.targetAlpha = MAX_ALPHA * (0.4 + Math.random() * 0.6);
      p.alpha = p.targetAlpha;
    }
  }

  function snapToTargets() {
    for (var i = 0; i < POOL_SIZE; i++) {
      pool[i].x = pool[i].tx;
      pool[i].y = pool[i].ty;
      pool[i].vx = 0;
      pool[i].vy = 0;
    }
  }

  // --- Animation state ---
  var elapsed = 0;
  var lastTime = 0;
  var running = true;
  var finished = false;

  function update(dt) {
    elapsed += dt;
    var dtF = dt / 16.667;

    var settleT = Math.max(0, (elapsed - CHAOS_DURATION) / SETTLE_DURATION);
    settleT = Math.min(1, settleT);
    settleT = settleT * settleT * (3 - 2 * settleT);

    var springK = 0.0002 + settleT * 0.008;
    var friction = 0.997 - settleT * 0.06;

    for (var i = 0; i < POOL_SIZE; i++) {
      var p = pool[i];
      var dx = p.tx - p.x;
      var dy = p.ty - p.y;
      p.vx += dx * springK * dtF;
      p.vy += dy * springK * dtF;

      if (settleT < 0.8) {
        var swirlStrength = 0.03 * (1 - settleT);
        p.vx += dy * swirlStrength * 0.01 * dtF;
        p.vy -= dx * swirlStrength * 0.01 * dtF;
      }

      p.vx *= friction;
      p.vy *= friction;
      p.x += p.vx * dtF;
      p.y += p.vy * dtF;

      if (p.x < -20) { p.x = -20; p.vx = Math.abs(p.vx) * 0.5; }
      if (p.x > W + 20) { p.x = W + 20; p.vx = -Math.abs(p.vx) * 0.5; }
      if (p.y < -20) { p.y = -20; p.vy = Math.abs(p.vy) * 0.5; }
      if (p.y > H + 20) { p.y = H + 20; p.vy = -Math.abs(p.vy) * 0.5; }
    }

    if (elapsed >= TOTAL_DURATION) {
      snapToTargets();
      finished = true;
    }
  }

  // Draw a filled region under the curve between x1 and x2
  function drawBand(baseY, sigma, peak, x1, x2, alpha, curveFade) {
    var stepsPerBand = 60;
    ctx.beginPath();
    ctx.moveTo(x1, baseY);
    for (var i = 0; i <= stepsPerBand; i++) {
      var x = x1 + (i / stepsPerBand) * (x2 - x1);
      var g = gaussianVal(x, W / 2, sigma);
      var y = baseY - g * peak;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x2, baseY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(215,213,208,' + (alpha * curveFade).toFixed(4) + ')';
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    var baseY = CURVE_FLOOR * H;
    var sigma = CURVE_SIGMA * W;
    var peak = CURVE_HEIGHT * H;

    var settleT = Math.max(0, (elapsed - CHAOS_DURATION * 0.5) / SETTLE_DURATION);
    settleT = Math.min(1, settleT);
    var curveFade = settleT * settleT;

    // --- Standard deviation shaded bands (drawn first, behind everything) ---
    // ±3σ band (outermost, lightest)
    var x3L = W / 2 - 3 * sigma, x3R = W / 2 + 3 * sigma;
    var x2L = W / 2 - 2 * sigma, x2R = W / 2 + 2 * sigma;
    var x1L = W / 2 - sigma,     x1R = W / 2 + sigma;

    // Clamp to canvas
    x3L = Math.max(0, x3L); x3R = Math.min(W, x3R);
    x2L = Math.max(0, x2L); x2R = Math.min(W, x2R);

    // ±3σ outer slivers
    if (x3L < x2L) drawBand(baseY, sigma, peak, x3L, x2L, 0.04, curveFade);
    if (x2R < x3R) drawBand(baseY, sigma, peak, x2R, x3R, 0.04, curveFade);
    // ±2σ slivers
    drawBand(baseY, sigma, peak, x2L, x1L, 0.08, curveFade);
    drawBand(baseY, sigma, peak, x1R, x2R, 0.08, curveFade);
    // ±1σ center band (most prominent)
    drawBand(baseY, sigma, peak, x1L, x1R, 0.14, curveFade);

    // --- Bell curve stroke ---
    var steps = 120;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var x = (i / steps) * W;
      var g = gaussianVal(x, W / 2, sigma);
      var y = baseY - g * peak;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(215,213,208,' + (0.25 * curveFade).toFixed(3) + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Baseline ---
    ctx.beginPath();
    ctx.moveTo(x3L, baseY);
    ctx.lineTo(x3R, baseY);
    ctx.strokeStyle = 'rgba(215,213,208,' + (0.12 * curveFade).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- σ vertical lines and labels ---
    var sigmaLines = [
      { x: x1L, label: '-1\u03C3' },
      { x: x1R, label: '+1\u03C3' },
      { x: x2L, label: '-2\u03C3' },
      { x: x2R, label: '+2\u03C3' },
      { x: x3L, label: '-3\u03C3' },
      { x: x3R, label: '+3\u03C3' }
    ];

    for (var s = 0; s < sigmaLines.length; s++) {
      var sl = sigmaLines[s];
      if (sl.x < 0 || sl.x > W) continue;
      var curveAtX = baseY - gaussianVal(sl.x, W / 2, sigma) * peak;

      // Vertical dashed line from baseline to curve
      ctx.beginPath();
      ctx.moveTo(sl.x, baseY);
      ctx.lineTo(sl.x, curveAtX);
      ctx.strokeStyle = 'rgba(215,213,208,' + (0.10 * curveFade).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label below baseline (skip on very small screens)
      if (!isSmall) {
        ctx.globalAlpha = 0.35 * curveFade;
        ctx.font = '600 ' + (isMobile ? '9' : '10') + 'px "JetBrains Mono", monospace';
        ctx.fillStyle = '#D7D5D0';
        ctx.textAlign = 'center';
        ctx.fillText(sl.label, sl.x, baseY - 6);
        ctx.globalAlpha = 1;
      }
    }

    // --- Dashed mean line (μ) ---
    ctx.beginPath();
    ctx.moveTo(W / 2, baseY);
    ctx.lineTo(W / 2, baseY - peak - 8);
    ctx.strokeStyle = 'rgba(215,213,208,' + (0.12 * curveFade).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // μ label
    if (!isSmall) {
      ctx.globalAlpha = 0.4 * curveFade;
      ctx.font = '600 ' + (isMobile ? '9' : '10') + 'px "JetBrains Mono", monospace';
      ctx.fillStyle = '#D7D5D0';
      ctx.textAlign = 'center';
      ctx.fillText('\u03BC', W / 2, baseY - 6);
      ctx.globalAlpha = 1;
    }

    // --- Particles ---
    for (var i = 0; i < POOL_SIZE; i++) {
      var p = pool[i];
      if (p.alpha <= 0) continue;
      ctx.globalAlpha = p.alpha;
      var d = p.size * 2;
      ctx.drawImage(p.sprite, p.x - d / 2, p.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
  }

  function frame(timestamp) {
    if (!running) {
      rafId = requestAnimationFrame(frame);
      return;
    }

    if (!lastTime) lastTime = timestamp;
    var dt = timestamp - lastTime;
    lastTime = timestamp;
    if (dt > 100) dt = 16.667;

    update(dt);
    draw();

    if (finished) return;
    rafId = requestAnimationFrame(frame);
  }

  resize();
  computeTargets();
  initParticles();
  var rafId = requestAnimationFrame(frame);

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (finished) return;
      running = entries[0].isIntersecting;
      if (running) lastTime = 0;
    }, { threshold: 0.05 });
    observer.observe(hero);
  }

  document.addEventListener('visibilitychange', function () {
    if (finished) return;
    if (document.hidden) { running = false; }
    else { running = true; lastTime = 0; }
  });
})();
