const hero = document.querySelector(".hero");
const canvas = document.querySelector(".trail-canvas");
const cursor = document.querySelector(".cursor-arrow");
const ctx = canvas.getContext("2d");

/* ── image sources ── */
const imageSources = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=720&h=720&q=90",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=720&h=720&q=90",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=720&h=720&q=90",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=720&h=720&q=90",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=720&h=720&q=90",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=720&h=720&q=90",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=720&h=720&q=90",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=720&h=720&q=90",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=720&h=720&q=90",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=720&h=720&q=90",
];

/* ── preload images into Image objects ── */
const loadedImages = [];
let imagesReady = 0;

imageSources.forEach((src, i) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    loadedImages[i] = img;
    imagesReady++;
  };
  img.onerror = () => {
    /* fallback */
    const fallback = new Image();
    fallback.crossOrigin = "anonymous";
    fallback.src = `https://picsum.photos/seed/trail-${i}/720/720`;
    fallback.onload = () => {
      loadedImages[i] = fallback;
      imagesReady++;
    };
  };
  img.src = src;
});

/* ── config ── */
let SLICES = 60;
const CORNER_TAPER = 2; // how many slices from edges get tapered width
const MAX_IMAGES = 150;
const SPACING = 60; // min px distance between emits

/* ── controls state ── */
let sizeMultiplier = 1.25;
let speedMultiplier = 1.7;
let selectedRatio = 1.777;
let animStyle = 'left-right';
let displayDuration = 0.4;
let layerOrigin = 'start';

const sizeSlider = document.getElementById("size-slider");
const speedSlider = document.getElementById("speed-slider");
const slicesSlider = document.getElementById("slices-slider");
const durationSlider = document.getElementById("duration-slider");
const ratioButtons = document.querySelectorAll(".ratio-btn");
const styleButtons = document.querySelectorAll(".style-btn");
const originButtons = document.querySelectorAll(".origin-btn");
const resetBtn = document.getElementById("reset-btn");

if (sizeSlider) {
  sizeSlider.addEventListener("input", (e) => {
    sizeMultiplier = parseFloat(e.target.value);
  });
}
if (speedSlider) {
  speedSlider.addEventListener("input", (e) => {
    speedMultiplier = parseFloat(e.target.value);
  });
}
if (slicesSlider) {
  slicesSlider.addEventListener("input", (e) => {
    SLICES = parseInt(e.target.value, 10);
  });
}
if (durationSlider) {
  durationSlider.addEventListener("input", (e) => {
    displayDuration = parseFloat(e.target.value);
  });
}
if (ratioButtons) {
  ratioButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      ratioButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedRatio = parseFloat(btn.dataset.ratio);
    });
  });
}
if (styleButtons) {
  styleButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      styleButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      animStyle = btn.dataset.style;
    });
  });
}
if (originButtons) {
  originButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      originButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      layerOrigin = btn.dataset.origin;
    });
  });
}
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    sizeMultiplier = 1.25;
    speedMultiplier = 1.7;
    SLICES = 60;
    selectedRatio = 1.777;
    animStyle = 'left-right';
    displayDuration = 0.4;
    layerOrigin = 'start';

    if (sizeSlider) sizeSlider.value = 1.25;
    if (speedSlider) speedSlider.value = 1.7;
    if (slicesSlider) slicesSlider.value = 60;
    if (durationSlider) durationSlider.value = 0.4;
    
    if (ratioButtons) {
      ratioButtons.forEach(b => {
        if (parseFloat(b.dataset.ratio) === 1.777) b.classList.add("active");
        else b.classList.remove("active");
      });
    }

    if (styleButtons) {
      styleButtons.forEach(b => {
        if (b.dataset.style === 'left-right') b.classList.add("active");
        else b.classList.remove("active");
      });
    }

    if (originButtons) {
      originButtons.forEach(b => {
        if (b.dataset.origin === 'start') b.classList.add("active");
        else b.classList.remove("active");
      });
    }
  });
}

/* ── state ── */
let imageIndex = 0;
let dpi = window.devicePixelRatio || 1;
let renderW = window.innerWidth;
let renderH = window.innerHeight;

const mouse = { x: -1, y: -1, sx: -1, sy: -1, lx: -1, ly: -1, vx: 0, vy: 0, svx: 0, svy: 0 };
const lastEmit = { x: 0, y: 0, time: 0 };
const trailImages = []; // active trail image objects

