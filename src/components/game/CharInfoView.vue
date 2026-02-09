<template>
  <div>
    <!-- 角色身份 -->
    <h3 class="text-accent text-sm mb-3">
      <User :size="14" class="inline" />
      角色信息
    </h3>

    <div class="game-panel mb-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-accent">{{ playerStore.playerName }}</p>
          <p class="text-xs text-muted">{{ genderLabel }}</p>
        </div>
        <div class="text-right text-xs text-muted">
          <p>第{{ gameStore.year }}年 {{ SEASON_NAMES[gameStore.season] }}</p>
        </div>
      </div>
    </div>

    <!-- 属性概览 -->
    <h3 class="text-accent text-sm mb-3 mt-4">
      <Heart :size="14" class="inline" />
      属性概览
    </h3>

    <div class="game-panel mb-3">
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between text-xs">
          <span>
            <Zap :size="12" class="inline" />
            体力
          </span>
          <span>{{ playerStore.stamina }}/{{ playerStore.maxStamina }}</span>
        </div>
        <div class="bg-bg rounded-[2px] h-2">
          <div
            class="h-2 rounded-[2px] transition-all"
            :class="playerStore.staminaPercent > 35 ? 'bg-success' : 'bg-danger'"
            :style="{ width: playerStore.staminaPercent + '%' }"
          />
        </div>

        <div class="flex items-center justify-between text-xs">
          <span>
            <Heart :size="12" class="inline" />
            生命
          </span>
          <span>{{ playerStore.hp }}/{{ playerStore.getMaxHp() }}</span>
        </div>
        <div class="bg-bg rounded-[2px] h-2">
          <div
            class="h-2 rounded-[2px] transition-all"
            :class="playerStore.getHpPercent() > 25 ? 'bg-success' : 'bg-danger'"
            :style="{ width: playerStore.getHpPercent() + '%' }"
          />
        </div>

        <div class="flex items-center justify-between text-xs mt-1">
          <span>
            <Coins :size="12" class="inline" />
            金币
          </span>
          <span class="text-accent">{{ playerStore.money }}文</span>
        </div>
      </div>
    </div>

    <!-- 武器装备 -->
    <h3 class="text-accent text-sm mb-3 mt-4">
      <Sword :size="14" class="inline" />
      武器装备
    </h3>

    <div class="space-y-2 mb-3">
      <div
        v-for="(weapon, index) in inventoryStore.ownedWeapons"
        :key="index"
        class="game-panel"
        :class="{ '!border-accent/60': index === inventoryStore.equippedWeaponIndex }"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm">
              {{ getWeaponDisplayName(weapon.defId, weapon.enchantmentId) }}
              <span v-if="index === inventoryStore.equippedWeaponIndex" class="text-accent text-xs">[ 已装备 ]</span>
            </p>
            <p class="text-xs text-muted">
              {{ getWeaponTypeName(weapon.defId) }}
              · 攻击 {{ getWeaponStats(weapon).attack }} · 暴击 {{ Math.round(getWeaponStats(weapon).critRate * 100) }}%
            </p>
            <p v-if="weapon.enchantmentId" class="text-xs text-success">
              {{ getEnchantDesc(weapon.enchantmentId) }}
            </p>
          </div>
          <button v-if="index !== inventoryStore.equippedWeaponIndex" class="btn text-xs" @click="handleEquip(index)">装备</button>
        </div>
      </div>
    </div>

    <!-- 戒指装备 -->
    <template v-if="inventoryStore.ownedRings.length > 0 || equippedRing1 || equippedRing2">
      <h3 class="text-accent text-sm mb-3 mt-4">
        <CircleDot :size="14" class="inline" />
        戒指装备
      </h3>

      <div class="space-y-2 mb-3">
        <!-- 槽位1 -->
        <div class="game-panel" :class="{ '!border-accent/60': equippedRing1 }">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted">槽位一</p>
              <template v-if="equippedRing1">
                <p class="text-sm">{{ equippedRing1.name }}</p>
                <p class="text-xs text-success">{{ equippedRing1.effectText }}</p>
              </template>
              <p v-else class="text-sm text-muted">空</p>
            </div>
            <button v-if="equippedRing1" class="btn text-xs" @click="handleUnequipRing(0)">卸下</button>
          </div>
        </div>

        <!-- 槽位2 -->
        <div class="game-panel" :class="{ '!border-accent/60': equippedRing2 }">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted">槽位二</p>
              <template v-if="equippedRing2">
                <p class="text-sm">{{ equippedRing2.name }}</p>
                <p class="text-xs text-success">{{ equippedRing2.effectText }}</p>
              </template>
              <p v-else class="text-sm text-muted">空</p>
            </div>
            <button v-if="equippedRing2" class="btn text-xs" @click="handleUnequipRing(1)">卸下</button>
          </div>
        </div>

        <!-- 拥有的戒指列表 -->
        <div v-for="(ring, index) in ownedRingList" :key="index" class="game-panel">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm">{{ ring.name }}</p>
              <p class="text-xs text-success">{{ ring.effectText }}</p>
            </div>
            <div class="flex gap-1">
              <button
                v-if="inventoryStore.equippedRingSlot1 !== index"
                class="btn text-xs"
                :disabled="inventoryStore.equippedRingSlot2 === index"
                @click="handleEquipRing(index, 0)"
              >
                槽一
              </button>
              <button
                v-if="inventoryStore.equippedRingSlot2 !== index"
                class="btn text-xs"
                :disabled="inventoryStore.equippedRingSlot1 === index"
                @click="handleEquipRing(index, 1)"
              >
                槽二
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 工具一览 -->
    <h3 class="text-accent text-sm mb-3 mt-4">
      <Wrench :size="14" class="inline" />
      工具一览
    </h3>

    <div class="space-y-2 mb-3">
      <div v-for="tool in inventoryStore.tools" :key="tool.type" class="game-panel">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-muted">{{ TOOL_CATEGORY_NAMES[tool.type] }}</p>
            <p class="text-sm">{{ TOOL_NAMES[tool.type] }} · {{ TIER_NAMES[tool.tier] }}</p>
          </div>
          <p class="text-xs text-muted">体力{{ Math.round((1 - inventoryStore.getToolStaminaMultiplier(tool.type)) * 100) }}%减免</p>
        </div>
      </div>

      <button class="btn text-xs w-full justify-center" @click="goToUpgrade">
        <Wrench :size="14" />
        前往工坊升级
      </button>
    </div>

    <!-- 技能总览 -->
    <h3 class="text-accent text-sm mb-3 mt-4">
      <Star :size="14" class="inline" />
      技能总览
    </h3>

    <div class="game-panel mb-3">
      <div class="flex flex-col gap-1">
        <div v-for="skill in skillStore.skills" :key="skill.type" class="flex items-center justify-between text-xs">
          <span>{{ SKILL_NAMES[skill.type] }}</span>
          <div class="flex items-center gap-2">
            <span class="text-accent">Lv.{{ skill.level }}</span>
            <span v-if="skill.perk5" class="text-success">{{ PERK_NAMES[skill.perk5] }}</span>
            <span v-if="skill.perk10" class="text-success">{{ PERK_NAMES[skill.perk10] }}</span>
          </div>
        </div>
      </div>
      <button class="btn text-xs w-full justify-center mt-3" @click="goToSkills">
        <Star :size="14" />
        查看详情
      </button>
    </div>

    <!-- 被动加成 -->
    <template v-if="unlockedWalletItems.length > 0">
      <h3 class="text-accent text-sm mb-3 mt-4">
        <WalletIcon :size="14" class="inline" />
        被动加成
      </h3>
      <div class="game-panel mb-3">
        <div class="flex flex-col gap-1">
          <div v-for="item in unlockedWalletItems" :key="item.id" class="flex items-center justify-between text-xs">
            <span class="text-accent">{{ item.name }}</span>
            <span class="text-muted">{{ item.description }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 家庭 -->
    <template v-if="spouseInfo">
      <h3 class="text-accent text-sm mb-3 mt-4">
        <Home :size="14" class="inline" />
        家庭
      </h3>
      <div class="game-panel">
        <div class="flex items-center justify-between text-xs mb-1">
          <span>配偶</span>
          <span class="text-accent">{{ spouseInfo.name }}</span>
        </div>
        <div v-for="child in npcStore.children" :key="child.id" class="flex items-center justify-between text-xs">
          <span>{{ child.name }}</span>
          <span class="text-muted">{{ CHILD_STAGE_NAMES[child.stage] }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { User, Heart, Zap, Coins, Sword, Wrench, Star, Wallet as WalletIcon, Home, CircleDot } from 'lucide-vue-next'
  import { usePlayerStore, useInventoryStore, useSkillStore, useWalletStore, useNpcStore, useGameStore, SEASON_NAMES } from '@/stores'
  import { TOOL_NAMES, TIER_NAMES, getNpcById } from '@/data'
  import { getWeaponById, getEnchantmentById, getWeaponDisplayName, WEAPON_TYPE_NAMES } from '@/data/weapons'
  import { getRingById } from '@/data/rings'
  import type { RingEffectType } from '@/types'
  import { WALLET_ITEMS } from '@/data/wallet'
  import { navigateToPanel } from '@/composables/useNavigation'
  import type { SkillType, SkillPerk5, SkillPerk10, ToolType, ChildStage, OwnedWeapon } from '@/types'
  import { addLog } from '@/composables/useGameLog'

  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const skillStore = useSkillStore()
  const walletStore = useWalletStore()
  const npcStore = useNpcStore()
  const gameStore = useGameStore()

  // === 身份 ===
  const genderLabel = computed(() => (playerStore.gender === 'male' ? '男' : '女'))

  // === 武器 ===
  const getWeaponTypeName = (defId: string): string => {
    const def = getWeaponById(defId)
    return def ? WEAPON_TYPE_NAMES[def.type] : '未知'
  }

  const getWeaponStats = (weapon: OwnedWeapon): { attack: number; critRate: number } => {
    const def = getWeaponById(weapon.defId)
    if (!def) return { attack: 0, critRate: 0 }
    let attack = def.attack
    let critRate = def.critRate
    if (weapon.enchantmentId) {
      const enchant = getEnchantmentById(weapon.enchantmentId)
      if (enchant) {
        attack += enchant.attackBonus
        critRate += enchant.critBonus
      }
    }
    return { attack, critRate }
  }

  const getEnchantDesc = (enchantmentId: string): string => {
    const enchant = getEnchantmentById(enchantmentId)
    return enchant ? `${enchant.name} - ${enchant.description}` : ''
  }

  const handleEquip = (index: number) => {
    if (inventoryStore.equipWeapon(index)) {
      const weapon = inventoryStore.ownedWeapons[index]!
      const name = getWeaponDisplayName(weapon.defId, weapon.enchantmentId)
      addLog(`装备了${name}。`)
    }
  }

  // === 戒指 ===

  const RING_EFFECT_SHORT: Record<RingEffectType, string> = {
    attack_bonus: '攻击',
    crit_rate_bonus: '暴击',
    defense_bonus: '减伤',
    vampiric: '吸血',
    max_hp_bonus: '生命',
    stamina_reduction: '体力减免',
    mining_stamina: '挖矿体力减免',
    farming_stamina: '农耕体力减免',
    fishing_stamina: '钓鱼体力减免',
    crop_quality_bonus: '品质',
    crop_growth_bonus: '生长加速',
    fish_quality_bonus: '鱼品质',
    fishing_calm: '鱼速降低',
    sell_price_bonus: '售价',
    shop_discount: '折扣',
    gift_friendship: '好感',
    monster_drop_bonus: '掉落',
    exp_bonus: '经验',
    treasure_find: '宝箱',
    ore_bonus: '矿石',
    luck: '幸运'
  }

  const formatRingEffects = (defId: string): string => {
    const def = getRingById(defId)
    if (!def) return ''
    return def.effects
      .map(e => {
        const label = RING_EFFECT_SHORT[e.type]
        return e.value > 0 && e.value < 1 ? `${label}${Math.round(e.value * 100)}%` : `${label}+${e.value}`
      })
      .join(' ')
  }

  const getRingInfo = (index: number): { name: string; effectText: string } | null => {
    if (index < 0 || index >= inventoryStore.ownedRings.length) return null
    const ring = inventoryStore.ownedRings[index]!
    const def = getRingById(ring.defId)
    if (!def) return null
    return { name: def.name, effectText: formatRingEffects(ring.defId) }
  }

  const equippedRing1 = computed(() => getRingInfo(inventoryStore.equippedRingSlot1))
  const equippedRing2 = computed(() => getRingInfo(inventoryStore.equippedRingSlot2))

  const ownedRingList = computed(() =>
    inventoryStore.ownedRings.map((ring, index) => ({
      index,
      name: getRingById(ring.defId)?.name ?? ring.defId,
      effectText: formatRingEffects(ring.defId)
    }))
  )

  const handleEquipRing = (ringIndex: number, slot: 0 | 1) => {
    if (inventoryStore.equipRing(ringIndex, slot)) {
      const def = getRingById(inventoryStore.ownedRings[ringIndex]!.defId)
      addLog(`将${def?.name ?? '戒指'}装备到槽位${slot + 1}。`)
    }
  }

  const handleUnequipRing = (slot: 0 | 1) => {
    const idx = slot === 0 ? inventoryStore.equippedRingSlot1 : inventoryStore.equippedRingSlot2
    const def = idx >= 0 ? getRingById(inventoryStore.ownedRings[idx]!.defId) : null
    if (inventoryStore.unequipRing(slot)) {
      addLog(`卸下了${def?.name ?? '戒指'}。`)
    }
  }

  const TOOL_CATEGORY_NAMES: Record<ToolType, string> = {
    wateringCan: '浇灌',
    hoe: '耕作',
    pickaxe: '采矿',
    fishingRod: '钓鱼',
    scythe: '收割',
    axe: '伐木',
    pan: '淘金'
  }

  // === 技能 ===
  const SKILL_NAMES: Record<SkillType, string> = {
    farming: '农耕',
    foraging: '采集',
    fishing: '钓鱼',
    mining: '挖矿',
    combat: '战斗'
  }

  const PERK_NAMES: Record<SkillPerk5 | SkillPerk10, string> = {
    harvester: '丰收者',
    rancher: '牧人',
    lumberjack: '樵夫',
    herbalist: '药师',
    fisher: '渔夫',
    trapper: '捕手',
    miner: '矿工',
    geologist: '地质学家',
    fighter: '斗士',
    defender: '守护者',
    intensive: '精耕',
    artisan: '匠人',
    coopmaster: '牧场主',
    shepherd: '牧羊人',
    botanist: '植物学家',
    alchemist: '炼金师',
    forester: '伐木工',
    tracker: '追踪者',
    angler: '垂钓大师',
    aquaculture: '水产商',
    mariner: '水手',
    luremaster: '诱饵师',
    prospector: '探矿者',
    blacksmith: '铁匠',
    excavator: '挖掘者',
    mineralogist: '宝石学家',
    warrior: '武者',
    brute: '蛮力者',
    acrobat: '杂技师',
    tank: '重甲者'
  }

  // === 被动 ===
  const unlockedWalletItems = computed(() => WALLET_ITEMS.filter(w => walletStore.has(w.id)))

  // === 家庭 ===
  const spouseInfo = computed(() => {
    const spouseState = npcStore.getSpouse()
    if (!spouseState) return null
    const npcDef = getNpcById(spouseState.npcId)
    return npcDef ? { name: npcDef.name } : null
  })

  const CHILD_STAGE_NAMES: Record<ChildStage, string> = {
    baby: '婴儿',
    toddler: '幼童',
    child: '孩童',
    teen: '少年'
  }

  // === 导航 ===
  const goToUpgrade = () => {
    navigateToPanel('upgrade')
  }

  const goToSkills = () => {
    navigateToPanel('skills')
  }
</script>
