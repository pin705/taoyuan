<template>
  <div>
    <h3 class="text-accent text-sm mb-3">
      <Mountain :size="14" class="inline" />
      {{ miningStore.isInSkullCavern ? '骷髅矿穴' : '云隐矿洞' }}
      <span v-if="miningStore.isExploring" class="text-muted">
        — 第{{ activeFloorNum }}层
        <span v-if="!miningStore.isInSkullCavern">({{ zoneName }})</span>
        <span v-if="currentFloorSpecial === 'mushroom'" class="text-success">[ 蘑菇洞穴 ]</span>
        <span v-if="currentFloorSpecial === 'treasure'" class="text-accent">[ 宝箱层 ]</span>
        <span v-if="currentFloorSpecial === 'infested'" class="text-danger">[ 感染层 ]</span>
        <span v-if="currentFloorSpecial === 'dark'" class="text-muted">[ 暗河层 ]</span>
        <span v-if="currentFloorSpecial === 'boss'" class="text-danger">[ BOSS层 ]</span>
      </span>
    </h3>

    <!-- 未进入矿洞 -->
    <div v-if="!miningStore.isExploring">
      <!-- 矿洞地图 -->
      <div class="game-panel mb-3">
        <p class="text-xs text-accent mb-2">
          <Mountain :size="12" class="inline" /> 矿洞地图
          <span class="text-muted ml-2">安全点：{{ miningStore.safePointFloor > 0 ? `第${miningStore.safePointFloor}层` : '入口' }}</span>
        </p>
        <div class="space-y-2">
          <div v-for="zone in mineZones" :key="zone.id">
            <div class="flex justify-between items-center text-xs">
              <span :class="zone.isCurrentZone ? 'text-accent' : zone.reached ? 'text-text' : 'text-muted/40'">
                {{ zone.name }}
                <span class="text-muted ml-1">{{ zone.start }}-{{ zone.end }}层</span>
              </span>
              <span v-if="zone.bossDefeated" class="text-success">✓ {{ zone.bossName }}</span>
              <span v-else-if="zone.reached" class="text-danger/70">{{ zone.bossName }}</span>
              <span v-else class="text-muted/30">???</span>
            </div>
            <div class="bg-bg rounded-[2px] h-1.5 mt-0.5">
              <div
                class="h-1.5 rounded-[2px] transition-all"
                :class="zone.barColor"
                :style="{ width: zone.progress + '%' }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 骷髅矿穴 -->
      <div v-if="miningStore.isSkullCavernUnlocked()" class="game-panel mb-3">
        <div class="flex justify-between items-center">
          <p class="text-xs text-danger">
            <Skull :size="12" class="inline" /> 骷髅矿穴
          </p>
          <span v-if="miningStore.skullCavernBestFloor > 0" class="text-xs text-muted">
            最深 第{{ miningStore.skullCavernBestFloor }}层
          </span>
          <span v-else class="text-xs text-muted/40">未探索</span>
        </div>
        <p class="text-xs text-muted mt-1">无限层 · 无安全点 · 铱矿来源 · 怪物随深度增强</p>
      </div>

      <!-- 装备与状态 -->
      <div class="text-xs text-muted mb-3 border-b border-accent/20 pb-2 space-y-1">
        <p>
          <Swords :size="12" class="inline" />
          武器：{{ weaponDisplayName }}（攻击力 {{ weaponAttack }}）
        </p>
        <p>
          HP {{ playerStore.hp }}/{{ playerStore.getMaxHp() }}
          <span class="ml-3">体力 {{ playerStore.stamina }}/{{ playerStore.maxStamina }}</span>
        </p>
      </div>

      <!-- 进入按钮 -->
      <div class="flex gap-2 flex-wrap">
        <button class="btn text-xs" @click="handleEnterMine(undefined)">
          <Pickaxe :size="14" />
          进入矿洞 (第{{ miningStore.safePointFloor + 1 }}层)
        </button>
        <button v-for="sp in lowerSafePoints" :key="sp" class="btn text-xs" @click="handleEnterMine(sp)">
          <Pickaxe :size="14" />
          返回第{{ sp + 1 }}层 ({{ safePointZoneName(sp) }})
        </button>
        <button v-if="miningStore.isSkullCavernUnlocked()" class="btn text-xs !text-danger" @click="handleEnterSkullCavern">
          <Skull :size="14" />
          进入骷髅矿穴
        </button>
      </div>
    </div>

    <!-- 矿洞探索（格子系统） -->
    <div v-else-if="!miningStore.inCombat">
      <p class="text-xs text-muted mb-1">
        武器：{{ weaponDisplayName }}（{{ weaponTypeName }} · 攻击力 {{ weaponAttack }} · 暴击 {{ critRateDisplay }}）
      </p>
      <p v-if="weaponEnchantName" class="text-xs text-success mb-1">附魔：{{ weaponEnchantName }}</p>

      <!-- 感染层剩余怪物 -->
      <p v-if="currentFloorSpecial === 'infested' && remainingMonsters > 0" class="text-xs text-danger mb-2">
        感染层：还需击败 {{ remainingMonsters }} 只怪物
      </p>

      <!-- 炸弹模式指示 -->
      <div v-if="bombModeId" class="text-xs text-accent mb-2 border border-accent/30 rounded-[2px] px-2 py-1">
        <Zap :size="12" class="inline" /> 炸弹模式：点击已探索的格子作为爆炸中心
        <button class="text-muted ml-2 underline" @click="bombModeId = null">取消</button>
      </div>

      <!-- 6×6 格子网格 -->
      <div class="grid grid-cols-6 gap-1 mb-3" style="max-width: 264px">
        <button
          v-for="tile in miningStore.floorGrid"
          :key="tile.index"
          class="w-10 h-10 rounded-[2px] flex items-center justify-center text-xs border transition-colors"
          :class="getTileClass(tile)"
          :disabled="!isTileClickable(tile)"
          @click="handleTileClick(tile)"
        >
          {{ getTileIcon(tile) }}
        </button>
      </div>

      <!-- 操作按钮栏 -->
      <div class="flex gap-2 flex-wrap mb-3">
        <button
          v-for="bombItem in availableBombs"
          :key="bombItem.id"
          class="btn text-xs"
          :class="{ '!border-accent !text-accent': bombModeId === bombItem.id }"
          @click="toggleBombMode(bombItem.id)"
        >
          <Zap :size="14" />
          {{ bombItem.name }} (×{{ bombItem.count }})
        </button>
        <button
          v-if="miningStore.stairsFound"
          class="btn text-xs"
          :disabled="!miningStore.stairsUsable"
          @click="handleNextFloor"
        >
          <ChevronDown :size="14" />
          {{ miningStore.stairsUsable ? '下一层' : '楼梯不可用' }}
        </button>
        <button class="btn btn-danger text-xs" @click="handleLeave">
          <LogOut :size="14" />
          {{ miningStore.isInSkullCavern ? '离开骷髅矿穴' : '离开矿洞' }}
        </button>
      </div>

      <div class="text-xs text-muted space-y-1">
        <p v-for="(msg, i) in recentLog" :key="i" :class="{ 'text-text': i === recentLog.length - 1 }">{{ msg }}</p>
      </div>
    </div>

    <!-- 战斗中 -->
    <div v-else>
      <!-- BOSS 标记 -->
      <p v-if="miningStore.combatIsBoss" class="text-danger text-xs mb-2 tracking-widest">—— BOSS 战 ——</p>

      <!-- 玩家 HP -->
      <div class="game-panel mb-3">
        <p class="text-xs mb-1">你的 HP: {{ playerStore.hp }}/{{ playerStore.getMaxHp() }}</p>
        <div class="bg-bg rounded-[2px] h-2">
          <div
            class="h-2 bg-success rounded-[2px] transition-all"
            :class="{ 'bg-danger': playerStore.getIsLowHp() }"
            :style="{ width: `${playerStore.getHpPercent()}%` }"
          />
        </div>
      </div>
      <!-- 怪物 HP -->
      <div class="game-panel mb-3">
        <p class="text-xs mb-1">
          <span class="text-danger">{{ miningStore.combatMonster?.name }}</span>
          <span v-if="miningStore.combatIsBoss" class="text-danger">[BOSS]</span>
          — HP: {{ miningStore.combatMonsterHp }}/{{ miningStore.combatMonster?.hp }}
        </p>
        <div class="bg-bg rounded-[2px] h-2">
          <div
            class="h-2 bg-danger rounded-[2px] transition-all"
            :style="{ width: `${miningStore.combatMonster ? (miningStore.combatMonsterHp / miningStore.combatMonster.hp) * 100 : 0}%` }"
          />
        </div>
      </div>

      <div class="flex gap-2 mb-3">
        <button class="btn text-xs" @click="handleCombat('attack')">
          <Swords :size="14" />
          攻击
        </button>
        <button class="btn text-xs" @click="handleCombat('defend')">
          <Shield :size="14" />
          防御
        </button>
        <button class="btn btn-danger text-xs" :disabled="miningStore.combatIsBoss" @click="handleCombat('flee')">
          <MoveRight :size="14" />
          {{ miningStore.combatIsBoss ? '无法逃跑' : '逃跑' }}
        </button>
      </div>

      <div class="text-xs space-y-1">
        <p v-for="(msg, i) in miningStore.combatLog" :key="i" :class="{ 'text-muted': i < miningStore.combatLog.length - 1 }">{{ msg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Mountain, Pickaxe, Zap, ChevronDown, LogOut, Swords, Shield, MoveRight, Skull } from 'lucide-vue-next'
  import { useMiningStore, useGameStore, usePlayerStore, useInventoryStore, useSkillStore } from '@/stores'
  import { ZONE_NAMES, getFloor, BOSS_MONSTERS } from '@/data'
  import { getWeaponById, getEnchantmentById, getWeaponDisplayName, WEAPON_TYPE_NAMES } from '@/data/weapons'
  import { ACTION_TIME_COSTS } from '@/data/timeConstants'
  import { BOMBS } from '@/data/processing'
  import type { CombatAction, MineTile } from '@/types'
  import { sfxMine, sfxAttack, sfxHurt, sfxClick, sfxEncounter, sfxDefend, sfxFlee, sfxVictory } from '@/composables/useAudio'
  import { useAudio } from '@/composables/useAudio'
  import { addLog } from '@/composables/useGameLog'
  import { handleEndDay } from '@/composables/useEndDay'

  const miningStore = useMiningStore()
  const gameStore = useGameStore()
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const { startBattleBgm, resumeNormalBgm } = useAudio()
  const exploreLog = ref<string[]>([])

  /** 炸弹模式 */
  const bombModeId = ref<string | null>(null)

  const recentLog = computed(() => exploreLog.value.slice(-8))

  const activeFloorNum = computed(() => {
    return miningStore.isInSkullCavern ? miningStore.skullCavernFloor : miningStore.currentFloor
  })

  const availableBombs = computed(() => {
    return BOMBS.map(b => ({ id: b.id, name: b.name, count: inventoryStore.getItemCount(b.id) })).filter(b => b.count > 0)
  })

  const zoneName = computed(() => {
    const floor = getFloor(miningStore.currentFloor)
    return floor ? ZONE_NAMES[floor.zone] : ''
  })

  /** 矿洞地图区域数据 */
  const mineZones = computed(() => {
    const zones = [
      { id: 'shallow', name: '浅矿·土石洞穴', start: 1, end: 20, bossFloor: 20 },
      { id: 'frost', name: '冰窟·冰霜暗河', start: 21, end: 40, bossFloor: 40 },
      { id: 'lava', name: '熔岩层·地火暗涌', start: 41, end: 60, bossFloor: 60 },
      { id: 'crystal', name: '晶窟·水晶迷宫', start: 61, end: 80, bossFloor: 80 },
      { id: 'shadow', name: '幽境·暗影裂隙', start: 81, end: 100, bossFloor: 100 },
      { id: 'abyss', name: '深渊·无底深渊', start: 101, end: 120, bossFloor: 120 }
    ]
    const sp = miningStore.safePointFloor
    return zones.map(z => {
      const reached = sp >= z.start - 1
      const boss = BOSS_MONSTERS[z.bossFloor]
      const bossDefeated = boss ? miningStore.defeatedBosses.includes(boss.id) : false
      const progress = Math.min(100, Math.max(0, ((sp - (z.start - 1)) / 20) * 100))
      const isCurrentZone = sp >= z.start - 1 && sp < z.end
      return {
        ...z,
        reached,
        bossName: boss?.name ?? '???',
        bossDefeated,
        progress: reached ? Math.max(5, progress) : 0,
        isCurrentZone,
        barColor: bossDefeated ? 'bg-success' : isCurrentZone ? 'bg-accent' : reached ? 'bg-accent/50' : 'bg-bg'
      }
    })
  })

  /** 当前层是否为特殊楼层 */
  const currentFloorSpecial = computed(() => {
    const floor = getFloor(miningStore.currentFloor)
    return floor?.specialType ?? null
  })

  /** 感染层剩余怪物 */
  const remainingMonsters = computed(() => {
    return miningStore.totalMonstersOnFloor - miningStore.monstersDefeatedCount
  })

  /** 武器信息 */
  const weaponDisplayName = computed(() => {
    const owned = inventoryStore.getEquippedWeapon()
    return getWeaponDisplayName(owned.defId, owned.enchantmentId)
  })
  const weaponTypeName = computed(() => {
    const owned = inventoryStore.getEquippedWeapon()
    const def = getWeaponById(owned.defId)
    return def ? WEAPON_TYPE_NAMES[def.type] : '未知'
  })
  const weaponAttack = computed(() => inventoryStore.getWeaponAttack() + skillStore.combatLevel * 2)
  const critRateDisplay = computed(() => `${Math.round(inventoryStore.getWeaponCritRate() * 100)}%`)
  const weaponEnchantName = computed(() => {
    const owned = inventoryStore.getEquippedWeapon()
    if (!owned.enchantmentId) return ''
    const enchant = getEnchantmentById(owned.enchantmentId)
    return enchant ? `${enchant.name} - ${enchant.description}` : ''
  })

  /** 比当前最大安全点更低的已解锁安全点（用于"返回低层"按钮） */
  const lowerSafePoints = computed(() => {
    return miningStore.getUnlockedSafePoints().filter(sp => sp < miningStore.safePointFloor)
  })

  /** 安全点对应的区域名称 */
  const safePointZoneName = (sp: number): string => {
    if (sp <= 20) return ZONE_NAMES['shallow']
    if (sp <= 40) return ZONE_NAMES['frost']
    if (sp <= 60) return ZONE_NAMES['lava']
    if (sp <= 80) return ZONE_NAMES['crystal']
    if (sp <= 100) return ZONE_NAMES['shadow']
    return ZONE_NAMES['abyss']
  }

  // ==================== 格子 UI 辅助 ====================

  /** 格子样式 */
  const getTileClass = (tile: MineTile): string => {
    if (tile.state === 'hidden') {
      if (bombModeId.value) return 'bg-panel/50 border-accent/10 cursor-not-allowed opacity-40'
      if (miningStore.canRevealTile(tile.index)) return 'bg-panel border-accent/30 hover:border-accent cursor-pointer'
      return 'bg-panel/50 border-accent/10 cursor-not-allowed opacity-40'
    }
    // 已翻开
    switch (tile.type) {
      case 'empty': return 'bg-bg border-accent/10'
      case 'ore': return tile.state === 'collected' ? 'bg-bg border-accent/10' : 'bg-accent/20 border-accent/40'
      case 'monster': return tile.state === 'defeated' ? 'bg-bg border-accent/10' : 'bg-danger/20 border-danger/40'
      case 'boss': return tile.state === 'defeated' ? 'bg-bg border-accent/10' : 'bg-danger/30 border-danger/50'
      case 'stairs': return 'bg-success/20 border-success/40'
      case 'trap': return 'bg-danger/10 border-danger/20'
      case 'treasure': return tile.state === 'collected' ? 'bg-bg border-accent/10' : 'bg-accent/30 border-accent/50'
      case 'mushroom': return tile.state === 'collected' ? 'bg-bg border-accent/10' : 'bg-success/20 border-success/30'
      default: return 'bg-bg border-accent/10'
    }
  }

  /** 格子图标 */
  const getTileIcon = (tile: MineTile): string => {
    if (tile.state === 'hidden') return '?'
    switch (tile.type) {
      case 'empty': return '·'
      case 'ore': return tile.state === 'collected' ? '·' : '◆'
      case 'monster': return tile.state === 'defeated' ? '×' : '!'
      case 'boss': return tile.state === 'defeated' ? '×' : '☠'
      case 'stairs': return '▼'
      case 'trap': return '△'
      case 'treasure': return tile.state === 'collected' ? '·' : '★'
      case 'mushroom': return tile.state === 'collected' ? '·' : '✿'
      default: return '·'
    }
  }

  /** 格子是否可点击 */
  const isTileClickable = (tile: MineTile): boolean => {
    if (bombModeId.value) {
      // 炸弹模式：可以点击已翻开的格子作为爆炸中心
      return tile.state !== 'hidden'
    }
    return tile.state === 'hidden' && miningStore.canRevealTile(tile.index)
  }

  /** 格子点击处理 */
  const handleTileClick = (tile: MineTile) => {
    if (gameStore.isPastBedtime) {
      addLog('太晚了，没法继续探索了。')
      handleEndDay()
      return
    }

    if (bombModeId.value) {
      // 炸弹模式
      const result = miningStore.useBombOnGrid(bombModeId.value, tile.index)
      if (result.success) {
        sfxMine()
        exploreLog.value.push(result.message)
        addLog(result.message)
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.mineOre)
        if (tr.message) addLog(tr.message)
        if (tr.passedOut) handleEndDay()
      } else {
        exploreLog.value.push(result.message)
      }
      bombModeId.value = null
      return
    }

    // 普通翻开
    const result = miningStore.revealTile(tile.index)
    if (result.success) {
      exploreLog.value.push(result.message)
      addLog(result.message)

      if (result.startsCombat) {
        startBattleBgm()
        sfxEncounter()
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.combat)
        if (tr.message) addLog(tr.message)
        if (tr.passedOut) handleEndDay()
      } else {
        sfxClick()
        const tr = gameStore.advanceTime(ACTION_TIME_COSTS.revealTile)
        if (tr.message) addLog(tr.message)
        if (tr.passedOut) handleEndDay()
      }
    }
  }

  /** 切换炸弹模式 */
  const toggleBombMode = (bombId: string) => {
    bombModeId.value = bombModeId.value === bombId ? null : bombId
  }

  // ==================== 事件处理 ====================

  const handleEnterMine = (startFrom?: number) => {
    const msg = miningStore.enterMine(startFrom)
    exploreLog.value = [msg]
    sfxClick()
    addLog(msg)
  }

  const handleEnterSkullCavern = () => {
    const msg = miningStore.enterSkullCavern()
    exploreLog.value = [msg]
    sfxClick()
    addLog(msg)
  }

  const handleCombat = (action: CombatAction) => {
    const result = miningStore.combatAction(action)
    if (action === 'attack') sfxAttack()
    if (action === 'defend') sfxDefend()
    if (action === 'flee') sfxFlee()
    if (result.message.includes('受到')) sfxHurt()
    addLog(result.message)
    if (result.combatOver) {
      if (result.won) sfxVictory()
      resumeNormalBgm()
      if (!miningStore.isExploring) {
        exploreLog.value.push(result.message)
      }
    }
  }

  const handleNextFloor = () => {
    if (gameStore.isPastBedtime) {
      addLog('太晚了，该回去了。')
      handleEndDay()
      return
    }
    const result = miningStore.goNextFloor()
    if (result.success) {
      exploreLog.value = [result.message]
      bombModeId.value = null
    } else {
      exploreLog.value.push(result.message)
    }
    addLog(result.message)
    const tr = gameStore.advanceTime(ACTION_TIME_COSTS.nextFloor)
    if (tr.message) addLog(tr.message)
    if (tr.passedOut) handleEndDay()
  }

  const handleLeave = () => {
    if (miningStore.inCombat) resumeNormalBgm()
    const msg = miningStore.leaveMine()
    exploreLog.value = []
    bombModeId.value = null
    addLog(msg)
  }
</script>
