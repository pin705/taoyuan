import { ref } from 'vue'
import type { Season, Weather } from '@/types'
import { useGameStore } from '@/stores'
import { getTimePeriod } from '@/data/timeConstants'

// ====== Tone.js 延迟加载（避免模块初始化时创建 AudioContext） ======

type ToneModule = typeof import('tone')
let T: ToneModule | null = null

/** 动态加载 Tone.js 并启动 AudioContext（首次调用需在用户手势中） */
const loadTone = async (): Promise<ToneModule> => {
  if (!T) {
    T = await import('tone')
  }
  await T.start()
  return T
}

// ====== 音量设置 ======

const sfxEnabled = ref(true)
const bgmEnabled = ref(true)
const sfxVolume = 0.3
const bgmVolume = 0.15

/** 线性音量 → 分贝 */
const toDb = (v: number): number => (v <= 0 ? -Infinity : 20 * Math.log10(v))

// ====== 音效 (SFX) ======

type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth'

/** 播放简单合成音效（一次性 Synth，播放后自动销毁） */
const playSfx = (freq: number, duration = 0.1, type: WaveType = 'square', vol = sfxVolume) => {
  if (!sfxEnabled.value || !T) return
  try {
    const synth = new T.Synth({
      oscillator: { type },
      envelope: {
        attack: 0.005,
        decay: duration * 0.6,
        sustain: 0,
        release: duration * 0.3
      },
      volume: toDb(vol)
    }).toDestination()
    synth.triggerAttackRelease(freq, duration)
    setTimeout(() => safeDispose(synth), (duration + 0.5) * 1000)
  } catch {
    /* AudioContext not ready */
  }
}

// ====== 游戏音效 ======

/** 按钮点击（清脆短促 blip） */
export const sfxClick = () => {
  playSfx(1200, 0.025, 'square', 0.12)
  setTimeout(() => playSfx(800, 0.02, 'square', 0.08), 20)
}

/** 浇水（水滴下落 + 扩散） */
export const sfxWater = () => {
  playSfx(500, 0.06, 'sine', 0.2)
  setTimeout(() => playSfx(350, 0.08, 'triangle', 0.18), 50)
  setTimeout(() => playSfx(250, 0.1, 'sine', 0.12), 100)
}

/** 种植（轻柔入土两声） */
export const sfxPlant = () => {
  playSfx(400, 0.04, 'triangle', 0.2)
  setTimeout(() => playSfx(600, 0.05, 'triangle', 0.18), 40)
  setTimeout(() => playSfx(500, 0.03, 'sine', 0.12), 80)
}

/** 收获（欢快三连音上行） */
export const sfxHarvest = () => {
  ;[523, 659, 784].forEach((f, i) => setTimeout(() => playSfx(f, 0.07, 'square', 0.22), i * 55))
  setTimeout(() => playSfx(784, 0.12, 'square', 0.15), 220)
}

/** 开垦（沉闷锄击 + 碎土） */
export const sfxDig = () => {
  playSfx(120, 0.06, 'sawtooth', 0.25)
  setTimeout(() => playSfx(200, 0.04, 'square', 0.18), 40)
  setTimeout(() => playSfx(350, 0.03, 'triangle', 0.1), 70)
}

/** 购买（清脆双音确认） */
export const sfxBuy = () => {
  playSfx(660, 0.04, 'triangle', 0.2)
  setTimeout(() => playSfx(880, 0.06, 'triangle', 0.22), 40)
  setTimeout(() => playSfx(880, 0.03, 'square', 0.1), 90)
}

/** 出售/获得金币（经典金币弹跳音） */
export const sfxCoin = () => {
  playSfx(988, 0.04, 'square', 0.22)
  setTimeout(() => playSfx(1319, 0.08, 'square', 0.2), 35)
}

