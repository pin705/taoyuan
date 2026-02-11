/** 瀚海商店物品定义 */
export interface HanhaiShopItemDef {
  itemId: string
  name: string
  price: number
  description: string
}

/** 赌坊游戏类型 */
export type CasinoGameType = 'roulette' | 'dice' | 'cup' | 'cricket' | 'cardflip'

/** 蛐蛐定义 */
export interface CricketDef {
  id: string
  name: string
  description: string
}

/** 轮盘赔率档位 */
export interface RouletteOutcome {
  label: string
  multiplier: number
  /** 概率权重 */
  weight: number
}
