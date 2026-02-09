<template>
  <div>
    <h3 class="text-accent text-sm mb-3">
      <Fish :size="14" class="inline" />
      {{ currentLocationName }}钓鱼
    </h3>

    <!-- 小游戏阶段 -->
    <div v-if="miniGameActive && miniGameParams">
      <FishingMiniGame
        v-bind="miniGameParams"
        @complete="handleMiniGameComplete"
      />
    </div>

    <!-- 未开始钓鱼 -->
    <div v-else>
      <!-- 地点选择 -->
      <div class="mb-3">
        <p class="text-xs text-muted mb-1">选择钓鱼地点：</p>
        <div class="flex gap-1 flex-wrap mb-1">
          <button
            v-for="loc in FISHING_LOCATIONS"
            :key="loc.id"
            class="btn text-xs py-0.5 px-2"
            :class="{ '!bg-accent !text-bg': fishingStore.fishingLocation === loc.id }"
            @click="handleSetLocation(loc.id)"
          >
            <MapPin :size="12" />
            {{ loc.name }}
          </button>
        </div>
        <p class="text-xs text-muted">{{ currentLocationDesc }}</p>
      </div>
      <!-- 装备面板 -->
      <div class="mb-3 border border-accent/20 rounded p-2">
        <p class="text-xs text-muted mb-2">装备</p>
        <div class="flex gap-3 items-center flex-wrap">
          <!-- 鱼饵 -->
          <div class="flex items-center gap-1">
            <span class="text-xs">鱼饵:</span>
            <span v-if="fishingStore.equippedBait" class="text-xs text-accent">{{ getBaitName(fishingStore.equippedBait) }}</span>
            <span v-else class="text-xs text-muted">无</span>
            <button v-if="fishingStore.equippedBait" class="btn text-xs py-0 px-1" @click="handleUnequipBait">
              <X :size="14" />
              卸下
            </button>
            <select
              v-if="availableBaits.length > 0 && !fishingStore.equippedBait"
              class="text-xs bg-bg border border-accent/30 rounded px-1 py-0.5"
              @change="handleEquipBait($event)"
            >
              <option value="">选择鱼饵</option>
              <option v-for="b in availableBaits" :key="b.id" :value="b.id">{{ b.name }} (×{{ b.count }})</option>
            </select>
          </div>
          <!-- 浮漂 -->
          <div class="flex items-center gap-1">
            <span class="text-xs">浮漂:</span>
            <span v-if="fishingStore.equippedTackle" class="text-xs text-accent">
              {{ getTackleName(fishingStore.equippedTackle) }}
              <span class="text-muted">({{ fishingStore.tackleDurability }})</span>
            </span>
            <span v-else class="text-xs text-muted">无</span>
            <button v-if="fishingStore.equippedTackle" class="btn text-xs py-0 px-1" @click="handleUnequipTackle">
              <X :size="14" />
              卸下
            </button>
            <select
              v-if="availableTackles.length > 0 && !fishingStore.equippedTackle"
              class="text-xs bg-bg border border-accent/30 rounded px-1 py-0.5"
              @change="handleEquipTackle($event)"
            >
              <option value="">选择浮漂</option>
              <option v-for="t in availableTackles" :key="t.id" :value="t.id">{{ t.name }} (×{{ t.count }})</option>
            </select>
          </div>
        </div>
      </div>

      <p class="text-xs text-muted mb-3">当前可钓：{{ fishingStore.availableFish.map(f => f.name).join('、') || '无' }}</p>
      <button class="btn text-xs" @click="handleStartFishing">
        <Target :size="14" />
        抛竿
      </button>

      <!-- 上次结果 -->
      <div v-if="lastResult" class="mt-3 text-xs">
        <p>{{ lastResult }}</p>
      </div>

      <!-- 蟹笼管理 -->
      <div class="mt-4 border border-accent/20 rounded p-2">
        <p class="text-xs text-accent mb-2">
          <Box :size="12" class="inline" />
          蟹笼 ({{ fishingStore.crabPots.length }}/{{ 10 }})
        </p>
        <div v-if="fishingStore.crabPots.length === 0 && !hasCrabPotInBag" class="text-xs text-muted">购买或制造蟹笼后可在此放置。</div>
        <div class="space-y-2">
          <div v-for="loc in FISHING_LOCATIONS" :key="loc.id">
            <div v-if="crabPotInfo(loc.id)" class="flex items-center gap-2 flex-wrap">
              <span class="text-xs">{{ loc.name }}: {{ crabPotInfo(loc.id)!.total }}个</span>
              <span class="text-xs text-muted">({{ crabPotInfo(loc.id)!.baited }}有饵)</span>
              <button class="btn text-xs py-0 px-1" @click="handleBaitCrabPots(loc.id)">装饵</button>
              <button class="btn text-xs py-0 px-1" @click="handleRemoveCrabPot(loc.id)">回收</button>
            </div>
          </div>
        </div>
        <div v-if="hasCrabPotInBag" class="mt-2">
          <button class="btn text-xs" @click="handlePlaceCrabPot">
            <Box :size="14" />
            放置蟹笼 ({{ currentLocationName }})
          </button>
        </div>
      </div>

      <!-- 淘金区域 -->
      <div class="mt-4 border border-accent/20 rounded p-2">
        <p class="text-xs text-accent mb-2">
          <CircleDot :size="12" class="inline" />
          淘金
        </p>
        <template v-if="canPan">
          <p class="text-xs text-muted mb-2">雨天河水涨起，可以用淘金盘在水边淘金。</p>
          <button class="btn text-xs" @click="handlePan">
            <CircleDot :size="14" />
            淘金一次
          </button>
          <div v-if="panResult" class="mt-2 text-xs">
            <p>{{ panResult }}</p>
          </div>
        </template>
        <p v-else class="text-xs text-muted">{{ panDisabledReason }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Fish, X, Target, MapPin, Box, CircleDot } from 'lucide-vue-next'
  import { useFishingStore, useGameStore, useInventoryStore, usePlayerStore, useSkillStore, useAchievementStore } from '@/stores'
  import { getBaitById, getTackleById } from '@/data/processing'
  import { FISHING_LOCATIONS } from '@/data/fish'
  import type { BaitType, TackleType, FishingLocation, MiniGameParams, MiniGameResult } from '@/types'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { sfxFishCatch, sfxLineBroken, sfxClick } from '@/composables/useAudio'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'
  import FishingMiniGame from './FishingMiniGame.vue'

  const fishingStore = useFishingStore()
  const gameStore = useGameStore()
  const inventoryStore = useInventoryStore()
  const lastResult = ref<string | null>(null)

  /** 小游戏阶段状态 */
  const miniGameActive = ref(false)
  const miniGameParams = ref<MiniGameParams | null>(null)

  /** 当前地点名称 */
  const currentLocationName = computed(() => {
    return FISHING_LOCATIONS.find(l => l.id === fishingStore.fishingLocation)?.name ?? '溪流'
  })

  /** 当前地点描述 */
  const currentLocationDesc = computed(() => {
    return FISHING_LOCATIONS.find(l => l.id === fishingStore.fishingLocation)?.description ?? ''
  })

  /** 切换钓鱼地点 */
  const handleSetLocation = (loc: FishingLocation) => {
    fishingStore.setLocation(loc)
    sfxClick()
  }

  /** 背包中可用的鱼饵 */
  const ALL_BAIT_TYPES: BaitType[] = ['standard_bait', 'wild_bait', 'magic_bait', 'deluxe_bait', 'targeted_bait']
  const availableBaits = computed(() => {
    return ALL_BAIT_TYPES.map(id => ({ id, name: getBaitById(id)?.name ?? id, count: inventoryStore.getItemCount(id) })).filter(
      b => b.count > 0
    )
  })

  /** 背包中可用的浮漂 */
  const availableTackles = computed(() => {
    const tackleTypes: TackleType[] = ['spinner', 'trap_bobber', 'cork_bobber', 'quality_bobber', 'lead_bobber']
    const rodTier = inventoryStore.getTool?.('fishingRod')?.tier ?? 'basic'
    if (rodTier === 'basic') return []
    return tackleTypes
      .map(id => ({ id, name: getTackleById(id)?.name ?? id, count: inventoryStore.getItemCount(id) }))
      .filter(t => t.count > 0)
  })

  /** 背包中是否有蟹笼 */
  const hasCrabPotInBag = computed(() => inventoryStore.getItemCount('crab_pot') > 0)

  const getBaitName = (type: BaitType): string => {
    return getBaitById(type)?.name ?? type
  }

  const getTackleName = (type: TackleType): string => {
    return getTackleById(type)?.name ?? type
  }

  const crabPotInfo = (locId: string) => {
    return fishingStore.crabPotsByLocation[locId as FishingLocation] ?? null
  }

  const handleEquipBait = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value as BaitType
    if (!value) return
    const result = fishingStore.equipBait(value)
    addLog(result.message)
    ;(event.target as HTMLSelectElement).value = ''
  }

  const handleUnequipBait = () => {
    const msg = fishingStore.unequipBait()
    addLog(msg)
  }

  const handleEquipTackle = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value as TackleType
    if (!value) return
    const result = fishingStore.equipTackle(value)
    addLog(result.message)
    ;(event.target as HTMLSelectElement).value = ''
  }

  const handleUnequipTackle = () => {
    const msg = fishingStore.unequipTackle()
    addLog(msg)
  }

  const handleStartFishing = () => {
    if (gameStore.isPastBedtime) {
      addLog('太晚了，没法钓鱼了。')
      handleEndDay()
      return
    }
    if (!inventoryStore.isToolAvailable('fishingRod')) {
      addLog('鱼竿正在升级中，无法钓鱼。')
      return
    }
    const result = fishingStore.startFishing()
    if (result.success) {
      sfxClick()
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.fishStart)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) {
        handleEndDay()
        return
      }
      // 进入小游戏阶段
      miniGameParams.value = fishingStore.calculateMiniGameParams()
      miniGameActive.value = true
    }
    addLog(result.message)
    if (!result.success) {
      lastResult.value = result.message
    }
  }

  /** 小游戏完成 */
  const handleMiniGameComplete = (result: MiniGameResult) => {
    miniGameActive.value = false
    miniGameParams.value = null

    const ratingNames: Record<string, string> = {
      perfect: '完美',
      excellent: '优秀',
      good: '良好',
      poor: '失败'
    }
    addLog(`小游戏评级：${ratingNames[result.rating]}！`)

    const catchResult = fishingStore.completeFishing(result.rating)
    if (catchResult) {
      addLog(catchResult.message)
      lastResult.value = catchResult.message
      if (catchResult.message.includes('钓上')) sfxFishCatch()
      else if (catchResult.message.includes('跑')) sfxLineBroken()
    }
  }

  /** 蟹笼操作 */
  const handlePlaceCrabPot = () => {
    const result = fishingStore.placeCrabPot(fishingStore.fishingLocation)
    addLog(result.message)
  }

  const handleRemoveCrabPot = (locId: string) => {
    const result = fishingStore.removeCrabPot(locId as FishingLocation)
    addLog(result.message)
  }

  const handleBaitCrabPots = (locId: string) => {
    const result = fishingStore.baitCrabPots(locId as FishingLocation)
    addLog(result.message)
  }

  // === 淘金 ===

  const playerStore = usePlayerStore()
  const skillStore = useSkillStore()
  const achievementStore = useAchievementStore()

  const panResult = ref<string | null>(null)

  /** 可淘金的地点 */
  const PAN_LOCATIONS: FishingLocation[] = ['creek', 'river', 'waterfall']

  /** 是否可以淘金 */
  const canPan = computed(() => {
    return gameStore.isRainy && PAN_LOCATIONS.includes(fishingStore.fishingLocation)
  })

  /** 淘金禁用原因 */
  const panDisabledReason = computed(() => {
    if (!gameStore.isRainy) return '需要雨天才能淘金（河水上涨时沙金露出）。'
    if (!PAN_LOCATIONS.includes(fishingStore.fishingLocation)) return '当前地点无法淘金，需前往溪流、江河或瀑布。'
    return ''
  })

  /** 淘金掉落表 */
  const handlePan = () => {
    if (gameStore.isPastBedtime) {
      addLog('太晚了，没法淘金了。')
      handleEndDay()
      return
    }

    if (!inventoryStore.isToolAvailable('pan')) {
      addLog('淘金盘正在升级中，无法淘金。')
      return
    }

    const panMultiplier = inventoryStore.getToolStaminaMultiplier('pan')
    const cost = Math.max(1, Math.floor(3 * panMultiplier))
    if (!playerStore.consumeStamina(cost)) {
      addLog('体力不足，无法淘金。')
      return
    }

    const panTier = inventoryStore.getTool('pan')?.tier ?? 'basic'
    const tiers: string[] = ['basic', 'iron', 'steel', 'iridium']
    const tierIndex = tiers.indexOf(panTier)

    const roll = Math.random()
    let itemId: string
    let qty = 1
    let name: string

    if (roll < 0.35) {
      itemId = 'copper_ore'
      qty = 1 + Math.floor(Math.random() * 2)
      name = `铜矿×${qty}`
    } else if (roll < 0.60) {
      itemId = tierIndex >= 1 ? 'iron_ore' : 'copper_ore'
      qty = 1 + Math.floor(Math.random() * 2)
      name = `${tierIndex >= 1 ? '铁矿' : '铜矿'}×${qty}`
    } else if (roll < 0.75) {
      itemId = tierIndex >= 2 ? 'gold_ore' : 'iron_ore'
      qty = 1
      name = tierIndex >= 2 ? '金矿' : '铁矿'
    } else if (roll < 0.85) {
      itemId = 'quartz'
      qty = 1
      name = '石英'
    } else if (roll < 0.90) {
      itemId = 'amethyst'
      qty = 1
      name = '紫水晶'
    } else if (roll < 0.95) {
      itemId = 'topaz'
      qty = 1
      name = '黄晶'
    } else {
      const goldNuggetChance = tierIndex >= 3 ? 0.15 : 0.05
      if (Math.random() < goldNuggetChance / 0.05) {
        itemId = 'gold_nugget'
        qty = 1
        name = '金砂'
      } else {
        itemId = 'copper_ore'
        qty = 2
        name = '铜矿×2'
      }
    }

    inventoryStore.addItem(itemId, qty)
    achievementStore.discoverItem(itemId)
    skillStore.addExp('mining', 5)
    panResult.value = `淘到了${name}！(-${cost}体力)`
    addLog(`淘金获得了${name}。(-${cost}体力)`)

    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.pan)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) handleEndDay()
  }
</script>
