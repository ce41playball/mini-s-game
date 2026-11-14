import {CakeFlavorConfig, CakeFlavorId} from './types';

export const CAKE_FLAVORS: CakeFlavorConfig[] = [
  {
    id: 'strawberry',
    nameZh: '經典草莓鮮奶油',
    nameFr: 'Fraisier Classique',
    descriptionZh: '鬆軟香草海綿夾入酸甜草莓果餡與手打鮮奶油',
    unlockLayer: 1,
    scoreMultiplier: 1,
    spongeTop: '#F4CE85',
    spongeBase: '#E5B45D',
    filling: '#DF5D6E',
    frosting: '#FFFBF4',
    drip: '#FCEEE4',
    crumbColor: '#E8B86B',
    garnish: 'strawberry',
    accentHex: '#C94A5A',
  },
  {
    id: 'vanilla_berry',
    nameZh: '波本香草藍莓',
    nameFr: 'Myrtille Vanille',
    descriptionZh: '馬達加斯加香草籽海綿點綴野生藍莓與輕乳酪霜',
    unlockLayer: 3,
    scoreMultiplier: 1.1,
    spongeTop: '#F5DFAD',
    spongeBase: '#E5C47C',
    filling: '#70609E',
    frosting: '#FAF6FF',
    drip: '#ECE4F8',
    crumbColor: '#E7C885',
    garnish: 'blueberry',
    accentHex: '#635394',
  },
  {
    id: 'matcha',
    nameZh: '宇治抹茶紅豆',
    nameFr: 'Matcha Azuki',
    descriptionZh: '濃厚茶香戚風蛋糕搭配蜜漬十勝紅豆與抹茶白巧淋面',
    unlockLayer: 6,
    scoreMultiplier: 1.2,
    spongeTop: '#96B86E',
    spongeBase: '#799C52',
    filling: '#8B4A4A',
    frosting: '#EBF4DC',
    drip: '#B4D18C',
    crumbColor: '#86A85E',
    garnish: 'matcha_bean',
    accentHex: '#5D8039',
  },
  {
    id: 'lemon',
    nameZh: '普羅旺斯香檸糖霜',
    nameFr: 'Citron Meringué',
    descriptionZh: '清爽檸檬海綿佐微酸凝乳夾心與糖漬黃檸檬片',
    unlockLayer: 9,
    scoreMultiplier: 1.3,
    spongeTop: '#F7DF6D',
    spongeBase: '#E9C543',
    filling: '#F5B82E',
    frosting: '#FFFDF0',
    drip: '#FDE88A',
    crumbColor: '#ECCB54',
    garnish: 'lemon_slice',
    accentHex: '#D19317',
  },
  {
    id: 'chocolate',
    nameZh: '70% 苦甜生巧甘納許',
    nameFr: 'Ganache Chocolat',
    descriptionZh: '法芙娜黑可可蛋糕體淋上絲滑鏡面甘納許與捲曲黑巧',
    unlockLayer: 13,
    scoreMultiplier: 1.5,
    spongeTop: '#7D4F39',
    spongeBase: '#5B3423',
    filling: '#422216',
    frosting: '#4F2D1E',
    drip: '#3A1E12',
    crumbColor: '#6D422E',
    garnish: 'choc_curl',
    accentHex: '#5E3524',
  },
  {
    id: 'raspberry_macaron',
    nameZh: '玫瑰覆盆子馬卡龍',
    nameFr: 'Macaron Framboise',
    descriptionZh: '粉嫩杏仁海綿夾覆盆子果醬，頂層點綴手工小馬卡龍',
    unlockLayer: 17,
    scoreMultiplier: 1.7,
    spongeTop: '#F3B4BC',
    spongeBase: '#E28C98',
    filling: '#B9354F',
    frosting: '#FFF0F3',
    drip: '#F7C2CC',
    crumbColor: '#EA9CA7',
    garnish: 'macaron',
    accentHex: '#C2405B',
  },
  {
    id: 'caramel_mille',
    nameZh: '布列塔尼焦糖海鹽',
    nameFr: 'Caramel Beurre Salé',
    descriptionZh: '琥珀焦糖千層奶霜搭配烤榛果碎與鹽之花太妃淋醬',
    unlockLayer: 22,
    scoreMultiplier: 2.0,
    spongeTop: '#E4AF69',
    spongeBase: '#C88B41',
    filling: '#9A5B22',
    frosting: '#FBEBD6',
    drip: '#C8782B',
    crumbColor: '#D69B52',
    garnish: 'caramel_drizzle',
    accentHex: '#B66A24',
  },
  {
    id: 'royal_opera',
    nameZh: '金箔皇家歌劇院',
    nameFr: 'Opéra Royal',
    descriptionZh: '濃縮咖啡杏仁餅底疊合黑巧與可食用金箔的巔峰之作',
    unlockLayer: 28,
    scoreMultiplier: 2.5,
    spongeTop: '#4A312C',
    spongeBase: '#311E1A',
    filling: '#D5A24B',
    frosting: '#2A1815',
    drip: '#D8A64A',
    crumbColor: '#432B26',
    garnish: 'gold_leaf',
    accentHex: '#C68B3C',
  },
];

export const FLAVOR_MAP: Record<CakeFlavorId, CakeFlavorConfig> = CAKE_FLAVORS.reduce(
  (acc, flavor) => {
    acc[flavor.id] = flavor;
    return acc;
  },
  {} as Record<CakeFlavorId, CakeFlavorConfig>
);

export function getFlavorForLayer(layerNumber: number): CakeFlavorConfig {
  // Exact milestone layer immediately debuts the newly unlocked flavor
  const exactMilestone = CAKE_FLAVORS.find((f) => f.unlockLayer === layerNumber);
  if (exactMilestone) {
    return exactMilestone;
  }

  const available = CAKE_FLAVORS.filter((f) => f.unlockLayer <= layerNumber);
  if (available.length === 0) {
    return CAKE_FLAVORS[0];
  }

  // Deterministic yet varied rotation favoring recently unlocked tiers
  const recentBiasPool: CakeFlavorConfig[] = [];
  available.forEach((f, idx) => {
    const weight = idx >= available.length - 2 ? 2 : 1;
    for (let i = 0; i < weight; i++) {
      recentBiasPool.push(f);
    }
  });

  const index = (layerNumber * 7 + 3) % recentBiasPool.length;
  return recentBiasPool[index];
}

export function getChefRankTitle(layers: number): {
  titleZh: string;
  titleFr: string;
} {
  if (layers >= 30) {
    return {titleZh: '巴黎傳奇甜點大師', titleFr: 'Grand Maître Pâtissier'};
  }
  if (layers >= 20) {
    return {titleZh: '皇家御用糕點主廚', titleFr: 'Chef Pâtissier Royal'};
  }
  if (layers >= 12) {
    return {titleZh: '法式沙龍首席主廚', titleFr: 'Chef de Salon'};
  }
  if (layers >= 5) {
    return {titleZh: '街角甜點屋烘焙師', titleFr: 'Artisan Boulanger'};
  }
  return {titleZh: '法式甜點見習學徒', titleFr: 'Apprenti Pâtissier'};
}
