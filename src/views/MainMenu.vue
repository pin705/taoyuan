<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-8 px-4" @click.once="startBgm">
    <!-- 标题 -->
    <div class="text-center">
      <div class="logo" />
      <h1 class="text-accent mb-2 text-2xl md:text-4xl tracking-widest">桃源乡</h1>
      <p class="text-muted text-sm">—— 文字田园物语 ——</p>
    </div>

    <!-- 主菜单 -->
    <template v-if="!showCharCreate && !showFarmSelect && !showIdentitySetup">
      <div class="flex flex-col gap-3 w-full md:w-110">
        <button class="btn text-center justify-center text-lg py-3" @click="showCharCreate = true">
          <Play :size="14" />
          新的旅程
        </button>

        <!-- 存档列表 -->
        <div v-for="info in slots" :key="info.slot" class="w-full">
          <div v-if="info.exists" class="flex gap-1 w-full">
            <button class="btn flex-1 justify-between" @click="handleLoadGame(info.slot)">
              <span>
                <FolderOpen :size="14" class="inline" />
                存档 {{ info.slot + 1 }}
              </span>
              <span class="text-muted text-xs truncate">
                {{ info.playerName ?? '未命名' }} · 第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{
                  info.day
                }}天 · {{ info.money }}文
              </span>
            </button>
            <button class="btn px-2 text-xs" @click="handleExportSlot(info.slot)" title="导出">
              <Download :size="12" />
            </button>
            <button class="btn btn-danger px-2 text-xs" @click="handleDeleteSlot(info.slot)" title="删除">
              <Trash2 :size="12" />
            </button>
          </div>
        </div>

        <!-- 导入存档 -->
        <button class="btn text-center justify-center text-sm" @click="triggerImport">
          <Upload :size="14" />
          导入存档
        </button>
        <input ref="fileInputRef" type="file" accept=".tyx" class="hidden" @change="handleImportFile" />
      </div>
    </template>

    <!-- 角色创建 -->
    <template v-else-if="showCharCreate && !showFarmSelect">
      <p class="text-muted text-sm">创建你的角色</p>

      <div class="flex flex-col gap-4 w-full max-w-xs px-4">
        <!-- 名字输入 -->
        <div>
          <label class="text-xs text-muted mb-1 block">你的名字</label>
          <input
            v-model="charName"
            type="text"
            maxlength="4"
            placeholder="请输入你的名字"
            class="w-full px-3 py-2 bg-bg border border-accent/30 rounded text-sm focus:border-accent outline-none"
          />
        </div>

        <!-- 性别选择 -->
        <div>
          <label class="text-xs text-muted mb-1 block">性别</label>
          <div class="flex gap-3">
            <button
              class="btn flex-1 justify-center py-2"
              :class="charGender === 'male' ? '!border-accent !bg-accent/10' : ''"
              @click="charGender = 'male'"
            >
              男
            </button>
            <button
              class="btn flex-1 justify-center py-2"
              :class="charGender === 'female' ? '!border-accent !bg-accent/10' : ''"
              @click="charGender = 'female'"
            >
              女
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button class="btn" @click="handleBackToMenu">
          <ArrowLeft :size="14" />
          返回
        </button>
        <button class="btn text-lg px-6" :disabled="!charName.trim()" @click="handleCharCreateNext">
          <Play :size="14" />
          下一步
        </button>
      </div>
    </template>

    <!-- 农场选择 -->
    <template v-else-if="showFarmSelect">
      <p class="text-muted text-sm">选择你的田庄类型</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl w-full px-4">
        <button
          v-for="farm in FARM_MAP_DEFS"
          :key="farm.type"
          class="border rounded-lg p-4 text-left transition-all cursor-pointer"
          :class="selectedMap === farm.type ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'"
          @click="selectedMap = farm.type"
        >
          <div class="font-bold mb-1">{{ farm.name }}</div>
          <div class="text-muted text-xs mb-2">{{ farm.description }}</div>
          <div class="text-accent text-xs">{{ farm.bonus }}</div>
        </button>
      </div>

      <div class="flex gap-3">
        <button class="btn" @click="handleBackToCharCreate">
          <ArrowLeft :size="14" />
          返回
        </button>
        <button class="btn text-lg px-6" @click="handleNewGame">
          <Play :size="14" />
          开始旅程
        </button>
      </div>
    </template>

    <!-- 旧存档身份设置 -->
    <template v-else-if="showIdentitySetup">
      <p class="text-muted text-sm">检测到角色信息为空，请设置你的角色信息</p>

      <div class="flex flex-col gap-4 w-full max-w-xs px-4">
        <div>
          <label class="text-xs text-muted mb-1 block">你的名字</label>
          <input
            v-model="charName"
            type="text"
            maxlength="4"
            placeholder="请输入你的名字"
            class="w-full px-3 py-2 bg-bg border border-accent/30 rounded text-sm focus:border-accent outline-none"
          />
        </div>

        <div>
          <label class="text-xs text-muted mb-1 block">性别</label>
          <div class="flex gap-3">
            <button
              class="btn flex-1 justify-center py-2"
              :class="charGender === 'male' ? '!border-accent !bg-accent/10' : ''"
              @click="charGender = 'male'"
            >
              男
            </button>
            <button
              class="btn flex-1 justify-center py-2"
              :class="charGender === 'female' ? '!border-accent !bg-accent/10' : ''"
              @click="charGender = 'female'"
            >
              女
            </button>
          </div>
        </div>
      </div>

      <button class="btn text-lg px-6" :disabled="!charName.trim()" @click="handleIdentityConfirm">
        <Play :size="14" />
        确认并继续
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { Play, FolderOpen, ArrowLeft, Trash2, Download, Upload } from 'lucide-vue-next'
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useGameStore, useSaveStore, useFarmStore, useAnimalStore, usePlayerStore, SEASON_NAMES } from '@/stores'
  import { FARM_MAP_DEFS } from '@/data/farmMaps'
  import { useAudio } from '@/composables/useAudio'
  import type { FarmMapType, Gender } from '@/types'

  const router = useRouter()
  const { startBgm } = useAudio()

  const gameStore = useGameStore()
  const saveStore = useSaveStore()
  const farmStore = useFarmStore()
  const animalStore = useAnimalStore()
  const playerStore = usePlayerStore()

  const slots = ref(saveStore.getSlots())
  const showCharCreate = ref(false)
  const showFarmSelect = ref(false)
  const showIdentitySetup = ref(false)
  const selectedMap = ref<FarmMapType>('standard')
  const charName = ref('')
  const charGender = ref<Gender>('male')

  const refreshSlots = () => {
    slots.value = saveStore.getSlots()
  }

  const handleBackToMenu = () => {
    showCharCreate.value = false
    showFarmSelect.value = false
    selectedMap.value = 'standard'
    charName.value = ''
    charGender.value = 'male'
  }

  const handleCharCreateNext = () => {
    showFarmSelect.value = true
  }

  const handleBackToCharCreate = () => {
    showFarmSelect.value = false
  }

  const handleNewGame = () => {
    // 分配空闲存档槽位
    const slot = saveStore.assignNewSlot()
    if (slot < 0) {
      alert('存档槽位已满，请先删除一个旧存档。')
      return
    }
    playerStore.setIdentity((charName.value.trim() || '未命名').slice(0, 4), charGender.value)
    gameStore.startNewGame(selectedMap.value)
    // 标准农场初始6×6，其余4×4
    farmStore.resetFarm(selectedMap.value === 'standard' ? 6 : 4)
    // 草地农场：免费鸡舍 + 2只鸡
    if (selectedMap.value === 'meadowlands') {
      const coop = animalStore.buildings.find(b => b.type === 'coop')
      if (coop) coop.built = true
      animalStore.animals.push(
        {
          id: 'chicken_init_1',
          type: 'chicken',
          name: '小花',
          friendship: 100,
          mood: 200,
          daysOwned: 0,
          daysSinceProduct: 0,
          wasFed: false,
          wasPetted: false
        },
        {
          id: 'chicken_init_2',
          type: 'chicken',
          name: '小白',
          friendship: 100,
          mood: 200,
          daysOwned: 0,
          daysSinceProduct: 0,
          wasFed: false,
          wasPetted: false
        }
      )
    }
    router.push('/game')
  }

  const handleLoadGame = (slot: number) => {
    if (saveStore.loadFromSlot(slot)) {
      if (playerStore.needsIdentitySetup) {
        // 旧存档没有性别/名字数据，先让玩家设置
        showIdentitySetup.value = true
      } else {
        router.push('/game')
      }
    }
  }

  /** 旧存档身份设置完成 */
  const handleIdentityConfirm = () => {
    playerStore.setIdentity((charName.value.trim() || '未命名').slice(0, 4), charGender.value)
    showIdentitySetup.value = false
    router.push('/game')
  }

  const handleDeleteSlot = (slot: number) => {
    if (confirm(`确定删除存档 ${slot + 1}？此操作不可恢复。`)) {
      saveStore.deleteSlot(slot)
      refreshSlots()
    }
  }

  const handleExportSlot = (slot: number) => {
    if (!saveStore.exportSave(slot)) {
      alert('导出失败。')
    }
  }

  const fileInputRef = ref<HTMLInputElement | null>(null)

  const triggerImport = () => {
    fileInputRef.value?.click()
  }

  const handleImportFile = (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      // 找到第一个空槽位导入，没有则提示
      const emptySlot = slots.value.find(s => !s.exists)
      if (!emptySlot) {
        alert('存档槽位已满，请先删除一个旧存档。')
      } else if (saveStore.importSave(emptySlot.slot, content)) {
        refreshSlots()
        alert(`已导入到存档 ${emptySlot.slot + 1}。`)
      } else {
        alert('存档文件无效或已损坏。')
      }
      input.value = ''
    }
    reader.readAsText(file)
  }
</script>

<style scoped>
  .logo {
    width: 96px;
    height: 96px;
    margin: 0 auto 8px;
    background: url(@/assets/logo.png) center / contain no-repeat;
    image-rendering: pixelated;
  }

  @media (min-width: 768px) {
    .logo {
      width: 128px;
      height: 128px;
      margin-bottom: 12px;
    }
  }
</style>
