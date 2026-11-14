import {useCallback, useEffect, useRef, useState} from 'react';
import {X} from 'lucide-react';
import {BakerySidebar} from './components/BakerySidebar';
import {PatisserieCanvas} from './components/PatisserieCanvas';
import {PatisserieAudioEngine} from './game/audio';
import {CakeFlavorId, GameSnapshot, PlayerProgress} from './game/types';

const STORAGE_KEY = 'patisserie_tower_progress_v1';

const DEFAULT_PROGRESS: PlayerProgress = {
  bestScore: 0,
  bestLayers: 0,
  unlockedFlavors: ['strawberry'],
  totalCakesStacked: 0,
  isMuted: false,
};

function loadProgress(): PlayerProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      bestLayers: typeof parsed.bestLayers === 'number' ? parsed.bestLayers : 0,
      unlockedFlavors: Array.isArray(parsed.unlockedFlavors)
        ? Array.from(new Set<CakeFlavorId>(['strawberry', ...parsed.unlockedFlavors]))
        : ['strawberry'],
      totalCakesStacked:
        typeof parsed.totalCakesStacked === 'number' ? parsed.totalCakesStacked : 0,
      isMuted: Boolean(parsed.isMuted),
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot>({
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
  });

  const audioRef = useRef<PatisserieAudioEngine | null>(null);
  if (!audioRef.current) {
    audioRef.current = new PatisserieAudioEngine();
    audioRef.current.setMuted(progress.isMuted);
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors in restricted sandboxes
    }
  }, [progress]);

  useEffect(() => {
    const engine = audioRef.current;
    return () => {
      engine?.dispose();
    };
  }, []);

  const handleToggleMute = useCallback(() => {
    setProgress((prev) => {
      const nextMuted = !prev.isMuted;
      audioRef.current?.setMuted(nextMuted);
      return {...prev, isMuted: nextMuted};
    });
  }, []);

  const handleRecordProgress = useCallback(
    (result: {
      score: number;
      layers: number;
      newlyUnlocked: CakeFlavorId[];
      cakesAdded: number;
    }) => {
      setProgress((prev) => ({
        ...prev,
        bestScore: Math.max(prev.bestScore, result.score),
        bestLayers: Math.max(prev.bestLayers, result.layers),
        unlockedFlavors: Array.from(
          new Set([...prev.unlockedFlavors, ...result.newlyUnlocked])
        ),
        totalCakesStacked: prev.totalCakesStacked + result.cakesAdded,
      }));
    },
    []
  );

  return (
    <main className="min-h-[100dvh] w-full bg-[#FAF6F0] text-[#2D211B]">
      {/* Mobile full-screen edge-to-edge stage; Desktop responsive two-column atelier layout */}
      <div className="mx-auto flex h-[100dvh] w-full max-w-6xl flex-col lg:grid lg:min-h-[760px] lg:h-[100dvh] lg:max-h-[900px] lg:grid-cols-[minmax(400px,460px)_minmax(340px,1fr)] lg:gap-8 lg:px-8 lg:py-6">
        <section className="relative h-full w-full flex-1">
          <PatisserieCanvas
            audio={audioRef.current}
            progress={progress}
            isMuted={progress.isMuted}
            onToggleMute={handleToggleMute}
            onSnapshotChange={setSnapshot}
            onRecordProgress={handleRecordProgress}
            onOpenCollectionMobile={() => setMobileSheetOpen(true)}
          />
        </section>

        <section className="hidden h-full lg:block">
          <BakerySidebar snapshot={snapshot} progress={progress} />
        </section>
      </div>

      {/* Mobile Bottom Sheet for Flavor Collection */}
      {mobileSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[#2D211B]/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="max-h-[84dvh] w-full overflow-y-auto rounded-t-3xl bg-[#FFFDF9] p-4 pb-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D8C8B4]" />
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-display text-lg font-bold text-[#2D211B]">
                法式甜點圖鑑與紀錄
              </span>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="關閉圖鑑"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#6E5A4F] hover:bg-[#EFE5D8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <BakerySidebar snapshot={snapshot} progress={progress} />
          </div>
        </div>
      )}
    </main>
  );
}
