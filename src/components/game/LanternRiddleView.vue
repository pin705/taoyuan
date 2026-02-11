<template>
  <div class="game-panel max-w-sm w-full">
    <h3 class="text-accent text-sm mb-3 flex items-center gap-1">
      <Lightbulb :size="14" />
      七夕猜灯谜
    </h3>

    <!-- 准备 -->
    <div v-if="phase === 'ready'">
      <p class="text-xs text-muted mb-3">广场上挂满了灯笼，每个灯笼下都有一条灯谜。共5题，每题8秒，答对有奖！</p>
      <button class="btn text-xs" @click="startGame">开始猜谜！</button>
    </div>

    <!-- 展示灯笼 -->
    <div v-else-if="phase === 'showing'" class="text-center py-4">
      <div class="lantern-drop mb-3">
        <div class="inline-block border-2 border-accent/50 px-6 py-3">
          <Lamp :size="20" class="text-accent mx-auto mb-1" />
          <p class="text-accent text-xs">第 {{ currentIndex + 1 }} 题</p>
        </div>
      </div>
      <!-- 进度点 -->
      <div class="flex justify-center gap-2 mt-2">
        <div v-for="i in 5" :key="i" class="w-2 h-2" :class="dotClass(i - 1)"></div>
      </div>
    </div>

    <!-- 答题中 -->
    <div v-else-if="phase === 'answering'">
      <!-- 进度点 + 倒计时 -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <div v-for="i in 5" :key="i" class="w-2 h-2" :class="dotClass(i - 1)"></div>
        </div>
        <p class="text-xs" :class="countdown <= 3 ? 'text-danger time-pulse' : 'text-accent'">
          <Timer :size="12" class="inline -mt-0.5" />
          {{ countdown }}s
        </p>
      </div>

      <!-- 倒计时条 -->
      <div class="h-1 bg-bg border border-accent/20 mb-3">
        <div
          class="h-full transition-all duration-1000 ease-linear"
          :class="countdown <= 3 ? 'bg-danger/60' : 'bg-accent/60'"
          :style="{ width: `${(countdown / 8) * 100}%` }"
        ></div>
      </div>

      <!-- 谜面 -->
      <div class="border border-accent/30 p-3 mb-3 text-center">
        <p class="text-xs text-muted mb-1">谜面</p>
        <p class="text-xs text-text leading-relaxed">{{ currentRiddle.question }}</p>
      </div>

      <!-- 选项 -->
      <div class="flex flex-col gap-2">
        <button
          v-for="(opt, i) in currentRiddle.options"
          :key="i"
          class="btn text-xs text-left"
          :disabled="answered"
          :class="{ 'opacity-50': answered }"
          @click="answer(i)"
        >
          <span class="text-accent mr-1">{{ ['甲', '乙', '丙'][i] }}.</span>
          {{ opt }}
        </button>
      </div>
    </div>

    <!-- 单题结果 -->
    <div v-else-if="phase === 'result'" class="text-center">
      <!-- 进度点 -->
      <div class="flex justify-center gap-1.5 mb-3">
        <div v-for="i in 5" :key="i" class="w-2 h-2" :class="dotClass(i - 1)"></div>
      </div>

      <div :class="lastCorrect ? 'correct-flash' : 'wrong-shake'" class="mb-3 py-3 border border-accent/20">
        <p class="text-sm mb-1" :class="lastCorrect ? 'text-success' : 'text-danger'">
          {{ lastCorrect ? '答对了！+100文' : '答错了…' }}
        </p>
        <p class="text-xs text-muted mt-1">
          正确答案：
          <span class="text-accent">{{ currentRiddle.options[currentRiddle.answer] }}</span>
        </p>
      </div>
      <p class="text-xs text-muted">
        当前得分：
        <span class="text-accent">{{ score }}</span>
        文
      </p>
    </div>

    <!-- 最终结果 -->
    <div v-else>
      <p class="text-xs text-muted mb-2">灯谜会结束！</p>

      <!-- 进度点（最终状态） -->
      <div class="flex justify-center gap-1.5 mb-3">
        <div v-for="i in 5" :key="i" class="w-2 h-2" :class="dotClass(i - 1)"></div>
      </div>

      <div class="border border-accent/20 p-3 mb-3 text-center">
        <p class="text-xs mb-1">
          答对：
          <span class="text-success">{{ correctCount }}</span>
          / 5 题
        </p>
        <p class="text-xs">
          总奖金：
          <span class="text-accent">{{ score }}</span>
          文
          <span v-if="correctCount === 5" class="text-accent finish-flash">（全对+300文！）</span>
        </p>
      </div>
      <button class="btn text-xs" @click="handleClaim">领取奖励</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onUnmounted } from 'vue'
  import { Lightbulb, Lamp, Timer } from 'lucide-vue-next'

  const emit = defineEmits<{ complete: [prize: number] }>()

  type Phase = 'ready' | 'showing' | 'answering' | 'result' | 'finished'
  const phase = ref<Phase>('ready')

  interface Riddle {
    question: string
    options: string[]
    answer: number
  }

  const RIDDLE_POOL: Riddle[] = [
    { question: '有面无口，有脚无手，听人讲话，陪人吃酒。（打一日用品）', options: ['桌子', '椅子', '镜子'], answer: 0 },
    { question: '千条线，万条线，掉到水里看不见。（打一自然现象）', options: ['风', '雨', '雪'], answer: 1 },
    { question: '白嫩小宝宝，洗澡吹泡泡，洗洗身体小，再洗不见了。（打一日用品）', options: ['毛巾', '肥皂', '牙膏'], answer: 1 },
    { question: '身穿绿衣裳，肚里水汪汪，生的子儿多，个个黑脸膛。（打一水果）', options: ['葡萄', '西瓜', '石榴'], answer: 1 },
    { question: '红公鸡，绿尾巴，身体钻到地底下。（打一蔬菜）', options: ['胡萝卜', '白萝卜', '红薯'], answer: 0 },
    { question: '弟兄七八个，围着柱子坐，大家一分手，衣服全扯破。（打一食物）', options: ['饺子', '包子', '蒜'], answer: 2 },
    { question: '头戴红帽子，身穿白袍子，走路摆架子，说话伸脖子。（打一动物）', options: ['鸡', '鹅', '鹤'], answer: 1 },
    { question: '一物三口，有腿无手，谁要没它，难见亲友。（打一服饰）', options: ['帽子', '裤子', '鞋子'], answer: 1 },
    { question: '圆圆脸儿像苹果，又酸又甜营养多，既能做菜吃，又能当水果。（打一蔬果）', options: ['番茄', '苹果', '桃子'], answer: 0 },
    { question: '看看圆，摸摸麻，包着一肚小月牙。（打一食物）', options: ['核桃', '花生', '橘子'], answer: 2 },
    { question: '小小一姑娘，坐在水中央，身穿粉红袄，阵阵放清香。（打一植物）', options: ['睡莲', '荷花', '菊花'], answer: 1 },
    { question: '一个老头，不跑不走，请他睡觉，他就摇头。（打一物品）', options: ['钟摆', '不倒翁', '秋千'], answer: 1 },
    { question: '有头无颈，有眼无眉，无脚能走，有翅难飞。（打一动物）', options: ['蛇', '鱼', '蚕'], answer: 1 },
    { question: '驼背公公，力大无穷，爱驮什么？车水马龙。（打一物）', options: ['桥', '路', '船'], answer: 0 },
    { question: '上不怕水，下不怕火，家家厨房，都有一个。（打一厨具）', options: ['菜刀', '锅', '碗'], answer: 1 }
  ]

  const gameRiddles = ref<Riddle[]>([])
  const currentIndex = ref(0)
  const countdown = ref(8)
  const score = ref(0)
  const correctCount = ref(0)
  const lastCorrect = ref(false)
  const answered = ref(false)
  /** 记录每题对错: true=对, false=错, null=未答 */
  const results = ref<(boolean | null)[]>([null, null, null, null, null])

  let countdownTimer: ReturnType<typeof setInterval> | null = null
  let phaseTimeout: ReturnType<typeof setTimeout> | null = null

  const currentRiddle = ref<Riddle>(RIDDLE_POOL[0]!)

  const dotClass = (idx: number) => {
    const r = results.value[idx]
    if (r === true) return 'bg-success'
    if (r === false) return 'bg-danger'
    if (idx === currentIndex.value && phase.value !== 'finished') return 'bg-accent dot-pulse'
    return 'bg-accent/20'
  }

  const pickRiddles = (): Riddle[] => {
    const pool = [...RIDDLE_POOL]
    const picked: Riddle[] = []
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      picked.push(pool.splice(idx, 1)[0]!)
    }
    return picked
  }

  const startGame = () => {
    gameRiddles.value = pickRiddles()
    currentIndex.value = 0
    score.value = 0
    correctCount.value = 0
    results.value = [null, null, null, null, null]
    showNextRiddle()
  }

  const showNextRiddle = () => {
    currentRiddle.value = gameRiddles.value[currentIndex.value]!
    answered.value = false
    phase.value = 'showing'
    phaseTimeout = setTimeout(() => {
      phase.value = 'answering'
      countdown.value = 8
      countdownTimer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          answer(-1) // 超时
        }
      }, 1000)
    }, 800)
  }

  const answer = (choice: number) => {
    if (answered.value) return
    answered.value = true

    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = null

    const correct = choice === currentRiddle.value.answer
    lastCorrect.value = correct
    results.value[currentIndex.value] = correct
    if (correct) {
      correctCount.value++
      score.value += 100
    }
    phase.value = 'result'

    phaseTimeout = setTimeout(() => {
      currentIndex.value++
      if (currentIndex.value >= 5) {
        // 全对奖励
        if (correctCount.value === 5) {
          score.value += 300
        }
        phase.value = 'finished'
      } else {
        showNextRiddle()
      }
    }, 1500)
  }

  const handleClaim = () => {
    emit('complete', score.value)
  }

  onUnmounted(() => {
    if (countdownTimer) clearInterval(countdownTimer)
    if (phaseTimeout) clearTimeout(phaseTimeout)
  })
</script>

<style scoped>
  .lantern-drop {
    animation: lantern-drop 0.6s ease-out;
  }

  @keyframes lantern-drop {
    0% {
      transform: translateY(-20px);
      opacity: 0;
    }
    60% {
      transform: translateY(3px);
      opacity: 1;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dot-pulse {
    animation: dot-pulse 1s ease-in-out infinite;
  }

  @keyframes dot-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .time-pulse {
    animation: time-pulse 0.5s ease-in-out infinite;
  }

  @keyframes time-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .correct-flash {
    animation: correct-flash 0.4s ease-in-out;
  }

  @keyframes correct-flash {
    0% {
      background-color: transparent;
    }
    30% {
      background-color: rgba(90, 158, 111, 0.2);
    }
    100% {
      background-color: transparent;
    }
  }

  .wrong-shake {
    animation: wrong-shake 0.4s ease-in-out;
  }

  @keyframes wrong-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-4px);
    }
    40% {
      transform: translateX(4px);
    }
    60% {
      transform: translateX(-3px);
    }
    80% {
      transform: translateX(3px);
    }
  }

  .finish-flash {
    animation: finish-flash 0.6s ease-in-out 3;
  }

  @keyframes finish-flash {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
</style>