/** 升级（华丽上行 fanfare） */
export const sfxLevelUp = () => {
  if (!sfxEnabled.value) return
  ;[523, 659, 784, 880].forEach((f, i) => setTimeout(() => playSfx(f, 0.1, 'square', 0.25), i * 80))
  setTimeout(() => playSfx(1047, 0.3, 'square', 0.22), 350)
  setTimeout(() => playSfx(1047, 0.15, 'triangle', 0.12), 500)
}

/** 战斗攻击（高频下扫 + 冲击，8-bit 打击感） */
export const sfxAttack = () => {
  playSfx(800, 0.04, 'sawtooth', 0.3)
  setTimeout(() => playSfx(400, 0.05, 'square', 0.25), 30)
  setTimeout(() => playSfx(150, 0.08, 'sawtooth', 0.2), 60)
}

/** 受伤（快速高低交替嗡鸣，经典 NES 伤害音） */
export const sfxHurt = () => {
  playSfx(300, 0.04, 'square', 0.25)
  setTimeout(() => playSfx(150, 0.04, 'square', 0.2), 40)
  setTimeout(() => playSfx(300, 0.04, 'square', 0.2), 80)
  setTimeout(() => playSfx(120, 0.06, 'square', 0.15), 120)
}

/** 遭遇怪物（紧迫上行，危险警告） */
export const sfxEncounter = () => {
  ;[200, 300, 400, 600].forEach((f, i) => setTimeout(() => playSfx(f, 0.06, 'square', 0.25), i * 50))
}

/** 防御格挡（金属质感短促音） */
export const sfxDefend = () => {
  playSfx(600, 0.03, 'triangle', 0.25)
  setTimeout(() => playSfx(800, 0.05, 'triangle', 0.2), 30)
}

/** 逃跑（快速下行滑落） */
export const sfxFlee = () => {
  ;[500, 400, 300, 200].forEach((f, i) => setTimeout(() => playSfx(f, 0.05, 'triangle', 0.2), i * 40))
}

/** 击败怪物（短胜利音，上行收束） */
export const sfxVictory = () => {
  ;[523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playSfx(f, 0.1, 'square', 0.25), i * 70))
}

/** 钓鱼拉线（紧张棘轮音，反复勾拉） */
export const sfxReel = () => {
  playSfx(700, 0.03, 'triangle', 0.18)
  setTimeout(() => playSfx(600, 0.03, 'triangle', 0.15), 35)
  setTimeout(() => playSfx(750, 0.03, 'triangle', 0.18), 70)
  setTimeout(() => playSfx(650, 0.03, 'triangle', 0.12), 105)
}

/** 钓到鱼（欢快弹跳上行 jingle） */
export const sfxFishCatch = () => {
  ;[523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playSfx(f, 0.06, 'square', 0.22), i * 55))
  setTimeout(() => playSfx(1047, 0.1, 'square', 0.15), 280)
}

/** 断线（急促下坠 + 闷响） */
export const sfxLineBroken = () => {
  playSfx(500, 0.04, 'sawtooth', 0.25)
  setTimeout(() => playSfx(300, 0.05, 'sawtooth', 0.2), 35)
  setTimeout(() => playSfx(120, 0.1, 'square', 0.15), 70)
}

/** 挖矿（锐利敲击 + 碎石回弹） */
export const sfxMine = () => {
  playSfx(180, 0.04, 'sawtooth', 0.25)
  setTimeout(() => playSfx(400, 0.03, 'square', 0.18), 35)
  setTimeout(() => playSfx(300, 0.03, 'triangle', 0.12), 65)
}

/** 休息/睡觉（柔和下行摇篮曲） */
export const sfxSleep = () => {
  ;[523, 440, 392, 330, 262].forEach((f, i) => setTimeout(() => playSfx(f, 0.18, 'sine', 0.12), i * 130))
}

/** 错误/失败（短促双嗡） */
export const sfxError = () => {
  playSfx(220, 0.06, 'square', 0.2)
  setTimeout(() => playSfx(180, 0.08, 'square', 0.18), 70)
}

