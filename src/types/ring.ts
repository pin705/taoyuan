/** 戒指效果类型 */
export type RingEffectType =
  | 'attack_bonus'
  | 'crit_rate_bonus'
  | 'defense_bonus'
  | 'vampiric'
  | 'max_hp_bonus'
  | 'stamina_reduction'
  | 'mining_stamina'
  | 'farming_stamina'
  | 'fishing_stamina'
  | 'crop_quality_bonus'
  | 'crop_growth_bonus'
  | 'fish_quality_bonus'
  | 'fishing_calm'
  | 'sell_price_bonus'
  | 'shop_discount'
  | 'gift_friendship'
  | 'monster_drop_bonus'
  | 'exp_bonus'
  | 'treasure_find'
  | 'ore_bonus'
  | 'luck'

/** 单个戒指效果 */
export interface RingEffect {
  type: RingEffectType
  value: number
}

/** 戒指定义（数据常量） */
export interface RingDef {
  id: string
  name: string
  description: string
  effects: RingEffect[]
  /** 合成配方（null = 不可合成） */
  recipe: { itemId: string; quantity: number }[] | null
  /** 合成所需金币 */
  recipeMoney: number
  /** 获取途径描述 */
  obtainSource: string
  /** 出售价格 */
  sellPrice: number
}

/** 拥有的戒指实例（存储用） */
export interface OwnedRing {
  defId: string
}
