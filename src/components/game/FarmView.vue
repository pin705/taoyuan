<template>
  <div>
    <h3 class="text-accent text-sm mb-3">你的田庄 ({{ farmStore.farmSize }}×{{ farmStore.farmSize }})</h3>

    <!-- 批量操作按钮 -->
    <div class="flex gap-2 mb-3 flex-wrap">
      <button class="btn text-xs" :disabled="unwateredCount === 0" @click="doBatchWater">
        <Droplets :size="14" />
        一键浇水 ({{ Math.min(waterBatchCount, unwateredCount) }}块)
      </button>
      <button class="btn text-xs" :disabled="wastelandCount === 0" @click="doBatchTill">
        <Shovel :size="14" />
        一键开垦 ({{ Math.min(tillBatchCount, wastelandCount) }}块)
      </button>
      <button class="btn text-xs" :disabled="harvestableCount === 0" @click="doBatchHarvest">
        <Wheat :size="14" />
        一键收获 ({{ scytheBatchCount >= 8 ? harvestableCount : Math.min(scytheBatchCount, harvestableCount) }}块)
      </button>
    </div>

    <!-- 农场网格 -->
    <div class="grid gap-1 max-w-full md:max-w-md" :style="{ gridTemplateColumns: `repeat(${farmStore.farmSize}, minmax(0, 1fr))` }">
      <button
        v-for="plot in farmStore.plots"
        :key="plot.id"
        class="aspect-square rounded-[2px] flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-accent/60 hover:bg-panel/80 relative leading-tight"
        :class="[getPlotDisplay(plot).color, needsWater(plot) ? 'border-2 border-danger/50' : 'border border-accent/20']"
        :title="getPlotTooltip(plot)"
        @click="activePlotId = plot.id"
      >
        <span class="text-xs">{{ getPlotDisplay(plot).text }}</span>
        <span v-if="plot.cropId" class="text-[10px] opacity-70 truncate max-w-full px-0.5">{{ getCropName(plot.cropId) }}</span>
        <!-- 需浇水标记 -->
        <Droplets
          v-if="(plot.state === 'planted' || plot.state === 'growing') && !plot.watered"
          :size="8"
          class="absolute bottom-0 right-0 text-danger"
        />
        <!-- 洒水器标记 -->
        <Droplet v-if="hasSprinkler(plot.id)" :size="8" class="absolute top-0 right-0 text-water" />
        <!-- 肥料标记 -->
        <CirclePlus v-if="plot.fertilizer" :size="8" class="absolute bottom-0 left-0 text-success" />
      </button>
    </div>

    <!-- 地块操作弹窗 -->
    <Transition name="panel-fade">
      <div v-if="activePlot" class="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4" @click.self="activePlotId = null">
        <div class="game-panel max-w-xs w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-accent text-sm">地块 #{{ activePlot.id + 1 }}</p>
            <button class="btn text-xs py-0 px-1" @click="activePlotId = null">
              <X :size="12" />
            </button>
          </div>

          <!-- 状态信息 -->
          <div class="text-xs space-y-1 mb-3 border-b border-accent/20 pb-2">
            <p>状态：{{ plotStateLabel }}{{ activePlot.giantCropGroup !== null ? '（巨型作物）' : '' }}</p>
            <p v-if="activePlot.cropId">
              作物：{{ activePlot.giantCropGroup !== null ? '巨型' : '' }}{{ getCropName(activePlot.cropId) }} ({{
                activePlot.growthDays
              }}/{{ plotCropGrowthDays }}天)
            </p>
            <p v-if="activePlot.cropId && activePlot.giantCropGroup === null">浇水：{{ activePlot.watered ? '已浇水' : '未浇水' }}</p>
            <p v-if="activePlot.giantCropGroup !== null" class="text-accent">收获可获得大量作物！</p>
            <p v-if="activePlot.fertilizer">肥料：{{ plotFertName }}</p>
            <p v-if="hasSprinkler(activePlot.id)">洒水器：已安装</p>
          </div>

          <!-- 操作按钮 -->

          <!-- 荒地 → 开垦 -->
          <button v-if="activePlot.state === 'wasteland'" class="btn text-xs w-full mb-1" @click="doTill">开垦</button>

          <!-- 已耕 → 种植列表 -->
          <template v-if="activePlot.state === 'tilled' && plantableSeeds.length > 0">
            <p class="text-xs text-muted mb-1">种植：</p>
            <div class="flex flex-wrap gap-1 mb-2">
              <button v-for="seed in plantableSeeds" :key="seed.cropId" class="btn text-xs" @click="doPlant(seed.cropId)">
                {{ seed.name }} (×{{ seed.count }})
              </button>
            </div>
          </template>

          <!-- 未浇水 → 浇水 -->
          <button v-if="canWater" class="btn text-xs w-full mb-1" @click="doWater">浇水</button>

          <!-- 可收获 → 收获 -->
          <button v-if="activePlot.state === 'harvestable'" class="btn text-xs w-full mb-1 !bg-accent !text-bg" @click="doHarvest">
            收获
          </button>

          <!-- 施肥（非荒地且无肥料） -->
          <template v-if="canFertilize && fertilizerItems.length > 0">
            <p class="text-xs text-muted mb-1">施肥：</p>
            <div class="flex flex-wrap gap-1 mb-2">
              <button v-for="f in fertilizerItems" :key="f.itemId" class="btn text-xs" @click="doFertilize(f.type)">
                {{ f.name }} (×{{ f.count }})
              </button>
            </div>
          </template>

          <!-- 洒水器 -->
          <template v-if="!hasSprinkler(activePlot.id) && sprinklerItems.length > 0">
            <p class="text-xs text-muted mb-1">洒水器：</p>
            <div class="flex flex-wrap gap-1 mb-2">
              <button v-for="s in sprinklerItems" :key="s.itemId" class="btn text-xs" @click="doPlaceSprinkler(s.type)">
                {{ s.name }} (×{{ s.count }})
              </button>
            </div>
          </template>
          <button v-if="hasSprinkler(activePlot.id)" class="btn text-xs w-full mb-1" @click="doRemoveSprinkler">拆除洒水器</button>
        </div>
      </div>
    </Transition>

    <!-- 图例 -->
    <div class="flex gap-4 mt-3 text-xs text-muted flex-wrap">
      <span>
        <span class="text-muted">荒</span>
        =荒地
      </span>
      <span>
        <span class="text-earth">耕</span>
        =已耕
      </span>
      <span>
        <span class="text-success/60">苗</span>
        =已种
      </span>
      <span>
        <span class="text-success">长</span>
        =生长中
      </span>
      <span>
        <span class="text-water">润</span>
        =已浇水
      </span>
      <span>
        <span class="text-accent">熟</span>
        =可收获
      </span>
      <span>
        <Droplet :size="12" class="text-water inline" />
        =洒水器
      </span>
      <span>
        <CirclePlus :size="12" class="text-success inline" />
        =肥料
      </span>
      <span>
        <Droplets :size="12" class="text-danger inline" />
        =需浇水
      </span>
      <span>
        <span class="text-accent">巨</span>
        =巨型作物
      </span>
    </div>
    <!-- 浇水提示 -->
    <p v-if="unwateredCount > 0" class="text-xs text-danger mt-1">还有 {{ unwateredCount }} 块地需要浇水</p>
    <!-- 农场设施 -->
    <div class="text-xs text-muted mt-1 flex gap-3">
      <span v-if="farmStore.scarecrows > 0">稻草人: {{ farmStore.scarecrows }}</span>
      <span v-else class="text-danger/80">无稻草人（乌鸦可能偷吃作物）</span>
      <span v-if="farmStore.lightningRods > 0">避雷针: {{ farmStore.lightningRods }}</span>
    </div>

    <!-- 出货箱 -->
    <div class="mt-4 border-t border-accent/20 pt-3">
      <h3 class="text-accent text-sm mb-2">
        <ArrowRight :size="14" class="inline" />
        出货箱
      </h3>
      <p class="text-muted text-xs mb-2">放入出货箱的物品将在次日结算。</p>

      <!-- 已放入的物品 -->
      <div v-if="shopStore.shippingBox.length > 0" class="flex flex-col gap-1 mb-2">
        <div
          v-for="(entry, idx) in shopStore.shippingBox"
          :key="idx"
          class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-1.5"
        >
          <div>
            <span class="text-sm">{{ getItemName(entry.itemId) }}</span>
            <span
              v-if="entry.quality !== 'normal'"
              class="text-xs ml-1"
              :class="{
                'text-quality-fine': entry.quality === 'fine',
                'text-quality-excellent': entry.quality === 'excellent',
                'text-quality-supreme': entry.quality === 'supreme'
              }"
            >
              {{ QUALITY_NAMES[entry.quality] }}
            </span>
            <span class="text-muted text-xs ml-1">×{{ entry.quantity }}</span>
            <span class="text-accent text-xs ml-2">≈{{ shopStore.calculateSellPrice(entry.itemId, entry.quantity, entry.quality) }}文</span>
          </div>
          <button class="btn text-xs" @click="handleRemoveFromBox(entry.itemId, entry.quantity, entry.quality)">取出</button>
        </div>
        <p class="text-xs text-accent mt-1">预计收入：{{ shippingBoxTotal }}文</p>
      </div>
      <p v-else class="text-muted text-xs mb-2">出货箱是空的。</p>

      <!-- 可放入的背包物品 -->
      <div v-if="shippableItems.length > 0" class="flex flex-col gap-1 overflow-auto h-50">
        <div
          v-for="item in shippableItems"
          :key="item.itemId + item.quality"
          class="flex items-center justify-between border border-accent/10 rounded-[2px] px-3 py-1.5"
        >
          <div>
            <span class="text-sm">{{ item.def?.name }}</span>
            <span
              v-if="item.quality !== 'normal'"
              class="text-xs ml-1"
              :class="{
                'text-quality-fine': item.quality === 'fine',
                'text-quality-excellent': item.quality === 'excellent',
                'text-quality-supreme': item.quality === 'supreme'
              }"
            >
              {{ QUALITY_NAMES[item.quality] }}
            </span>
            <span class="text-muted text-xs ml-1">×{{ item.quantity }}</span>
          </div>
          <div class="flex gap-1">
            <button class="btn text-xs" @click="handleAddToBox(item.itemId, 1, item.quality)">放入1</button>
            <button v-if="item.quantity > 1" class="btn text-xs" @click="handleAddToBox(item.itemId, item.quantity, item.quality)">
              全部
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 果树区 -->
    <div class="mt-4 border-t border-accent/20 pt-3">
      <h3 class="text-accent text-sm mb-2">
        <TreeDeciduous :size="14" class="inline" />
        果树 ({{ farmStore.fruitTrees.length }}/{{ MAX_FRUIT_TREES }})
      </h3>
      <div v-if="farmStore.fruitTrees.length > 0" class="flex flex-col gap-1 mb-2">
        <div v-for="tree in farmStore.fruitTrees" :key="tree.id" class="flex items-center gap-3 text-xs">
          <span class="w-16">{{ getTreeName(tree.type) }}</span>
          <span v-if="!tree.mature" class="text-muted">生长中 {{ tree.growthDays }}/28天</span>
          <span v-else-if="tree.todayFruit" class="text-accent">今日已结果</span>
          <span v-else class="text-success">已成熟 ({{ tree.yearAge }}年) · {{ getTreeFruitSeason(tree.type) }}产果</span>
          <div v-if="!tree.mature" class="flex-1 h-1.5 bg-bg rounded-[2px] border border-accent/10">
            <div
              class="h-full rounded-[2px] bg-success transition-all"
              :style="{ width: Math.floor((tree.growthDays / 28) * 100) + '%' }"
            />
          </div>
        </div>
      </div>
      <div v-if="plantableSaplings.length > 0 && farmStore.fruitTrees.length < MAX_FRUIT_TREES" class="flex gap-2 flex-wrap">
        <button v-for="s in plantableSaplings" :key="s.saplingId" class="btn text-xs" @click="handlePlantTree(s.type)">
          <TreePine :size="14" />
          种{{ s.name }} (×{{ s.count }})
        </button>
      </div>
      <p v-else-if="farmStore.fruitTrees.length === 0" class="text-xs text-muted">购买树苗后可在此种植果树。</p>
    </div>

    <!-- 野树区 -->
    <div class="mt-4 border-t border-accent/20 pt-3">
      <h3 class="text-accent text-sm mb-2">
        <TreePine :size="14" class="inline" />
        野树 ({{ farmStore.wildTrees.length }}/{{ MAX_WILD_TREES }})
      </h3>
      <div v-if="farmStore.wildTrees.length > 0" class="flex flex-col gap-1 mb-2">
        <div v-for="tree in farmStore.wildTrees" :key="tree.id" class="flex items-center gap-3 text-xs">
          <span class="w-12">{{ getWildTreeName(tree.type) }}</span>
          <template v-if="!tree.mature">
            <span class="text-muted">生长中 {{ tree.growthDays }}/{{ getWildTreeDef(tree.type)?.growthDays ?? '?' }}天</span>
            <div class="flex-1 h-1.5 bg-bg rounded-[2px] border border-accent/10">
              <div
                class="h-full rounded-[2px] bg-success transition-all"
                :style="{ width: Math.floor((tree.growthDays / (getWildTreeDef(tree.type)?.growthDays ?? 28)) * 100) + '%' }"
              />
            </div>
          </template>
          <template v-else-if="!tree.hasTapper">
            <span class="text-success">已成熟</span>
            <button v-if="hasTapper" class="btn text-xs" @click="handleAttachTapper(tree.id)">
              <Wrench :size="14" />
              装采脂器
            </button>
            <span v-else class="text-muted">需在工坊制造采脂器</span>
          </template>
          <template v-else-if="tree.tapReady">
            <span class="text-accent">可收取</span>
            <button class="btn text-xs bg-accent text-bg" @click="handleCollectTapProduct(tree.id)">
              <Gift :size="14" />
              收取
            </button>
          </template>
          <template v-else>
            <span class="text-muted">采脂中 {{ tree.tapDaysElapsed }}/{{ getWildTreeDef(tree.type)?.tapCycleDays ?? '?' }}天</span>
          </template>
        </div>
      </div>
      <div v-if="plantableWildSeeds.length > 0 && farmStore.wildTrees.length < MAX_WILD_TREES" class="flex gap-2 flex-wrap">
        <button v-for="s in plantableWildSeeds" :key="s.type" class="btn text-xs" @click="handlePlantWildTree(s.type)">
          <TreePine :size="14" />
          种{{ s.name }} (×{{ s.count }})
        </button>
      </div>
      <p v-else-if="farmStore.wildTrees.length === 0" class="text-xs text-muted">采集松果、樟树种子或桑葚后可在此种植野树。</p>
    </div>

    <!-- 温室 -->
    <div v-if="showGreenhouse" class="mt-4 border-t border-accent/20 pt-3">
      <div class="flex items-center gap-2 mb-2">
        <h3 class="text-accent text-sm">温室</h3>
        <button class="btn text-xs py-0 px-1" :class="{ 'bg-accent text-bg': greenhouseMode }" @click="greenhouseMode = !greenhouseMode">
          <template v-if="greenhouseMode">
            <ArrowLeft :size="14" />
            返回农场
          </template>
          <template v-else>
            <ArrowRight :size="14" />
            进入温室
          </template>
        </button>
      </div>
      <template v-if="greenhouseMode">
        <!-- 温室地块 -->
        <div class="grid gap-1 max-w-md" style="grid-template-columns: repeat(4, minmax(0, 1fr))">
          <button
            v-for="plot in farmStore.greenhousePlots"
            :key="plot.id"
            class="aspect-square border border-accent/20 rounded-[2px] flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-accent/60 hover:bg-panel/80 leading-tight"
            :class="getPlotDisplay(plot).color"
            :title="getPlotTooltip(plot)"
            @click="activeGhPlotId = plot.id"
          >
            <span class="text-sm">{{ getPlotDisplay(plot).text }}</span>
            <span v-if="plot.cropId" class="text-[10px] opacity-70 truncate max-w-full px-0.5">{{ getCropName(plot.cropId) }}</span>
          </button>
        </div>
      </template>
    </div>

    <!-- 温室地块操作弹窗 -->
    <Transition name="panel-fade">
      <div
        v-if="activeGhPlot"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4"
        @click.self="activeGhPlotId = null"
      >
        <div class="game-panel max-w-xs w-full">
          <div class="flex items-center justify-between mb-2">
            <p class="text-accent text-sm">温室地块 #{{ activeGhPlot.id + 1 }}</p>
            <button class="btn text-xs py-0 px-1" @click="activeGhPlotId = null">
              <X :size="12" />
            </button>
          </div>

          <div class="text-xs space-y-1 mb-3 border-b border-accent/20 pb-2">
            <p>状态：{{ ghPlotStateLabel }}</p>
            <p v-if="activeGhPlot.cropId">
              作物：{{ getCropName(activeGhPlot.cropId) }} ({{ activeGhPlot.growthDays }}/{{ ghPlotCropGrowthDays }}天)
            </p>
            <p class="text-muted">温室自动浇水，无季节限制</p>
          </div>

          <!-- 已耕 → 种植（所有种子） -->
          <template v-if="activeGhPlot.state === 'tilled' && allSeeds.length > 0">
            <p class="text-xs text-muted mb-1">种植：</p>
            <div class="flex flex-wrap gap-1 mb-2">
              <button v-for="seed in allSeeds" :key="seed.cropId" class="btn text-xs" @click="doGhPlant(seed.cropId)">
                {{ seed.name }} (×{{ seed.count }})
              </button>
            </div>
          </template>

          <!-- 可收获 → 收获 -->
          <button v-if="activeGhPlot.state === 'harvestable'" class="btn text-xs w-full mb-1 !bg-accent !text-bg" @click="doGhHarvest">
            收获
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import {
    Droplets,
    Droplet,
    TreePine,
    TreeDeciduous,
    ArrowRight,
    ArrowLeft,
    Wrench,
    Gift,
    CirclePlus,
    X,
    Shovel,
    Wheat
  } from 'lucide-vue-next'
  import {
    useFarmStore,
    useInventoryStore,
    useGameStore,
    useHomeStore,
    usePlayerStore,
    useSkillStore,
    useShopStore,
    SEASON_NAMES
  } from '@/stores'
  import { getCropById, getCropsBySeason, getItemById } from '@/data'
  import { FRUIT_TREE_DEFS, MAX_FRUIT_TREES } from '@/data/fruitTrees'
  import { WILD_TREE_DEFS, MAX_WILD_TREES, getWildTreeDef } from '@/data/wildTrees'
  import { CROPS } from '@/data/crops'
  import { FERTILIZERS, getFertilizerById } from '@/data/processing'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { addLog, showFloat } from '@/composables/useGameLog'
  import {
    handlePlotClick,
    useFarmActions,
    handleBatchWater,
    handleBatchTill,
    handleBatchHarvest,
    QUALITY_NAMES
  } from '@/composables/useFarmActions'
  import type { SprinklerType, FertilizerType, FruitTreeType, WildTreeType } from '@/types'
  import { sfxHarvest } from '@/composables/useAudio'

  const { selectedSeed } = useFarmActions()

  const farmStore = useFarmStore()
  const inventoryStore = useInventoryStore()
  const gameStore = useGameStore()
  const homeStore = useHomeStore()
  const shopStore = useShopStore()

  // === 出货箱 ===

  const getItemName = (itemId: string): string => getItemById(itemId)?.name ?? itemId

  const shippableItems = computed(() => {
    return inventoryStore.items
      .map(inv => ({ ...inv, def: getItemById(inv.itemId) }))
      .filter(item => item.def && item.def.category !== 'seed' && item.def.category !== 'machine' && item.def.category !== 'sprinkler')
  })

  const shippingBoxTotal = computed(() => {
    return shopStore.shippingBox.reduce((sum, entry) => sum + shopStore.calculateSellPrice(entry.itemId, entry.quantity, entry.quality), 0)
  })

  const handleAddToBox = (itemId: string, quantity: number, quality: import('@/types').Quality) => {
    if (shopStore.addToShippingBox(itemId, quantity, quality)) {
      const name = getItemName(itemId)
      addLog(`将${name}×${quantity}放入了出货箱。`)
    }
  }

  const handleRemoveFromBox = (itemId: string, quantity: number, quality: import('@/types').Quality) => {
    if (shopStore.removeFromShippingBox(itemId, quantity, quality)) {
      const name = getItemName(itemId)
      addLog(`从出货箱取出了${name}×${quantity}。`)
    }
  }

  // === 地块弹窗状态 ===

  const activePlotId = ref<number | null>(null)
  const activePlot = computed(() => (activePlotId.value !== null ? (farmStore.plots.find(p => p.id === activePlotId.value) ?? null) : null))

  const activeGhPlotId = ref<number | null>(null)
  const activeGhPlot = computed(() => (activeGhPlotId.value !== null ? (farmStore.greenhousePlots[activeGhPlotId.value] ?? null) : null))

  // === 弹窗显示辅助 ===

  const STATE_LABELS: Record<string, string> = {
    wasteland: '荒地',
    tilled: '已耕',
    planted: '已种',
    growing: '生长中',
    harvestable: '可收获'
  }

  const plotStateLabel = computed(() => (activePlot.value ? (STATE_LABELS[activePlot.value.state] ?? '?') : ''))
  const ghPlotStateLabel = computed(() => (activeGhPlot.value ? (STATE_LABELS[activeGhPlot.value.state] ?? '?') : ''))

  const plotCropGrowthDays = computed(() => {
    if (!activePlot.value?.cropId) return '?'
    return getCropById(activePlot.value.cropId)?.growthDays ?? '?'
  })

  const ghPlotCropGrowthDays = computed(() => {
    if (!activeGhPlot.value?.cropId) return '?'
    return getCropById(activeGhPlot.value.cropId)?.growthDays ?? '?'
  })

  const plotFertName = computed(() => {
    if (!activePlot.value?.fertilizer) return ''
    return getFertilizerById(activePlot.value.fertilizer)?.name ?? activePlot.value.fertilizer
  })

  const canWater = computed(() => {
    if (!activePlot.value) return false
    return (activePlot.value.state === 'planted' || activePlot.value.state === 'growing') && !activePlot.value.watered
  })

  const canFertilize = computed(() => {
    if (!activePlot.value) return false
    return activePlot.value.state !== 'wasteland' && !activePlot.value.fertilizer
  })

  // === 背包物品列表 ===

  const sprinklerItems = computed(() => {
    const types: { type: SprinklerType; itemId: string; name: string }[] = [
      { type: 'bamboo_sprinkler', itemId: 'bamboo_sprinkler', name: '竹筒洒水器' },
      { type: 'copper_sprinkler', itemId: 'copper_sprinkler', name: '铜管洒水器' },
      { type: 'gold_sprinkler', itemId: 'gold_sprinkler', name: '金管洒水器' }
    ]
    return types.map(s => ({ ...s, count: inventoryStore.getItemCount(s.itemId) })).filter(s => s.count > 0)
  })

  const fertilizerItems = computed(() => {
    return FERTILIZERS.map(f => ({
      type: f.id as FertilizerType,
      itemId: f.id,
      name: f.name,
      count: inventoryStore.getItemCount(f.id)
    })).filter(f => f.count > 0)
  })

  const plantableSeeds = computed(() => {
    return getCropsBySeason(gameStore.season)
      .filter(crop => inventoryStore.hasItem(crop.seedId))
      .map(crop => ({
        cropId: crop.id,
        seedId: crop.seedId,
        name: crop.name,
        count: inventoryStore.getItemCount(crop.seedId)
      }))
  })

  // === 地块显示 ===

  const getCropName = (cropId: string): string => {
    const crop = getCropById(cropId)
    return crop?.name ?? cropId
  }

  const hasSprinkler = (plotId: number): boolean => {
    return farmStore.sprinklers.some(s => s.plotId === plotId)
  }

  const needsWater = (plot: (typeof farmStore.plots)[number]): boolean => {
    return (plot.state === 'planted' || plot.state === 'growing') && !plot.watered
  }

  const unwateredCount = computed(() => farmStore.plots.filter(needsWater).length)
  const wastelandCount = computed(() => farmStore.plots.filter(p => p.state === 'wasteland').length)
  const harvestableCount = computed(() => farmStore.plots.filter(p => p.state === 'harvestable' && p.giantCropGroup === null).length)

  const waterBatchCount = computed(() => inventoryStore.getToolBatchCount('wateringCan'))
  const tillBatchCount = computed(() => inventoryStore.getToolBatchCount('hoe'))
  const scytheBatchCount = computed(() => inventoryStore.getToolBatchCount('scythe'))

  const doBatchWater = () => handleBatchWater()
  const doBatchTill = () => handleBatchTill()
  const doBatchHarvest = () => handleBatchHarvest()

  const getPlotDisplay = (plot: (typeof farmStore.plots)[number]) => {
    // 巨型作物特殊显示
    if (plot.giantCropGroup !== null) {
      return { text: '巨', color: 'text-accent' }
    }
    switch (plot.state) {
      case 'wasteland':
        return { text: '荒', color: 'text-muted' }
      case 'tilled':
        return { text: '耕', color: 'text-earth' }
      case 'planted':
        return { text: plot.watered ? '润' : '苗', color: plot.watered ? 'text-water' : 'text-success/60' }
      case 'growing': {
        const crop = getCropById(plot.cropId!)
        const progress = crop ? Math.floor((plot.growthDays / crop.growthDays) * 100) : 0
        return {
          text: plot.watered ? '润' : '长',
          color: plot.watered ? 'text-water' : progress > 60 ? 'text-success' : 'text-success/80'
        }
      }
      case 'harvestable':
        return { text: '熟', color: 'text-accent' }
      default:
        return { text: '？', color: 'text-muted' }
    }
  }

  const getPlotTooltip = (plot: (typeof farmStore.plots)[number]): string => {
    let tip = ''
    if (plot.state === 'wasteland') tip = '荒地（点击开垦）'
    else if (plot.state === 'tilled') tip = '已耕地（点击播种）'
    else if (plot.state === 'harvestable') {
      const crop = getCropById(plot.cropId!)
      tip = `${crop?.name ?? ''}已成熟（点击收获）`
    } else if (plot.state === 'planted' || plot.state === 'growing') {
      const crop = getCropById(plot.cropId!)
      tip = `${crop?.name ?? ''} ${plot.growthDays}/${crop?.growthDays ?? '?'}天 ${plot.watered ? '已浇水' : '需浇水'}`
    }
    if (hasSprinkler(plot.id)) tip += ' [洒水器]'
    if (plot.fertilizer) {
      const fertDef = getFertilizerById(plot.fertilizer)
      tip += ` [${fertDef?.name ?? plot.fertilizer}]`
    }
    return tip
  }

  // === 弹窗操作：农场 ===

  const doTill = () => {
    if (activePlotId.value === null) return
    selectedSeed.value = null
    handlePlotClick(activePlotId.value)
    activePlotId.value = null
  }

  const doPlant = (cropId: string) => {
    if (activePlotId.value === null) return
    selectedSeed.value = cropId
    handlePlotClick(activePlotId.value)
    selectedSeed.value = null
    activePlotId.value = null
  }

  const doWater = () => {
    if (activePlotId.value === null) return
    selectedSeed.value = null
    handlePlotClick(activePlotId.value)
    activePlotId.value = null
  }

  const doHarvest = () => {
    if (activePlotId.value === null) return
    const plot = farmStore.plots.find(p => p.id === activePlotId.value)
    if (plot && plot.giantCropGroup !== null) {
      const result = farmStore.harvestGiantCrop(activePlotId.value)
      if (result) {
        inventoryStore.addItem(result.cropId, result.quantity)
        const cropName = getCropName(result.cropId)
        addLog(`收获了巨型${cropName}！获得了${result.quantity}个${cropName}！`)
        showFloat(`巨型${cropName} ×${result.quantity}`, 'accent')
        sfxHarvest()
      }
      activePlotId.value = null
      return
    }
    selectedSeed.value = null
    handlePlotClick(activePlotId.value)
    activePlotId.value = null
  }

  const doFertilize = (type: FertilizerType) => {
    if (activePlotId.value === null) return
    if (!inventoryStore.removeItem(type)) {
      addLog('没有该肥料了。')
      return
    }
    if (farmStore.applyFertilizer(activePlotId.value, type)) {
      const fertDef = getFertilizerById(type)
      addLog(`施了${fertDef?.name ?? '肥料'}。`)
    } else {
      inventoryStore.addItem(type)
      addLog('无法在此施肥（需要已开垦且未施肥的地块）。')
    }
    activePlotId.value = null
  }

  const doPlaceSprinkler = (type: SprinklerType) => {
    if (activePlotId.value === null) return
    if (!inventoryStore.removeItem(type)) {
      addLog('没有该洒水器了。')
      return
    }
    if (farmStore.placeSprinkler(activePlotId.value, type)) {
      addLog('放置了洒水器，周围地块将自动浇水。')
    } else {
      inventoryStore.addItem(type)
      addLog('无法在此放置洒水器。')
    }
    activePlotId.value = null
  }

  const doRemoveSprinkler = () => {
    if (activePlotId.value === null) return
    const type = farmStore.removeSprinkler(activePlotId.value)
    if (type) {
      inventoryStore.addItem(type)
      addLog('拆除了洒水器，已回收到背包。')
    }
    activePlotId.value = null
  }

  // === 果树 ===

  const getTreeName = (type: string): string => {
    return FRUIT_TREE_DEFS.find(d => d.type === type)?.name ?? type
  }

  const getTreeFruitSeason = (type: string): string => {
    const def = FRUIT_TREE_DEFS.find(d => d.type === type)
    if (!def) return '?'
    return SEASON_NAMES[def.fruitSeason as keyof typeof SEASON_NAMES]
  }

  const plantableSaplings = computed(() => {
    return FRUIT_TREE_DEFS.filter(d => inventoryStore.hasItem(d.saplingId)).map(d => ({
      type: d.type as FruitTreeType,
      saplingId: d.saplingId,
      name: d.name,
      count: inventoryStore.getItemCount(d.saplingId)
    }))
  })

  const plantableWildSeeds = computed(() => {
    return WILD_TREE_DEFS.filter(d => inventoryStore.hasItem(d.seedItemId)).map(d => ({
      type: d.type as WildTreeType,
      seedItemId: d.seedItemId,
      name: d.name,
      count: inventoryStore.getItemCount(d.seedItemId)
    }))
  })

  const hasTapper = computed(() => inventoryStore.getItemCount('tapper') > 0)

  const handlePlantTree = (treeType: FruitTreeType) => {
    const def = FRUIT_TREE_DEFS.find(d => d.type === treeType)
    if (!def) return
    if (!inventoryStore.removeItem(def.saplingId)) {
      addLog('背包中没有该树苗。')
      return
    }
    if (farmStore.plantFruitTree(treeType)) {
      addLog(`种下了${def.name}苗，需28天成熟。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plantTree)
      if (tr.message) addLog(tr.message)
    } else {
      inventoryStore.addItem(def.saplingId)
      addLog(`果树位已满（最多${MAX_FRUIT_TREES}棵）。`)
    }
  }

  // === 野树 ===

  const getWildTreeName = (type: string): string => {
    return getWildTreeDef(type)?.name ?? type
  }

  const handlePlantWildTree = (treeType: WildTreeType) => {
    const def = WILD_TREE_DEFS.find(d => d.type === treeType)
    if (!def) return
    if (!inventoryStore.removeItem(def.seedItemId)) {
      addLog('背包中没有该种子。')
      return
    }
    if (farmStore.plantWildTree(treeType)) {
      addLog(`种下了${def.name}，需${def.growthDays}天成熟。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.plantTree)
      if (tr.message) addLog(tr.message)
    } else {
      inventoryStore.addItem(def.seedItemId)
      addLog(`野树位已满（最多${MAX_WILD_TREES}棵）。`)
    }
  }

  const handleAttachTapper = (treeId: number) => {
    if (!inventoryStore.removeItem('tapper')) {
      addLog('背包中没有采脂器。')
      return
    }
    if (farmStore.attachTapper(treeId)) {
      addLog('安装了采脂器，将定期产出树脂。')
    } else {
      inventoryStore.addItem('tapper')
      addLog('无法安装采脂器（需要已成熟且未装采脂器的野树）。')
    }
  }

  const handleCollectTapProduct = (treeId: number) => {
    const productId = farmStore.collectTapProduct(treeId)
    if (productId) {
      inventoryStore.addItem(productId)
      const def = WILD_TREE_DEFS.find(d => d.tapProduct === productId)
      addLog(`收取了${def?.tapProductName ?? productId}！`)
    }
  }

  // === 温室 ===

  const showGreenhouse = computed(() => homeStore.greenhouseUnlocked)
  const greenhouseMode = ref(false)

  const allSeeds = computed(() => {
    return CROPS.filter(crop => inventoryStore.hasItem(crop.seedId)).map(crop => ({
      cropId: crop.id,
      seedId: crop.seedId,
      name: crop.name,
      count: inventoryStore.getItemCount(crop.seedId)
    }))
  })

  // === 弹窗操作：温室 ===

  const doGhPlant = (cropId: string) => {
    if (activeGhPlotId.value === null) return
    const crop = getCropById(cropId)
    if (!crop) return
    if (!inventoryStore.removeItem(crop.seedId)) {
      addLog('背包中没有该种子了。')
      return
    }
    if (farmStore.greenhousePlantCrop(activeGhPlotId.value, cropId)) {
      addLog(`在温室中播种了${crop.name}。`)
    } else {
      inventoryStore.addItem(crop.seedId)
    }
    activeGhPlotId.value = null
  }

  const doGhHarvest = () => {
    if (activeGhPlotId.value === null) return
    const playerStore = usePlayerStore()
    if (!playerStore.consumeStamina(1)) {
      addLog('体力不足，无法收获。')
      return
    }
    const cropId = farmStore.greenhouseHarvestPlot(activeGhPlotId.value)
    if (cropId) {
      const cropDef = getCropById(cropId)
      const skillStore = useSkillStore()
      const quality = skillStore.rollCropQualityWithBonus(0)
      inventoryStore.addItem(cropId, 1, quality)
      const qualityLabel = quality !== 'normal' ? `(${QUALITY_NAMES[quality]})` : ''
      sfxHarvest()
      showFloat(`+${cropDef?.name ?? cropId}${qualityLabel}`, 'success')
      addLog(`在温室收获了${cropDef?.name ?? cropId}${qualityLabel}！(-1体力)`)
    }
    activeGhPlotId.value = null
  }
</script>