/** 采集（轻快拨取音） */
export const sfxForage = () => {
  playSfx(500, 0.04, 'triangle', 0.2)
  setTimeout(() => playSfx(660, 0.05, 'triangle', 0.18), 35)
  setTimeout(() => playSfx(550, 0.03, 'sine', 0.1), 75)
}

// ====== 背景音乐 (中国风五声音阶) ======

// 五声音阶: 宫(C) 商(D) 角(E) 徵(G) 羽(A)
// C3=131 D3=147 E3=165 G3=196 A3=220
// C4=262 D4=294 E4=330 G4=392 A4=440
// C5=523 D5=587 E5=659 G5=784 A5=880

// ---- BGM 类型定义 ----

type SeasonBgmType = 'spring' | 'summer' | 'autumn' | 'winter'
type FestivalBgmType = 'festival_spring' | 'festival_summer' | 'festival_autumn' | 'festival_winter'
type BgmType = SeasonBgmType | FestivalBgmType | 'battle'

let currentFestivalOverride: FestivalBgmType | null = null

// ---- 春季 BGM（明快上行，晨光田园） ----

const SPRING_MELODY: number[] = [
  330, 392, 440, 392, 330, 294, 262, 294, 330, 392, 440, 523, 440, 392, 330, 0, 523, 440, 392, 330, 392, 440, 523, 587, 523, 440, 392, 440,
  392, 330, 294, 0, 294, 330, 392, 440, 392, 330, 294, 262, 294, 330, 392, 330, 294, 262, 294, 0, 440, 392, 330, 392, 440, 523, 440, 392,
  330, 294, 330, 392, 330, 294, 262, 0
]

const SPRING_BASS: number[] = [131, 147, 165, 196, 220, 196, 165, 131, 147, 165, 196, 131, 220, 196, 165, 131]

// ---- 夏季 BGM（活泼高音域，蝉鸣荷塘） ----

const SUMMER_MELODY: number[] = [
  523, 587, 659, 587, 523, 440, 523, 587, 659, 784, 659, 587, 523, 440, 392, 0, 440, 523, 587, 523, 440, 392, 440, 523, 587, 523, 440, 392,
  330, 392, 440, 0, 784, 659, 587, 523, 587, 659, 523, 440, 392, 440, 523, 587, 523, 440, 392, 0, 392, 440, 523, 587, 659, 587, 523, 440,
  392, 330, 392, 440, 392, 330, 262, 0
]

const SUMMER_BASS: number[] = [165, 196, 220, 196, 131, 165, 196, 220, 196, 165, 131, 147, 165, 196, 220, 131]

// ---- 秋季 BGM（缓慢下行，落叶忧伤） ----

const AUTUMN_MELODY: number[] = [
  440, 392, 330, 294, 262, 294, 330, 262, 440, 392, 330, 294, 262, 294, 262, 0, 330, 392, 440, 392, 330, 294, 330, 392, 440, 523, 440, 392,
  330, 294, 262, 0, 523, 440, 392, 330, 262, 294, 330, 294, 262, 294, 330, 392, 330, 294, 262, 0, 294, 330, 392, 440, 392, 330, 294, 262,
  294, 262, 294, 330, 294, 262, 262, 0
]

const AUTUMN_BASS: number[] = [220, 196, 165, 131, 147, 165, 196, 165, 131, 147, 165, 196, 220, 196, 165, 131]

// ---- 冬季 BGM（稀疏空灵，初雪炉火） ----

const WINTER_MELODY: number[] = [
  262, 0, 330, 0, 392, 330, 262, 0, 294, 0, 392, 0, 440, 392, 330, 0, 440, 392, 330, 262, 330, 392, 330, 0, 262, 294, 330, 294, 262, 0, 262,
  0, 330, 392, 440, 0, 392, 330, 0, 262, 294, 330, 0, 294, 262, 0, 262, 0, 392, 330, 294, 262, 294, 330, 392, 330, 294, 262, 0, 294, 262, 0,
  262, 0
]