let cursorTarget = { x: -100, y: -100 };
let cursorCurrent = { x: -100, y: -100 };
let cursorVisible = false;

/* ── canvas sizing ── */
function setCanvasSize() {
  dpi = window.devicePixelRatio || 1;
  renderW = window.innerWidth;
  renderH = window.innerHeight;
  canvas.width = renderW * dpi;
  canvas.height = renderH * dpi;
  canvas.style.width = renderW + "px";
  canvas.style.height = renderH + "px";
}
setCanvasSize();
window.addEventListener("resize", setCanvasSize);

/* ── image size based on viewport ── */
function getImageSize() {
  const isSmall = window.innerWidth < 560;
  let baseSize = 110;
  if (!isSmall) {
    baseSize = Math.min(Math.max(window.innerWidth * 0.11, 130), 180);
  }
  return baseSize * sizeMultiplier;
}

/* ── Trail Image class (canvas-drawn, slice-animated) ── */
class TrailImage {
  constructor(src, x, y, vx, vy, size, ratio, style, origin) {
    this.src = src;
    this.slices = SLICES;
    this.corner = CORNER_TAPER;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.opacity = 1;
    this.brightness = 1;
    this.size = size;
    this.aspectRatio = ratio || 1.1;
    this.style = style || 'center-h';
    this.origin = origin || 'center';
    this.isLoaded = false;
    this.isDead = false;
    this.image = null;
    this.clipPaths = [];
    this.clipPathSliceStep = 0;
    this.isVertical = false;

    this.loadImage();
  }

  loadImage() {
    /* check if we already have this image preloaded */
    const idx = imageSources.indexOf(this.src);
    if (idx >= 0 && loadedImages[idx]) {
      this.image = loadedImages[idx];
      this.init();
    } else {
      this.image = new window.Image();
      this.image.crossOrigin = "anonymous";
      this.image.onload = () => this.init();
      this.image.src = this.src;
    }
  }

  init() {
    this.setSizes();
    this.setClipPaths();
    this.animate();
    this.isLoaded = true;
  }

  setSizes() {
    let sw = this.image.naturalWidth || this.image.width;
    let sh = sw / this.aspectRatio;
    if (sh > (this.image.naturalHeight || this.image.height)) {
      sh = this.image.naturalHeight || this.image.height;
      sw = sh * this.aspectRatio;
    }
    const sx = ((this.image.naturalWidth || this.image.width) - sw) / 2;
    const sy = ((this.image.naturalHeight || this.image.height) - sh) / 2;

    this.sourceRect = { x: sx + 2, y: sy + 2, w: sw - 4, h: sh - 4 };

    this.width = this.size;
    this.hWidth = this.width / 2;
    this.height = this.width / this.aspectRatio;
    this.hHeight = this.height / 2;

    this.destRect = {
      x: this.x - this.hWidth,
      y: this.y - this.hHeight,
      w: this.width,
      h: this.height,
    };
  }

  setClipPaths() {
    const { corner, slices, style } = this;
    this.clipPaths = [];
    
    this.isVertical = style === 'left-right' || style === 'right-left' || style === 'center-v';

    if (this.isVertical) {
      this.clipPathSliceStep = this.destRect.w / slices;
    } else {
      this.clipPathSliceStep = this.destRect.h / slices;
    }

    for (let i = 0; i < slices; i++) {
      /* taper: slices near edges are narrower, giving a "tapered card" look */
      const taper = Math.max(i < slices / 2 ? corner - i : i - (slices - corner - 1), 0);
      const taperAmount = this.clipPathSliceStep * taper;

      if (this.isVertical) {
        this.clipPaths.push({
          pos: this.clipPathSliceStep * i,
          size: 0,
          targetSize: this.destRect.h - taperAmount,
          taper: taperAmount,
        });
      } else {
        this.clipPaths.push({
          pos: this.clipPathSliceStep * i,
          size: 0,
          targetSize: this.destRect.w - taperAmount,
          taper: taperAmount,
        });
      }
    }
  }

