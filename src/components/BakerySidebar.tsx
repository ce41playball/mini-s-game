import React, {useState} from 'react';
import {Lock, Check, Keyboard, Sparkles} from 'lucide-react';
import heroAtelierImg from '../assets/images/patisserie_atelier_hero_1794667290845.jpg';
import {CAKE_FLAVORS, FLAVOR_MAP, getChefRankTitle} from '../game/flavors';
import {CakeFlavorConfig, GameSnapshot, PlayerProgress} from '../game/types';

interface BakerySidebarProps {
  snapshot: GameSnapshot;
  progress: PlayerProgress;
}

const MiniCakeSwatch: React.FC<{flavor: CakeFlavorConfig; unlocked: boolean}> = ({
  flavor,
  unlocked,
}) => (
  <svg
    viewBox="0 0 44 32"
    className={`h-8 w-11 shrink-0 ${unlocked ? '' : 'opacity-40 grayscale'}`}
    aria-hidden="true"
  >
    <rect
      x="4"
      y="8"
      width="36"
      height="20"
      rx="4"
      fill={flavor.spongeTop}
      stroke="#3E2A22"
      strokeWidth="1.6"
    />
    <rect x="5" y="18" width="34" height="3.5" fill={flavor.filling} />
    <path
      d="M4 10 C4 7, 40 7, 40 10 L40 14 Q34 17 28 14 Q22 18 16 14 Q10 17 4 14 Z"
      fill={flavor.frosting}
      stroke="#3E2A22"
      strokeWidth="1.4"
    />
    <circle cx="22" cy="7" r="3" fill={flavor.accentHex} stroke="#3E2A22" strokeWidth="1.2" />
  </svg>
);

export const BakerySidebar: React.FC<BakerySidebarProps> = ({snapshot, progress}) => {
  const [imgError, setImgError] = useState(false);

  const currentFlavor = FLAVOR_MAP[snapshot.currentFlavorId];
  const nextLocked = CAKE_FLAVORS.find(
    (f) => !progress.unlockedFlavors.includes(f.id)
  );
  const rank = getChefRankTitle(progress.bestLayers);

  return (
    <aside className="flex h-full flex-col justify-between gap-5 rounded-2xl border border-[#D8C8B4] bg-[#FFFDF9] p-6">
      <div className="space-y-5">
        {/* Atelier Hero Card */}
        <div className="flex items-center gap-4 border-b border-[#EFE5D8] pb-5">
          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-[#D8C8B4] bg-[#EFE5D8]">
            {!imgError ? (
              <img
                src={heroAtelierImg}
                alt="法式甜點屋烘焙櫃檯"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#C68B3C]">
                <Sparkles className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold leading-snug text-[#2D211B]">
              法式甜點屋工作台
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#6E5A4F]">
              {rank.titleZh} · 最高 {progress.bestScore} 分 · {progress.bestLayers} 層
            </p>
          </div>
        </div>

        {/* Live Session Status */}
        <div className="rounded-xl border border-[#EFE5D8] bg-[#FAF6F0] p-4">
          <div className="flex items-center justify-between text-xs text-[#6E5A4F]">
            <span>目前懸吊蛋糕</span>
            <span className="font-mono-num">
              寬度保留 {Math.round(snapshot.currentWidthRatio * 100)}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <MiniCakeSwatch flavor={currentFlavor} unlocked={true} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-[#2D211B]">
                {currentFlavor.nameZh}
              </div>
              <div className="truncate text-xs text-[#6E5A4F]">
                {currentFlavor.nameFr} · {currentFlavor.scoreMultiplier}× 分數倍率
              </div>
            </div>
          </div>
          {nextLocked && (
            <div className="mt-3 border-t border-[#E6DACB] pt-2.5 text-xs text-[#6E5A4F]">
              下一款解鎖：疊至第{' '}
              <span className="font-mono-num font-semibold text-[#2D211B]">
                {nextLocked.unlockLayer}
              </span>{' '}
              層解鎖「{nextLocked.nameZh}」
            </div>
          )}
        </div>

        {/* 8-Flavor Unlock Collection */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#2D211B]">法式甜點口味圖鑑</h3>
            <span className="font-mono-num text-xs text-[#6E5A4F]">
              {progress.unlockedFlavors.length} / {CAKE_FLAVORS.length} 已解鎖
            </span>
          </div>

          <div className="max-h-[290px] overflow-y-auto pr-1 divide-y divide-[#EFE5D8]">
            {CAKE_FLAVORS.map((flavor) => {
              const unlocked = progress.unlockedFlavors.includes(flavor.id);
              return (
                <div
                  key={flavor.id}
                  className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1"
                >
                  <MiniCakeSwatch flavor={flavor} unlocked={unlocked} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-sm font-semibold ${
                          unlocked ? 'text-[#2D211B]' : 'text-[#6E5A4F]'
                        }`}
                      >
                        {flavor.nameZh}
                      </span>
                      <span
                        className={`flex shrink-0 items-center gap-1 text-[11px] font-medium whitespace-nowrap ${
                          unlocked ? 'text-[#5D8039]' : 'text-[#6E5A4F]'
                        }`}
                      >
                        {unlocked ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>已解鎖</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            <span>第 {flavor.unlockLayer} 層</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[#6E5A4F]">
                      {flavor.descriptionZh}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls & Precision Tips */}
      <div className="flex items-center justify-between gap-3 border-t border-[#EFE5D8] pt-4 text-xs text-[#6E5A4F]">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 shrink-0 text-[#2D211B]" />
          <span>空白鍵 / 點擊畫布放下蛋糕</span>
        </div>
        <span className="whitespace-nowrap">P 鍵暫停</span>
      </div>
    </aside>
  );
};
