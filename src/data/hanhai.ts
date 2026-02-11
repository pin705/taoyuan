import type { HanhaiShopItemDef, RouletteOutcome, CricketDef } from '@/types'

/** 瀚海驿站商店物品 */
export const HANHAI_SHOP_ITEMS: HanhaiShopItemDef[] = [
  { itemId: 'hanhai_cactus_seed', name: '仙人掌种子', price: 500, description: '来自西域的奇特植物种子。' },
  { itemId: 'hanhai_date_seed', name: '红枣种子', price: 400, description: '丝绸之路带来的果树种子。' },
  { itemId: 'hanhai_spice', name: '西域香料', price: 300, description: '异域风情的香料，烹饪佳品。' },
  { itemId: 'hanhai_silk', name: '丝绸', price: 800, description: '细腻光滑的上等丝绸。' },
  { itemId: 'hanhai_turquoise', name: '绿松石', price: 600, description: '西域特产的珍贵宝石。' },
  { itemId: 'hanhai_map', name: '藏宝图', price: 1000, description: '标记着荒原某处宝藏的地图。' },
  { itemId: 'mega_bomb_recipe', name: '巨型炸弹配方', price: 5000, description: '据说能炸开整层矿洞的秘方。' }
]

/** 轮盘赔率 */
export const ROULETTE_OUTCOMES: RouletteOutcome[] = [
  { label: '空', multiplier: 0, weight: 25 },
  { label: '半返', multiplier: 0.5, weight: 20 },
  { label: '平局', multiplier: 1, weight: 25 },
  { label: '双倍', multiplier: 2, weight: 15 },
  { label: '三倍', multiplier: 3, weight: 10 },
  { label: '五倍', multiplier: 5, weight: 5 }
]

/** 轮盘投注档位 */
export const ROULETTE_BET_TIERS = [100, 500, 1000] as const

/** 骰子投注金额 */
export const DICE_BET_AMOUNT = 200

/** 每天最大赌博次数 */
export const MAX_DAILY_BETS = 10

/** 解锁瀚海所需费用 */
export const HANHAI_UNLOCK_COST = 100000

/** 根据权重随机选择轮盘结果 */
export const spinRoulette = (): RouletteOutcome => {
  const totalWeight = ROULETTE_OUTCOMES.reduce((sum, o) => sum + o.weight, 0)
  let roll = Math.random() * totalWeight
  for (const outcome of ROULETTE_OUTCOMES) {
    roll -= outcome.weight
    if (roll <= 0) return outcome
  }
  return ROULETTE_OUTCOMES[0]!
}

/** 骰子游戏：投大小 */
export const rollDice = (): { dice1: number; dice2: number; total: number; isBig: boolean } => {
  const dice1 = Math.floor(Math.random() * 6) + 1
  const dice2 = Math.floor(Math.random() * 6) + 1
  const total = dice1 + dice2
  return { dice1, dice2, total, isBig: total >= 7 }
}

// ==================== 猜杯 ====================

/** 猜杯投注金额 */
export const CUP_BET_AMOUNT = 250

/** 猜杯倍率 */
export const CUP_WIN_MULTIPLIER = 3

/** 猜杯游戏：球藏在哪个杯子下 */
export const playCupRound = (): { correctCup: number } => {
  return { correctCup: Math.floor(Math.random() * 3) }
}

// ==================== 斗蛐蛐 ====================

/** 斗蛐蛐投注金额 */
export const CRICKET_BET_AMOUNT = 300

/** 斗蛐蛐赢赔率 */
export const CRICKET_WIN_MULTIPLIER = 2.5

/** 可选蛐蛐 */
export const CRICKETS: CricketDef[] = [
  { id: 'general', name: '将军', description: '体格健壮，攻守兼备。' },
  { id: 'ironhead', name: '铁头', description: '头铁如铁，擅长硬碰硬。' },
  { id: 'dragonfly', name: '青龙', description: '身法灵活，出其不意。' }
]

/** 斗蛐蛐：双方各掷力量，高者胜 */
export const fightCricket = (): { playerPower: number; opponentPower: number } => {
  const playerPower = Math.floor(Math.random() * 10) + 1
  const opponentPower = Math.floor(Math.random() * 10) + 1
  return { playerPower, opponentPower }
}

// ==================== 翻牌寻宝 ====================

/** 翻牌投注金额 */
export const CARD_BET_AMOUNT = 150

/** 翻牌赢赔率 */
export const CARD_WIN_MULTIPLIER = 2.5

/** 翻牌总数 */
export const CARD_TOTAL = 5

/** 翻牌中宝牌数量 */
export const CARD_TREASURE_COUNT = 2

/** 翻牌游戏：生成宝牌位置 */
export const dealCards = (): { treasures: number[] } => {
  const positions = [0, 1, 2, 3, 4]
  // Fisher-Yates shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[positions[i], positions[j]] = [positions[j]!, positions[i]!]
  }
  return { treasures: positions.slice(0, CARD_TREASURE_COUNT) }
}