  animate() {
    /* Match reference: slices expand in with power3.inOut, stagger from center */
    const mid = Math.round(this.slices / 2);
    const inDuration = 800 / speedMultiplier; // 0.8s per slice
    const inStaggerTotal = 400 / speedMultiplier; // 0.4s total stagger spread
    const now = performance.now();

    this.clipPaths.forEach((cp, i) => {
      let delay = 0;
      if (this.style === 'center-h' || this.style === 'center-v') {
        const distFromMid = Math.abs(i - mid);
        const normalizedDist = mid > 0 ? distFromMid / mid : 0;
        delay = normalizedDist * inStaggerTotal;
      } else if (this.style === 'top-bottom' || this.style === 'left-right') {
        delay = (i / this.slices) * inStaggerTotal;
      } else if (this.style === 'bottom-top' || this.style === 'right-left') {
        delay = ((this.slices - 1 - i) / this.slices) * inStaggerTotal;
      }

      cp._animStart = now + delay;
      cp._animDur = inDuration;
      cp._startSize = 0;
      cp._targetSize = cp.targetSize;
      cp._phase = "in";
    });

    /* Timeline: in -> hold -> out -> destroy
     * 0ms:    slices start expanding in (staggered, each 800ms)
     * ~1200ms: all slices fully expanded (800ms + 400ms stagger)
     * 1200ms + hold: start collapse out (staggered, each 800ms)
     * ~1600ms + hold: brightness starts fading
     * ~2400ms + hold: fully collapsed, destroy
     */
    const holdMs = displayDuration * 1000;
    this._collapseStart = now + 1200 / speedMultiplier + holdMs;
    this._collapseDur = 800 / speedMultiplier;
    this._fadeStart = now + 800 / speedMultiplier + holdMs;
    this._destroyTime = now + 2400 / speedMultiplier + holdMs;
  }

  move() {
    if (!this.isLoaded) return;

    /* drift: velocity decays */
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;

    this.destRect.x = this.x - this.hWidth;
    this.destRect.y = this.y - this.hHeight;
  }

  updateAnimation(now) {
    /* power3 style easing functions */
    const easeInOut = (t) => {
      if (t < 0.5) return 4 * t * t * t;
      return 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    /* Update slice widths: phase "in" */
    this.clipPaths.forEach((cp) => {
      if (cp._phase === "in") {
        const elapsed = now - cp._animStart;
        if (elapsed < 0) {
          cp.size = 0;
          return;
        }
        const t = Math.min(elapsed / cp._animDur, 1);
        const ease = easeInOut(t);
        cp.size = cp._targetSize * ease;

        if (t >= 1) cp._phase = "hold";
      }
    });

    /* Brightness fade (dim to ~0.25) */
    if (now > this._fadeStart) {
      const fadeProgress = Math.min((now - this._fadeStart) / (this._destroyTime - this._fadeStart), 1);
      this.brightness = 1 - 0.75 * fadeProgress;
    }

    /* Phase 2: collapse out */
    if (now > this._collapseStart) {
      this.clipPaths.forEach((cp) => {
        if (cp._phase !== "out") {
          cp._phase = "out";
          cp._outStart = now;
          cp._outStartSize = cp.size;
        }
        const elapsed = now - cp._outStart;
        const t = Math.min(elapsed / this._collapseDur, 1);
        const ease = easeInOut(t);
        cp.size = cp._outStartSize * (1 - ease);
      });
    }

    /* Destroy */
    if (now > this._destroyTime) {
      this.isDead = true;
    }
  }

  draw() {
    if (!this.isLoaded || this.isDead) return;

    const dest = this.destRect;
    const src = this.sourceRect;

    ctx.save();

    /* Build clip region from slices */
    ctx.beginPath();
    this.clipPaths.forEach((cp) => {
      if (this.isVertical) {
        const sliceX = dest.x + cp.pos;
        let sliceY;
        if (this.origin === 'start') {
          sliceY = dest.y + cp.taper / 2;
        } else if (this.origin === 'end') {
          sliceY = dest.y + dest.h - cp.size - cp.taper / 2;
        } else {
          sliceY = dest.y + (dest.h - cp.size) / 2;
        }
        const sliceW = this.clipPathSliceStep;
        const sliceH = cp.size;
        if (sliceH > 0) ctx.rect(sliceX, sliceY, sliceW, sliceH);
      } else {
        let sliceX;
        if (this.origin === 'start') {
          sliceX = dest.x + cp.taper / 2;
        } else if (this.origin === 'end') {
          sliceX = dest.x + dest.w - cp.size - cp.taper / 2;
        } else {
          sliceX = dest.x + (dest.w - cp.size) / 2;
        }
        const sliceY = dest.y + cp.pos;
        const sliceW = cp.size;
        const sliceH = this.clipPathSliceStep;
        if (sliceW > 0) ctx.rect(sliceX, sliceY, sliceW, sliceH);
      }
    });
    ctx.closePath();
    ctx.clip();

    /* Apply brightness via filter */
    ctx.filter = `brightness(${this.brightness})`;
    ctx.globalAlpha = this.opacity;

    /* Draw image — no rotation, always upright */
    ctx.drawImage(
      this.image,
      src.x, src.y, src.w, src.h,
      dest.x, dest.y, dest.w, dest.h
    );

    ctx.restore();
  }
}

/* ── emit a new trail image ── */
function emitImage() {
  if (trailImages.length >= MAX_IMAGES) {
    trailImages.shift();
  }
  if (mouse.x === -1 && mouse.y === -1) return;

  const ex = mouse.sx;
  const ey = mouse.sy;

  let shouldEmit = false;

  if (lastEmit.x === 0 && lastEmit.y === 0) {
    shouldEmit = true;
  } else {
    const dx = ex - lastEmit.x;
    const dy = ey - lastEmit.y;
    if (Math.hypot(dx, dy) > SPACING) {
      shouldEmit = true;
    }
  }

  if (shouldEmit) {
    const src = imageSources[imageIndex % imageSources.length];
    imageIndex++;
    const size = getImageSize();
    const trail = new TrailImage(src, ex, ey, mouse.svx, mouse.svy, size, selectedRatio, animStyle, layerOrigin);
    trailImages.push(trail);
    lastEmit.x = ex;
    lastEmit.y = ey;
    lastEmit.time = performance.now();
  }
}

/* ── main render loop ── */
function tick() {
  const now = performance.now();

  /* Smooth mouse */
  mouse.sx += 0.5 * (mouse.x - mouse.sx);
  mouse.sy += 0.5 * (mouse.y - mouse.sy);

  /* Clear canvas */
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpi, dpi);

