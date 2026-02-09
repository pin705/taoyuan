<template>
  <div>
    <h3 class="text-accent text-sm mb-3">
      <Wrench :size="14" class="inline" />
      工具升级（找小满）
    </h3>
    <p class="text-xs text-muted mb-4">消耗金属锭和金币升级你的工具，需等待2天。</p>

    <!-- 正在升级提示 -->
    <div v-if="inventoryStore.pendingUpgrade" class="game-panel mb-4 border-accent/40">
      <p class="text-xs text-accent">
        <Clock :size="12" class="inline" />
        小满正在锻造「{{ TOOL_NAMES[inventoryStore.pendingUpgrade.toolType] }}」→
        {{ TIER_NAMES[inventoryStore.pendingUpgrade.targetTier] }} （还需 {{ inventoryStore.pendingUpgrade.daysRemaining }} 天）
      </p>
    </div>

    <div class="space-y-3">
      <div v-for="tool in inventoryStore.tools" :key="tool.type" class="game-panel">
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm">{{ TOOL_NAMES[tool.type] }}</p>
            <p class="text-xs text-muted">当前：{{ TIER_NAMES[tool.tier] }}</p>
            <p v-if="isUpgrading(tool.type)" class="text-xs text-accent">升级中…</p>
          </div>

          <!-- 正在升级此工具 -->
          <div v-if="isUpgrading(tool.type)" class="text-right">
            <p class="text-xs text-accent">锻造中（{{ inventoryStore.pendingUpgrade!.daysRemaining }}天后完成）</p>
          </div>
          <!-- 可以升级 -->
          <div v-else-if="getUpgradeCost(tool.type, tool.tier)" class="text-right">
            <p class="text-xs text-muted mb-1">
              升级至{{ TIER_NAMES[getUpgradeCost(tool.type, tool.tier)!.toTier] }}： {{ getUpgradeCost(tool.type, tool.tier)!.money }}文 +
              {{
                getUpgradeCost(tool.type, tool.tier)!
                  .materials.map(m => `${getItemById(m.itemId)?.name}×${m.quantity}`)
                  .join(' + ')
              }}
            </p>
            <p v-if="getUpgradeBlockReason(tool.type)" class="text-xs text-danger mb-1">
              {{ getUpgradeBlockReason(tool.type) }}
            </p>
            <button class="btn text-xs" :disabled="!canUpgrade(tool.type)" @click="handleUpgrade(tool.type)">
              <ArrowUp :size="14" />
              升级
            </button>
          </div>
          <p v-else class="text-xs text-accent">已满级</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ArrowUp, Wrench, Clock } from 'lucide-vue-next'
  import { useInventoryStore, usePlayerStore, useNpcStore, useGameStore } from '@/stores'
  import { getUpgradeCost, TOOL_NAMES, TIER_NAMES, getItemById } from '@/data'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import type { ToolType, ToolTier, FriendshipLevel } from '@/types'

  /** 升级目标等级 → 所需小满好感 */
  const TIER_FRIENDSHIP_REQ: Partial<Record<ToolTier, FriendshipLevel>> = {
    iron: 'acquaintance',
    steel: 'friendly',
    iridium: 'bestFriend'
  }
  const LEVEL_ORDER: FriendshipLevel[] = ['stranger', 'acquaintance', 'friendly', 'bestFriend']
  const LEVEL_NAMES: Record<FriendshipLevel, string> = {
    stranger: '陌生',
    acquaintance: '相识',
    friendly: '熟识',
    bestFriend: '挚友'
  }
  const meetsLevel = (current: FriendshipLevel, required: FriendshipLevel): boolean =>
    LEVEL_ORDER.indexOf(current) >= LEVEL_ORDER.indexOf(required)
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'

  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const npcStore = useNpcStore()
  const gameStore = useGameStore()

  /** 该工具是否正在升级中 */
  const isUpgrading = (type: ToolType): boolean => {
    return inventoryStore.pendingUpgrade?.toolType === type
  }

  const canUpgrade = (type: ToolType): boolean => {
    // 已有工具在升级中，不能再升级
    if (inventoryStore.pendingUpgrade) return false

    const tool = inventoryStore.getTool(type)
    if (!tool) return false
    const cost = getUpgradeCost(type, tool.tier)
    if (!cost) return false

    const requiredLevel = TIER_FRIENDSHIP_REQ[cost.toTier]
    if (requiredLevel && !meetsLevel(npcStore.getFriendshipLevel('xiao_man'), requiredLevel)) return false

    if (playerStore.money < cost.money) return false
    for (const mat of cost.materials) {
      if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  /** 返回升级被阻止的原因（用于 UI 提示），可升级时返回空字符串 */
  const getUpgradeBlockReason = (type: ToolType): string => {
    if (inventoryStore.pendingUpgrade) return '小满正在锻造其他工具'

    const tool = inventoryStore.getTool(type)
    if (!tool) return ''
    const cost = getUpgradeCost(type, tool.tier)
    if (!cost) return ''

    const requiredLevel = TIER_FRIENDSHIP_REQ[cost.toTier]
    if (requiredLevel && !meetsLevel(npcStore.getFriendshipLevel('xiao_man'), requiredLevel)) {
      return `需要小满好感达到「${LEVEL_NAMES[requiredLevel]}」`
    }

    if (playerStore.money < cost.money) return '金币不足'
    for (const mat of cost.materials) {
      if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) {
        const itemName = getItemById(mat.itemId)?.name ?? mat.itemId
        return `${itemName}不足（${inventoryStore.getItemCount(mat.itemId)}/${mat.quantity}）`
      }
    }
    return ''
  }

  const handleUpgrade = (type: ToolType) => {
    const tool = inventoryStore.getTool(type)
    if (!tool) return
    const cost = getUpgradeCost(type, tool.tier)
    if (!cost) return
    if (!canUpgrade(type)) {
      addLog('条件不足，无法升级。')
      return
    }

    playerStore.spendMoney(cost.money)
    for (const mat of cost.materials) {
      inventoryStore.removeItem(mat.itemId, mat.quantity)
    }
    inventoryStore.startUpgrade(type, cost.toTier)

    addLog(`你把${TOOL_NAMES[type]}和材料交给了小满，${cost.money}文。2天后可以取回升级后的工具。`)
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.toolUpgrade)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) {
      handleEndDay()
      return
    }
  }
</script>
