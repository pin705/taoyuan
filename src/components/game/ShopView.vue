<template>
  <div class="flex flex-col md:flex-row gap-4 md:gap-6">
    <!-- 左侧：购买区 -->
    <div class="flex-1">
      <!-- 折扣提示 -->
      <p v-if="hasDiscount" class="text-success text-xs mb-3">商人印章生效中：所有购物价格 -10%</p>

      <!-- ====== 商圈总览 ====== -->
      <template v-if="!shopStore.currentShopId">
        <h3 class="text-accent text-sm mb-3">
          <Store :size="14" class="inline" />
          桃源商圈
        </h3>
        <p class="text-muted text-xs mb-3">点击商铺进入选购。</p>

        <!-- 旅行商人（仅周五/日） -->
        <div v-if="shopStore.isMerchantHere" class="mb-4">
          <h4 class="text-accent text-sm mb-2">
            <MapPin :size="14" class="inline" />
            旅行商人 · 限时特卖
          </h4>
          <p class="text-muted text-xs mb-2">旅行商人今天在桃源村摆摊，带来了稀有货物！</p>
          <div class="flex flex-col gap-2">
            <div
              v-for="item in shopStore.travelingStock"
              :key="item.itemId"
              class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
              :class="{ 'opacity-50': item.quantity <= 0 }"
            >
              <div>
                <span class="text-sm">{{ item.name }}</span>
                <span class="text-muted text-xs ml-2">剩余{{ item.quantity }}个</span>
              </div>
              <button
                class="btn text-xs"
                :disabled="item.quantity <= 0 || playerStore.money < discounted(item.price)"
                @click="handleBuyFromTraveler(item.itemId, item.name, item.price)"
              >
                <ShoppingCart :size="14" />
                <template v-if="hasDiscount">
                  <span class="line-through text-muted">{{ item.price }}</span>
                </template>
                {{ discounted(item.price) }}文
              </button>
            </div>
          </div>
        </div>

        <!-- 六大商铺卡片 -->
        <div class="flex flex-col gap-2">
          <div
            v-for="shop in SHOPS"
            :key="shop.id"
            class="flex items-center justify-between border rounded-[2px] px-3 py-2"
            :class="isOpen(shop) ? 'border-accent/30 cursor-pointer hover:bg-accent/5' : 'border-accent/10 opacity-50'"
            @click="isOpen(shop) && enterShop(shop.id)"
          >
            <div>
              <span class="text-sm">{{ shop.name }}</span>
              <span class="text-muted text-xs ml-2">{{ shop.npcName }}</span>
              <span v-if="!isOpen(shop)" class="text-danger text-xs ml-2">{{ closedReason(shop) }}</span>
            </div>
            <ChevronRight v-if="isOpen(shop)" :size="14" class="text-muted" />
          </div>
        </div>
      </template>

      <!-- ====== 万物铺 ====== -->
      <template v-else-if="shopStore.currentShopId === 'wanwupu'">
        <ShopHeader name="万物铺" npc="陈伯" />

        <!-- 当季种子 -->
        <h4 class="text-accent text-sm mb-2 mt-3">
          <Sprout :size="14" class="inline" />
          当季种子
        </h4>
        <div class="flex flex-col gap-2">
          <div
            v-for="seed in shopStore.availableSeeds"
            :key="seed.seedId"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">{{ seed.cropName }}种子</span>
              <span class="text-muted text-xs ml-2">{{ seed.growthDays }}天 → 售{{ seed.sellPrice }}文</span>
            </div>
            <button class="btn text-xs" :disabled="playerStore.money < discounted(seed.price)" @click="handleBuySeed(seed.seedId)">
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ seed.price }}</span>
              </template>
              {{ discounted(seed.price) }}文
            </button>
          </div>
          <p v-if="shopStore.availableSeeds.length === 0" class="text-muted text-xs">本季没有种子出售。</p>
        </div>

        <!-- 杂货 -->
        <h4 class="text-accent text-sm mb-2 mt-4">
          <Package :size="14" class="inline" />
          杂货
        </h4>
        <div class="flex flex-col gap-2">
          <!-- 背包扩容 -->
          <div
            v-if="inventoryStore.capacity < 36"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">背包扩容</span>
              <span class="text-muted text-xs ml-2">当前{{ inventoryStore.capacity }}格 → {{ inventoryStore.capacity + 4 }}格</span>
            </div>
            <button class="btn text-xs" :disabled="playerStore.money < discounted(bagPrice)" @click="handleBuyBag">
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ bagPrice }}</span>
              </template>
              {{ discounted(bagPrice) }}文
            </button>
          </div>

          <!-- 农场扩建 -->
          <div v-if="farmExpandInfo" class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2">
            <div>
              <span class="text-sm">农场扩建</span>
              <span class="text-muted text-xs ml-2">
                {{ farmStore.farmSize }}×{{ farmStore.farmSize }} → {{ farmExpandInfo.newSize }}×{{ farmExpandInfo.newSize }}
              </span>
            </div>
            <button class="btn text-xs" :disabled="playerStore.money < discounted(farmExpandInfo.price)" @click="handleBuyFarmExpand">
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ farmExpandInfo.price }}</span>
              </template>
              {{ discounted(farmExpandInfo.price) }}文
            </button>
          </div>

          <!-- 树苗 -->
          <div
            v-for="tree in FRUIT_TREE_DEFS"
            :key="tree.saplingId"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">{{ tree.name }}苗</span>
              <span class="text-muted text-xs ml-2">28天成熟 · {{ seasonName(tree.fruitSeason) }}季产{{ tree.fruitName }}</span>
            </div>
            <button
              class="btn text-xs"
              :disabled="playerStore.money < discounted(tree.saplingPrice)"
              @click="handleBuySapling(tree.saplingId, tree.saplingPrice, tree.name)"
            >
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ tree.saplingPrice }}</span>
              </template>
              {{ discounted(tree.saplingPrice) }}文
            </button>
          </div>

          <!-- 干草 -->
          <div class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2">
            <div>
              <span class="text-sm">干草</span>
              <span class="text-muted text-xs ml-2">喂养牲畜用</span>
            </div>
            <button class="btn text-xs" :disabled="playerStore.money < discounted(HAY_PRICE)" @click="handleBuyHay">
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ HAY_PRICE }}</span>
              </template>
              {{ discounted(HAY_PRICE) }}文
            </button>
          </div>

          <!-- 雨图腾 -->
          <div class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2">
            <div>
              <span class="text-sm">雨图腾</span>
              <span class="text-muted text-xs ml-2">使用后可以让明天下雨</span>
            </div>
            <button
              class="btn text-xs"
              :disabled="playerStore.money < discounted(RAIN_TOTEM_PRICE)"
              @click="handleBuyItem('rain_totem', RAIN_TOTEM_PRICE, '雨图腾')"
            >
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ RAIN_TOTEM_PRICE }}</span>
              </template>
              {{ discounted(RAIN_TOTEM_PRICE) }}文
            </button>
          </div>
        </div>
      </template>

      <!-- ====== 铁匠铺 ====== -->
      <template v-else-if="shopStore.currentShopId === 'tiejiangpu'">
        <ShopHeader name="铁匠铺" npc="孙铁匠" />

        <div class="flex flex-col gap-2">
          <div
            v-for="item in shopStore.blacksmithItems"
            :key="item.itemId"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">{{ item.name }}</span>
              <span class="text-muted text-xs ml-2">{{ item.description }}</span>
            </div>
            <button
              class="btn text-xs"
              :disabled="playerStore.money < discounted(item.price)"
              @click="handleBuyItem(item.itemId, item.price, item.name)"
            >
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ item.price }}</span>
              </template>
              {{ discounted(item.price) }}文
            </button>
          </div>
        </div>

        <!-- 戒指合成 -->
        <h4 class="text-accent text-sm mb-2 mt-4">
          <CircleDot :size="14" class="inline" />
          戒指合成
        </h4>
        <div class="flex flex-col gap-2">
          <div v-for="ring in craftableRings" :key="ring.id" class="border border-accent/20 rounded-[2px] px-3 py-2">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm">{{ ring.name }}</span>
                <span v-if="inventoryStore.hasRing(ring.id)" class="text-success text-xs ml-1">已拥有</span>
              </div>
              <button class="btn text-xs" :disabled="!canCraftRing(ring)" @click="handleCraftRing(ring.id)">
                <Hammer :size="14" />
                合成
              </button>
            </div>
            <p class="text-xs text-muted mt-1">{{ ring.description }}</p>
            <p class="text-xs mt-1">
              <span class="text-accent">效果：</span>
              <span v-for="(eff, i) in ring.effects" :key="i" class="text-success">
                {{ RING_EFFECT_LABELS[eff.type] }}{{ eff.value > 0 && eff.value < 1 ? Math.round(eff.value * 100) + '%' : '+' + eff.value
                }}{{ i < ring.effects.length - 1 ? '、' : '' }}
              </span>
            </p>
            <p class="text-xs text-muted mt-1">
              材料：
              <span v-for="(mat, i) in ring.recipe!" :key="i">
                {{ getItemById(mat.itemId)?.name ?? mat.itemId }}×{{ mat.quantity }}{{ i < ring.recipe!.length - 1 ? '、' : '' }}
              </span>
              + {{ ring.recipeMoney }}文
            </p>
          </div>
          <p v-if="craftableRings.length === 0" class="text-muted text-xs">没有可合成的戒指。</p>
        </div>
      </template>

      <!-- ====== 镖局 ====== -->
      <template v-else-if="shopStore.currentShopId === 'biaoju'">
        <ShopHeader name="镖局" npc="云飞" />

        <!-- 武器 -->
        <h4 class="text-accent text-sm mb-2">
          <Sword :size="14" class="inline" />
          武器
        </h4>
        <div class="flex flex-col gap-2">
          <div
            v-for="w in SHOP_WEAPONS"
            :key="w.id"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">{{ w.name }}</span>
              <span class="text-muted text-xs ml-2">
                {{ WEAPON_TYPE_NAMES[w.type] }} · 攻击{{ w.attack }} · 暴击{{ Math.round(w.critRate * 100) }}%
              </span>
              <span v-if="inventoryStore.hasWeapon(w.id)" class="text-success text-xs ml-1">已拥有</span>
            </div>
            <button
              class="btn text-xs"
              :disabled="inventoryStore.hasWeapon(w.id) || playerStore.money < discounted(w.shopPrice!) || !hasWeaponMaterials(w)"
              @click="handleBuyWeapon(w)"
            >
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ w.shopPrice }}</span>
              </template>
              {{ discounted(w.shopPrice!) }}文{{ w.shopMaterials.length > 0 ? '+材料' : '' }}
            </button>
          </div>
        </div>

        <!-- 炸弹 -->
        <h4 class="text-accent text-sm mb-2 mt-4">
          <Bomb :size="14" class="inline" />
          炸弹
        </h4>
        <div class="flex flex-col gap-2">
          <div v-for="b in shopBombs" :key="b.id" class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2">
            <div>
              <span class="text-sm">{{ b.name }}</span>
              <span class="text-muted text-xs ml-2">{{ b.description }}</span>
            </div>
            <button
              class="btn text-xs"
              :disabled="playerStore.money < discounted(b.shopPrice!)"
              @click="handleBuyItem(b.id, b.shopPrice!, b.name)"
            >
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ b.shopPrice }}</span>
              </template>
              {{ discounted(b.shopPrice!) }}文
            </button>
          </div>
        </div>
      </template>

      <!-- ====== 渔具铺 ====== -->
      <template v-else-if="shopStore.currentShopId === 'yugupu'">
        <ShopHeader name="渔具铺" npc="秋月" />

        <!-- 鱼饵 -->
        <h4 class="text-accent text-sm mb-2">
          <Fish :size="14" class="inline" />
          鱼饵
        </h4>
        <div class="flex flex-col gap-2">
          <div
            v-for="b in shopStore.shopBaits"
            :key="b.id"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">{{ b.name }}</span>
              <span class="text-muted text-xs ml-2">{{ b.description }}</span>
            </div>
            <button class="btn text-xs" :disabled="playerStore.money < discounted(b.price)" @click="handleBuyItem(b.id, b.price, b.name)">
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ b.price }}</span>
              </template>
              {{ discounted(b.price) }}文
            </button>
          </div>
        </div>

        <!-- 浮漂 -->
        <h4 class="text-accent text-sm mb-2 mt-4">
          <Fish :size="14" class="inline" />
          浮漂
        </h4>
        <div class="flex flex-col gap-2">
          <div
            v-for="t in shopStore.shopTackles"
            :key="t.id"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">{{ t.name }}</span>
              <span class="text-muted text-xs ml-2">{{ t.description }}</span>
            </div>
            <button class="btn text-xs" :disabled="playerStore.money < discounted(t.price)" @click="handleBuyItem(t.id, t.price, t.name)">
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ t.price }}</span>
              </template>
              {{ discounted(t.price) }}文
            </button>
          </div>
        </div>
      </template>

      <!-- ====== 药铺 ====== -->
      <template v-else-if="shopStore.currentShopId === 'yaopu'">
        <ShopHeader name="药铺" npc="林老" />

        <!-- 肥料 -->
        <h4 class="text-accent text-sm mb-2">
          <Leaf :size="14" class="inline" />
          肥料
        </h4>
        <div class="flex flex-col gap-2">
          <div
            v-for="f in shopStore.shopFertilizers"
            :key="f.id"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">{{ f.name }}</span>
              <span class="text-muted text-xs ml-2">{{ f.description }}</span>
            </div>
            <button class="btn text-xs" :disabled="playerStore.money < discounted(f.price)" @click="handleBuyItem(f.id, f.price, f.name)">
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ f.price }}</span>
              </template>
              {{ discounted(f.price) }}文
            </button>
          </div>
        </div>

        <!-- 草药 -->
        <h4 class="text-accent text-sm mb-2 mt-4">
          <Sprout :size="14" class="inline" />
          草药
        </h4>
        <div class="flex flex-col gap-2">
          <div
            v-for="item in shopStore.apothecaryItems"
            :key="item.itemId"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">{{ item.name }}</span>
              <span class="text-muted text-xs ml-2">{{ item.description }}</span>
            </div>
            <button
              class="btn text-xs"
              :disabled="playerStore.money < discounted(item.price)"
              @click="handleBuyItem(item.itemId, item.price, item.name)"
            >
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ item.price }}</span>
              </template>
              {{ discounted(item.price) }}文
            </button>
          </div>
        </div>
      </template>

      <!-- ====== 绸缎庄 ====== -->
      <template v-else-if="shopStore.currentShopId === 'chouduanzhuang'">
        <ShopHeader name="绸缎庄" npc="素素" />

        <div class="flex flex-col gap-2">
          <div
            v-for="item in shopStore.textileItems"
            :key="item.itemId"
            class="flex items-center justify-between border border-accent/20 rounded-[2px] px-3 py-2"
          >
            <div>
              <span class="text-sm">{{ item.name }}</span>
              <span class="text-muted text-xs ml-2">{{ item.description }}</span>
            </div>
            <button
              class="btn text-xs"
              :disabled="playerStore.money < discounted(item.price)"
              @click="handleBuyItem(item.itemId, item.price, item.name)"
            >
              <ShoppingCart :size="14" />
              <template v-if="hasDiscount">
                <span class="line-through text-muted">{{ item.price }}</span>
              </template>
              {{ discounted(item.price) }}文
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- 右侧：出售区 -->
    <div class="flex-1">
      <!-- 返回按钮（在子商铺时显示） -->
      <button v-if="shopStore.currentShopId" class="btn text-xs mb-3" @click="shopStore.currentShopId = null">
        <ChevronLeft :size="14" />
        返回商圈
      </button>

      <div class="flex items-center justify-between mb-3">
        <h3 class="text-accent text-sm">
          <TrendingUp :size="14" class="inline" />
          出售物品
        </h3>
        <button v-if="getSellableItems().length > 0" class="btn btn-danger text-xs" @click="handleSellAll()">
          <Coins :size="14" />
          一键全部出售
        </button>
      </div>
      <div class="flex flex-col gap-2">
        <div
          v-for="item in getSellableItems()"
          :key="item.itemId + item.quality"
          class="flex items-center justify-between border rounded-[2px] px-3 py-2"
          :class="item.quality !== 'normal' ? QUALITY_BORDERS[item.quality] : 'border-accent/20'"
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
              {{ QUALITY_LABELS[item.quality] }}
            </span>
            <span class="text-muted text-xs ml-1">×{{ item.quantity }}</span>
          </div>
          <div class="flex gap-1">
            <button class="btn text-xs" @click="handleSellItem(item.itemId, item.quality)">
              <Coins :size="14" />
              售1
            </button>
            <button v-if="item.quantity > 1" class="btn text-xs" @click="handleSellItemAll(item.itemId, item.quantity, item.quality)">
              全部
            </button>
          </div>
        </div>
        <p v-if="getSellableItems().length === 0" class="text-muted text-xs">背包中没有可出售的物品。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import {
    ShoppingCart,
    Coins,
    Sprout,
    Package,
    TrendingUp,
    Fish,
    Leaf,
    Sword,
    MapPin,
    ChevronRight,
    ChevronLeft,
    Store,
    Bomb,
    CircleDot,
    Hammer
  } from 'lucide-vue-next'
  import { useShopStore, usePlayerStore, useInventoryStore, useFarmStore, useWalletStore, useGameStore, SEASON_NAMES } from '@/stores'
  import { getItemById } from '@/data'
  import { SHOPS, isShopAvailable, getShopClosedReason } from '@/data/shops'
  import type { ShopDef } from '@/data/shops'
  import { SHOP_WEAPONS, WEAPON_TYPE_NAMES } from '@/data/weapons'
  import type { WeaponDef } from '@/types'
  import { FRUIT_TREE_DEFS } from '@/data/fruitTrees'
  import { BOMBS } from '@/data/processing'
  import { CRAFTABLE_RINGS } from '@/data/rings'
  import type { RingDef, RingEffectType } from '@/types'
  import { HAY_PRICE } from '@/data/animals'
  import { addLog } from '@/composables/useGameLog'
  import { sfxBuy } from '@/composables/useAudio'
  import { showFloat } from '@/composables/useGameLog'
  import { handleBuySeed, handleSellItem, handleSellItemAll, handleSellAll } from '@/composables/useFarmActions'
  import type { Season } from '@/types'

  const RAIN_TOTEM_PRICE = 300

  const QUALITY_LABELS: Record<string, string> = {
    normal: '',
    fine: '优良',
    excellent: '精品',
    supreme: '极品'
  }

  const QUALITY_BORDERS: Record<string, string> = {
    fine: 'border-quality-fine',
    excellent: 'border-quality-excellent',
    supreme: 'border-quality-supreme'
  }

  const shopStore = useShopStore()
  const playerStore = usePlayerStore()
  const inventoryStore = useInventoryStore()
  const farmStore = useFarmStore()
  const walletStore = useWalletStore()
  const gameStore = useGameStore()

  // === 折扣系统 ===

  const hasDiscount = computed(() => walletStore.getShopDiscount() > 0 || inventoryStore.getRingEffectValue('shop_discount') > 0)

  const discounted = (price: number): number => {
    const walletDiscount = walletStore.getShopDiscount()
    const ringDiscount = inventoryStore.getRingEffectValue('shop_discount')
    return Math.floor(price * (1 - walletDiscount) * (1 - ringDiscount))
  }

  // === 商铺开放状态 ===

  const isOpen = (shop: ShopDef): boolean => {
    return isShopAvailable(shop, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season)
  }

  const closedReason = (shop: ShopDef): string => {
    return getShopClosedReason(shop, gameStore.day, gameStore.hour, gameStore.weather, gameStore.season)
  }

  const enterShop = (shopId: string) => {
    shopStore.currentShopId = shopId
  }

  // === 旅行商人 ===

  if (shopStore.isMerchantHere) {
    shopStore.refreshMerchantStock()
  }

  const handleBuyFromTraveler = (itemId: string, name: string, originalPrice: number) => {
    const actualPrice = discounted(originalPrice)
    if (shopStore.buyFromTraveler(itemId)) {
      sfxBuy()
      showFloat(`-${actualPrice}文`, 'danger')
      addLog(`从旅行商人处购买了${name}。(-${actualPrice}文)`)
    } else {
      addLog('金币不足或背包已满。')
    }
  }

  // === 万物铺 ===

  const bagPrice = computed(() => {
    const level = (inventoryStore.capacity - 20) / 4
    return 500 + level * 500
  })

  const farmExpandInfo = computed(() => {
    const prices: Record<number, { newSize: number; price: number }> = {
      4: { newSize: 6, price: 2000 },
      6: { newSize: 8, price: 5000 }
    }
    return prices[farmStore.farmSize] ?? null
  })

  const handleBuyBag = () => {
    const actualPrice = discounted(bagPrice.value)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('金币不足。')
      return
    }
    if (inventoryStore.expandCapacity()) {
      addLog(`背包扩容至${inventoryStore.capacity}格！(-${actualPrice}文)`)
    } else {
      playerStore.earnMoney(actualPrice)
      addLog('背包已满级。')
    }
  }

  const handleBuyFarmExpand = () => {
    const info = farmExpandInfo.value
    if (!info) return
    const actualPrice = discounted(info.price)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('金币不足。')
      return
    }
    const newSize = farmStore.expandFarm()
    if (newSize) {
      addLog(`农场扩建至${newSize}×${newSize}！(-${actualPrice}文)`)
    } else {
      playerStore.earnMoney(actualPrice)
      addLog('农场已满级。')
    }
  }

  const seasonName = (season: Season): string => {
    return SEASON_NAMES[season] ?? season
  }

  const handleBuySapling = (saplingId: string, price: number, treeName: string) => {
    const actualPrice = discounted(price)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('金币不足。')
      return
    }
    inventoryStore.addItem(saplingId)
    addLog(`购买了${treeName}苗。(-${actualPrice}文)`)
  }

  const handleBuyHay = () => {
    const actualPrice = discounted(HAY_PRICE)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('金币不足。')
      return
    }
    inventoryStore.addItem('hay')
    addLog(`购买了干草。(-${actualPrice}文)`)
  }

  // === 镖局 ===

  const shopBombs = computed(() => BOMBS.filter(b => b.shopPrice !== null))

  const hasWeaponMaterials = (w: WeaponDef): boolean => {
    for (const mat of w.shopMaterials) {
      if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  const handleBuyWeapon = (w: WeaponDef) => {
    if (inventoryStore.hasWeapon(w.id)) {
      addLog('你已经拥有这把武器了。')
      return
    }
    if (w.shopPrice === null) return
    const actualPrice = discounted(w.shopPrice)
    if (!playerStore.spendMoney(actualPrice)) {
      addLog('金币不足。')
      return
    }
    for (const mat of w.shopMaterials) {
      if (!inventoryStore.removeItem(mat.itemId, mat.quantity)) {
        playerStore.earnMoney(actualPrice)
        addLog('材料不足。')
        return
      }
    }
    inventoryStore.addWeapon(w.id)
    const matStr =
      w.shopMaterials.length > 0 ? ' + ' + w.shopMaterials.map(m => `${getItemById(m.itemId)?.name}×${m.quantity}`).join(' + ') : ''
    addLog(`购买了${w.name}。(-${actualPrice}文${matStr})`)
  }

  // === 戒指合成 ===

  const RING_EFFECT_LABELS: Record<RingEffectType, string> = {
    attack_bonus: '攻击',
    crit_rate_bonus: '暴击',
    defense_bonus: '减伤',
    vampiric: '吸血',
    max_hp_bonus: '生命',
    stamina_reduction: '全局体力减免',
    mining_stamina: '挖矿体力减免',
    farming_stamina: '农耕体力减免',
    fishing_stamina: '钓鱼体力减免',
    crop_quality_bonus: '作物品质',
    crop_growth_bonus: '生长加速',
    fish_quality_bonus: '鱼品质',
    fishing_calm: '鱼速降低',
    sell_price_bonus: '售价加成',
    shop_discount: '商店折扣',
    gift_friendship: '送礼好感',
    monster_drop_bonus: '怪物掉落',
    exp_bonus: '经验加成',
    treasure_find: '宝箱概率',
    ore_bonus: '矿石额外',
    luck: '幸运'
  }

  const craftableRings = computed(() => CRAFTABLE_RINGS)

  const canCraftRing = (ring: RingDef): boolean => {
    if (!ring.recipe) return false
    if (playerStore.money < ring.recipeMoney) return false
    for (const mat of ring.recipe) {
      if (inventoryStore.getItemCount(mat.itemId) < mat.quantity) return false
    }
    return true
  }

  const handleCraftRing = (defId: string) => {
    const result = inventoryStore.craftRing(defId)
    if (result.success) {
      sfxBuy()
      showFloat(result.message, 'success')
      addLog(result.message)
    } else {
      addLog(result.message)
    }
  }

  // === 通用 ===

  const handleBuyItem = (itemId: string, price: number, name: string) => {
    const actualPrice = discounted(price)
    if (shopStore.buyItem(itemId, price)) {
      addLog(`购买了${name}。(-${actualPrice}文)`)
    } else {
      addLog('金币不足或背包已满。')
    }
  }

  const getSellableItems = () => {
    return inventoryStore.items
      .map(inv => {
        const def = getItemById(inv.itemId)
        return { ...inv, def }
      })
      .filter(item => item.def && item.def.category !== 'seed')
  }
</script>

<!-- ShopHeader 内联子组件 -->
<script lang="ts">
  import { defineComponent, h } from 'vue'

  const ShopHeader = defineComponent({
    name: 'ShopHeader',
    props: {
      name: { type: String, required: true },
      npc: { type: String, required: true }
    },
    setup(props) {
      return () =>
        h('div', { class: 'flex items-center gap-2 mb-3' }, [h('h3', { class: 'text-accent text-sm' }, [`${props.name} · ${props.npc}`])])
    }
  })

  export default { components: { ShopHeader } }
</script>
