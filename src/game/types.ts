export type GamePhase = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type ActiveCakeState = 'SWINGING' | 'FALLING' | 'TUMBLING_OVER';

export type CakeFlavorId =
  | 'strawberry'
  | 'vanilla_berry'
  | 'matcha'
  | 'lemon'
  | 'chocolate'
  | 'raspberry_macaron'
  | 'caramel_mille'
  | 'royal_opera';

export type GarnishStyle =
  | 'strawberry'
  | 'blueberry'
  | 'matcha_bean'
  | 'lemon_slice'
  | 'choc_curl'
  | 'macaron'
  | 'caramel_drizzle'
  | 'gold_leaf';

export interface CakeFlavorConfig {
  id: CakeFlavorId;
  nameZh: string;
  nameFr: string;
  descriptionZh: string;
  unlockLayer: number;
  scoreMultiplier: number;
  spongeTop: string;
  spongeBase: string;
  filling: string;
  frosting: string;
  drip: string;
  crumbColor: string;
  garnish: GarnishStyle;
  accentHex: string;
}

export interface StackedLayer {
  id: number;
  x: number; // center X in logical world
  y: number; // top Y in logical world (unshifted by cameraY)
  width: number;
  height: number;
  flavorId: CakeFlavorId;
  decorSeed: number;
  squash: number; // 0..1 spring compression on landing
  isPerfect: boolean;
}

export interface ActiveCake {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  vy: number;
  vx: number;
  vRot: number;
  flavorId: CakeFlavorId;
  decorSeed: number;
  state: ActiveCakeState;
}

export interface DebrisPiece {
  x: number; // center X
  y: number; // top Y
  width: number;
  height: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  alpha: number;
  flavorId: CakeFlavorId;
  side: 'left' | 'right';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  kind: 'sugar' | 'crumb' | 'star';
}

export interface FloatingCallout {
  id: number;
  text: string;
  subtext?: string;
  x: number;
  y: number;
  alpha: number;
  vy: number;
  color: string;
  scale: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  score: number;
  layers: number;
  combo: number;
  maxCombo: number;
  currentFlavorId: CakeFlavorId;
  nextFlavorId: CakeFlavorId;
  perfectCount: number;
  slicedCount: number;
  currentWidthRatio: number; // 0..1 compared to initial cake width
}

export interface PlayerProgress {
  bestScore: number;
  bestLayers: number;
  unlockedFlavors: CakeFlavorId[];
  totalCakesStacked: number;
  isMuted: boolean;
}