const WINTER_BASS: number[] = [131, 0, 165, 0, 196, 0, 131, 0, 147, 0, 165, 131, 196, 165, 131, 0]

// ---- 战斗 BGM（快节奏驱动型，魂斗罗/宝可梦风格） ----

const BATTLE_MELODY: number[] = [
  // Phase 1: 急速上行 riff（驱动感）
  330, 392, 440, 523, 330, 392, 440, 523, 587, 659, 587, 523, 440, 392, 330, 392,
  // Phase 2: 切分冲击（休止符制造打击感）
  523, 0, 523, 587, 0, 659, 587, 523, 440, 0, 440, 523, 0, 392, 440, 0,
  // Phase 3: 高音域紧张段
  659, 587, 523, 587, 659, 784, 659, 587, 523, 440, 392, 440, 523, 587, 659, 0,
  // Phase 4: 跌落 + 回旋（循环点）
  784, 659, 587, 523, 392, 440, 523, 659, 587, 523, 440, 392, 330, 392, 440, 0
]

const BATTLE_BASS: number[] = [131, 196, 131, 196, 220, 196, 165, 196, 131, 220, 196, 165, 131, 165, 196, 220]

// ---- 节日 BGM ----

const FESTIVAL_SPRING_MELODY: number[] = [523, 587, 659, 784, 659, 587, 523, 440, 523, 659, 784, 880, 784, 659, 523, 0]
const FESTIVAL_SPRING_BASS: number[] = [131, 196, 165, 220]

const FESTIVAL_SUMMER_MELODY: number[] = [440, 523, 587, 523, 440, 392, 440, 523, 587, 659, 587, 523, 440, 392, 330, 0]
const FESTIVAL_SUMMER_BASS: number[] = [220, 196, 165, 196]

const FESTIVAL_AUTUMN_MELODY: number[] = [392, 440, 523, 440, 392, 330, 392, 440, 523, 587, 523, 440, 523, 440, 392, 0]
const FESTIVAL_AUTUMN_BASS: number[] = [196, 220, 165, 131]

const FESTIVAL_WINTER_MELODY: number[] = [262, 330, 392, 440, 523, 440, 392, 330, 440, 523, 587, 659, 587, 523, 440, 0]
const FESTIVAL_WINTER_BASS: number[] = [131, 165, 196, 220]

// ---- BGM 配置表 ----

interface BgmConfig {
  melody: number[]
  bass: number[]
  noteDur: number
  melodyWave: WaveType
  bassWave: WaveType
  /** 低音每隔几拍播放一次（默认 4） */
  bassInterval?: number
}

const BGM_CONFIG: Record<BgmType, BgmConfig> = {
  spring: { melody: SPRING_MELODY, bass: SPRING_BASS, noteDur: 0.38, melodyWave: 'triangle', bassWave: 'sine' },
  summer: { melody: SUMMER_MELODY, bass: SUMMER_BASS, noteDur: 0.34, melodyWave: 'triangle', bassWave: 'sine' },
  autumn: { melody: AUTUMN_MELODY, bass: AUTUMN_BASS, noteDur: 0.42, melodyWave: 'triangle', bassWave: 'sine' },
  winter: { melody: WINTER_MELODY, bass: WINTER_BASS, noteDur: 0.5, melodyWave: 'sine', bassWave: 'sine' },
  festival_spring: { melody: FESTIVAL_SPRING_MELODY, bass: FESTIVAL_SPRING_BASS, noteDur: 0.3, melodyWave: 'square', bassWave: 'triangle' },
  festival_summer: { melody: FESTIVAL_SUMMER_MELODY, bass: FESTIVAL_SUMMER_BASS, noteDur: 0.4, melodyWave: 'sine', bassWave: 'sine' },
  festival_autumn: {
    melody: FESTIVAL_AUTUMN_MELODY,
    bass: FESTIVAL_AUTUMN_BASS,
    noteDur: 0.28,
    melodyWave: 'square',
    bassWave: 'triangle'
  },
  festival_winter: { melody: FESTIVAL_WINTER_MELODY, bass: FESTIVAL_WINTER_BASS, noteDur: 0.35, melodyWave: 'triangle', bassWave: 'sine' },
  battle: { melody: BATTLE_MELODY, bass: BATTLE_BASS, noteDur: 0.15, melodyWave: 'sawtooth', bassWave: 'square', bassInterval: 2 }
}

