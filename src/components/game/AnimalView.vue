<template>
  <div>
    <h3 class="text-accent text-sm mb-3">
      <Home :size="14" class="inline" />
      畜棚
    </h3>
    <p class="text-xs text-muted mb-3">建造畜舍后可购买和饲养动物，每天喂食干草并抚摸可提升友好度。</p>

    <!-- 宠物区域 -->
    <div v-if="animalStore.pet" class="mb-4 border border-accent/20 rounded-[2px] p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-accent">
          {{ animalStore.pet.type === 'cat' ? '猫' : '狗' }} — {{ animalStore.pet.name }}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex-1 space-y-0.5">
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-muted w-6">好感</span>
            <div class="flex-1 h-1.5 bg-bg rounded-[2px] border border-accent/10">
              <div class="h-full rounded-[2px] bg-danger transition-all" :style="{ width: Math.floor(animalStore.pet.friendship / 10) + '%' }" />
            </div>
            <span class="text-[10px] text-muted">{{ animalStore.pet.friendship }}/1000</span>
          </div>
        </div>
        <button class="btn text-xs py-0 px-1" :disabled="animalStore.pet.wasPetted" @click="handlePetThePet">
          <Hand :size="14" />
          {{ animalStore.pet.wasPetted ? '已摸' : '抚摸' }}
        </button>
      </div>
      <p v-if="animalStore.pet.friendship >= 800" class="text-xs text-success mt-1">好感度很高，每天有机会叼回采集物！</p>
    </div>
    <p v-else class="text-xs text-muted mb-3">暂无宠物。（入住后第7天会有小动物来访。）</p>

    <!-- 畜舍列表 (鸡舍和牲口棚) -->
    <div v-for="bDef in mainBuildings" :key="bDef.type" class="mb-4 border border-accent/20 rounded-[2px] p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-accent">{{ getBuildingDisplayName(bDef.type) }}</span>
        <div v-if="isBuildingBuilt(bDef.type)" class="flex items-center gap-2">
          <span class="text-xs text-muted">
            {{ getAnimalsInBuilding(bDef.type).length }}/{{ getBuildingCapacity(bDef.type) }}
          </span>
          <button
            v-if="getBuildingLevel(bDef.type) < 3"
            class="btn text-xs"
            @click="handleUpgradeBuilding(bDef.type)"
          >
            <ArrowUp :size="14" />
            升级
          </button>
        </div>
        <button v-else class="btn text-xs" @click="handleBuildBuilding(bDef.type)">
          <Hammer :size="14" />
          建造 ({{ bDef.cost }}文 + 材料)
        </button>
      </div>

      <template v-if="isBuildingBuilt(bDef.type)">
        <!-- 鸡舍孵化器（鸡舍2级以上） -->
        <div v-if="bDef.type === 'coop' && getBuildingLevel('coop') >= 2" class="mb-2 p-2 border border-accent/10 rounded-[2px]">
          <p class="text-xs text-accent mb-1">孵化器</p>
          <div v-if="animalStore.incubating">
            <p class="text-xs">
              正在孵化：{{ getAnimalName(animalStore.incubating.animalType) }}
              （剩余{{ animalStore.incubating.daysLeft }}天）
            </p>
          </div>
          <div v-else class="flex gap-2 flex-wrap">
            <button
              v-for="eggItem in coopIncubatableEggs"
              :key="eggItem.itemId"
              class="btn text-xs"
              @click="handleStartIncubation(eggItem.itemId)"
            >
              <Egg :size="14" />
              放入{{ eggItem.name }} (×{{ eggItem.count }})
            </button>
            <p v-if="coopIncubatableEggs.length === 0" class="text-xs text-muted">背包中没有可孵化的蛋。</p>
          </div>
        </div>

        <!-- 牲口棚孵化器（牲口棚2级以上） -->
        <div v-if="bDef.type === 'barn' && getBuildingLevel('barn') >= 2" class="mb-2 p-2 border border-accent/10 rounded-[2px]">
          <p class="text-xs text-accent mb-1">牲口棚孵化器</p>
          <div v-if="animalStore.barnIncubating">
            <p class="text-xs">
              正在孵化：{{ getAnimalName(animalStore.barnIncubating.animalType) }}
              （剩余{{ animalStore.barnIncubating.daysLeft }}天）
            </p>
          </div>
          <div v-else class="flex gap-2 flex-wrap">
            <button
              v-for="eggItem in barnIncubatableEggs"
              :key="eggItem.itemId"
              class="btn text-xs"
              @click="handleStartBarnIncubation(eggItem.itemId)"
            >
              <Egg :size="14" />
              放入{{ eggItem.name }} (×{{ eggItem.count }})
            </button>
            <p v-if="barnIncubatableEggs.length === 0" class="text-xs text-muted">背包中没有可在牲口棚孵化的蛋。</p>
          </div>
        </div>

        <!-- 购买动物按钮 -->
        <div class="flex gap-2 mb-2 flex-wrap">
          <button
            v-for="aDef in getAnimalDefsForBuilding(bDef.type)"
            :key="aDef.type"
            class="btn text-xs"
            :disabled="getAnimalsInBuilding(bDef.type).length >= getBuildingCapacity(bDef.type)"
            @click="handleBuyAnimal(aDef.type)"
          >
            <ShoppingCart :size="14" />
            买{{ aDef.name }} ({{ aDef.cost }}文)
          </button>
        </div>

        <!-- 动物列表 -->
        <div
          v-for="animal in getAnimalsInBuilding(bDef.type)"
          :key="animal.id"
          class="flex items-center gap-3 py-1 border-t border-accent/10"
        >
          <span class="text-xs w-16">{{ animal.name }}</span>
          <div class="flex-1 space-y-0.5">
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-muted w-6">好感</span>
              <div class="flex-1 h-1.5 bg-bg rounded-[2px] border border-accent/10">
                <div class="h-full rounded-[2px] bg-danger transition-all" :style="{ width: Math.floor(animal.friendship / 10) + '%' }" />
              </div>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-muted w-6">心情</span>
              <div class="flex-1 h-1.5 bg-bg rounded-[2px] border border-accent/10">
                <div class="h-full rounded-[2px] transition-all" :class="getMoodBarColor(animal.mood)" :style="{ width: Math.floor(animal.mood / 255 * 100) + '%' }" />
              </div>
              <span class="text-[10px] text-muted w-6">{{ getMoodText(animal.mood) }}</span>
            </div>
          </div>
          <button class="btn text-xs py-0 px-1" :disabled="animal.wasPetted" @click="handlePetAnimal(animal.id)">
            <Hand :size="14" />
            {{ animal.wasPetted ? '已摸' : '抚摸' }}
          </button>
        </div>

        <p v-if="getAnimalsInBuilding(bDef.type).length === 0" class="text-xs text-muted">暂无动物。</p>
      </template>
      <template v-else>
        <p class="text-xs text-muted">需要：{{ bDef.materialCost.map(m => `${getItemName(m.itemId)}×${m.quantity}`).join('、') }}</p>
      </template>
    </div>

    <!-- 马厩 -->
    <div class="mb-4 border border-accent/20 rounded-[2px] p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-accent">马厩</span>
        <div v-if="animalStore.stableBuilt" class="flex items-center gap-2">
          <span class="text-xs text-muted">{{ animalStore.getHorse ? '1/1' : '0/1' }}</span>
        </div>
        <button v-else class="btn text-xs" @click="handleBuildBuilding('stable')">
          <Hammer :size="14" />
          建造 ({{ stableDef?.cost ?? 10000 }}文 + 材料)
        </button>
      </div>

      <template v-if="animalStore.stableBuilt">
        <div v-if="animalStore.getHorse" class="flex items-center gap-3 py-1">
          <span class="text-xs w-16">{{ animalStore.getHorse.name }}</span>
          <div class="flex-1 space-y-0.5">
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-muted w-6">好感</span>
              <div class="flex-1 h-1.5 bg-bg rounded-[2px] border border-accent/10">
                <div class="h-full rounded-[2px] bg-danger transition-all" :style="{ width: Math.floor(animalStore.getHorse.friendship / 10) + '%' }" />
              </div>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-muted w-6">心情</span>
              <div class="flex-1 h-1.5 bg-bg rounded-[2px] border border-accent/10">
                <div class="h-full rounded-[2px] transition-all" :class="getMoodBarColor(animalStore.getHorse.mood)" :style="{ width: Math.floor(animalStore.getHorse.mood / 255 * 100) + '%' }" />
              </div>
              <span class="text-[10px] text-muted w-6">{{ getMoodText(animalStore.getHorse.mood) }}</span>
            </div>
          </div>
          <button class="btn text-xs py-0 px-1" :disabled="animalStore.getHorse.wasPetted" @click="handlePetAnimal(animalStore.getHorse.id)">
            <Hand :size="14" />
            {{ animalStore.getHorse.wasPetted ? '已摸' : '抚摸' }}
          </button>
        </div>
        <div v-else>
          <button class="btn text-xs" @click="handleBuyAnimal('horse')">
            <ShoppingCart :size="14" />
            买马 (5000文)
          </button>
        </div>
        <p class="text-xs text-success mt-1">
          {{ animalStore.hasHorse ? '骑马出行，旅行时间减少30%。' : '建造马厩后可购买马匹，加速旅行。' }}
        </p>
      </template>
      <template v-else>
        <p class="text-xs text-muted">需要：{{ stableDef?.materialCost.map(m => `${getItemName(m.itemId)}×${m.quantity}`).join('、') ?? '' }}</p>
        <p class="text-xs text-muted mt-1">拥有马匹可减少30%旅行时间。</p>
      </template>
    </div>

    <!-- 喂食 & 放牧 -->
    <div class="flex items-center gap-3 mt-3 flex-wrap">
      <button class="btn text-xs" :disabled="animalStore.animals.length === 0" @click="handleFeedAll">
        <Apple :size="14" />
        喂食全部 (需干草×{{ unfedCount }})
      </button>
      <span class="text-xs text-muted">干草库存：{{ hayCount }}</span>
      <button class="btn text-xs" :disabled="playerStore.money < HAY_PRICE" @click="handleBuyHay">
        <ShoppingCart :size="14" />
        买干草 ({{ HAY_PRICE }}文)
      </button>
    </div>

    <!-- 放牧按钮 -->
    <div class="mt-2">
      <button
        class="btn text-xs"
        :disabled="!canGraze"
        @click="handleGraze"
      >
        <TreePine :size="14" />
        放牧
      </button>
      <span v-if="grazeDisabledReason" class="text-xs text-muted ml-2">{{ grazeDisabledReason }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Hammer, ShoppingCart, Hand, Apple, Home, ArrowUp, Egg, TreePine } from 'lucide-vue-next'
  import { useAnimalStore, useInventoryStore, usePlayerStore, useGameStore } from '@/stores'
  import { ANIMAL_BUILDINGS, ANIMAL_DEFS, HAY_ITEM_ID, HAY_PRICE, getItemById, getBuildingUpgrade, INCUBATION_MAP } from '@/data'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import type { AnimalBuildingType, AnimalType } from '@/types'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'

  const animalStore = useAnimalStore()
  const inventoryStore = useInventoryStore()
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()

  /** 只显示鸡舍和牲口棚（马厩单独渲染） */
  const mainBuildings = computed(() => ANIMAL_BUILDINGS.filter(b => b.type !== 'stable'))

  /** 马厩建筑定义 */
  const stableDef = computed(() => ANIMAL_BUILDINGS.find(b => b.type === 'stable'))

  /** 干草库存数量 */
  const hayCount = computed(() => inventoryStore.getItemCount(HAY_ITEM_ID))

  /** 未喂食动物数量 */
  const unfedCount = computed(() => animalStore.animals.filter(a => !a.wasFed).length)

  /** 可在鸡舍孵化的蛋列表 */
  const coopIncubatableEggs = computed(() => {
    const result: { itemId: string; name: string; count: number }[] = []
    for (const [itemId, mapping] of Object.entries(INCUBATION_MAP)) {
      if (mapping.building !== 'coop') continue
      const count = inventoryStore.getItemCount(itemId)
      if (count > 0) {
        const itemDef = getItemById(itemId)
        result.push({ itemId, name: itemDef?.name ?? itemId, count })
      }
    }
    return result
  })

  /** 可在牲口棚孵化的蛋列表 */
  const barnIncubatableEggs = computed(() => {
    const result: { itemId: string; name: string; count: number }[] = []
    for (const [itemId, mapping] of Object.entries(INCUBATION_MAP)) {
      if (mapping.building !== 'barn') continue
      const count = inventoryStore.getItemCount(itemId)
      if (count > 0) {
        const itemDef = getItemById(itemId)
        result.push({ itemId, name: itemDef?.name ?? itemId, count })
      }
    }
    return result
  })

  /** 获取动物名称 */
  const getAnimalName = (type: AnimalType): string => {
    return ANIMAL_DEFS.find(d => d.type === type)?.name ?? type
  }

  /** 查询物品中文名 */
  const getItemName = (itemId: string): string => {
    return getItemById(itemId)?.name ?? itemId
  }

  /** 判断畜舍是否已建造 */
  const isBuildingBuilt = (type: AnimalBuildingType): boolean => {
    return animalStore.buildings.find(b => b.type === type)?.built ?? false
  }

  /** 获取某畜舍中的动物列表 */
  const getAnimalsInBuilding = (type: AnimalBuildingType) => {
    return animalStore.animals.filter(a => {
      const def = ANIMAL_DEFS.find(d => d.type === a.type)
      return def?.building === type
    })
  }

  /** 获取某畜舍可购买的动物定义 */
  const getAnimalDefsForBuilding = (type: AnimalBuildingType) => {
    return ANIMAL_DEFS.filter(d => d.building === type)
  }

  /** 获取畜舍等级 */
  const getBuildingLevel = (type: AnimalBuildingType): number => {
    return animalStore.buildings.find(b => b.type === type)?.level ?? 0
  }

  /** 获取畜舍显示名（根据等级） */
  const getBuildingDisplayName = (type: AnimalBuildingType): string => {
    const level = getBuildingLevel(type)
    if (level >= 2) {
      const upgrade = getBuildingUpgrade(type, level)
      if (upgrade) return upgrade.name
    }
    return ANIMAL_BUILDINGS.find(b => b.type === type)?.name ?? type
  }

  /** 获取畜舍当前容量 */
  const getBuildingCapacity = (type: AnimalBuildingType): number => {
    const level = getBuildingLevel(type)
    if (type === 'stable') return 1
    return level * 4
  }

  /** 放牧条件检查 */
  const canGraze = computed(() => {
    if (animalStore.grazedToday) return false
    if (gameStore.isRainy) return false
    if (gameStore.season === 'winter') {
      // 冬季只有牦牛可放牧
      return animalStore.animals.some(a => a.wasFed && a.type === 'yak')
    }
    const hasGrazeableAnimals = animalStore.animals.some(a => a.wasFed && a.type !== 'horse')
    return hasGrazeableAnimals
  })

  /** 放牧禁用原因 */
  const grazeDisabledReason = computed(() => {
    if (animalStore.animals.filter(a => a.type !== 'horse').length === 0) return '没有牲畜'
    if (animalStore.grazedToday) return '今天已放牧'
    if (gameStore.isRainy) return '雨天不能放牧'
    if (gameStore.season === 'winter') {
      const hasYak = animalStore.animals.some(a => a.wasFed && a.type === 'yak')
      return hasYak ? '' : '冬天只有牦牛可放牧'
    }
    if (!animalStore.animals.some(a => a.wasFed && a.type !== 'horse')) return '先喂食再放牧'
    return ''
  })

  /** 升级畜舍 */
  const handleUpgradeBuilding = (type: AnimalBuildingType) => {
    const level = getBuildingLevel(type)
    const upgrade = getBuildingUpgrade(type, level + 1)
    const success = animalStore.upgradeBuilding(type)
    if (success) {
      addLog(`成功升级为${upgrade?.name ?? '高级畜舍'}！容量增至${(level + 1) * 4}。`)
      const tr = gameStore.advanceTime(2)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    } else {
      addLog(`升级失败，请检查金币和材料是否充足。`)
    }
  }

  /** 心情文字 */
  const getMoodText = (mood: number): string => {
    if (mood > 200) return '开心'
    if (mood > 100) return '一般'
    return '低落'
  }

  /** 心情条颜色 */
  const getMoodBarColor = (mood: number): string => {
    if (mood > 200) return 'bg-success'
    if (mood > 100) return 'bg-accent'
    return 'bg-danger'
  }

  /** 建造畜舍 */
  const handleBuildBuilding = (type: AnimalBuildingType) => {
    const success = animalStore.buildBuilding(type)
    const bDef = ANIMAL_BUILDINGS.find(b => b.type === type)
    if (success) {
      addLog(`成功建造了${bDef?.name ?? '畜舍'}！`)
      const tr = gameStore.advanceTime(2)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    } else {
      addLog(`建造${bDef?.name ?? '畜舍'}失败，请检查金币和材料是否充足。`)
    }
  }

  /** 购买动物 */
  const handleBuyAnimal = (type: AnimalType) => {
    const aDef = ANIMAL_DEFS.find(d => d.type === type)
    if (!aDef) return
    const count = animalStore.animals.filter(a => a.type === type).length
    const defaultName = `${aDef.name}${count + 1}`
    const success = animalStore.buyAnimal(type, defaultName)
    if (success) {
      addLog(`买了一只${aDef.name}，取名「${defaultName}」。`)
    } else {
      addLog(`购买${aDef.name}失败，请检查金币和畜舍容量。`)
    }
  }

  /** 抚摸动物 */
  const handlePetAnimal = (id: string) => {
    const success = animalStore.petAnimal(id)
    if (success) {
      const animal = animalStore.animals.find(a => a.id === id)
      addLog(`抚摸了${animal?.name ?? '动物'}，友好度提升了。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.petAnimal)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    } else {
      addLog('今天已经抚摸过了。')
    }
  }

  /** 抚摸宠物 */
  const handlePetThePet = () => {
    const success = animalStore.petThePet()
    if (success) {
      addLog(`抚摸了${animalStore.pet?.name ?? '宠物'}，好感度+5。`)
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.petAnimal)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    } else {
      addLog('今天已经抚摸过了。')
    }
  }

  /** 鸡舍孵化器放入蛋 */
  const handleStartIncubation = (itemId: string) => {
    const result = animalStore.startIncubation(itemId)
    addLog(result.message)
  }

  /** 牲口棚孵化器放入蛋 */
  const handleStartBarnIncubation = (itemId: string) => {
    const result = animalStore.startBarnIncubation(itemId)
    addLog(result.message)
  }

  /** 喂食全部动物 */
  const handleFeedAll = () => {
    const result = animalStore.feedAll()
    if (result.fedCount > 0) {
      addLog(`喂食了${result.fedCount}只动物。`)
    }
    if (result.noHayCount > 0) {
      addLog(`干草不足，${result.noHayCount}只动物未能喂食。`)
    }
    if (result.fedCount === 0 && result.noHayCount === 0) {
      addLog('所有动物今天都已喂过了。')
    }
    if (result.fedCount > 0) {
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.feedAnimals)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    }
  }

  /** 购买干草 */
  const handleBuyHay = () => {
    if (!playerStore.spendMoney(HAY_PRICE)) {
      addLog('金币不足，无法购买干草。')
      return
    }
    inventoryStore.addItem(HAY_ITEM_ID)
    addLog(`购买了1份干草，花费${HAY_PRICE}文。`)
  }

  /** 放牧 */
  const handleGraze = () => {
    const result = animalStore.grazeAnimals()
    addLog(result.message)
    if (result.success) {
      const tr = gameStore.advanceTime(ACTION_TIME_COSTS.graze)
      if (tr.message) addLog(tr.message)
      if (tr.passedOut) handleEndDay()
    }
  }
</script>