  /* Update & draw trail images */
  for (let i = trailImages.length - 1; i >= 0; i--) {
    const trail = trailImages[i];
    trail.move();
    trail.updateAnimation(now);
    if (trail.isDead) {
      trailImages.splice(i, 1);
      continue;
    }
  }

  /* Draw in order (oldest first, newest on top) */
  trailImages.forEach((trail) => trail.draw());

  /* Emit new images */
  emitImage();

  ctx.restore();

  /* Update custom cursor */
  cursorCurrent.x += (cursorTarget.x - cursorCurrent.x) * 0.32;
  cursorCurrent.y += (cursorTarget.y - cursorCurrent.y) * 0.32;
  cursor.style.transform = `translate3d(${cursorCurrent.x}px, ${cursorCurrent.y}px, 0)`;

  requestAnimationFrame(tick);
}

/* ── pointer events ── */
function handlePointerMove(event) {
  if (event.target.closest('.control-panel')) {
    hideCursor();
    return;
  }

  const x = event.clientX;
  const y = event.clientY;

  cursorTarget = { x: x - 4, y: y - 2 };

  if (!cursorVisible) {
    cursor.classList.add("is-visible");
    cursorVisible = true;
  }

  /* velocity */
  if (mouse.x !== -1) {
    mouse.vx = Math.max(Math.min(x - mouse.lx, 10), -10);
    mouse.vy = Math.max(Math.min(y - mouse.ly, 10), -10);
    mouse.svx += 0.1 * (mouse.vx - mouse.svx);
    mouse.svy += 0.1 * (mouse.vy - mouse.svy);
  }

  mouse.x = x;
  mouse.y = y;
  mouse.lx = x;
  mouse.ly = y;

  if (mouse.sx === -1) {
    mouse.sx = x;
    mouse.sy = y;
  }
}

function hideCursor() {
  cursor.classList.remove("is-visible");
  cursorVisible = false;
  mouse.x = -1;
  mouse.y = -1;
}

hero.addEventListener("pointermove", handlePointerMove, { passive: true });
hero.addEventListener("pointerleave", hideCursor);
window.addEventListener("blur", hideCursor);

requestAnimationFrame(tick);
