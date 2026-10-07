import type { MatchSound } from "@/types"
import type { MusicTrack } from "@/utils/soundtrack"

import { Howl, Howler } from "howler"

export type SoundCue = MatchSound | "menu-hover" | "ui-click" | "slot-place"

type Tone = {
  frequency: number

  duration: number

  waveform: OscillatorType

  volume: number
}

type CachedSoundEffect = {
  howl: Howl

  volume: number
}

type StadiumAudioGraph = {
  directGain: GainNode
  reverbGain: GainNode
}

const CUES: Record<SoundCue, Tone[]> = {
  "menu-hover": [],

  "ui-click": [
    { frequency: 420, duration: 0.065, waveform: "triangle", volume: 0.26 },
  ],

  "slot-place": [
    { frequency: 540, duration: 0.06, waveform: "triangle", volume: 0.28 },

    { frequency: 810, duration: 0.09, waveform: "sine", volume: 0.2 },
  ],

  "match-start": [
    { frequency: 392, duration: 0.16, waveform: "triangle", volume: 0.24 },

    { frequency: 523, duration: 0.16, waveform: "triangle", volume: 0.27 },

    { frequency: 784, duration: 0.32, waveform: "sine", volume: 0.3 },
  ],

  goal: [
    { frequency: 523, duration: 0.14, waveform: "triangle", volume: 0.28 },

    { frequency: 659, duration: 0.14, waveform: "triangle", volume: 0.3 },

    { frequency: 880, duration: 0.36, waveform: "sine", volume: 0.34 },
  ],

  "ball-piece": [
    { frequency: 210, duration: 0.07, waveform: "triangle", volume: 0.34 },
  ],

  "piece-piece": [
    { frequency: 125, duration: 0.09, waveform: "triangle", volume: 0.3 },
  ],

  wall: [{ frequency: 165, duration: 0.08, waveform: "sine", volume: 0.3 }],

  "goal-line": [
    { frequency: 280, duration: 0.045, waveform: "square", volume: 0.16 },

    { frequency: 560, duration: 0.08, waveform: "sine", volume: 0.24 },

    { frequency: 1120, duration: 0.12, waveform: "triangle", volume: 0.14 },
  ],

  whistle: [
    { frequency: 1480, duration: 0.22, waveform: "sine", volume: 0.24 },

    { frequency: 1240, duration: 0.28, waveform: "sine", volume: 0.22 },
  ],

  "lights-on": [
    { frequency: 520, duration: 0.045, waveform: "triangle", volume: 0.18 },

    { frequency: 1040, duration: 0.085, waveform: "sine", volume: 0.24 },
  ],
}

let context: AudioContext | null = null

let masterVolume = 1

let musicVolume = 0.8

let sfxVolume = 0.8
let stadiumVolume = 0.22

let musicTracks: MusicTrack[] = []

let shuffledMusicQueue: number[] = []

let musicQueueIndex = 0

let previousTrackIndex: number | null = null

const musicTrackListeners = new Set<(track: MusicTrack | null) => void>()

let activeMusic: Howl | null = null

const soundEffects = new Map<string, CachedSoundEffect>()

let musicSession = 0
let stadiumGraph: StadiumAudioGraph | null = null
let stadiumMode = false
let stadiumCrowdSoundId: number | null = null
let stadiumCrowdStopTimer: number | null = null
let sfxContext: AudioContext | null = null
let sfxCompressor: DynamicsCompressorNode | null = null
let sfxOutput: GainNode | null = null

const stadiumCrowd = new Howl({
  src: [`${import.meta.env.BASE_URL}audio/arrowhead-stadium-crowd.wav`],
  volume: 0,
  loop: true,
  preload: true,
  onloaderror: (_soundId, error) => {
    console.error("Unable to load stadium crowd ambience.", error)
  },
  onplayerror: (_soundId, error) => {
    console.error("Unable to play stadium crowd ambience.", error)
  },
})

function connectStadiumAudio() {
  if (stadiumGraph) return

  const audioContext = Howler.ctx
  const masterGain = Howler.masterGain

  if (!audioContext || !masterGain) {
    console.error("Unable to initialize stadium audio processing.")
    return
  }

  const directGain = audioContext.createGain()
  const reverb = audioContext.createConvolver()
  const reverbGain = audioContext.createGain()
  const duration = 1.6
  const impulseLength = Math.floor(audioContext.sampleRate * duration)
  const impulse = audioContext.createBuffer(
    2,
    impulseLength,
    audioContext.sampleRate,
  )

  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const samples = impulse.getChannelData(channel)
    for (let index = 0; index < impulseLength; index++) {
      const decay = (1 - index / impulseLength) ** 2.8
      samples[index] = (Math.random() * 2 - 1) * decay
    }
  }

  reverb.buffer = impulse
  directGain.gain.value = 1
  reverbGain.gain.value = stadiumMode ? 0.07 : 0

  masterGain.disconnect()
  masterGain.connect(directGain)
  directGain.connect(audioContext.destination)
  masterGain.connect(reverb)
  reverb.connect(reverbGain)
  reverbGain.connect(audioContext.destination)

  stadiumGraph = { directGain, reverbGain }
}

