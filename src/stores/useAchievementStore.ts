import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { AchievementDef } from '@/types'
import { ACHIEVEMENTS, COMMUNITY_BUNDLES } from '@/data/achievements'
import { ITEMS } from '@/data/items'
import { usePlayerStore } from './usePlayerStore'
import { useInventoryStore } from './useInventoryStore'
import { useSkillStore } from './useSkillStore'
import { useNpcStore } from './useNpcStore'
import { useQuestStore } from './useQuestStore'
import { useShopStore } from './useShopStore'
import { useAnimalStore } from './useAnimalStore'

export const useAchievementStore = defineStore('achievement', () => {
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const npcStore = useNpcStore()

  /** 已发现的物品ID集合 */
  const discoveredItems = ref<string[]>([])

  /** 已完成的成就ID集合 */
  const completedAchievements = ref<string[]>([])

  /** 社区任务已提交物品 */
  const bundleSubmissions = ref<Record<string, Record<string, number>>>({})

  /** 已完成的社区任务 */
  const completedBundles = ref<string[]>([])

  /** 统计计数器 */
  const stats = ref({
    totalCropsHarvested: 0,
    totalFishCaught: 0,
    totalMoneyEarned: 0,
    highestMineFloor: 0,
    totalRecipesCooked: 0,
    skullCavernBestFloor: 0,
    totalMonstersKilled: 0
  })

  const discoveredCount = computed(() => discoveredItems.value.length)

  // === 物品发现 ===

  const discoverItem = (itemId: string) => {
    if (!discoveredItems.value.includes(itemId)) {
      discoveredItems.value.push(itemId)
    }
  }

  const isDiscovered = (itemId: string): boolean => {
    return discoveredItems.value.includes(itemId)
  }

  // === 统计记录 ===

  const recordCropHarvest = () => {
    stats.value.totalCropsHarvested++
  }

  const recordFishCaught = () => {
    stats.value.totalFishCaught++
  }

  const recordMoneyEarned = (amount: number) => {
    stats.value.totalMoneyEarned += amount
  }

  const recordMineFloor = (floor: number) => {
    if (floor > stats.value.highestMineFloor) {
      stats.value.highestMineFloor = floor
    }
  }

  const recordRecipeCooked = () => {
    stats.value.totalRecipesCooked++
  }

  const recordSkullCavernFloor = (floor: number) => {
    if (floor > stats.value.skullCavernBestFloor) {
      stats.value.skullCavernBestFloor = floor
    }
  }

  const recordMonsterKill = () => {
    stats.value.totalMonstersKilled++
  }

  // === 成就检查 ===

  const checkAchievements = (): AchievementDef[] => {
    const newlyCompleted: AchievementDef[] = []

    for (const achievement of ACHIEVEMENTS) {
      if (completedAchievements.value.includes(achievement.id)) continue

      let met = false
      const c = achievement.condition

      switch (c.type) {
        case 'itemCount':
          met = discoveredItems.value.length >= c.count
          break
        case 'cropHarvest':
          met = stats.value.totalCropsHarvested >= c.count
          break
        case 'fishCaught':
          met = stats.value.totalFishCaught >= c.count
          break
        case 'moneyEarned':
          met = stats.value.totalMoneyEarned >= c.amount
          break
        case 'mineFloor':
          met = stats.value.highestMineFloor >= c.floor
          break
        case 'skullCavernFloor':
          met = stats.value.skullCavernBestFloor >= c.floor
          break
        case 'recipesCooked':
          met = stats.value.totalRecipesCooked >= c.count
          break
        case 'skillLevel':
          // 任意技能达到指定等级
          met = skillStore.skills.some(s => s.level >= c.level)
          break
        case 'npcFriendship':
          met = npcStore.npcStates.every(n => npcStore.getFriendshipLevel(n.npcId) !== 'stranger')
          break
        case 'questsCompleted': {
          const questStore = useQuestStore()
          met = questStore.completedQuestCount >= c.count
          break
        }
        case 'npcBestFriend': {
          const bestFriendCount = npcStore.npcStates.filter(n => npcStore.getFriendshipLevel(n.npcId) === 'bestFriend').length
          met = bestFriendCount >= c.count
          break
        }
        case 'npcAllFriendly':
          met = npcStore.npcStates.every(n => {
            const level = npcStore.getFriendshipLevel(n.npcId)
            return level === 'friendly' || level === 'bestFriend'
          })
          break
        case 'married':
          met = npcStore.getSpouse() !== null
          break
        case 'hasChild':
          met = npcStore.children.length > 0
          break
        case 'monstersKilled':
          met = stats.value.totalMonstersKilled >= c.count
          break
        case 'shippedCount': {
          const shopStore = useShopStore()
          met = shopStore.shippedItems.length >= c.count
          break
        }
        case 'fullShipment': {
          const shopStore2 = useShopStore()
          const shippableCategories = [
            'crop',
            'fish',
            'animal_product',
            'processed',
            'fruit',
            'ore',
            'gem',
            'material',
            'misc',
            'food',
            'gift'
          ]
          const shippableCount = ITEMS.filter(i => shippableCategories.includes(i.category)).length
          met = shopStore2.shippedItems.length >= shippableCount
          break
        }
        case 'animalCount': {
          const animalStore = useAnimalStore()
          met = animalStore.animals.length >= c.count
          break
        }
        case 'allSkillsMax':
          met = skillStore.skills.every(s => s.level === 10)
          break
        case 'allBundlesComplete':
          met = completedBundles.value.length >= COMMUNITY_BUNDLES.length
          break
      }

      if (met) {
        completedAchievements.value.push(achievement.id)
        // 发放奖励
        if (achievement.reward.money) {
          playerStore.earnMoney(achievement.reward.money)
        }
        if (achievement.reward.items) {
          for (const item of achievement.reward.items) {
            inventoryStore.addItem(item.itemId, item.quantity)
          }
        }
        newlyCompleted.push(achievement)
      }
    }

    return newlyCompleted
  }

  // === 社区任务 ===

  const submitToBundle = (bundleId: string, itemId: string, quantity: number): boolean => {
    if (completedBundles.value.includes(bundleId)) return false
    const bundle = COMMUNITY_BUNDLES.find(b => b.id === bundleId)
    if (!bundle) return false

    const req = bundle.requiredItems.find(r => r.itemId === itemId)
    if (!req) return false

    if (!inventoryStore.removeItem(itemId, quantity)) return false

    if (!bundleSubmissions.value[bundleId]) {
      bundleSubmissions.value[bundleId] = {}
    }
    const sub = bundleSubmissions.value[bundleId]!
    sub[itemId] = (sub[itemId] ?? 0) + quantity

    // 检查是否完成
    const allMet = bundle.requiredItems.every(r => (sub[r.itemId] ?? 0) >= r.quantity)

    if (allMet) {
      completedBundles.value.push(bundleId)
      // 发放奖励
      if (bundle.reward.money) {
        playerStore.earnMoney(bundle.reward.money)
      }
      if (bundle.reward.items) {
        for (const item of bundle.reward.items) {
          inventoryStore.addItem(item.itemId, item.quantity)
        }
      }
    }

    return true
  }

  const getBundleProgress = (bundleId: string): Record<string, number> => {
    return bundleSubmissions.value[bundleId] ?? {}
  }

  const isBundleComplete = (bundleId: string): boolean => {
    return completedBundles.value.includes(bundleId)
  }

  // === 完美度 ===

  const SHIPPABLE_CATEGORIES = ['crop', 'fish', 'animal_product', 'processed', 'fruit', 'ore', 'gem', 'material', 'misc', 'food', 'gift']
  const shippableItemCount = ITEMS.filter(i => SHIPPABLE_CATEGORIES.includes(i.category)).length

  const perfectionPercent = computed(() => {
    const shopStore = useShopStore()

    // 成就 25%
    const achievementRate = completedAchievements.value.length / ACHIEVEMENTS.length
    // 出货 20%
    const shippingRate = shippableItemCount > 0 ? shopStore.shippedItems.length / shippableItemCount : 0
    // 社区任务 15%
    const bundleRate = COMMUNITY_BUNDLES.length > 0 ? completedBundles.value.length / COMMUNITY_BUNDLES.length : 0
    // 图鉴 15%
    const collectionRate = ITEMS.length > 0 ? discoveredItems.value.length / ITEMS.length : 0
    // 技能 15%
    const avgSkillLevel = skillStore.skills.reduce((sum, s) => sum + s.level, 0) / skillStore.skills.length
    const skillRate = avgSkillLevel / 10
    // 好感 10%
    const friendlyCount = npcStore.npcStates.filter(n => {
      const level = npcStore.getFriendshipLevel(n.npcId)
      return level === 'friendly' || level === 'bestFriend'
    }).length
    const friendRate = npcStore.npcStates.length > 0 ? friendlyCount / npcStore.npcStates.length : 0

    const total =
      achievementRate * 0.25 + shippingRate * 0.2 + bundleRate * 0.15 + collectionRate * 0.15 + skillRate * 0.15 + friendRate * 0.1
    return Math.floor(total * 100)
  })

  // === 序列化 ===

  const serialize = () => {
    return {
      discoveredItems: discoveredItems.value,
      completedAchievements: completedAchievements.value,
      bundleSubmissions: bundleSubmissions.value,
      completedBundles: completedBundles.value,
      stats: stats.value
    }
  }

  const deserialize = (data: ReturnType<typeof serialize>) => {
    discoveredItems.value = data.discoveredItems ?? []
    completedAchievements.value = data.completedAchievements ?? []
    bundleSubmissions.value = data.bundleSubmissions ?? {}
    completedBundles.value = data.completedBundles ?? []
    stats.value = data.stats ?? {
      totalCropsHarvested: 0,
      totalFishCaught: 0,
      totalMoneyEarned: 0,
      highestMineFloor: 0,
      totalRecipesCooked: 0,
      skullCavernBestFloor: 0
    }
    // 兼容旧存档：补充缺失字段
    if (stats.value.skullCavernBestFloor === undefined) {
      stats.value.skullCavernBestFloor = 0
    }
    if ((stats.value as Record<string, unknown>).totalMonstersKilled === undefined) {
      stats.value.totalMonstersKilled = 0
    }
  }

  return {
    discoveredItems,
    completedAchievements,
    bundleSubmissions,
    completedBundles,
    stats,
    discoveredCount,
    discoverItem,
    isDiscovered,
    recordCropHarvest,
    recordFishCaught,
    recordMoneyEarned,
    recordMineFloor,
    recordRecipeCooked,
    recordSkullCavernFloor,
    recordMonsterKill,
    checkAchievements,
    perfectionPercent,
    submitToBundle,
    getBundleProgress,
    isBundleComplete,
    serialize,
    deserialize
  }
})