// ---- 天气修饰器 ----

type NoiseType = 'white' | 'pink' | 'brown'

interface WeatherModifier {
  tempoScale: number
  volumeScale: number
  melodyWaveOverride?: WaveType
  noiseType?: NoiseType
  noiseVolume?: number
  noiseFilterFreq?: number
  noiseFilterType?: BiquadFilterType
  detuneAmount?: number
}

const WEATHER_MODIFIERS: Record<Weather, WeatherModifier> = {
  sunny: {
    tempoScale: 1.0,
    volumeScale: 1.0
  },
  rainy: {
    tempoScale: 1.15,
    volumeScale: 0.85,
    noiseType: 'pink',
    noiseVolume: 0.06,
    noiseFilterFreq: 3000,
    noiseFilterType: 'lowpass',
    detuneAmount: 5
  },
  stormy: {
    tempoScale: 0.9,
    volumeScale: 0.75,
    melodyWaveOverride: 'sawtooth',
    noiseType: 'brown',
    noiseVolume: 0.1,
    noiseFilterFreq: 1500,
    noiseFilterType: 'lowpass',
    detuneAmount: 10
  },
  snowy: {
    tempoScale: 1.25,
    volumeScale: 0.7,
    melodyWaveOverride: 'sine',
    noiseType: 'white',
    noiseVolume: 0.02,
    noiseFilterFreq: 2000,
    noiseFilterType: 'lowpass',
    detuneAmount: 8
  },
  windy: {
    tempoScale: 0.95,
    volumeScale: 0.9,
    noiseType: 'pink',
    noiseVolume: 0.05,
    noiseFilterFreq: 800,
    noiseFilterType: 'bandpass',
    detuneAmount: 3
  }
}

// ---- 时段修饰器 ----

interface TimeModifier {
  volumeScale: number
  tempoScale: number
  detuneOffset: number
  bassVolumeScale: number
}

const TIME_MODIFIERS: Record<import('@/types').TimePeriod, TimeModifier> = {
  morning: { volumeScale: 1.0, tempoScale: 1.0, detuneOffset: 0, bassVolumeScale: 0.8 },
  afternoon: { volumeScale: 0.95, tempoScale: 1.05, detuneOffset: 0, bassVolumeScale: 1.0 },
  evening: { volumeScale: 0.85, tempoScale: 1.1, detuneOffset: 3, bassVolumeScale: 1.1 },
  night: { volumeScale: 0.7, tempoScale: 1.2, detuneOffset: 6, bassVolumeScale: 1.3 },
  late_night: { volumeScale: 0.55, tempoScale: 1.3, detuneOffset: 10, bassVolumeScale: 1.5 }
}

// ====== BGM 播放核心 ======

let bgmPlaying = false
let bgmLoopId = 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tone 类型延迟加载，无法静态引用
let melodySynth: any = null
let bassSynth: any = null
let ambientNoise: any = null
let ambientFilter: any = null

/** 安全释放 Tone 节点（已 disposed 则静默忽略） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeDispose = (node: any) => {
  try {
    node?.dispose()
  } catch {
    /* already disposed */
  }
}

/** 停止环境音层 */
const stopAmbient = () => {
  if (ambientNoise?.state === 'started') {
    try {
      ambientNoise.stop()
    } catch {
      /* ignore */
    }
  }
  safeDispose(ambientNoise)
  safeDispose(ambientFilter)
  ambientNoise = null
  ambientFilter = null
}

