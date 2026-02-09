<template>
  <div>
    <!-- 主线任务 -->
    <div v-if="mainQuestDef" class="mb-4">
      <h3 class="text-accent text-sm mb-2">
        <BookOpen :size="14" class="inline" />
        主线任务 · 第{{ mainQuestDef.chapter }}章「{{ chapterTitle }}」
      </h3>
      <div class="border border-accent/50 rounded p-2 bg-accent/5">
        <p class="text-xs font-bold text-accent">{{ mainQuestDef.title }}</p>
        <p class="text-xs text-muted mt-0.5">{{ mainQuestDef.description }}</p>
        <div class="mt-1 flex flex-col gap-0.5">
          <div v-for="(obj, i) in mainQuestDef.objectives" :key="i">
            <span class="text-xs" :class="mainQuestProgress[i] ? 'text-success' : 'text-muted'">
              {{ mainQuestProgress[i] ? '✓' : '○' }} {{ obj.label }}
            </span>
          </div>
        </div>
        <p class="text-xs text-muted mt-1">
          奖励: {{ mainQuestDef.moneyReward }}文
          <template v-if="mainQuestDef.friendshipReward?.length">+ 好感</template>
          <template v-if="mainQuestDef.itemReward?.length">
            + {{ mainQuestDef.itemReward.map(i => `${getItemName(i.itemId)}×${i.quantity}`).join(', ') }}
          </template>
        </p>
        <div class="mt-1">
          <button v-if="!questStore.mainQuest?.accepted" class="btn text-xs" @click="handleAcceptMain">
            <Plus :size="14" />
            接取
          </button>
          <button
            v-else
            class="btn text-xs"
            :class="{ '!bg-accent !text-bg': questStore.canSubmitMainQuest() }"
            :disabled="!questStore.canSubmitMainQuest()"
            @click="handleSubmitMain"
          >
            <CheckCircle :size="14" />
            提交
          </button>
        </div>
      </div>
    </div>
    <div v-else-if="questStore.completedMainQuests.length >= 50" class="mb-4">
      <p class="text-xs text-accent">主线任务已全部完成！</p>
    </div>

    <h3 class="text-accent text-sm mb-3">
      <ClipboardList :size="14" class="inline" />
      告示栏
    </h3>

    <!-- 告示栏任务 -->
    <div class="mb-4">
      <p class="text-xs text-muted mb-2">
        <Calendar :size="14" class="inline" />
        今日委托
      </p>
      <div v-if="questStore.boardQuests.length === 0" class="text-xs text-muted">今日暂无委托。</div>
      <div v-else class="flex flex-col gap-2">
        <div v-for="quest in questStore.boardQuests" :key="quest.id" class="border border-accent/20 rounded p-2">
          <p class="text-xs">{{ quest.description }}</p>
          <div class="flex justify-between items-center mt-1">
            <span class="text-xs text-muted">奖励: {{ quest.moneyReward }}文 + 好感{{ quest.friendshipReward }}</span>
            <button
              class="btn text-xs"
              :disabled="questStore.activeQuests.length >= questStore.MAX_ACTIVE_QUESTS"
              @click="handleAccept(quest.id)"
            >
              <Plus :size="14" />
              接取
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 特殊订单 -->
    <div v-if="questStore.specialOrder" class="mb-4">
      <p class="text-xs text-accent mb-2">
        <Star :size="14" class="inline" />
        特殊订单
      </p>
      <div class="border border-accent/50 rounded p-2 bg-accent/5">
        <p class="text-xs font-bold text-accent">{{ questStore.specialOrder.description }}</p>
        <p class="text-xs text-muted mt-0.5">
          目标: {{ questStore.specialOrder.targetItemName }} × {{ questStore.specialOrder.targetQuantity }}
        </p>
        <p class="text-xs text-muted">限时: {{ questStore.specialOrder.daysRemaining }} 天</p>
        <div class="flex justify-between items-center mt-1">
          <span class="text-xs text-muted">
            奖励: {{ questStore.specialOrder.moneyReward }}文 + 好感{{ questStore.specialOrder.friendshipReward }}
            <template v-if="questStore.specialOrder.itemReward?.length">
              + {{ questStore.specialOrder.itemReward.map(i => `${getItemName(i.itemId)}×${i.quantity}`).join(', ') }}
            </template>
          </span>
          <button
            class="btn text-xs"
            :disabled="questStore.activeQuests.length >= questStore.MAX_ACTIVE_QUESTS"
            @click="handleAcceptSpecialOrder"
          >
            <Plus :size="14" />
            接取
          </button>
        </div>
      </div>
    </div>

    <!-- 进行中任务 -->
    <div class="mb-4">
      <p class="text-xs text-muted mb-2">
        <Clock :size="14" class="inline" />
        进行中 ({{ questStore.activeQuests.length }}/{{ questStore.MAX_ACTIVE_QUESTS }})
      </p>
      <div v-if="questStore.activeQuests.length === 0" class="text-xs text-muted">暂无进行中的任务。</div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="quest in questStore.activeQuests"
          :key="quest.id"
          class="border rounded p-2"
          :class="quest.type === 'special_order' ? 'border-accent/50 bg-accent/5' : 'border-accent/20'"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs">{{ quest.description }}</p>
              <p class="text-xs text-muted mt-0.5">
                剩余 {{ quest.daysRemaining }} 天 · 奖励 {{ quest.moneyReward }}文
                <template v-if="quest.itemReward?.length">
                  + {{ quest.itemReward.map(i => `${getItemName(i.itemId)}×${i.quantity}`).join(', ') }}
                </template>
              </p>
            </div>
          </div>
          <!-- Progress bar for non-delivery quests -->
          <div v-if="quest.type !== 'delivery'" class="mt-1">
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-bg rounded-[2px] border border-accent/10">
                <div
                  class="h-full rounded-[2px] bg-accent transition-all"
                  :style="{ width: Math.floor((quest.collectedQuantity / quest.targetQuantity) * 100) + '%' }"
                />
              </div>
              <span class="text-xs text-muted">{{ quest.collectedQuantity }}/{{ quest.targetQuantity }}</span>
            </div>
          </div>
          <!-- For delivery: show current inventory count -->
          <div v-else class="mt-1">
            <span class="text-xs text-muted">背包中: {{ inventoryStore.getItemCount(quest.targetItemId) }}/{{ quest.targetQuantity }}</span>
          </div>
          <!-- Submit button -->
          <button
            class="btn text-xs mt-1"
            :class="{ 'bg-accent text-bg': canSubmit(quest) }"
            :disabled="!canSubmit(quest)"
            @click="handleSubmit(quest.id)"
          >
            <CheckCircle :size="14" />
            提交
          </button>
        </div>
      </div>
    </div>

    <!-- 累计完成 -->
    <p class="text-xs text-muted">累计完成委托: {{ questStore.completedQuestCount }} 个</p>
    <p class="text-xs text-muted">主线进度: {{ questStore.completedMainQuests.length }}/50</p>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ClipboardList, Calendar, Clock, Plus, CheckCircle, Star, BookOpen } from 'lucide-vue-next'
  import type { QuestInstance } from '@/types'
  import { useQuestStore, useInventoryStore } from '@/stores'
  import { getItemById, getStoryQuestById, CHAPTER_TITLES } from '@/data'
  import { addLog } from '@/composables/useGameLog'

  const questStore = useQuestStore()
  const inventoryStore = useInventoryStore()

  const getItemName = (id: string): string => {
    return getItemById(id)?.name ?? id
  }

  // === 主线任务 ===

  const mainQuestDef = computed(() => {
    if (!questStore.mainQuest) return null
    return getStoryQuestById(questStore.mainQuest.questId) ?? null
  })

  const chapterTitle = computed(() => {
    if (!mainQuestDef.value) return ''
    return CHAPTER_TITLES[mainQuestDef.value.chapter] ?? ''
  })

  const mainQuestProgress = computed(() => {
    return questStore.mainQuest?.objectiveProgress ?? []
  })

  const handleAcceptMain = () => {
    const result = questStore.acceptMainQuest()
    addLog(result.message)
  }

  const handleSubmitMain = () => {
    const result = questStore.submitMainQuest()
    addLog(result.message)
  }

  // === 日常委托 ===

  const canSubmit = (quest: QuestInstance): boolean => {
    if (quest.type === 'delivery') {
      return inventoryStore.getItemCount(quest.targetItemId) >= quest.targetQuantity
    }
    return quest.collectedQuantity >= quest.targetQuantity
  }

  const handleAccept = (questId: string) => {
    const result = questStore.acceptQuest(questId)
    addLog(result.message)
  }

  const handleAcceptSpecialOrder = () => {
    const result = questStore.acceptSpecialOrder()
    addLog(result.message)
  }

  const handleSubmit = (questId: string) => {
    const result = questStore.submitQuest(questId)
    addLog(result.message)
  }
</script>
