/* ============================================
   Weibull Distribution Particle Animation — Hero Background
   "Snow globe" effect: particles start scattered
   and swirling, then settle into a Weibull curve
   with percentile bands. Runs once.
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

  // Responsive state (updated on resize)
  var isMobile, isSmall;
  var curveParams = {};

  // --- Weibull parameters ---
  var WEIBULL_K = 1.9;
  var WEIBULL_LAM = 1;

  // --- Weibull math ---
  function weibullPDF(x, k, lam) {
    if (x < 0) return 0;
    if (x === 0) return k < 1 ? Infinity : (k === 1 ? 1 / lam : 0);
    return (k / lam) * Math.pow(x / lam, k - 1) * Math.exp(-Math.pow(x / lam, k));
  }

  function weibullQuantile(p, k, lam) {
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    return lam * Math.pow(-Math.log(1 - p), 1 / k);
  }

  function weibullMode(k, lam) {
    if (k <= 1) return 0;
    return lam * Math.pow((k - 1) / k, 1 / k);
  }

  // Pre-computed constants (k and λ are fixed)
  var PEAK_PDF = weibullPDF(weibullMode(WEIBULL_K, WEIBULL_LAM), WEIBULL_K, WEIBULL_LAM);
  var P10 = weibullQuantile(0.10, WEIBULL_K, WEIBULL_LAM);
  var P25 = weibullQuantile(0.25, WEIBULL_K, WEIBULL_LAM);
  var P75 = weibullQuantile(0.75, WEIBULL_K, WEIBULL_LAM);
  var P90 = weibullQuantile(0.90, WEIBULL_K, WEIBULL_LAM);

  // --- Coordinate mapping ---
  // Maps Weibull domain to canvas pixels with margins
  var cachedMap;
  function getWeibullMapping() {
    var xDomainMax = weibullQuantile(0.999, WEIBULL_K, WEIBULL_LAM);
    var leftMargin = 0.10 * W;   // 10% left margin
    var rightMargin = 0;         // extend to right edge
    var plotWidth = W - leftMargin - rightMargin;
    var scale = plotWidth / xDomainMax;

    return {
      xDomainMax: xDomainMax,
      leftMargin: leftMargin,
      plotWidth: plotWidth,
      scale: scale,
      xToPx: function (x) { return leftMargin + x * scale; },
      pxToX: function (px) { return (px - leftMargin) / scale; }
    };
  }

  function updateBreakpoints() {
    var w = window.innerWidth;
    isMobile = w < 768;
    isSmall = w < 480;

    curveParams = {
      height: isSmall ? 0.22 : isMobile ? 0.25 : 0.30,
      pulseWidth: isSmall ? 0.22 : isMobile ? 0.16 : 0.08,
      pulseAlpha: isSmall ? 0.55 : isMobile ? 0.50 : 0.35,
      baseStrokeAlpha: isMobile ? 0.35 : 0.25,
      bandAlphaOuter: isSmall ? 0.16 : isMobile ? 0.14 : 0.08,
      bandAlphaInner: isSmall ? 0.24 : isMobile ? 0.22 : 0.14,
      curveSteps: isSmall ? 50 : isMobile ? 70 : 100,
      pulseSteps: isSmall ? 30 : isMobile ? 40 : 60,
      bandSteps: isSmall ? 20 : isMobile ? 30 : 40
    };
  }

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

    updateBreakpoints();
    buildSprites();
    cachedMap = getWeibullMapping();
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var prevW = W;
      resize();
      // Recalculate if width changed significantly (ignores mobile scrollbars)
      if (Math.abs(W - prevW) > 1) {
        computeTargets();
        // If finished, snap to the new layout immediately.
        // If not finished, let particles fly to the new targets naturally.
        if (finished) {
          snapToTargets();
        }
      }
    }, 200);
  });

  // --- Config ---
  var COLORS = ['#F28C50', '#FFB878', '#E06A38', '#FFD0A0'];
  var COLOR_WEIGHTS = [0.4, 0.25, 0.25, 0.1];
  // Pool size is fixed so we don't have to push/splice arrays on resize
  var POOL_SIZE = window.innerWidth < 480 ? 600 : window.innerWidth < 768 ? 900 : 1800;
  var MAX_ALPHA = 0.28;
  var SPRITE_SIZE = 2;

  // Baseline pinned to bottom of viewport (not bottom of hero)
  function getBaseY() {
    var rect = hero.getBoundingClientRect();
    var viewportBottom = window.innerHeight - rect.top;
    return Math.min(H, Math.max(100, viewportBottom));
  }

  // Snow globe timing
  var CHAOS_DURATION = 1500;
  var SETTLE_DURATION = 4000;
  var TOTAL_DURATION = CHAOS_DURATION + SETTLE_DURATION;

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

  // Store random seeds so resize reuses the same distribution
  var targetSeeds = [];

  function computeTargets() {
    var baseY = getBaseY();
    var map = cachedMap;
    var peak = curveParams.height * H;
    var needSeeds = targetSeeds.length === 0;

    for (var i = 0; i < POOL_SIZE; i++) {
      var p = pool[i];
      var seed;
      if (needSeeds) {
        seed = { u: Math.random(), fy: Math.random() };
        targetSeeds.push(seed);
      } else {
        seed = targetSeeds[i];
      }

      // Inverse CDF sampling for x-position
      var wx = weibullQuantile(seed.u, WEIBULL_K, WEIBULL_LAM);
      var px = map.xToPx(wx);
      px = Math.max(0, Math.min(W, px));

      // Normalize PDF to 0–1 range using peak value
      var g = weibullPDF(wx, WEIBULL_K, WEIBULL_LAM) / PEAK_PDF;
      var curveTop = baseY - g * peak;
      var margin = 6;
      var innerTop = curveTop + margin;
      var innerBottom = baseY - margin;
      if (innerTop >= innerBottom) innerTop = innerBottom - 1;
      var gy = innerTop + seed.fy * (innerBottom - innerTop);
      p.tx = px;
      p.ty = gy;
    }
  }

  function initParticles() {
    var INIT_SPEED_MIN = isSmall ? 0.8 : isMobile ? 1.0 : 1.5;
    var INIT_SPEED_MAX = isSmall ? 1.8 : isMobile ? 2.0 : 2.5;

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
  var pulseTime = 0;
  var PULSE_SPEED = 0.0004; // cycles per ms (~2.5s per sweep)

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

  // Draw a filled region under the Weibull curve between x1 and x2 (in domain units)
  function drawBand(baseY, map, peakPDF, peak, x1, x2, alpha, curveFade) {
    var stepsPerBand = curveParams.bandSteps;
    var px1 = map.xToPx(x1);
    var px2 = map.xToPx(x2);
    ctx.beginPath();
    ctx.moveTo(px1, baseY);
    for (var i = 0; i <= stepsPerBand; i++) {
      var x = x1 + (i / stepsPerBand) * (x2 - x1);
      var g = weibullPDF(x, WEIBULL_K, WEIBULL_LAM) / PEAK_PDF;
      var y = baseY - g * peak;
      ctx.lineTo(map.xToPx(x), y);
    }
    ctx.lineTo(px2, baseY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(215,213,208,' + (alpha * curveFade).toFixed(4) + ')';
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    var baseY = getBaseY();
    var map = cachedMap;
    var peak = curveParams.height * H;

    var settleT = Math.max(0, (elapsed - CHAOS_DURATION * 0.5) / SETTLE_DURATION);
    settleT = Math.min(1, settleT);
    var curveFade = settleT * settleT;

    // --- Percentile bands (drawn first, behind everything) ---
    // P10–P25 outer sliver (left)
    drawBand(baseY, map, PEAK_PDF, peak, P10, P25, curveParams.bandAlphaOuter, curveFade);
    // P75–P90 outer sliver (right)
    drawBand(baseY, map, PEAK_PDF, peak, P75, P90, curveParams.bandAlphaOuter, curveFade);
    // P25–P75 inner band (most prominent)
    drawBand(baseY, map, PEAK_PDF, peak, P25, P75, curveParams.bandAlphaInner, curveFade);

    // --- Weibull curve stroke with rolling pulse ---
    var steps = curveParams.curveSteps;
    var xDomainMax = map.xDomainMax;

    // Base stroke
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var x = (i / steps) * xDomainMax;
      var g = weibullPDF(x, WEIBULL_K, WEIBULL_LAM) / PEAK_PDF;
      var px = map.xToPx(x);
      var y = baseY - g * peak;
      if (i === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
    }
    ctx.strokeStyle = 'rgba(215,213,208,' + (curveParams.baseStrokeAlpha * curveFade).toFixed(3) + ')';
    ctx.lineWidth = isMobile ? 2 : 1.5;
    ctx.stroke();

    // Pulse glow on top (only after settling)
    if (finished || curveFade > 0.9) {
      var pulseCenter = Math.sin(pulseTime * Math.PI * 2) * 0.5 + 0.5;
      var xLeft = 0;
      var xRight = xDomainMax;
      var pulseCenterX = map.xToPx(xLeft + pulseCenter * (xRight - xLeft));
      var pulseW = curveParams.pulseWidth * W;
      var segSteps = curveParams.pulseSteps;

      for (var seg = 0; seg < segSteps; seg++) {
        var sx1domain = (seg / segSteps) * xDomainMax;
        var sx2domain = ((seg + 1) / segSteps) * xDomainMax;
        var sx1px = map.xToPx(sx1domain);
        var sx2px = map.xToPx(sx2domain);
        var smid = (sx1px + sx2px) / 2;

        var dist = (smid - pulseCenterX) / pulseW;
        var intensity = Math.exp(-0.5 * dist * dist);
        if (intensity < 0.01) continue;

        var gx1 = weibullPDF(sx1domain, WEIBULL_K, WEIBULL_LAM) / PEAK_PDF;
        var gx2 = weibullPDF(sx2domain, WEIBULL_K, WEIBULL_LAM) / PEAK_PDF;

        ctx.beginPath();
        ctx.moveTo(sx1px, baseY - gx1 * peak);
        ctx.lineTo(sx2px, baseY - gx2 * peak);
        ctx.strokeStyle = 'rgba(215,213,208,' + (intensity * curveParams.pulseAlpha * curveFade).toFixed(3) + ')';
        ctx.lineWidth = isMobile ? 3.5 : 2.5;
        ctx.stroke();
      }
    }

    // --- Baseline ---
    var baselineLeft = map.xToPx(0);
    var baselineRight = map.xToPx(xDomainMax);
    ctx.beginPath();
    ctx.moveTo(baselineLeft, baseY);
    ctx.lineTo(baselineRight, baseY);
    ctx.strokeStyle = 'rgba(215,213,208,' + (0.12 * curveFade).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();

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

    if (!finished) {
      update(dt);
    }

    // Keep incrementing pulse time always
    pulseTime += dt * PULSE_SPEED;

    draw();
    rafId = requestAnimationFrame(frame);
  }

  resize();
  computeTargets();
  initParticles();
  var rafId = requestAnimationFrame(frame);

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      running = entries[0].isIntersecting;
      if (running) lastTime = 0;
    }, { threshold: 0.05 });
    observer.observe(hero);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; }
    else { running = true; lastTime = 0; }
  });
})();