export function setStadiumMode(enabled: boolean) {
  if (stadiumMode === enabled) return
  stadiumMode = enabled
  connectStadiumAudio()

  if (!stadiumGraph) return
  const audioContext = Howler.ctx
  if (!audioContext) return

  const now = audioContext.currentTime
  stadiumGraph.reverbGain.gain.cancelScheduledValues(now)
  stadiumGraph.reverbGain.gain.setTargetAtTime(enabled ? 0.07 : 0, now, 0.35)

  if (enabled) {
    if (stadiumCrowdStopTimer !== null) {
      window.clearTimeout(stadiumCrowdStopTimer)
      stadiumCrowdStopTimer = null
    }
    if (stadiumCrowd.playing() && stadiumCrowdSoundId !== null) {
      stadiumCrowd.fade(
        stadiumCrowd.volume(),
        stadiumVolume,
        1200,
        stadiumCrowdSoundId,
      )
    } else {
      stadiumCrowd.volume(0)
      stadiumCrowdSoundId = stadiumCrowd.play()
      stadiumCrowd.fade(0, stadiumVolume, 1200, stadiumCrowdSoundId)
    }
    return
  }

  if (stadiumCrowdStopTimer !== null) {
    window.clearTimeout(stadiumCrowdStopTimer)
  }
  if (
    stadiumCrowdSoundId !== null &&
    stadiumCrowd.playing(stadiumCrowdSoundId)
  ) {
    stadiumCrowd.fade(0.2, 0, 900, stadiumCrowdSoundId)
    stadiumCrowdStopTimer = window.setTimeout(() => {
      if (!stadiumMode && stadiumCrowdSoundId !== null) {
        stadiumCrowd.stop(stadiumCrowdSoundId)
        stadiumCrowd.volume(0)
        stadiumCrowdSoundId = null
      }
      stadiumCrowdStopTimer = null
    }, 1000)
  }
}

function getSfxOutput(audioContext: AudioContext) {
  if (sfxContext !== audioContext || !sfxCompressor || !sfxOutput) {
    sfxContext = audioContext
    sfxCompressor = audioContext.createDynamicsCompressor()
    sfxCompressor.threshold.value = -9
    sfxCompressor.knee.value = 8
    sfxCompressor.ratio.value = 4
    sfxCompressor.attack.value = 0.004
    sfxCompressor.release.value = 0.12
    sfxOutput = audioContext.createGain()
    sfxOutput.gain.value = 1.35
    sfxCompressor.connect(sfxOutput)
    sfxOutput.connect(audioContext.destination)
  }

  return sfxCompressor
}

function getAudioContext() {
  if (typeof window === "undefined" || !window.AudioContext) return null

  if (!context) context = new window.AudioContext()

  return context
}

export function unlockAudio() {
  try {
    const audioContext = getAudioContext()

    if (audioContext?.state === "suspended") {
      void audioContext.resume().catch((error: unknown) => {
        console.error("Unable to resume audio playback.", error)
      })
    }
  } catch (error) {
    console.error("Unable to initialize audio playback.", error)
  }
}

export function setAudioVolumes(volumes: {
  master?: number
  music?: number
  sfx?: number
  stadium?: number
}) {
  if (volumes.master !== undefined) masterVolume = volumes.master / 100
  if (volumes.music !== undefined) musicVolume = volumes.music / 100
  if (volumes.sfx !== undefined) sfxVolume = volumes.sfx / 100
  if (volumes.stadium !== undefined) stadiumVolume = volumes.stadium / 100

  Howler.volume(masterVolume)
  activeMusic?.volume(musicVolume)
  if (stadiumCrowdSoundId !== null) {
    stadiumCrowd.volume(stadiumMode ? stadiumVolume : 0, stadiumCrowdSoundId)
  }
  if (stadiumGraph && Howler.ctx) {
    stadiumGraph.reverbGain.gain.setTargetAtTime(
      stadiumMode ? 0.07 * stadiumVolume : 0,
      Howler.ctx.currentTime,
      0.2,
    )
  }
  for (const effect of soundEffects.values()) {
    effect.howl.volume(effect.volume * sfxVolume)
  }
}