/** 清理 BGM 合成器和环境音 */
const cleanupBgm = () => {
  safeDispose(melodySynth)
  safeDispose(bassSynth)
  melodySynth = null
  bassSynth = null
  stopAmbient()
}

/** BGM 播放循环 */
const playBgmLoop = async (type: BgmType = 'spring', weather: Weather = 'sunny') => {
  if (!bgmEnabled.value || bgmPlaying) return
  bgmPlaying = true
  const myLoopId = ++bgmLoopId

  // 动态加载 Tone.js 并启动 AudioContext（首次需在用户手势中）
  let Tone: ToneModule
  try {
    Tone = await loadTone()
  } catch {
    bgmPlaying = false
    return
  }

  // await 后重新检查状态（等待期间可能已被取消）
  if (!bgmEnabled.value || !bgmPlaying || myLoopId !== bgmLoopId) {
    if (myLoopId === bgmLoopId) bgmPlaying = false
    return
  }

  const baseConfig = BGM_CONFIG[type]
  const isBattle = type === 'battle'
  const weatherMod = isBattle ? WEATHER_MODIFIERS.sunny : WEATHER_MODIFIERS[weather]

  // 天气修饰（循环期间固定）
  const weatherNoteDur = baseConfig.noteDur * weatherMod.tempoScale
  const weatherMelodyWave = weatherMod.melodyWaveOverride ?? baseConfig.melodyWave
  const weatherBassWave = baseConfig.bassWave
  const weatherVolume = bgmVolume * weatherMod.volumeScale
  const weatherDetune = weatherMod.detuneAmount ?? 0

  // 创建旋律合成器
  melodySynth = new Tone.Synth({
    oscillator: { type: weatherMelodyWave },
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.08, release: 0.1 },
    volume: toDb(weatherVolume)
  }).toDestination()

  // 创建低音合成器
  bassSynth = new Tone.Synth({
    oscillator: { type: weatherBassWave },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 },
    volume: toDb(weatherVolume * 0.5)
  }).toDestination()

  if (weatherDetune) {
    melodySynth.detune.value = weatherDetune
    bassSynth.detune.value = weatherDetune * 0.5
  }

  // 启动环境噪声层（Tone.Noise + Filter = 雨声/风声/雪声）
  if (weatherMod.noiseVolume && weatherMod.noiseFilterFreq) {
    try {
      ambientFilter = new Tone.Filter({
        frequency: weatherMod.noiseFilterFreq,
        type: weatherMod.noiseFilterType ?? 'lowpass'
      }).toDestination()

      ambientNoise = new Tone.Noise({
        type: weatherMod.noiseType ?? 'pink',
        volume: toDb(weatherMod.noiseVolume),
        fadeIn: 0.5,
        fadeOut: 0.3
      })
      ambientNoise.connect(ambientFilter)
      ambientNoise.start()
    } catch {
      /* noise setup failed */
    }
  }

  let noteIndex = 0

  const playNext = () => {
    // 检查是否应继续播放
    if (!bgmEnabled.value || !bgmPlaying || myLoopId !== bgmLoopId) {
      if (myLoopId === bgmLoopId) {
        bgmPlaying = false
        cleanupBgm()
      }
      return
    }

    // 合成器已被清理则退出
    if (!melodySynth || !bassSynth) return

    // 时段修饰（逐音符动态读取，战斗跳过）
    const gameStore = useGameStore()
    const timeMod = isBattle ? TIME_MODIFIERS.morning : TIME_MODIFIERS[getTimePeriod(gameStore.hour)]

    // 合成最终参数
    const noteDur = weatherNoteDur * timeMod.tempoScale
    const volume = weatherVolume * timeMod.volumeScale
    const detune = weatherDetune + timeMod.detuneOffset

    const freq = baseConfig.melody[noteIndex % baseConfig.melody.length]!

    try {
      // 更新旋律音量和失谐
      melodySynth.volume.value = toDb(volume)
      if (detune !== 0) melodySynth.detune.value = detune

      // 旋律音符（freq=0 为休止符，不播放）
      if (freq > 0) {
        melodySynth.triggerAttackRelease(freq, noteDur * 0.8)
      }

      // 低音 — 每 bassInterval 拍一个根音（默认 4）
      const bassInterval = baseConfig.bassInterval ?? 4
      if (noteIndex % bassInterval === 0) {
        const bassIndex = Math.floor(noteIndex / bassInterval) % baseConfig.bass.length
        const bassFreq = baseConfig.bass[bassIndex]!
        if (bassFreq > 0) {
          bassSynth.volume.value = toDb(volume * timeMod.bassVolumeScale * 0.5)
          if (detune !== 0) bassSynth.detune.value = detune * 0.5
          bassSynth.triggerAttackRelease(bassFreq, noteDur * 3)
        }
      }
    } catch {
      /* synth may be disposed */
    }

    noteIndex++
    setTimeout(playNext, noteDur * 1000)
  }

  playNext()
}

