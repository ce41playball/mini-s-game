import {FLAVOR_MAP} from './flavors';
import {
  ActiveCake,
  CakeFlavorConfig,
  DebrisPiece,
  FloatingCallout,
  Particle,
  StackedLayer,
} from './types';

export const WORLD_WIDTH = 420;
export const WORLD_HEIGHT = 720;
export const GROUND_Y = 636;
export const STAND_WIDTH = 212;
export const INITIAL_CAKE_WIDTH = 172;
export const CAKE_HEIGHT = 38;
export const PENDULUM_PIVOT_X = WORLD_WIDTH / 2;
export const PENDULUM_PIVOT_Y = 38;
export const PENDULUM_ARM_LENGTH = 132;
export const PERFECT_TOLERANCE = 7.5;

const INK_COLOR = '#3E2A22';

function lerpColor(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const rA = (a >> 16) & 255;
  const gA = (a >> 8) & 255;
  const bA = a & 255;
  const rB = (b >> 16) & 255;
  const gB = (b >> 8) & 255;
  const bB = b & 255;
  const r = Math.round(rA + (rB - rA) * clamped);
  const g = Math.round(gA + (gB - gA) * clamped);
  const bl = Math.round(bA + (bB - bA) * clamped);
  return `rgb(${r}, ${g}, ${bl})`;
}

export interface RenderSceneInput {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  cameraY: number;
  layerCount: number;
  timeSec: number;
  pendulumAngle: number;
  shakeOffset: {x: number; y: number};
  stacked: StackedLayer[];
  activeCake: ActiveCake | null;
  debris: DebrisPiece[];
  particles: Particle[];
  callouts: FloatingCallout[];
  showGuideLine: boolean;
}

