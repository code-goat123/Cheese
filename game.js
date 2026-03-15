/**
 * Cheese (RippleFroggy) - browser game
 * Plain JS + HTML Canvas, no frameworks.
 * Classes: WaterBackground, LilyPad, Ripple, FloatingText, Game
 */

(function () {
  'use strict';

  // --- Constants ---
  const LILY_RADIUS = 28;
  const LILY_MARGIN = 20;
  const MIN_PAD_DISTANCE = LILY_RADIUS * 2;
  const MAX_PADS = 8;
  const NORMAL_LIFETIME_MIN = 1.2;
  const NORMAL_LIFETIME_MAX = 2.2;
  const GOLDEN_CHANCE = 1 / 8;
  const SPAWN_INTERVAL_MIN = 0.4;
  const SPAWN_INTERVAL_MAX = 1.0;
  const FLOAT_TEXT_DURATION = 0.6;
  const RIPPLE_DURATION_MIN = 0.8;
  const RIPPLE_DURATION_MAX = 1.2;
  const INSTRUCTION_DURATION = 5;

  // --- WaterBackground: procedural water (no images) ---
  function WaterBackground(canvas) {
    this.canvas = canvas;
    this.ctx = null;
    this.time = 0;
  }

  WaterBackground.prototype.init = function () {
    this.ctx = this.canvas.getContext('2d');
  };

  WaterBackground.prototype.draw = function (dt) {
    this.time += dt;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    if (!ctx) return;

    // Base gradient (blue/teal water)
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a4d6e');
    gradient.addColorStop(0.5, '#0d3d56');
    gradient.addColorStop(1, '#0a2d42');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Subtle scrolling sine-based wave pattern (performance-friendly, no per-pixel loops)
    const bandCount = 6;
    const scroll = this.time * 0.15;
    for (let i = 0; i < bandCount; i++) {
      const t = (i / bandCount) + scroll;
      const y = (Math.sin(t * Math.PI * 2) * 0.5 + 0.5) * h;
      const alpha = 0.04 + 0.02 * Math.sin(this.time * 2 + i);
      ctx.fillStyle = `rgba(100, 180, 200, ${alpha})`;
      ctx.fillRect(0, Math.max(0, y - 40), w, 80);
    }

    // Gentle vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.6, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,20,30,0.4)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  };

  // --- LilyPad: circular-ish with notch, normal or golden ---
  function LilyPad(x, y, isGolden, baseLifetime) {
    this.x = x;
    this.y = y;
    this.radius = LILY_RADIUS;
    this.isGolden = isGolden;
    this.lifetime = isGolden ? baseLifetime / 3 : baseLifetime;
    this.maxLifetime = this.lifetime;
    this.dead = false;
    this.scored = false; // true when clicked (scored), false when timed out
  }

  LilyPad.prototype.update = function (dt) {
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.dead = true;
  };

  LilyPad.prototype.draw = function (ctx) {
    if (this.dead) return;
    const r = this.radius;
    const progress = 1 - this.lifetime / this.maxLifetime;

    // Slight scale-in at spawn
    const scale = progress < 0.1 ? progress / 0.1 : 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);

    // Glow for golden
    if (this.isGolden) {
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      ctx.shadowBlur = 14;
    }

    // Circular shape with small notch (path)
    ctx.beginPath();
    const segments = 24;
    const notchAngle = Math.PI * 0.35;
    const notchDepth = r * 0.25;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
      let rad = r;
      if (Math.abs(angle + Math.PI / 2) < notchAngle) {
        rad = r - notchDepth * (1 - Math.abs(angle + Math.PI / 2) / notchAngle);
      }
      const px = Math.cos(angle) * rad;
      const py = Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = this.isGolden ? '#e6c229' : '#2d6a3e';
    ctx.fill();
    ctx.strokeStyle = this.isGolden ? 'rgba(255,235,150,0.9)' : 'rgba(60,120,80,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  };

  LilyPad.prototype.hitTest = function (px, py) {
    if (this.dead) return false;
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  };

  // --- Ripple: expanding rings, fading ---
  function Ripple(x, y) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.duration = RIPPLE_DURATION_MIN + Math.random() * (RIPPLE_DURATION_MAX - RIPPLE_DURATION_MIN);
    this.ringCount = 2 + Math.floor(Math.random() * 3);
    this.maxRadius = 80;
    this.dead = false;
  }

  Ripple.prototype.update = function (dt) {
    this.age += dt;
    if (this.age >= this.duration) this.dead = true;
  };

  Ripple.prototype.draw = function (ctx) {
    if (this.dead) return;
    const t = this.age / this.duration;
    const easeOut = 1 - Math.pow(1 - t, 1.5);

    for (let i = 0; i < this.ringCount; i++) {
      const ringProgress = (t * (this.ringCount + 1) - i * 0.25) / 0.4;
      if (ringProgress < 0 || ringProgress > 1) continue;
      const radius = ringProgress * this.maxRadius;
      const alpha = (1 - ringProgress) * (1 - t) * 0.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200, 230, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // --- FloatingText: "+1" / "+3" rising and fading ---
  function FloatingText(x, y, value) {
    this.x = x;
    this.y = y;
    this.text = '+' + value;
    this.age = 0;
    this.duration = FLOAT_TEXT_DURATION;
    this.dead = false;
  }

  FloatingText.prototype.update = function (dt) {
    this.age += dt;
    if (this.age >= this.duration) this.dead = true;
  };

  FloatingText.prototype.draw = function (ctx) {
    if (this.dead) return;
    const t = this.age / this.duration;
    const y = this.y - t * 35;
    const alpha = 1 - t;
    const fontSize = 22 + (1 - t) * 6;
    ctx.save();
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.6})`;
    ctx.lineWidth = 2;
    ctx.strokeText(this.text, this.x, y);
    ctx.fillText(this.text, this.x, y);
    ctx.restore();
  };

  // --- Game controller ---
  function Game() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.water = new WaterBackground(this.canvas);
    this.lilyPads = [];
    this.ripples = [];
    this.floatingTexts = [];
    this.score = 0;
    this.nextSpawnAt = 0;
    this.gameTime = 0;
    this.lastTime = 0;
    this.instructionShownAt = null;
    this.scoreEl = document.getElementById('score');
    this.instructionEl = document.getElementById('instruction');
    this.lost = false;
  }

  Game.prototype.tryAgain = function () {
    this.lost = false;
    this.score = 0;
    this.lilyPads = [];
    this.ripples = [];
    this.floatingTexts = [];
    this.gameTime = 0;
    this.nextSpawnAt = 0.5 + Math.random() * 0.5;
    this.instructionShownAt = 0;
    if (this.scoreEl) this.scoreEl.textContent = 'Score: 0';
    if (this.instructionEl) this.instructionEl.classList.remove('hidden');
  }

  Game.prototype.init = function () {
    this.water.init();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.nextSpawnAt = 0.5 + Math.random() * 0.5;
    this.instructionShownAt = 0;
    this.loop(0);
  };

  Game.prototype.resize = function () {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  };

  Game.prototype.getPlayBounds = function () {
    const margin = LILY_RADIUS + LILY_MARGIN;
    return {
      xMin: margin,
      yMin: margin,
      xMax: this.canvas.width - margin,
      yMax: this.canvas.height - margin
    };
  };

  Game.prototype.trySpawnLilyPad = function () {
    if (this.lilyPads.length >= MAX_PADS) return;
    const bounds = this.getPlayBounds();
    const width = bounds.xMax - bounds.xMin;
    const height = bounds.yMax - bounds.yMin;
    if (width <= 0 || height <= 0) return;

    let x, y;
    let attempts = 0;
    const maxAttempts = 30;
    do {
      x = bounds.xMin + Math.random() * width;
      y = bounds.yMin + Math.random() * height;
      let ok = true;
      for (let i = 0; i < this.lilyPads.length; i++) {
        const p = this.lilyPads[i];
        if (p.dead) continue;
        const dx = x - p.x;
        const dy = y - p.y;
        if (dx * dx + dy * dy < MIN_PAD_DISTANCE * MIN_PAD_DISTANCE) {
          ok = false;
          break;
        }
      }
      if (ok) break;
      attempts++;
    } while (attempts < maxAttempts);
    if (attempts >= maxAttempts) return;

    const isGolden = Math.random() < GOLDEN_CHANCE;
    const baseLifetime = NORMAL_LIFETIME_MIN + Math.random() * (NORMAL_LIFETIME_MAX - NORMAL_LIFETIME_MIN);
    this.lilyPads.push(new LilyPad(x, y, isGolden, baseLifetime));
  };

  Game.prototype.scheduleNextSpawn = function () {
    const interval = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
    this.nextSpawnAt = this.gameTime + interval;
  };

  Game.prototype.onPointerDown = function (e) {
    if (this.lost) {
      this.tryAgain();
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    for (let i = 0; i < this.lilyPads.length; i++) {
      const pad = this.lilyPads[i];
      if (pad.dead) continue;
      if (pad.hitTest(px, py)) {
        pad.dead = true;
        pad.scored = true;
        const points = pad.isGolden ? 3 : 1;
        this.score += points;
        this.scoreEl.textContent = 'Score: ' + this.score;
        this.ripples.push(new Ripple(pad.x, pad.y));
        this.floatingTexts.push(new FloatingText(pad.x, pad.y, points));
        return;
      }
    }
  };

  Game.prototype.update = function (dt) {
    this.gameTime += dt;

    if (!this.lost && this.gameTime >= this.nextSpawnAt) {
      this.trySpawnLilyPad();
      this.scheduleNextSpawn();
    }

    this.lilyPads.forEach(function (p) { p.update(dt); });
    this.ripples.forEach(function (r) { r.update(dt); });
    this.floatingTexts.forEach(function (f) { f.update(dt); });

    // Check for lose: any pad died without being clicked
    if (!this.lost) {
      for (let i = 0; i < this.lilyPads.length; i++) {
        if (this.lilyPads[i].dead && !this.lilyPads[i].scored) {
          this.lost = true;
          break;
        }
      }
    }

    this.lilyPads = this.lilyPads.filter(function (p) { return !p.dead; });
    this.ripples = this.ripples.filter(function (r) { return !r.dead; });
    this.floatingTexts = this.floatingTexts.filter(function (f) { return !f.dead; });

    if (this.instructionEl && this.instructionShownAt != null) {
      if (this.gameTime - this.instructionShownAt > INSTRUCTION_DURATION) {
        this.instructionEl.classList.add('hidden');
      }
    }
  };

  Game.prototype.draw = function (dt) {
    this.water.draw(dt);

    this.lilyPads.forEach(function (p) { p.draw(this.ctx); }, this);
    this.ripples.forEach(function (r) { r.draw(this.ctx); }, this);
    this.floatingTexts.forEach(function (f) { f.draw(this.ctx); }, this);

    if (this.lost) this.drawLostOverlay();
  };

  Game.prototype.drawLostOverlay = function () {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.fillText('You lost!', w / 2, h / 2 - 28);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Click to try again', w / 2, h / 2 + 20);
    ctx.restore();
  };

  Game.prototype.loop = function (now) {
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.1) : 1 / 60;
    this.lastTime = now;
    this.update(dt);
    this.draw(dt);
    requestAnimationFrame((t) => this.loop(t));
  };

  // --- Start ---
  const game = new Game();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => game.init());
  } else {
    game.init();
  }
})();
