/* ============================================
   Bell Curve Particle Animation — Hero Background
   Galton board-inspired: particles drift randomly,
   stack into histogram columns, with a smooth
   Gaussian curve overlay.
   ============================================ */
(function () {
  'use strict';

  const hero = document.querySelector('.hero');
  if (!hero) return;

  // --- Canvas setup ---
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;';
  hero.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W, H, dpr;

  function resize() {
    const rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Rebuild sprites on resize (dpr may change)
    buildSprites();
  }

  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });

  // --- Config ---
  const COLORS = ['#D4785A', '#E8A87C', '#C46849', '#F0C9A8'];
  const COLOR_WEIGHTS = [0.4, 0.25, 0.25, 0.1];
  const isMobile = window.innerWidth < 768;
  const POOL_SIZE = isMobile ? 900 : 1800;
  const BASE_SPAWN_RATE = isMobile ? 3.5 : 7.0;
  const DRIFT_STRENGTH = 0.15;
  const FRICTION = 0.99;
  const MAX_ALPHA = 0.28;
  const FADE_RATE = 0.0005;
  const BIN_COUNT = 80;
  const PARTICLE_R = 0.75; // particle radius for stacking — tight packing

  // Gaussian curve config
  const CURVE_HEIGHT = 0.28;  // peak height as fraction of canvas
  const CURVE_SIGMA = 0.16;   // std dev as fraction of canvas width
  const CURVE_FLOOR = 0.88;   // y position of curve baseline (fraction from top)

  // --- Weighted color picker ---
  function pickColor() {
    let r = Math.random(), cum = 0;
    for (let i = 0; i < COLORS.length; i++) {
      cum += COLOR_WEIGHTS[i];
      if (r < cum) return COLORS[i];
    }
    return COLORS[0];
  }

  // --- Pre-render ball sprite (solid circle with 3D highlight) ---
  const SPRITE_SIZE = 2;
  var sprites = [];
  function buildSprites() {
    sprites = COLORS.map(function (color) {
      const r = Math.round(SPRITE_SIZE * dpr);
      const s = r * 2 + 2; // canvas size with 1px padding
      const off = document.createElement('canvas');
      off.width = s;
      off.height = s;
      const c = off.getContext('2d');
      const cx = s / 2, cy = s / 2;

      // Parse color to RGB for darkening
      var hex = color.replace('#', '');
      var cr = parseInt(hex.substring(0, 2), 16);
      var cg = parseInt(hex.substring(2, 4), 16);
      var cb = parseInt(hex.substring(4, 6), 16);

      // Base circle with radial gradient: highlight top-left, darken at edge
      var grad = c.createRadialGradient(
        cx - r * 0.25, cy - r * 0.25, r * 0.1,  // highlight offset
        cx, cy, r
      );
      // Bright highlight
      var light = 'rgba(' + Math.min(255, cr + 60) + ',' + Math.min(255, cg + 50) + ',' + Math.min(255, cb + 40) + ',1)';
      // Base color
      var base = 'rgba(' + cr + ',' + cg + ',' + cb + ',1)';
      // Dark edge
      var dark = 'rgba(' + Math.round(cr * 0.6) + ',' + Math.round(cg * 0.6) + ',' + Math.round(cb * 0.6) + ',1)';

      grad.addColorStop(0, light);
      grad.addColorStop(0.5, base);
      grad.addColorStop(1, dark);

      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fillStyle = grad;
      c.fill();

      return off;
    });
  }

  function spriteFor(color) {
    const idx = COLORS.indexOf(color);
    return sprites[idx >= 0 ? idx : 0];
  }

  // --- Gaussian function ---
  function gaussian(x, mu, sigma) {
    var d = (x - mu) / sigma;
    return Math.exp(-0.5 * d * d);
  }

  // Returns the y-coordinate of the bell curve at horizontal position x
  function curveY(x, breathWidth) {
    var sigma = CURVE_SIGMA * W * breathWidth;
    var peak = CURVE_HEIGHT * H;
    var baseY = CURVE_FLOOR * H;
    var g = gaussian(x, W / 2, sigma);
    return baseY - g * peak;
  }

  // --- Particle pool ---
  var pool = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push({
      phase: 'dead', x: 0, y: 0, vx: 0, vy: 0,
      alpha: 0, color: '', sprite: null, size: 0,
      stackY: 0 // target y when stacking
    });
  }

  // --- Per-bin stack heights (tracks how many particles stacked per column) ---
  var binStacks = new Float64Array(BIN_COUNT);

  function spawnParticle(p) {
    p.phase = 'falling';
    p.x = W / 2 + (Math.random() - 0.5) * W * 0.05;
    p.y = -3;
    p.vx = 0;
    p.vy = 0.12 + Math.random() * 0.18; // slow mist drift
    p.alpha = MAX_ALPHA * (0.4 + Math.random() * 0.6);
    p.color = pickColor();
    p.sprite = spriteFor(p.color);
    p.size = SPRITE_SIZE * (0.6 + Math.random() * 0.8); // tiny dots
    p.stackY = 0;
  }

  // --- Breathing oscillators (incommensurate) ---
  const breathSpeeds = [0.0003, 0.00023, 0.000187];
  let breathTime = 0;

  function breathWidth() {
    return 1 + 0.12 * Math.sin(breathTime * breathSpeeds[0] * Math.PI * 2);
  }
  function breathSpawn() {
    return 1 + 0.10 * Math.sin(breathTime * breathSpeeds[1] * Math.PI * 2);
  }
  function breathGlow() {
    return 1 + 0.08 * Math.sin(breathTime * breathSpeeds[2] * Math.PI * 2);
  }

  // --- Animation state ---
  let spawnAccum = 0;
  let totalSpawned = 0;
  let lastTime = 0;
  let running = true;
  let finished = false;

  function update(dt) {
    breathTime += dt;

    const bw = breathWidth();
    const currentSpawn = BASE_SPAWN_RATE * breathSpawn();
    const currentDrift = DRIFT_STRENGTH * bw;
    const dtFactor = dt / 16.667;

    // Spawn — stop once the entire pool has been emitted
    if (totalSpawned < POOL_SIZE) {
      spawnAccum += currentSpawn * dtFactor;
      while (spawnAccum >= 1 && totalSpawned < POOL_SIZE) {
        spawnAccum -= 1;
        spawnParticle(pool[totalSpawned]);
        totalSpawned++;
      }
    }

    var baseY = CURVE_FLOOR * H;
    var anyFalling = false;

    // Update particles
    for (let i = 0; i < POOL_SIZE; i++) {
      var p = pool[i];
      if (p.phase === 'dead' || p.phase === 'settled') continue;

      if (p.phase === 'falling') {
        anyFalling = true;
        // Random walk (Galton board)
        p.vx += (Math.random() - 0.5) * 2 * currentDrift * dtFactor;
        p.vx *= FRICTION;
        p.vy += 0.008 * dtFactor; // very gentle gravity
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;

        // Stack inside the curve: particles land at baseline and pile upward
        var bin = Math.floor(((p.x / W) - 0.5 / BIN_COUNT) * BIN_COUNT);
        bin = Math.max(0, Math.min(BIN_COUNT - 1, bin));
        var stackOffset = binStacks[bin] * PARTICLE_R * 1.8;
        // Land at baseline, stack upward, but don't go above the curve line
        var cy = curveY(p.x, bw);
        var landingY = baseY - stackOffset;
        if (landingY < cy) landingY = cy; // clamp: don't overflow above curve

        if (p.y >= landingY) {
          p.phase = 'settled';
          p.y = landingY;
          p.vx = 0;
          p.vy = 0;
          binStacks[bin] += 1;
        }
      }

      // Kill particles that drift offscreen
      if (p.x < -50 || p.x > W + 50 || p.y > H + 20) {
        p.phase = 'dead';
      }
    }

    // All spawned and none still falling — animation is done
    if (totalSpawned >= POOL_SIZE && !anyFalling) {
      finished = true;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    var bw = breathWidth();
    var bg = breathGlow();
    var baseY = CURVE_FLOOR * H;
    var sigma = CURVE_SIGMA * W * bw;
    var peak = CURVE_HEIGHT * H;

    // --- Draw filled bell curve area ---
    var steps = 120;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let i = 0; i <= steps; i++) {
      var x = (i / steps) * W;
      var g = gaussian(x, W / 2, sigma);
      var y = baseY - g * peak;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(W, baseY);
    ctx.closePath();

    // Gradient fill
    var fillGrad = ctx.createLinearGradient(0, baseY - peak, 0, baseY);
    var fillAlpha = 0.07 * bg;
    fillGrad.addColorStop(0, 'rgba(212,120,90,' + (fillAlpha * 1.2).toFixed(3) + ')');
    fillGrad.addColorStop(0.5, 'rgba(212,120,90,' + fillAlpha.toFixed(3) + ')');
    fillGrad.addColorStop(1, 'rgba(212,120,90,' + (fillAlpha * 0.4).toFixed(3) + ')');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // --- Draw bell curve stroke (the classic line) ---
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      var x = (i / steps) * W;
      var g = gaussian(x, W / 2, sigma);
      var y = baseY - g * peak;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(212,120,90,' + (0.18 * bg).toFixed(3) + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Draw baseline ---
    ctx.beginPath();
    ctx.moveTo(W * 0.08, baseY);
    ctx.lineTo(W * 0.92, baseY);
    ctx.strokeStyle = 'rgba(212,120,90,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Draw std deviation markers ---
    for (let s = -2; s <= 2; s++) {
      if (s === 0) continue;
      var mx = W / 2 + s * sigma;
      if (mx < 0 || mx > W) continue;
      ctx.beginPath();
      ctx.moveTo(mx, baseY);
      ctx.lineTo(mx, baseY + 4);
      ctx.strokeStyle = 'rgba(212,120,90,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // --- Draw a subtle vertical center line (mean) ---
    ctx.beginPath();
    ctx.moveTo(W / 2, baseY - peak - 8);
    ctx.lineTo(W / 2, baseY + 4);
    ctx.strokeStyle = 'rgba(212,120,90,0.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- Draw particles (solid balls) ---
    for (let i = 0; i < POOL_SIZE; i++) {
      var p = pool[i];
      if (p.phase === 'dead' || p.alpha <= 0) continue;
      ctx.globalAlpha = p.alpha;
      var d = p.size * 2; // diameter in CSS px
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

    // Cap delta to avoid spiral after tab switch
    if (dt > 100) dt = 16.667;

    update(dt);
    draw();

    // Stop the loop once all particles have settled
    if (finished) return;

    rafId = requestAnimationFrame(frame);
  }

  resize();
  var rafId = requestAnimationFrame(frame);

  // --- Pause when hero scrolls out of view (only while animating) ---
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (finished) return;
      running = entries[0].isIntersecting;
      if (running) lastTime = 0;
    }, { threshold: 0.05 });
    observer.observe(hero);
  }

  // --- Pause when tab is hidden ---
  document.addEventListener('visibilitychange', function () {
    if (finished) return;
    if (document.hidden) {
      running = false;
    } else {
      running = true;
      lastTime = 0;
    }
  });
})();