export function renderPatisserieScene(input: RenderSceneInput): void {
  const {
    ctx,
    canvasWidth,
    canvasHeight,
    cameraY,
    layerCount,
    timeSec,
    pendulumAngle,
    shakeOffset,
    stacked,
    activeCake,
    debris,
    particles,
    callouts,
    showGuideLine,
  } = input;

  const scale = canvasHeight / WORLD_HEIGHT;
  const logicalSpanW = canvasWidth / scale;
  const worldOffsetX = (logicalSpanW - WORLD_WIDTH) / 2;

  ctx.save();
  ctx.scale(scale, scale);

  // 1. Background sky & patisserie wallpaper atmosphere (shifts gently with height)
  drawBackdrop(ctx, logicalSpanW, WORLD_HEIGHT, cameraY, layerCount, timeSec);

  ctx.save();
  ctx.translate(worldOffsetX + shakeOffset.x, shakeOffset.y);

  // 2. World objects shifted by vertical camera pan
  ctx.save();
  ctx.translate(0, cameraY);

  // Patisserie counter & marble brass cake stand
  drawCounterAndStand(ctx, logicalSpanW, worldOffsetX);

  // Optional subtle alignment guide on Layer 1 only
  if (showGuideLine && activeCake && activeCake.state === 'SWINGING') {
    ctx.save();
    ctx.strokeStyle = 'rgba(198, 139, 60, 0.34)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.moveTo(activeCake.x, activeCake.y + activeCake.height - cameraY);
    ctx.lineTo(activeCake.x, GROUND_Y);
    ctx.stroke();
    ctx.restore();
  }

  // Stacked cake layers (bottom to top)
  for (let i = 0; i < stacked.length; i++) {
    const layer = stacked[i];
    // Cull layers scrolled well below viewport
    if (layer.y + cameraY > WORLD_HEIGHT + 90) continue;
    drawCakeLayer(ctx, {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      flavor: FLAVOR_MAP[layer.flavorId],
      decorSeed: layer.decorSeed,
      squash: layer.squash,
      isPerfectGlow: layer.isPerfect,
    });
  }

  // Trimmed debris tumbling down
  for (let i = 0; i < debris.length; i++) {
    const piece = debris[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, piece.alpha);
    ctx.translate(piece.x, piece.y + piece.height / 2);
    ctx.rotate(piece.rotation);
    drawCakeLayer(ctx, {
      x: 0,
      y: -piece.height / 2,
      width: piece.width,
      height: piece.height,
      flavor: FLAVOR_MAP[piece.flavorId],
      decorSeed: 1,
      squash: 0,
      isPerfectGlow: false,
      isDebris: true,
    });
    ctx.restore();
  }

  // Falling or tumbling-over active cake (lives in world Y space once dropped)
  if (activeCake && activeCake.state !== 'SWINGING') {
    ctx.save();
    ctx.translate(activeCake.x, activeCake.y + activeCake.height / 2);
    ctx.rotate(activeCake.angle);
    drawCakeLayer(ctx, {
      x: 0,
      y: -activeCake.height / 2,
      width: activeCake.width,
      height: activeCake.height,
      flavor: FLAVOR_MAP[activeCake.flavorId],
      decorSeed: activeCake.decorSeed,
      squash: 0,
      isPerfectGlow: false,
    });
    ctx.restore();
  }

  // Particles (sugar sparkles & pastry crumbs)
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    if (p.kind === 'star') {
      drawSparkleStar(ctx, p.x, p.y, p.size);
    } else if (p.kind === 'crumb') {
      ctx.beginPath();
      ctx.roundRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.8, 1.5);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Floating score / Perfect callouts
  for (let i = 0; i < callouts.length; i++) {
    const c = callouts[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, c.alpha);
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);
    ctx.textAlign = 'center';
    ctx.font = '700 20px "Fraunces", "Noto Sans TC", serif';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#FFFDF9';
    ctx.strokeText(c.text, 0, 0);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, 0, 0);
    if (c.subtext) {
      ctx.font = '600 12px "Plus Jakarta Sans", "Noto Sans TC", sans-serif';
      ctx.strokeText(c.subtext, 0, 17);
      ctx.fillStyle = INK_COLOR;
      ctx.fillText(c.subtext, 0, 17);
    }
    ctx.restore();
  }

  ctx.restore(); // end cameraY transform

  // 3. Screen-pinned Brass Pendulum Clock & Swinging Cake (always anchored near top)
  drawPendulumAssembly(ctx, pendulumAngle, timeSec, activeCake);

  ctx.restore(); // end worldOffsetX
  ctx.restore(); // end scale
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  spanW: number,
  worldH: number,
  cameraY: number,
  layerCount: number,
  timeSec: number
): void {
  const heightProgress = Math.min(1, layerCount / 32);

  let topColor: string;
  let bottomColor: string;
  if (heightProgress < 0.45) {
    const t = heightProgress / 0.45;
    topColor = lerpColor('#FBF6ED', '#F7E7D0', t);
    bottomColor = lerpColor('#F1E6D6', '#EDD6BA', t);
  } else if (heightProgress < 0.8) {
    const t = (heightProgress - 0.45) / 0.35;
    topColor = lerpColor('#F7E7D0', '#EED0CC', t);
    bottomColor = lerpColor('#EDD6BA', '#E7BEB8', t);
  } else {
    const t = (heightProgress - 0.8) / 0.2;
    topColor = lerpColor('#EED0CC', '#39324B', t);
    bottomColor = lerpColor('#E7BEB8', '#6B5268', t);
  }

  const grad = ctx.createLinearGradient(0, 0, 0, worldH);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, spanW, worldH);

  // Subtle vertical patisserie wallpaper stripes with gentle parallax
  const stripeAlpha = heightProgress > 0.8 ? 0.05 : 0.28;
  ctx.fillStyle = `rgba(255, 252, 246, ${stripeAlpha})`;
  for (let sx = 0; sx < spanW; sx += 36) {
    ctx.fillRect(sx, 0, 16, worldH);
  }

  // Arched Parisian patisserie windows on parallax layer
  const windowY = 170 + cameraY * 0.25;
  if (windowY < worldH + 220) {
    const centerX = spanW / 2;
    const archW = 240;
    const archH = 260;

    ctx.save();
    ctx.fillStyle =
      heightProgress > 0.78 ? 'rgba(255, 232, 185, 0.14)' : 'rgba(255, 253, 249, 0.55)';
    ctx.strokeStyle =
      heightProgress > 0.78 ? 'rgba(224, 194, 148, 0.28)' : 'rgba(210, 190, 166, 0.6)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(centerX - archW / 2, windowY + archH);
    ctx.lineTo(centerX - archW / 2, windowY + archW / 2);
    ctx.arc(centerX, windowY + archW / 2, archW / 2, Math.PI, 0, false);
    ctx.lineTo(centerX + archW / 2, windowY + archH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Window panes
    ctx.beginPath();
    ctx.moveTo(centerX, windowY);
    ctx.lineTo(centerX, windowY + archH);
    ctx.moveTo(centerX - archW / 2, windowY + 135);
    ctx.lineTo(centerX + archW / 2, windowY + 135);
    ctx.stroke();
    ctx.restore();
  }

  // Soft twinkling stars when reaching high twilight tiers
  if (heightProgress > 0.72) {
    const starVis = Math.min(1, (heightProgress - 0.72) / 0.25);
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const sx = ((i * 97 + 41) % Math.max(300, Math.floor(spanW - 40))) + 20;
      const sy = ((i * 61 + 23) % 340) + 30;
      const pulse = 0.45 + 0.55 * Math.sin(timeSec * 2.2 + i * 1.4);
      ctx.globalAlpha = starVis * pulse * 0.75;
      ctx.fillStyle = '#FFE9B3';
      drawSparkleStar(ctx, sx, sy, 3 + (i % 3));
    }
    ctx.restore();
  }

  // Warm bakery wainscoting along lower wall
  const wainscotY = GROUND_Y + 26 + cameraY;
  if (wainscotY < worldH + 120) {
    ctx.fillStyle = '#E6D6C2';
    ctx.fillRect(0, wainscotY - 65, spanW, 200);
    ctx.strokeStyle = '#C9B296';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, wainscotY - 65);
    ctx.lineTo(spanW, wainscotY - 65);
    ctx.stroke();
  }
}