/** 停止 BGM */
const stopBgm = () => {
  bgmPlaying = false
  cleanupBgm()
}

/** 解析当前应播放的 BGM 类型和天气 */
const resolveCurrentBgm = (): { type: BgmType; weather: Weather } => {
  const gameStore = useGameStore()
  if (currentFestivalOverride) {
    return { type: currentFestivalOverride, weather: 'sunny' }
  }
  return { type: gameStore.season as SeasonBgmType, weather: gameStore.weather as Weather }
}

// ====== 导出 composable ======

export const useAudio = () => {
  const toggleSfx = () => {
    sfxEnabled.value = !sfxEnabled.value
  }

  const toggleBgm = () => {
    bgmEnabled.value = !bgmEnabled.value
    if (bgmEnabled.value) {
      const { type, weather } = resolveCurrentBgm()
      playBgmLoop(type, weather)
    } else {
      stopBgm()
    }
  }

  /** 启动 BGM（自动匹配当前季节+天气） */
  const startBgm = () => {
    if (bgmEnabled.value && !bgmPlaying) {
      const { type, weather } = resolveCurrentBgm()
      playBgmLoop(type, weather)
    }
  }

  /** 强制切换到当前季节/天气的 BGM（日结算后使用） */
  const switchToSeasonalBgm = () => {
    if (!bgmEnabled.value) return
    stopBgm()
    const { type, weather } = resolveCurrentBgm()
    playBgmLoop(type, weather)
  }

  /** 切换到战斗 BGM */
  const startBattleBgm = () => {
    if (!bgmEnabled.value) return
    stopBgm()
    playBgmLoop('battle', 'sunny')
  }

  /** 恢复战斗前的 BGM（季节/节日） */
  const resumeNormalBgm = () => {
    if (!bgmEnabled.value) return
    stopBgm()
    const { type, weather } = resolveCurrentBgm()
    playBgmLoop(type, weather)
  }

  /** 开始播放节日 BGM */
  const startFestivalBgm = (season: Season) => {
    if (!bgmEnabled.value) return
    const festivalType = `festival_${season}` as FestivalBgmType
    currentFestivalOverride = festivalType
    stopBgm()
    playBgmLoop(festivalType, 'sunny')
  }

  /** 结束节日 BGM，恢复季节 BGM */
  const endFestivalBgm = () => {
    currentFestivalOverride = null
    if (bgmEnabled.value) {
      switchToSeasonalBgm()
    }
  }

  return {
    sfxEnabled,
    bgmEnabled,
    toggleSfx,
    toggleBgm,
    startBgm,
    stopBgm,
    startBattleBgm,
    resumeNormalBgm,
    switchToSeasonalBgm,
    startFestivalBgm,
    endFestivalBgm
  }
}
