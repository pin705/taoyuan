<template>
  <div>
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center gap-1.5 text-sm text-accent">
        <Package :size="14" />
        <span>背包</span>
      </div>
      <span class="text-xs text-muted">{{ inventoryStore.items.length }}/{{ inventoryStore.capacity }}</span>
    </div>

    <!-- 页签切换 -->
    <div class="flex gap-1 mb-3">
      <button class="btn text-xs flex-1 justify-center" :class="{ 'bg-accent! text-bg!': tab === 'items' }" @click="tab = 'items'">
        物品
      </button>
      <button class="btn text-xs flex-1 justify-center" :class="{ 'bg-accent! text-bg!': tab === 'tools' }" @click="tab = 'tools'">
        装备
      </button>
    </div>

    <!-- 物品页 -->
    <template v-if="tab === 'items'">
      <div v-if="inventoryStore.items.length > 0" class="grid grid-cols-3 md:grid-cols-5 gap-1.5">
        <div
          v-for="item in inventoryStore.items"
          :key="item.itemId + item.quality"
          class="border border-accent/20 rounded-xs p-1.5 text-center cursor-pointer hover:bg-accent/5 transition-colors"
          @click="activeItemKey = item.itemId + ':' + item.quality"
        >
          <div
            class="text-xs truncate"
            :class="{
              'text-quality-fine': item.quality === 'fine',
              'text-quality-excellent': item.quality === 'excellent',
              'text-quality-supreme': item.quality === 'supreme'
            }"
          >
            {{ getItemById(item.itemId)?.name }}
          </div>
          <div class="text-xs text-muted">×{{ item.quantity }}</div>
        </div>

        <!-- 空格子 -->
        <div
          v-for="i in Math.max(0, inventoryStore.capacity - inventoryStore.items.length)"
          :key="'empty-' + i"
          class="border border-accent/10 rounded-xs p-1.5 text-center text-xs text-muted/30"
        >
          空
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-4 text-muted">
        <Package :size="24" />
        <p class="text-xs mt-1">背包是空的</p>
      </div>
    </template>

    <!-- 装备页 -->
    <template v-if="tab === 'tools'">
      <!-- 工具 -->
      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <p class="text-xs text-muted mb-1">工具</p>
        <div class="flex flex-col gap-1">
          <div
            v-for="tool in inventoryStore.tools"
            :key="tool.type"
            class="flex items-center justify-between border border-accent/10 rounded-xs px-2 py-1"
          >
            <span class="text-xs">{{ TOOL_NAMES[tool.type] }}</span>
            <span class="text-xs text-muted">{{ TIER_NAMES[tool.tier] }}</span>
          </div>
        </div>
      </div>

      <!-- 武器 -->
      <div class="border border-accent/20 rounded-xs p-2 mb-3">
        <p class="text-xs text-muted mb-1">武器</p>
        <div class="flex flex-col gap-1">
          <div
            v-for="(weapon, idx) in inventoryStore.ownedWeapons"
            :key="idx"
            class="flex items-center justify-between border rounded-xs px-2 py-1 cursor-pointer hover:bg-accent/5"
            :class="idx === inventoryStore.equippedWeaponIndex ? 'border-accent/30' : 'border-accent/10'"
            @click="inventoryStore.equipWeapon(idx)"
          >
            <span class="text-xs" :class="idx === inventoryStore.equippedWeaponIndex ? 'text-accent' : ''">
              {{ getWeaponDisplayName(weapon.defId, weapon.enchantmentId) }}
            </span>
            <span v-if="idx === inventoryStore.equippedWeaponIndex" class="text-xs text-accent">装备中</span>
          </div>
        </div>
      </div>

      <!-- 戒指 -->
      <div class="border border-accent/20 rounded-xs p-2">
        <p class="text-xs text-muted mb-1">戒指</p>
        <div v-if="inventoryStore.ownedRings.length > 0" class="flex flex-col gap-1">
          <!-- 槽位 -->
          <div class="flex gap-1 mb-1">
            <div class="flex-1 border border-accent/10 rounded-xs px-2 py-1 text-center">
              <p class="text-[10px] text-muted">槽位1</p>
              <p class="text-xs" :class="equippedRing1Name ? 'text-accent' : 'text-muted/40'">
                {{ equippedRing1Name ?? '空' }}
              </p>
            </div>
            <div class="flex-1 border border-accent/10 rounded-xs px-2 py-1 text-center">
              <p class="text-[10px] text-muted">槽位2</p>
              <p class="text-xs" :class="equippedRing2Name ? 'text-accent' : 'text-muted/40'">
                {{ equippedRing2Name ?? '空' }}
              </p>
            </div>
          </div>
          <!-- 拥有的戒指列表 -->
          <div
            v-for="(ring, idx) in inventoryStore.ownedRings"
            :key="idx"
            class="flex items-center justify-between border rounded-xs px-2 py-1"
            :class="isRingEquipped(idx) ? 'border-accent/30' : 'border-accent/10'"
          >
            <div class="min-w-0">
              <span class="text-xs" :class="isRingEquipped(idx) ? 'text-accent' : ''">
                {{ getRingById(ring.defId)?.name ?? ring.defId }}
              </span>
              <p class="text-[10px] text-muted truncate">{{ getRingById(ring.defId)?.description }}</p>
            </div>
            <div class="flex gap-1 shrink-0 ml-2">
              <template v-if="isRingEquipped(idx)">
                <button class="btn text-xs py-0 px-1.5" @click="handleUnequipRing(idx)">卸下</button>
              </template>
              <template v-else>
                <button class="btn text-xs py-0 px-1.5" @click="inventoryStore.equipRing(idx, 0)">槽1</button>
                <button class="btn text-xs py-0 px-1.5" @click="inventoryStore.equipRing(idx, 1)">槽2</button>
              </template>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-muted/40 text-center py-2">暂无戒指</p>
      </div>
    </template>

    <!-- 物品详情弹窗 -->
    <Transition name="panel-fade">
      <div v-if="activeItem" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="activeItemKey = null">
        <div class="game-panel max-w-xs w-full relative">
          <button class="absolute top-2 right-2 text-muted hover:text-text" @click="activeItemKey = null">
            <X :size="14" />
          </button>

          <p
            class="text-sm mb-2"
            :class="{
              'text-quality-fine': activeItem.quality === 'fine',
              'text-quality-excellent': activeItem.quality === 'excellent',
              'text-quality-supreme': activeItem.quality === 'supreme',
              'text-accent': activeItem.quality === 'normal'
            }"
          >
            {{ activeItemDef?.name }}
          </p>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <p class="text-xs text-muted">{{ activeItemDef?.description }}</p>
          </div>

          <div class="border border-accent/10 rounded-xs p-2 mb-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">数量</span>
              <span class="text-xs">×{{ activeItem.quantity }}</span>
            </div>
            <div v-if="activeItem.quality !== 'normal'" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">品质</span>
              <span
                class="text-xs"
                :class="{
                  'text-quality-fine': activeItem.quality === 'fine',
                  'text-quality-excellent': activeItem.quality === 'excellent',
                  'text-quality-supreme': activeItem.quality === 'supreme'
                }"
              >
                {{ QUALITY_NAMES[activeItem.quality] }}
              </span>
            </div>
            <div v-if="activeItemDef?.sellPrice" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">售价</span>
              <span class="text-xs text-accent">{{ activeItemDef.sellPrice }}文</span>
            </div>
            <div v-if="activeItemDef?.staminaRestore" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">恢复</span>
              <span class="text-xs text-success">
                +{{ activeItemDef.staminaRestore }}体力
                <template v-if="activeItemDef.healthRestore">/ +{{ activeItemDef.healthRestore }}HP</template>
              </span>
            </div>
            <div v-if="activeItemBuff" class="flex items-center justify-between mt-0.5">
              <span class="text-xs text-muted">增益</span>
              <span class="text-xs text-accent">{{ activeItemBuff.description }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <button
              v-if="isEdible(activeItem.itemId)"
              class="btn text-xs w-full justify-center"
              @click="handleEat(activeItem.itemId, activeItem.quality)"
            >
              <Apple :size="12" />
              食用
            </button>
            <button
              v-if="isUsable(activeItem.itemId)"
              class="btn text-xs w-full justify-center"
              @click="handleUse(activeItem.itemId, activeItem.quality)"
            >
              <Zap :size="12" />
              使用
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Apple, Package, X, Zap } from 'lucide-vue-next'
  import { useInventoryStore, usePlayerStore, useSkillStore, useGameStore, useCookingStore } from '@/stores'
  import { getItemById, TOOL_NAMES, TIER_NAMES } from '@/data'
  import { getRecipeById } from '@/data/recipes'
  import { getWeaponDisplayName } from '@/data/weapons'
  import { getRingById } from '@/data/rings'
  import { QUALITY_NAMES } from '@/composables/useFarmActions'
  import { addLog } from '@/composables/useGameLog'
  import type { Quality } from '@/types'

  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const skillStore = useSkillStore()
  const gameStore = useGameStore()
  const cookingStore = useCookingStore()

  // === 页签 ===

  const tab = ref<'items' | 'tools'>('items')

  // === 装备页辅助 ===

  const equippedRing1Name = computed(() => {
    const idx = inventoryStore.equippedRingSlot1
    const ring = inventoryStore.ownedRings[idx]
    if (!ring) return null
    return getRingById(ring.defId)?.name ?? null
  })

  const equippedRing2Name = computed(() => {
    const idx = inventoryStore.equippedRingSlot2
    const ring = inventoryStore.ownedRings[idx]
    if (!ring) return null
    return getRingById(ring.defId)?.name ?? null
  })

  const isRingEquipped = (idx: number): boolean => {
    return inventoryStore.equippedRingSlot1 === idx || inventoryStore.equippedRingSlot2 === idx
  }

  const handleUnequipRing = (idx: number) => {
    if (inventoryStore.equippedRingSlot1 === idx) inventoryStore.unequipRing(0)
    else if (inventoryStore.equippedRingSlot2 === idx) inventoryStore.unequipRing(1)
  }

  // === 物品弹窗 ===

  const activeItemKey = ref<string | null>(null)

  const activeItem = computed(() => {
    if (!activeItemKey.value) return null
    const [itemId, quality] = activeItemKey.value.split(':')
    return inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality) ?? null
  })

  const activeItemDef = computed(() => {
    if (!activeItem.value) return null
    return getItemById(activeItem.value.itemId) ?? null
  })

  /** 烹饪品的buff描述 */
  const activeItemBuff = computed(() => {
    if (!activeItem.value) return null
    const itemId = activeItem.value.itemId
    if (!itemId.startsWith('food_')) return null
    const recipe = getRecipeById(itemId.slice(5))
    return recipe?.effect.buff ?? null
  })

  const isEdible = (itemId: string): boolean => {
    const def = getItemById(itemId)
    return !!def?.edible && !!def.staminaRestore
  }

  const handleEat = (itemId: string, quality: Quality) => {
    const def = getItemById(itemId)
    if (!def?.edible || !def.staminaRestore) return
    const staminaFull = playerStore.stamina >= playerStore.maxStamina
    const hpFull = playerStore.hp >= playerStore.getMaxHp()
    if (staminaFull && hpFull) {
      addLog('体力和生命值都已满，不需要食用。')
      return
    }

    // 烹饪品走 cookingStore.eat()，以正确应用buff、厨房加成等
    if (itemId.startsWith('food_')) {
      const recipeId = itemId.slice(5) // 去掉 'food_' 前缀
      const result = cookingStore.eat(recipeId)
      if (result.success) {
        addLog(result.message)
      } else {
        addLog(result.message)
      }
      // 物品消耗完则关闭弹窗
      if (!inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality)) {
        activeItemKey.value = null
      }
      return
    }

    if (!inventoryStore.removeItem(itemId, 1, quality)) return
    // 炼金师专精：食物恢复+50%
    const alchemistBonus = skillStore.getSkill('foraging').perk10 === 'alchemist' ? 1.5 : 1.0
    const staminaRestore = Math.floor(def.staminaRestore * alchemistBonus)
    playerStore.restoreStamina(staminaRestore)
    let msg = `食用了${def.name}，恢复${staminaRestore}体力`
    if (def.healthRestore) {
      const healthRestore = Math.floor(def.healthRestore * alchemistBonus)
      playerStore.restoreHealth(healthRestore)
      msg += `、${healthRestore}生命值`
    }
    msg += '。'
    addLog(msg)
    // 物品消耗完则关闭弹窗
    if (!inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality)) {
      activeItemKey.value = null
    }
  }

  /** 可使用的特殊物品 */
  const USABLE_ITEMS = new Set(['rain_totem'])

  const isUsable = (itemId: string): boolean => {
    return USABLE_ITEMS.has(itemId)
  }

  const handleUse = (itemId: string, quality: Quality) => {
    if (itemId === 'rain_totem') {
      if (!inventoryStore.removeItem(itemId, 1, quality)) return
      gameStore.setTomorrowWeather('rainy')
      addLog('你使用了雨图腾，明天将会下雨。')
    }
    // 物品消耗完则关闭弹窗
    if (!inventoryStore.items.find(i => i.itemId === itemId && i.quality === quality)) {
      activeItemKey.value = null
    }
  }
</script>