function drawCounterAndStand(
  ctx: CanvasRenderingContext2D,
  spanW: number,
  worldOffsetX: number
): void {
  const counterTopY = GROUND_Y + 46;

  // Bakery marble & oak counter across full width
  ctx.fillStyle = '#D7B996';
  ctx.fillRect(-worldOffsetX, counterTopY, spanW, 180);
  ctx.fillStyle = '#EDE2D2';
  ctx.fillRect(-worldOffsetX, counterTopY, spanW, 14);
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-worldOffsetX, counterTopY);
  ctx.lineTo(spanW - worldOffsetX, counterTopY);
  ctx.stroke();

  const cx = WORLD_WIDTH / 2;

  // Vintage brass pedestal stem
  ctx.fillStyle = '#C8984C';
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 18, GROUND_Y + 12);
  ctx.lineTo(cx + 18, GROUND_Y + 12);
  ctx.lineTo(cx + 34, counterTopY);
  ctx.lineTo(cx - 34, counterTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Brass neck ring
  ctx.fillStyle = '#DFB36B';
  ctx.beginPath();
  ctx.roundRect(cx - 24, GROUND_Y + 14, 48, 9, 4);
  ctx.fill();
  ctx.stroke();

  // Porcelain platter plate
  const plateLeft = cx - STAND_WIDTH / 2;
  ctx.fillStyle = '#FFFDF9';
  ctx.beginPath();
  ctx.roundRect(plateLeft, GROUND_Y, STAND_WIDTH, 14, 7);
  ctx.fill();
  ctx.stroke();

  // Delicate scalloped lace doily detail on plate edge
  ctx.fillStyle = '#F2E7D8';
  for (let dx = plateLeft + 12; dx < plateLeft + STAND_WIDTH - 10; dx += 16) {
    ctx.beginPath();
    ctx.arc(dx, GROUND_Y + 11, 4, 0, Math.PI, false);
    ctx.fill();
  }
}

