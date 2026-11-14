import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Award,
  BookOpen,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import heroAtelierImg from '../assets/images/patisserie_atelier_hero_1794667290845.jpg';
import {PatisserieAudioEngine} from '../game/audio';
import {FLAVOR_MAP, getChefRankTitle, getFlavorForLayer} from '../game/flavors';
import {
  CAKE_HEIGHT,
  GROUND_Y,
  INITIAL_CAKE_WIDTH,
  PENDULUM_ARM_LENGTH,
  PENDULUM_PIVOT_X,
  PENDULUM_PIVOT_Y,
  PERFECT_TOLERANCE,
  renderPatisserieScene,
  STAND_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../game/renderer';
import {
  ActiveCake,
  CakeFlavorConfig,
  CakeFlavorId,
  DebrisPiece,
  FloatingCallout,
  GamePhase,
  GameSnapshot,
  Particle,
  PlayerProgress,
  StackedLayer,
} from '../game/types';

interface PatisserieCanvasProps {
  audio: PatisserieAudioEngine;
  progress: PlayerProgress;
  isMuted: boolean;
  onToggleMute: () => void;
  onSnapshotChange: (snapshot: GameSnapshot) => void;
  onRecordProgress: (result: {
    score: number;
    layers: number;
    newlyUnlocked: CakeFlavorId[];
    cakesAdded: number;
  }) => void;
  onOpenCollectionMobile: () => void;
}

interface MutableEngineState {
  phase: GamePhase;
  score: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  slicedCount: number;
  stacked: StackedLayer[];
  activeCake: ActiveCake | null;
  debris: DebrisPiece[];
  particles: Particle[];
  callouts: FloatingCallout[];
  pendulumTime: number;
  pendulumAngle: number;
  cameraY: number;
  targetCameraY: number;
  shakeTime: number;
  shakeMagnitude: number;
  totalTimeSec: number;
  nextId: number;
  gameOverDelayTimer: number;
  pendingGameOver: boolean;
  sessionUnlocked: Set<CakeFlavorId>;
}

export const PatisserieCanvas: React.FC<PatisserieCanvasProps> = ({
  audio,
  progress,
  isMuted,
  onToggleMute,
  onSnapshotChange,
  onRecordProgress,
  onOpenCollectionMobile,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('MENU');
  const [hudState, setHudState] = useState<GameSnapshot>(() => ({
    phase: 'MENU',
    score: 0,
    layers: 0,
    combo: 0,
    maxCombo: 0,
    currentFlavorId: 'strawberry',
    nextFlavorId: 'strawberry',
    perfectCount: 0,
    slicedCount: 0,
    currentWidthRatio: 1,
  }));
  const [unlockToast, setUnlockToast] = useState<CakeFlavorConfig | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const unlockToastTimerRef = useRef<number | null>(null);

  const engineRef = useRef<MutableEngineState>({
    phase: 'MENU',
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfectCount: 0,
    slicedCount: 0,
    stacked: [],
    activeCake: {
      x: PENDULUM_PIVOT_X,
      y: PENDULUM_PIVOT_Y + PENDULUM_ARM_LENGTH + 7,
      width: INITIAL_CAKE_WIDTH,
      height: CAKE_HEIGHT,
      angle: 0,
      vy: 0,
      vx: 0,
      vRot: 0,
      flavorId: 'strawberry',
      decorSeed: 22,
      state: 'SWINGING',
    },
    debris: [],
    particles: [],
    callouts: [],
    pendulumTime: 0,
    pendulumAngle: 0,
    cameraY: 0,
    targetCameraY: 0,
    shakeTime: 0,
    shakeMagnitude: 0,
    totalTimeSec: 0,
    nextId: 1,
    gameOverDelayTimer: 0,
    pendingGameOver: false,
    sessionUnlocked: new Set(['strawberry']),
  });

  const emitSnapshot = useCallback(() => {
    const s = engineRef.current;
    const nextLayerNum = s.stacked.length + 1;
    const currentFlavor = s.activeCake
      ? s.activeCake.flavorId
      : getFlavorForLayer(nextLayerNum).id;
    const nextFlavor = getFlavorForLayer(nextLayerNum + 1).id;
    const topWidth =
      s.stacked.length > 0 ? s.stacked[s.stacked.length - 1].width : INITIAL_CAKE_WIDTH;

    const snap: GameSnapshot = {
      phase: s.phase,
      score: s.score,
      layers: s.stacked.length,
      combo: s.combo,
      maxCombo: s.maxCombo,
      currentFlavorId: currentFlavor,
      nextFlavorId: nextFlavor,
      perfectCount: s.perfectCount,
      slicedCount: s.slicedCount,
      currentWidthRatio: Math.max(0, Math.min(1, topWidth / INITIAL_CAKE_WIDTH)),
    };
    setHudState(snap);
    onSnapshotChange(snap);
  }, [onSnapshotChange]);

  const showFlavorUnlockToast = useCallback((flavor: CakeFlavorConfig) => {
    setUnlockToast(flavor);
    if (unlockToastTimerRef.current !== null) {
      window.clearTimeout(unlockToastTimerRef.current);
    }
    unlockToastTimerRef.current = window.setTimeout(() => {
      setUnlockToast(null);
    }, 2600);
  }, []);

  const spawnCakeOnPendulum = useCallback((layerNumber: number, width: number) => {
    const s = engineRef.current;
    const flavor = getFlavorForLayer(layerNumber);
    const claspX = PENDULUM_PIVOT_X + Math.sin(s.pendulumAngle) * PENDULUM_ARM_LENGTH;
    const claspY = PENDULUM_PIVOT_Y + Math.cos(s.pendulumAngle) * PENDULUM_ARM_LENGTH;

    s.activeCake = {
      x: claspX,
      y: claspY + 7,
      width,
      height: CAKE_HEIGHT,
      angle: -s.pendulumAngle * 0.35,
      vy: 0,
      vx: 0,
      vRot: 0,
      flavorId: flavor.id,
      decorSeed: layerNumber * 17 + 5,
      state: 'SWINGING',
    };
  }, []);

  const startNewGame = useCallback(() => {
    audio.unlock();
    audio.setBgmPlaying(true);

    const s = engineRef.current;
    s.phase = 'PLAYING';
    s.score = 0;
    s.combo = 0;
    s.maxCombo = 0;
    s.perfectCount = 0;
    s.slicedCount = 0;
    s.stacked = [];
    s.debris = [];
    s.particles = [];
    s.callouts = [];
    s.pendulumTime = 0;
    s.pendulumAngle = 0;
    s.cameraY = 0;
    s.targetCameraY = 0;
    s.shakeTime = 0;
    s.shakeMagnitude = 0;
    s.nextId = 1;
    s.pendingGameOver = false;
    s.gameOverDelayTimer = 0;
    s.sessionUnlocked = new Set(['strawberry']);

    setIsNewRecord(false);
    setUnlockToast(null);
    setPhase('PLAYING');

    spawnCakeOnPendulum(1, INITIAL_CAKE_WIDTH);
    emitSnapshot();
  }, [audio, emitSnapshot, spawnCakeOnPendulum]);

  const dropCurrentCake = useCallback(() => {
    const s = engineRef.current;
    if (s.phase !== 'PLAYING' || !s.activeCake || s.activeCake.state !== 'SWINGING') {
      return;
    }

    audio.unlock();
    audio.playRelease();

    const claspX = PENDULUM_PIVOT_X + Math.sin(s.pendulumAngle) * PENDULUM_ARM_LENGTH;
    const claspY = PENDULUM_PIVOT_Y + Math.cos(s.pendulumAngle) * PENDULUM_ARM_LENGTH;

    // Convert screen-space clasp coordinates into world space seamlessly
    s.activeCake.x = claspX;
    s.activeCake.y = claspY + 7 - s.cameraY;
    s.activeCake.angle = -s.pendulumAngle * 0.35;
    s.activeCake.vy = 160;
    s.activeCake.state = 'FALLING';
  }, [audio]);

  const togglePause = useCallback(() => {
    const s = engineRef.current;
    if (s.phase === 'PLAYING') {
      s.phase = 'PAUSED';
      setPhase('PAUSED');
      audio.setBgmPlaying(false);
      emitSnapshot();
    } else if (s.phase === 'PAUSED') {
      s.phase = 'PLAYING';
      setPhase('PLAYING');
      audio.setBgmPlaying(true);
      emitSnapshot();
    }
  }, [audio, emitSnapshot]);

  // Keyboard shortcuts (Space/Enter/ArrowDown to drop, P/Escape to pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
        if (engineRef.current.phase === 'PLAYING') {
          e.preventDefault();
          dropCurrentCake();
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (engineRef.current.phase === 'PLAYING' || engineRef.current.phase === 'PAUSED') {
          e.preventDefault();
          togglePause();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dropCurrentCake, togglePause]);

  // Cleanup unlock toast timeout on unmount
  useEffect(() => {
    return () => {
      if (unlockToastTimerRef.current !== null) {
        window.clearTimeout(unlockToastTimerRef.current);
      }
    };
  }, []);

  // Main requestAnimationFrame Simulation & Render Loop
  useEffect(() => {
    let rafId = 0;
    let lastTimestamp = performance.now();

    const spawnParticles = (
      x: number,
      y: number,
      count: number,
      kind: Particle['kind'],
      color: string
    ) => {
      const s = engineRef.current;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI + Math.random() * Math.PI * 2;
        const speed = kind === 'star' ? 55 + Math.random() * 110 : 35 + Math.random() * 85;
        s.particles.push({
          x: x + (Math.random() - 0.5) * 24,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (kind === 'star' ? 45 : 20),
          size: kind === 'star' ? 4 + Math.random() * 3.5 : 2.2 + Math.random() * 2.8,
          color,
          alpha: 1,
          life: 0,
          maxLife: kind === 'star' ? 0.65 + Math.random() * 0.3 : 0.45 + Math.random() * 0.25,
          kind,
        });
      }
    };

    const spawnCallout = (text: string, x: number, y: number, color: string, subtext?: string) => {
      const s = engineRef.current;
      s.callouts.push({
        id: s.nextId++,
        text,
        subtext,
        x,
        y,
        alpha: 1,
        vy: -42,
        color,
        scale: 1,
      });
    };

    const finishGame = () => {
      const s = engineRef.current;
      s.phase = 'GAMEOVER';
      s.pendingGameOver = false;
      audio.setBgmPlaying(false);
      setPhase('GAMEOVER');

      const newlyUnlocked = Array.from(s.sessionUnlocked);
      if (
        s.score > progressRef.current.bestScore ||
        s.stacked.length > progressRef.current.bestLayers
      ) {
        setIsNewRecord(true);
      }
      onRecordProgress({
        score: s.score,
        layers: s.stacked.length,
        newlyUnlocked,
        cakesAdded: s.stacked.length,
      });
      emitSnapshot();
    };

    const handleLandingCollision = (falling: ActiveCake) => {
      const s = engineRef.current;
      const isFirstLayer = s.stacked.length === 0;
      const prevLayer = !isFirstLayer ? s.stacked[s.stacked.length - 1] : null;

      const targetX = prevLayer ? prevLayer.x : WORLD_WIDTH / 2;
      const targetWidth = prevLayer ? prevLayer.width : STAND_WIDTH;
      const targetTopY = prevLayer ? prevLayer.y : GROUND_Y;

      const fLeft = falling.x - falling.width / 2;
      const fRight = falling.x + falling.width / 2;
      const tLeft = targetX - targetWidth / 2;
      const tRight = targetX + targetWidth / 2;

      const overlapLeft = Math.max(fLeft, tLeft);
      const overlapRight = Math.min(fRight, tRight);
      const overlapWidth = overlapRight - overlapLeft;

      // 1. Total Miss -> Tumble off and end game
      if (overlapWidth <= 2.5) {
        falling.state = 'TUMBLING_OVER';
        falling.vy = 90;
        falling.vx = falling.x < targetX ? -85 : 85;
        falling.vRot = falling.x < targetX ? -3.8 : 3.8;
        s.shakeTime = 0.24;
        s.shakeMagnitude = 5;
        s.pendingGameOver = true;
        s.gameOverDelayTimer = 0.55;
        audio.playGameOver();
        spawnCallout('沒疊到！', falling.x, targetTopY - 22, '#C94A5A');
        return;
      }

      const flavor = FLAVOR_MAP[falling.flavorId];
      const deltaX = Math.abs(falling.x - targetX);
      const canPerfectSnap = !isFirstLayer
        ? deltaX <= PERFECT_TOLERANCE
        : deltaX <= PERFECT_TOLERANCE * 1.4; // slightly warmer tolerance on plate center

      let finalX = (overlapLeft + overlapRight) / 2;
      let finalWidth = overlapWidth;
      let isPerfect = false;

      if (canPerfectSnap) {
        isPerfect = true;
        finalX = targetX;
        finalWidth = prevLayer ? prevLayer.width : falling.width;
        s.combo += 1;
        s.maxCombo = Math.max(s.maxCombo, s.combo);
        s.perfectCount += 1;

        const gained = Math.round((12 + s.combo * 6) * flavor.scoreMultiplier);
        s.score += gained;

        audio.playPlace(s.combo);
        spawnParticles(finalX, targetTopY - CAKE_HEIGHT / 2, 16, 'star', '#D7A757');
        spawnParticles(finalX, targetTopY - 4, 10, 'sugar', '#FFFDF9');
        spawnCallout(
          s.combo >= 2 ? `Perfect! ×${s.combo}` : 'Perfect!',
          finalX,
          targetTopY - CAKE_HEIGHT - 12,
          '#C68B3C',
          `+${gained}`
        );
      } else {
        // Partial Overlap -> Slice excess overhanging section
        s.combo = 0;

        const leftTrimW = Math.max(0, tLeft - fLeft);
        const rightTrimW = Math.max(0, fRight - tRight);

        // Spawn left debris if left side overhung
        if (leftTrimW > 2) {
          s.debris.push({
            x: fLeft + leftTrimW / 2,
            y: targetTopY - CAKE_HEIGHT,
            width: leftTrimW,
            height: CAKE_HEIGHT,
            vx: -78,
            vy: -35,
            rotation: 0,
            vRot: -3.2,
            alpha: 1,
            flavorId: falling.flavorId,
            side: 'left',
          });
        }

        // Spawn right debris if right side overhung
        if (rightTrimW > 2) {
          s.debris.push({
            x: tRight + rightTrimW / 2,
            y: targetTopY - CAKE_HEIGHT,
            width: rightTrimW,
            height: CAKE_HEIGHT,
            vx: 78,
            vy: -35,
            rotation: 0,
            vRot: 3.2,
            alpha: 1,
            flavorId: falling.flavorId,
            side: 'right',
          });
        }

        if (leftTrimW > 2 || rightTrimW > 2) {
          s.slicedCount += 1;
          s.shakeTime = 0.14;
          s.shakeMagnitude = 2.6;
          audio.playSlice();
          const cutX = leftTrimW > rightTrimW ? overlapLeft : overlapRight;
          spawnParticles(cutX, targetTopY - CAKE_HEIGHT / 2, 12, 'crumb', flavor.crumbColor);
        } else {
          // Landed safely inside first plate without overhang
          audio.playPlace(0);
          spawnParticles(finalX, targetTopY - 4, 8, 'sugar', '#FFFDF9');
        }

        const gained = Math.round(10 * flavor.scoreMultiplier);
        s.score += gained;
        spawnCallout(`+${gained}`, finalX, targetTopY - CAKE_HEIGHT - 10, '#2D211B');
      }

      // Push settled cake layer
      const placedLayer: StackedLayer = {
        id: s.nextId++,
        x: finalX,
        y: targetTopY - CAKE_HEIGHT,
        width: finalWidth,
        height: CAKE_HEIGHT,
        flavorId: falling.flavorId,
        decorSeed: falling.decorSeed,
        squash: 1,
        isPerfect,
      };
      s.stacked.push(placedLayer);

      // Update camera target so active stack top stays comfortably in lower-middle stretch zone
      const desiredScreenTopY = 435;
      if (placedLayer.y < desiredScreenTopY) {
        s.targetCameraY = desiredScreenTopY - placedLayer.y;
      }

      // Prepare next cake on pendulum and check flavor milestone unlocks
      const nextLayerNum = s.stacked.length + 1;
      const upcomingFlavor = getFlavorForLayer(nextLayerNum);
      if (
        upcomingFlavor.unlockLayer === nextLayerNum &&
        !s.sessionUnlocked.has(upcomingFlavor.id)
      ) {
        s.sessionUnlocked.add(upcomingFlavor.id);
        if (!progressRef.current.unlockedFlavors.includes(upcomingFlavor.id)) {
          audio.playUnlock();
        }
        showFlavorUnlockToast(upcomingFlavor);
      }

      spawnCakeOnPendulum(nextLayerNum, finalWidth);
      emitSnapshot();
    };

    const step = (now: number) => {
      const rawDt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      const s = engineRef.current;
      s.totalTimeSec += dt;

      if (s.phase !== 'PAUSED') {
        // Pendulum oscillation (active on MENU as live background charm and during PLAYING)
        const layerFactor = s.phase === 'PLAYING' ? s.stacked.length : 0;
        const omega = Math.min(4.55, 2.3 + layerFactor * 0.055);
        const maxAngle = Math.min(0.79, 0.57 + layerFactor * 0.008);

        s.pendulumTime += dt * omega;
        s.pendulumAngle = Math.sin(s.pendulumTime) * maxAngle;

        if (s.activeCake && s.activeCake.state === 'SWINGING') {
          const claspX = PENDULUM_PIVOT_X + Math.sin(s.pendulumAngle) * PENDULUM_ARM_LENGTH;
          const claspY = PENDULUM_PIVOT_Y + Math.cos(s.pendulumAngle) * PENDULUM_ARM_LENGTH;
          s.activeCake.x = claspX;
          s.activeCake.y = claspY + 7;
        } else if (s.activeCake && s.activeCake.state === 'FALLING') {
          const c = s.activeCake;
          c.vy += 2050 * dt;
          c.y += c.vy * dt;
          c.angle += (0 - c.angle) * Math.min(1, dt * 12);

          const prevLayer =
            s.stacked.length > 0 ? s.stacked[s.stacked.length - 1] : null;
          const targetTopY = prevLayer ? prevLayer.y : GROUND_Y;

          if (c.y + c.height >= targetTopY) {
            c.y = targetTopY - c.height;
            c.angle = 0;
            handleLandingCollision(c);
          }
        } else if (s.activeCake && s.activeCake.state === 'TUMBLING_OVER') {
          const c = s.activeCake;
          c.vy += 1650 * dt;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.angle += c.vRot * dt;
        }

        // Game Over delay so player sees the cake tumble past the edge
        if (s.pendingGameOver) {
          s.gameOverDelayTimer -= dt;
          if (s.gameOverDelayTimer <= 0) {
            finishGame();
          }
        }

        // Smooth camera tracking
        s.cameraY += (s.targetCameraY - s.cameraY) * Math.min(1, dt * 6.5);

        // Squash spring decay on stacked cakes
        for (let i = Math.max(0, s.stacked.length - 5); i < s.stacked.length; i++) {
          if (s.stacked[i].squash > 0.001) {
            s.stacked[i].squash *= Math.exp(-12 * dt);
          } else {
            s.stacked[i].squash = 0;
          }
        }

        // Trimmed debris falling physics
        for (let i = s.debris.length - 1; i >= 0; i--) {
          const d = s.debris[i];
          d.vy += 1550 * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.rotation += d.vRot * dt;
          d.alpha -= dt * 0.9;
          if (d.alpha <= 0 || d.y + s.cameraY > WORLD_HEIGHT + 160) {
            s.debris.splice(i, 1);
          }
        }

        // Particles update
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.life += dt;
          p.vy += 260 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
          if (p.life >= p.maxLife) {
            s.particles.splice(i, 1);
          }
        }

        // Floating callouts update
        for (let i = s.callouts.length - 1; i >= 0; i--) {
          const c = s.callouts[i];
          c.y += c.vy * dt;
          c.vy *= Math.exp(-2.5 * dt);
          c.alpha -= dt * 1.15;
          if (c.alpha <= 0) {
            s.callouts.splice(i, 1);
          }
        }

        // Screen shake decay
        if (s.shakeTime > 0) {
          s.shakeTime = Math.max(0, s.shakeTime - dt);
        }
      }

      // Render onto Canvas
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.max(1, Math.round(rect.width * dpr));
        const targetH = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);

          const shakeOffset =
            s.shakeTime > 0
              ? {
                  x: (Math.random() - 0.5) * 2 * s.shakeMagnitude,
                  y: (Math.random() - 0.5) * 2 * s.shakeMagnitude,
                }
              : {x: 0, y: 0};

          renderPatisserieScene({
            ctx,
            canvasWidth: rect.width,
            canvasHeight: rect.height,
            cameraY: s.cameraY,
            layerCount: s.stacked.length,
            timeSec: s.totalTimeSec,
            pendulumAngle: s.pendulumAngle,
            shakeOffset,
            stacked: s.stacked,
            activeCake: s.activeCake,
            debris: s.debris,
            particles: s.particles,
            callouts: s.callouts,
            showGuideLine: s.phase === 'PLAYING' && s.stacked.length === 0,
          });

          ctx.restore();
        }
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [audio, emitSnapshot, onRecordProgress, showFlavorUnlockToast, spawnCakeOnPendulum]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drop on primary canvas tap when actively playing and not clicking HUD buttons
    if ((e.target as HTMLElement).closest('button')) return;
    if (engineRef.current.phase === 'PLAYING') {
      dropCurrentCake();
    }
  };

  const rank = getChefRankTitle(hudState.layers);
  const currentFlavorConfig = FLAVOR_MAP[hudState.currentFlavorId];

  return (
    <div
      ref={containerRef}
      onPointerDown={handleCanvasPointerDown}
      className="touch-game-surface relative w-full h-full overflow-hidden bg-[#FBF6ED] lg:rounded-2xl lg:border lg:border-[#D8C8B4] lg:shadow-[0_12px_36px_rgba(45,33,27,0.08)]"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Compact Top HUD (strictly <= 15% mobile height) */}
      <header className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-2.5 pb-2">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[#D8C8B4]/90 bg-[#FFFDF9]/90 px-3.5 py-2 backdrop-blur-sm">
          <div>
            <div className="text-[11px] font-medium leading-none text-[#6E5A4F]">分數</div>
            <div className="font-display tabular-nums text-xl font-bold leading-tight text-[#2D211B]">
              {hudState.score}
            </div>
          </div>
          <div className="h-6 w-px bg-[#D8C8B4]" aria-hidden="true" />
          <div>
            <div className="text-[11px] font-medium leading-none text-[#6E5A4F]">高度</div>
            <div className="font-mono-num text-base font-semibold leading-tight text-[#2D211B]">
              {hudState.layers} 層
            </div>
          </div>
          {hudState.combo >= 2 && (
            <>
              <div className="h-6 w-px bg-[#D8C8B4]" aria-hidden="true" />
              <div className="flex items-center gap-1 text-xs font-bold text-[#C68B3C] whitespace-nowrap">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="tabular-nums">連擊 ×{hudState.combo}</span>
              </div>
            </>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              audio.unlock();
              onToggleMute();
            }}
            aria-label={isMuted ? '開啟音效與音樂' : '靜音'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D8C8B4]/90 bg-[#FFFDF9]/90 text-[#2D211B] backdrop-blur-sm transition-colors hover:bg-[#EFE5D8] active:scale-95 focus-visible:outline-2 focus-visible:outline-[#C94A5A]"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {(phase === 'PLAYING' || phase === 'PAUSED') && (
            <button
              type="button"
              onClick={togglePause}
              aria-label={phase === 'PAUSED' ? '繼續遊戲' : '暫停遊戲'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#D8C8B4]/90 bg-[#FFFDF9]/90 text-[#2D211B] backdrop-blur-sm transition-colors hover:bg-[#EFE5D8] active:scale-95 focus-visible:outline-2 focus-visible:outline-[#C94A5A]"
            >
              {phase === 'PAUSED' ? (
                <Play className="h-5 w-5" />
              ) : (
                <Pause className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Current Hanging Flavor Caption during Play */}
      {phase === 'PLAYING' && (
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-lg border border-[#D8C8B4]/80 bg-[#FFFDF9]/85 px-3 py-1 text-xs font-medium text-[#2D211B] backdrop-blur-sm">
            <span>{currentFlavorConfig.nameZh}</span>
            <span className="text-[#6E5A4F]" aria-hidden="true">
              ·
            </span>
            <span className="text-[#6E5A4F]">點擊螢幕任意處落下</span>
          </div>
        </div>
      )}

      {/* Non-blocking Flavor Unlock Toast */}
      {unlockToast && phase === 'PLAYING' && (
        <div className="pointer-events-none absolute top-18 left-0 right-0 z-20 flex justify-center px-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-[#C68B3C]/60 bg-[#FFFDF9]/95 px-4 py-2 shadow-md">
            <Award className="h-4 w-4 shrink-0 text-[#C68B3C]" />
            <div className="text-xs text-[#2D211B]">
              <span className="font-semibold text-[#C68B3C]">解鎖新口味：</span>
              <span className="font-semibold">{unlockToast.nameZh}</span>
            </div>
          </div>
        </div>
      )}

      {/* TITLE MENU OVERLAY */}
      {phase === 'MENU' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#FAF6F0]/75 p-5 backdrop-blur-[3px]">
          <div className="w-full max-w-[350px] overflow-hidden rounded-2xl border border-[#D8C8B4] bg-[#FFFDF9] shadow-[0_18px_48px_rgba(45,33,27,0.14)]">
            <div className="relative h-36 w-full overflow-hidden bg-[#EFE5D8]">
              {!heroImgFailed ? (
                <img
                  src={heroAtelierImg}
                  alt="溫暖手繪法式甜點屋展示台"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setHeroImgFailed(true);
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F7E7D0] to-[#EFE5D8] text-[#6E5A4F]">
                  <Sparkles className="mb-1 h-7 w-7 text-[#C68B3C]" />
                  <span className="font-display text-sm font-semibold">Atelier Pâtisserie</span>
                </div>
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#2D211B]/65 via-[#2D211B]/15 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute bottom-3 left-4 right-4 text-[#FFFDF9]">
                <h1 className="font-display text-2xl font-bold tracking-tight text-balance">
                  法式甜點塔疊疊樂
                </h1>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center justify-between text-xs text-[#6E5A4F]">
                <span>最高紀錄：{progress.bestScore} 分</span>
                <span aria-hidden="true">·</span>
                <span>最高堆疊：{progress.bestLayers} 層</span>
              </div>

              <div className="mb-5 space-y-2 border-y border-[#EFE5D8] py-3 text-sm text-[#2D211B]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-[#C94A5A]">01.</span>
                  <span className="flex-1">觀察上方黃銅擺鐘，抓準中心時機點擊落下</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-[#C68B3C]">02.</span>
                  <span className="flex-1">精準對齊觸發 Perfect 連擊加分與微幅吸附</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-[#6E5A4F]">03.</span>
                  <span className="flex-1">多餘邊緣將被切落，隨高度解鎖 8 款法式蛋糕</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={startNewGame}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#C94A5A] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#B23A4A] active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#2D211B]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>開始烘焙疊高</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenCollectionMobile}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#D8C8B4] bg-[#FAF6F0] px-4 py-2.5 text-sm font-medium text-[#2D211B] transition-colors hover:bg-[#EFE5D8] lg:hidden whitespace-nowrap"
                >
                  <BookOpen className="h-4 w-4 text-[#6E5A4F]" />
                  <span>甜點圖鑑（已解鎖 {progress.unlockedFlavors.length}/8）</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {phase === 'PAUSED' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#2D211B]/45 p-5 backdrop-blur-xs">
          <div className="w-full max-w-[300px] rounded-2xl border border-[#D8C8B4] bg-[#FFFDF9] p-6 text-center shadow-xl">
            <h2 className="font-display mb-1 text-xl font-bold text-[#2D211B]">烘焙暫停中</h2>
            <p className="mb-5 text-sm text-[#6E5A4F]">
              目前 {hudState.layers} 層 · {hudState.score} 分
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#C94A5A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B23A4A] whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>繼續疊蛋糕</span>
              </button>
              <button
                type="button"
                onClick={startNewGame}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#D8C8B4] bg-[#FAF6F0] px-4 py-2.5 text-sm font-medium text-[#2D211B] transition-colors hover:bg-[#EFE5D8] whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                <span>重新開始</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SUMMARY MODAL */}
      {phase === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#2D211B]/50 p-5 backdrop-blur-xs">
          <div className="w-full max-w-[340px] rounded-2xl border border-[#D8C8B4] bg-[#FFFDF9] p-6 shadow-2xl">
            <div className="mb-4 text-center">
              {isNewRecord ? (
                <div className="mb-1 text-xs font-bold tracking-wide text-[#C68B3C]">
                  刷新歷史最高紀錄
                </div>
              ) : (
                <div className="mb-1 text-xs font-medium text-[#6E5A4F]">{rank.titleFr}</div>
              )}
              <h2 className="font-display text-2xl font-bold text-[#2D211B]">
                甜點塔完成！
              </h2>
              <div className="mt-1 text-sm font-semibold text-[#C94A5A]">{rank.titleZh}</div>
            </div>

            <div className="mb-4 rounded-xl bg-[#FAF6F0] p-4 text-center border border-[#EFE5D8]">
              <div className="text-xs text-[#6E5A4F]">本局總分</div>
              <div className="font-display tabular-nums text-4xl font-bold text-[#2D211B]">
                {hudState.score}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-[#6E5A4F]">
                <span>堆疊 {hudState.layers} 層</span>
                <span aria-hidden="true">·</span>
                <span>最佳紀錄 {Math.max(progress.bestScore, hudState.score)} 分</span>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-3 divide-x divide-[#EFE5D8] border-y border-[#EFE5D8] py-2.5 text-center">
              <div>
                <div className="text-[11px] text-[#6E5A4F]">Perfect</div>
                <div className="font-mono-num text-sm font-semibold text-[#C68B3C]">
                  {hudState.perfectCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E5A4F]">最高連擊</div>
                <div className="font-mono-num text-sm font-semibold text-[#2D211B]">
                  ×{hudState.maxCombo}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E5A4F]">裁切次數</div>
                <div className="font-mono-num text-sm font-semibold text-[#2D211B]">
                  {hudState.slicedCount}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={startNewGame}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#C94A5A] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#B23A4A] active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#2D211B]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>再疊一次</span>
              </button>

              <button
                type="button"
                onClick={onOpenCollectionMobile}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#D8C8B4] bg-[#FAF6F0] px-4 py-2.5 text-sm font-medium text-[#2D211B] transition-colors hover:bg-[#EFE5D8] lg:hidden whitespace-nowrap"
              >
                <BookOpen className="h-4 w-4 text-[#6E5A4F]" />
                <span>甜點口味圖鑑（{progress.unlockedFlavors.length}/8）</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