export function playSfx(cue: SoundCue, intensity = 1) {
  const audioContext = getAudioContext()

  if (!audioContext || masterVolume <= 0 || sfxVolume <= 0) return

  const sfxBus = getSfxOutput(audioContext)

  if (cue === "menu-hover") {
    const safeIntensity = Math.max(0.08, Math.min(intensity, 1.25))
    const voices = [
      { start: 330, end: 660, delay: 0, volume: 0.12 },
      { start: 495, end: 990, delay: 0.018, volume: 0.1 },
      { start: 660, end: 1320, delay: 0.036, volume: 0.075 },
    ]

    for (const voice of voices) {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      const startAt = audioContext.currentTime + voice.delay
      const endAt = startAt + 0.105
      const peak = voice.volume * masterVolume * sfxVolume * safeIntensity * 1.5

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(voice.start, startAt)
      oscillator.frequency.exponentialRampToValueAtTime(voice.end, endAt)
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0002, peak),
        startAt + 0.018,
      )
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt)
      oscillator.connect(gain)
      gain.connect(sfxBus)
      oscillator.start(startAt)
      oscillator.stop(endAt + 0.01)
    }
    return
  }

  const tones = CUES[cue]

  const safeIntensity = Math.max(0.08, Math.min(intensity, 1.25))

  let startAt = audioContext.currentTime

  for (const tone of tones) {
    const oscillator = audioContext.createOscillator()

    const gain = audioContext.createGain()

    const endAt = startAt + tone.duration

    const peak = tone.volume * masterVolume * sfxVolume * safeIntensity * 1.5

    oscillator.type = tone.waveform

    oscillator.frequency.setValueAtTime(tone.frequency, startAt)

    gain.gain.setValueAtTime(0.0001, startAt)

    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, peak),
      startAt + 0.008,
    )

    gain.gain.exponentialRampToValueAtTime(0.0001, endAt)

    oscillator.connect(gain)

    gain.connect(sfxBus)

    oscillator.start(startAt)

    oscillator.stop(endAt + 0.01)

    startAt = endAt
  }
}

export function stopMusic() {
  musicSession++

  musicTracks = []
  shuffledMusicQueue = []
  musicQueueIndex = 0

  if (!activeMusic) return

  activeMusic.stop()
  activeMusic.unload()
  activeMusic = null
}

export function subscribeToMusicTrack(
  listener: (track: MusicTrack | null) => void,
) {
  musicTrackListeners.add(listener)
  return () => {
    musicTrackListeners.delete(listener)
  }
}

function notifyCurrentTrack(track: MusicTrack | null) {
  for (const listener of musicTrackListeners) listener(track)
}

function shuffleMusicQueue() {
  shuffledMusicQueue = musicTracks.map((_, index) => index)

  for (let index = shuffledMusicQueue.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffledMusicQueue[index], shuffledMusicQueue[randomIndex]] = [
      shuffledMusicQueue[randomIndex],
      shuffledMusicQueue[index],
    ]
  }

  if (
    shuffledMusicQueue.length > 1 &&
    shuffledMusicQueue[0] === previousTrackIndex
  ) {
    const swapIndex =
      1 + Math.floor(Math.random() * (shuffledMusicQueue.length - 1))
    ;[shuffledMusicQueue[0], shuffledMusicQueue[swapIndex]] = [
      shuffledMusicQueue[swapIndex],
      shuffledMusicQueue[0],
    ]
  }

  musicQueueIndex = 0
}

export function playMusicPlaylist(tracks: MusicTrack[]) {
  if (
    activeMusic &&
    tracks.length === musicTracks.length &&
    tracks.every((track, index) => track.src === musicTracks[index]?.src)
  ) {
    return
  }

  stopMusic()

  musicTracks = [...tracks]

  if (musicTracks.length === 0) {
    notifyCurrentTrack(null)
    return
  }

  shuffleMusicQueue()

  void playNextTrack(musicSession)
}

function playNextTrack(session: number) {
  if (session !== musicSession || musicTracks.length === 0) return

  if (musicQueueIndex >= shuffledMusicQueue.length) shuffleMusicQueue()
  const trackIndex = shuffledMusicQueue[musicQueueIndex]
  const track = musicTracks[trackIndex]
  musicQueueIndex++

  const audio = new Howl({
    src: [track.src],
    volume: musicVolume,
    onend: () => {
      if (session !== musicSession || activeMusic !== audio) return
      previousTrackIndex = trackIndex
      activeMusic = null
      playNextTrack(session)
    },
    onloaderror: (_soundId, error) => {
      console.error(`Unable to load soundtrack: ${track.src}`, error)
      if (activeMusic === audio) {
        previousTrackIndex = trackIndex
        activeMusic = null
        playNextTrack(session)
      }
    },
    onplayerror: (_soundId, error) => {
      console.error(`Unable to start soundtrack: ${track.src}`, error)
    },
  })

  activeMusic = audio
  notifyCurrentTrack(track)
  connectStadiumAudio()

  audio.play()
}

export function playSoundFile(src: string, volume = 1) {
  if (masterVolume <= 0 || sfxVolume <= 0) return

  const safeVolume = Math.max(0, Math.min(volume, 1))
  let effect = soundEffects.get(src)

  if (!effect) {
    const howl = new Howl({
      src: [src],
      volume: safeVolume * sfxVolume,
      onloaderror: (_soundId, error) => {
        console.error(`Unable to load sound effect: ${src}`, error)
      },
      onplayerror: (_soundId, error) => {
        console.error(`Unable to play sound effect: ${src}`, error)
      },
    })
    effect = { howl, volume: safeVolume }
    soundEffects.set(src, effect)
  }

  effect.volume = safeVolume
  effect.howl.volume(safeVolume * sfxVolume)
  effect.howl.play()
}