function drawPendulumAssembly(
  ctx: CanvasRenderingContext2D,
  angle: number,
  timeSec: number,
  activeCake: ActiveCake | null
): void {
  const claspX = PENDULUM_PIVOT_X + Math.sin(angle) * PENDULUM_ARM_LENGTH;
  const claspY = PENDULUM_PIVOT_Y + Math.cos(angle) * PENDULUM_ARM_LENGTH;

  // Decorative ceiling beam
  ctx.fillStyle = '#C7964B';
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(PENDULUM_PIVOT_X - 42, -6, 84, 16, 6);
  ctx.fill();
  ctx.stroke();

  // Swinging brass pendulum rod
  ctx.save();
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(PENDULUM_PIVOT_X, PENDULUM_PIVOT_Y);
  ctx.lineTo(claspX, claspY);
  ctx.stroke();

  ctx.strokeStyle = '#D7A757';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PENDULUM_PIVOT_X, PENDULUM_PIVOT_Y);
  ctx.lineTo(claspX, claspY);
  ctx.stroke();
  ctx.restore();

  // Ornate brass clock face at pivot
  ctx.save();
  ctx.fillStyle = '#D7A757';
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(PENDULUM_PIVOT_X, PENDULUM_PIVOT_Y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFDF6';
  ctx.beginPath();
  ctx.arc(PENDULUM_PIVOT_X, PENDULUM_PIVOT_Y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Clock hands ticking smoothly
  const secHand = timeSec * 1.4;
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(PENDULUM_PIVOT_X, PENDULUM_PIVOT_Y);
  ctx.lineTo(
    PENDULUM_PIVOT_X + Math.cos(secHand - Math.PI / 2) * 10,
    PENDULUM_PIVOT_Y + Math.sin(secHand - Math.PI / 2) * 10
  );
  ctx.moveTo(PENDULUM_PIVOT_X, PENDULUM_PIVOT_Y);
  ctx.lineTo(
    PENDULUM_PIVOT_X + Math.cos(secHand * 0.2) * 7,
    PENDULUM_PIVOT_Y + Math.sin(secHand * 0.2) * 7
  );
  ctx.stroke();

  ctx.fillStyle = '#C94A5A';
  ctx.beginPath();
  ctx.arc(PENDULUM_PIVOT_X, PENDULUM_PIVOT_Y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ribbon clasp & swinging cake (if activeCake is still swinging)
  ctx.save();
  ctx.translate(claspX, claspY);
  ctx.rotate(-angle * 0.35);

  // Satin ribbon bow
  ctx.fillStyle = '#C94A5A';
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(-7, -2, 6, 3.5, -0.35, 0, Math.PI * 2);
  ctx.ellipse(7, -2, 6, 3.5, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -1, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (activeCake && activeCake.state === 'SWINGING') {
    // Thin golden holding tongs hugging top of cake
    ctx.strokeStyle = '#B88437';
    ctx.lineWidth = 2;
    const gripSpan = Math.min(24, activeCake.width * 0.32);
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-gripSpan, 10);
    ctx.moveTo(0, 2);
    ctx.lineTo(gripSpan, 10);
    ctx.stroke();

    drawCakeLayer(ctx, {
      x: 0,
      y: 7,
      width: activeCake.width,
      height: activeCake.height,
      flavor: FLAVOR_MAP[activeCake.flavorId],
      decorSeed: activeCake.decorSeed,
      squash: 0,
      isPerfectGlow: false,
    });
  }
  ctx.restore();
}

interface DrawCakeLayerOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  flavor: CakeFlavorConfig;
  decorSeed: number;
  squash: number;
  isPerfectGlow: boolean;
  isDebris?: boolean;
}

function drawCakeLayer(ctx: CanvasRenderingContext2D, opts: DrawCakeLayerOptions): void {
  const {x, y, width, height, flavor, decorSeed, squash, isPerfectGlow, isDebris} = opts;
  if (width <= 1.5) return;

  // Elastic squash & stretch deformation on landing
  const scaleY = 1 - squash * 0.14;
  const scaleX = 1 + squash * 0.08;
  const drawW = width * scaleX;
  const drawH = height * scaleY;
  const left = x - drawW / 2;
  const top = y + (height - drawH);

  ctx.save();

  // Golden highlight halo for freshly snapped Perfect layer
  if (isPerfectGlow && !isDebris) {
    ctx.shadowColor = 'rgba(215, 167, 87, 0.55)';
    ctx.shadowBlur = 10;
  }

  // 1. Main Sponge Body
  const spongeGrad = ctx.createLinearGradient(left, top, left, top + drawH);
  spongeGrad.addColorStop(0, flavor.spongeTop);
  spongeGrad.addColorStop(1, flavor.spongeBase);

  ctx.fillStyle = spongeGrad;
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(left, top + 4, drawW, drawH - 4, [5, 5, 6, 6]);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  // 2. Center Fruit Jam / Cream Filling Stripe
  if (drawH > 18) {
    const midY = top + drawH * 0.56;
    ctx.fillStyle = flavor.filling;
    ctx.fillRect(left + 1.5, midY, Math.max(0, drawW - 3), 5.5);

    ctx.strokeStyle = 'rgba(62, 42, 34, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + 1.5, midY);
    ctx.lineTo(left + drawW - 1.5, midY);
    ctx.moveTo(left + 1.5, midY + 5.5);
    ctx.lineTo(left + drawW - 1.5, midY + 5.5);
    ctx.stroke();
  }

  // 3. Subtle hand-drawn sponge crumb speckles inside clipped body
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(left + 2, top + 6, Math.max(0, drawW - 4), Math.max(0, drawH - 8), 4);
  ctx.clip();
  ctx.fillStyle = 'rgba(62, 42, 34, 0.12)';
  const speckleCount = Math.max(2, Math.floor(drawW / 18));
  for (let i = 0; i < speckleCount; i++) {
    const rx = left + 8 + ((decorSeed * 29 + i * 37) % Math.max(10, Math.floor(drawW - 16)));
    const ry = top + 14 + ((decorSeed * 13 + i * 19) % Math.max(6, Math.floor(drawH - 18)));
    ctx.beginPath();
    ctx.arc(rx, ry, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Lush Wavy Frosting & Drip Layer on Top
  const frostTop = top + 2;
  const frostBase = top + 12;
  ctx.fillStyle = flavor.frosting;
  ctx.strokeStyle = INK_COLOR;
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  ctx.moveTo(left + 3, frostTop);
  ctx.lineTo(left + drawW - 3, frostTop);
  ctx.quadraticCurveTo(left + drawW + 1, frostTop, left + drawW + 1, frostTop + 5);
  ctx.lineTo(left + drawW + 1, frostBase - 2);

  // Scalloped drips across bottom edge of frosting
  const dripStep = Math.max(11, Math.min(18, drawW / Math.max(2, Math.round(drawW / 15))));
  let currentX = left + drawW + 1;
  let dripIdx = 0;
  while (currentX > left + 1) {
    const nextX = Math.max(left - 1, currentX - dripStep);
    const midX = (currentX + nextX) / 2;
    const dropDepth = ((decorSeed + dripIdx * 3) % 3 === 0) ? 7.5 : 3.8;
    ctx.quadraticCurveTo(midX, frostBase + dropDepth, nextX, frostBase - 1);
    currentX = nextX;
    dripIdx++;
  }

  ctx.lineTo(left - 1, frostTop + 5);
  ctx.quadraticCurveTo(left - 1, frostTop, left + 3, frostTop);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 5. Top Garnishes (scaled & bounded inside current cake width)
  if (drawW >= 18 && !isDebris) {
    drawGarnishes(ctx, left, top, drawW, flavor, decorSeed);
  }

  ctx.restore();
}

function drawGarnishes(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  flavor: CakeFlavorConfig,
  seed: number
): void {
  const count = Math.max(1, Math.min(5, Math.floor(width / 32)));
  const usableW = Math.max(8, width - 16);

  for (let i = 0; i < count; i++) {
    const gx = count === 1 ? left + width / 2 : left + 8 + (usableW * i) / (count - 1);
    const gy = top + 1;

    switch (flavor.garnish) {
      case 'strawberry': {
        // Halved strawberry with little green leaf
        ctx.fillStyle = '#D93B4E';
        ctx.strokeStyle = INK_COLOR;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(gx, gy - 8);
        ctx.bezierCurveTo(gx + 6, gy - 8, gx + 5.5, gy + 2, gx, gy + 3);
        ctx.bezierCurveTo(gx - 5.5, gy + 2, gx - 6, gy - 8, gx, gy - 8);
        ctx.fill();
        ctx.stroke();

        // Leaf crown
        ctx.fillStyle = '#5F9E4C';
        ctx.beginPath();
        ctx.ellipse(gx - 2.5, gy - 8, 3, 1.5, -0.4, 0, Math.PI * 2);
        ctx.ellipse(gx + 2.5, gy - 8, 3, 1.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'blueberry': {
        ctx.fillStyle = '#4B4485';
        ctx.strokeStyle = INK_COLOR;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(gx, gy - 3, 4.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#8F89C9';
        ctx.beginPath();
        ctx.arc(gx - 1.3, gy - 4.3, 1.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'matcha_bean': {
        // Whipped cream rosette + sweet azuki bean
        ctx.fillStyle = '#F7FBEF';
        ctx.strokeStyle = INK_COLOR;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(gx, gy - 2.5, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#7D3B3B';
        ctx.beginPath();
        ctx.ellipse(gx + 1, gy - 5.5, 2.8, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'lemon_slice': {
        ctx.fillStyle = '#FCD74A';
        ctx.strokeStyle = INK_COLOR;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(gx, gy - 1, 6, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFF9D6';
        ctx.beginPath();
        ctx.arc(gx, gy - 1, 3.8, Math.PI, 0, false);
        ctx.fill();
        break;
      }
      case 'choc_curl': {
        ctx.fillStyle = '#3B1E13';
        ctx.strokeStyle = '#1E0E08';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.roundRect(gx - 4.5, gy - 6, 9, 5, 2.5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#784A36';
        ctx.fillRect(gx - 2.5, gy - 4.5, 5, 1.4);
        break;
      }
      case 'macaron': {
        const macColor = (seed + i) % 2 === 0 ? '#F294A5' : '#A9D6B8';
        ctx.fillStyle = macColor;
        ctx.strokeStyle = INK_COLOR;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(gx - 6, gy - 7, 12, 3.8, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(gx - 5.2, gy - 3.2, 10.4, 2);
        ctx.fillStyle = macColor;
        ctx.beginPath();
        ctx.roundRect(gx - 6, gy - 1.5, 12, 3.2, 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'caramel_drizzle': {
        ctx.fillStyle = '#B86921';
        ctx.strokeStyle = INK_COLOR;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(gx, gy - 3, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFF7EA';
        ctx.beginPath();
        ctx.arc(gx - 1, gy - 4, 1.1, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'gold_leaf': {
        ctx.fillStyle = '#E8BE5A';
        ctx.strokeStyle = '#8F641A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx - 4, gy - 1);
        ctx.lineTo(gx - 1, gy - 7);
        ctx.lineTo(gx + 5, gy - 4);
        ctx.lineTo(gx + 2, gy + 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
    }
  }
}

function drawSparkleStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.closePath();
  ctx.fill();
}
