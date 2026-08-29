import { Capacitor } from '@capacitor/core'
import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech'

export type SoundEffect = 'tap' | 'collect' | 'hit' | 'correct' | 'wrong' | 'success' | 'fail' | 'move' | 'drop' | 'rotate' | 'clear' | 'storm' | 'boost'

interface ToneStep {
  frequency: number
  duration: number
  delay?: number
  type?: OscillatorType
  gain?: number
}

const EFFECTS: Record<SoundEffect, ToneStep[]> = {
  tap: [{ frequency: 520, duration: 0.045, type: 'sine', gain: 0.12 }],
  collect: [
    { frequency: 660, duration: 0.07, type: 'sine', gain: 0.16 },
    { frequency: 990, duration: 0.1, delay: 0.06, type: 'sine', gain: 0.14 },
  ],
  hit: [{ frequency: 150, duration: 0.08, type: 'square', gain: 0.1 }],
  correct: [
    { frequency: 523, duration: 0.09, type: 'sine', gain: 0.14 },
    { frequency: 784, duration: 0.14, delay: 0.08, type: 'sine', gain: 0.14 },
  ],
  wrong: [
    { frequency: 260, duration: 0.1, type: 'triangle', gain: 0.12 },
    { frequency: 196, duration: 0.14, delay: 0.09, type: 'triangle', gain: 0.1 },
  ],
  success: [
    { frequency: 523, duration: 0.1, type: 'sine', gain: 0.14 },
    { frequency: 659, duration: 0.1, delay: 0.09, type: 'sine', gain: 0.14 },
    { frequency: 784, duration: 0.18, delay: 0.18, type: 'sine', gain: 0.16 },
  ],
  fail: [
    { frequency: 294, duration: 0.12, type: 'triangle', gain: 0.11 },
    { frequency: 220, duration: 0.2, delay: 0.1, type: 'triangle', gain: 0.1 },
  ],
  move: [{ frequency: 330, duration: 0.035, type: 'square', gain: 0.05 }],
  drop: [{ frequency: 110, duration: 0.07, type: 'triangle', gain: 0.09 }],
  rotate: [
    { frequency: 440, duration: 0.055, type: 'triangle', gain: 0.09 },
    { frequency: 660, duration: 0.07, delay: 0.045, type: 'sine', gain: 0.08 },
  ],
  clear: [
    { frequency: 523, duration: 0.08, type: 'sine', gain: 0.16 },
    { frequency: 659, duration: 0.08, delay: 0.06, type: 'sine', gain: 0.16 },
    { frequency: 784, duration: 0.08, delay: 0.12, type: 'sine', gain: 0.16 },
    { frequency: 1047, duration: 0.16, delay: 0.18, type: 'sine', gain: 0.18 },
  ],
  storm: [
    { frequency: 130, duration: 0.16, type: 'sawtooth', gain: 0.1 },
    { frequency: 260, duration: 0.16, delay: 0.08, type: 'square', gain: 0.1 },
    { frequency: 520, duration: 0.2, delay: 0.16, type: 'sine', gain: 0.13 },
  ],
  boost: [
    { frequency: 180, duration: 0.1, type: 'sawtooth', gain: 0.08 },
    { frequency: 420, duration: 0.18, delay: 0.07, type: 'sawtooth', gain: 0.1 },
  ],
}

export class AudioManager {
  private synth: SpeechSynthesis | undefined
  private audioContext: AudioContext | undefined
  private activeOscillators = new Set<OscillatorNode>()
  private speaking = false
  private muted = true
  private volume = 1
  private speechRequest = 0
  private nativeSpeechSupported: boolean | undefined

  constructor() {
    if (typeof window !== 'undefined') this.synth = window.speechSynthesis
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (muted) this.stop()
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume))
  }

  async unlock() {
    if (typeof window === 'undefined') return false

    const AudioContextConstructor = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) return false

    this.audioContext ??= new AudioContextConstructor()
    if (this.audioContext.state === 'suspended') await this.audioContext.resume()
    return this.audioContext.state === 'running'
  }

  async isSpeechAvailable(language = 'zh-CN') {
    if (Capacitor.isNativePlatform()) {
      if (this.nativeSpeechSupported) return true
      try {
        const result = await TextToSpeech.isLanguageSupported({ lang: language })
        if (result.supported) this.nativeSpeechSupported = true
        return result.supported
      } catch (error) {
        console.warn('Native text-to-speech is unavailable.', error)
      }
    }

    return Boolean(this.synth && typeof SpeechSynthesisUtterance !== 'undefined')
  }

  speak(text: string, rate = 0.8, pitch = 1.1, language = 'zh-CN') {
    if (this.muted || !text.trim()) return
    const request = ++this.speechRequest
    this.speaking = true
    void this.speakAsync(request, text, rate, pitch, language)
  }

  speakPinyin(pinyin: string) {
    this.speak(pinyin, 0.6, 1.0)
  }

  speakEncouragement() {
    this.playEffect('correct')
    const phrases = ['太棒了', '真厉害', '答对了', '好聪明', '真棒']
    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    this.speak(phrase, 0.9, 1.2)
  }

  speakTryAgain() {
    this.playEffect('wrong')
    const phrases = ['再试一次', '差一点点', '加油', '别灰心']
    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    this.speak(phrase, 0.8, 1.0)
  }

  playEffect(effect: SoundEffect) {
    if (this.muted || this.volume <= 0) return
    void this.playEffectAsync(effect)
  }

  isSpeaking() {
    return this.speaking
  }

  stop() {
    this.speechRequest += 1
    this.synth?.cancel()
    if (Capacitor.isNativePlatform()) void TextToSpeech.stop().catch(() => undefined)
    this.activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop()
      } catch {
        // The oscillator may already have ended.
      }
    })
    this.activeOscillators.clear()
    this.speaking = false
  }

  suspend() {
    this.stop()
    if (this.audioContext?.state === 'running') void this.audioContext.suspend()
  }

  async resume() {
    if (typeof window !== 'undefined') this.synth = window.speechSynthesis
    this.nativeSpeechSupported = undefined
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume()
      } catch (error) {
        console.warn('Sound effect playback could not resume.', error)
      }
    }
  }

  private async speakAsync(request: number, text: string, rate: number, pitch: number, language: string) {
    if (Capacitor.isNativePlatform()) {
      try {
        const supported = await this.isSpeechAvailable(language)
        if (request !== this.speechRequest || this.muted) return
        if (!supported) throw new Error(`Language ${language} is not installed.`)
        await TextToSpeech.stop()
        await TextToSpeech.speak({
          text,
          lang: language,
          rate,
          pitch,
          volume: this.volume,
          queueStrategy: QueueStrategy.Flush,
        })
        if (request === this.speechRequest) this.speaking = false
        return
      } catch (error) {
        console.warn('Native speech failed; falling back to Web Speech.', error)
      }
    }

    if (request !== this.speechRequest || this.muted || !this.synth
      || typeof SpeechSynthesisUtterance === 'undefined') {
      if (request === this.speechRequest) this.speaking = false
      return
    }

    this.synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = this.volume
    const voices = this.synth.getVoices()
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === language.toLowerCase())
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(language.split('-')[0].toLowerCase()))
      ?? null
    utterance.onend = () => {
      if (request === this.speechRequest) this.speaking = false
    }
    utterance.onerror = (event) => {
      if (request === this.speechRequest) this.speaking = false
      console.warn('Web Speech could not play the requested text.', event.error)
    }
    this.synth.speak(utterance)
  }

  private async playEffectAsync(effect: SoundEffect) {
    try {
      const unlocked = await this.unlock()
      if (!unlocked || this.muted || !this.audioContext) return

      const startTime = this.audioContext.currentTime
      EFFECTS[effect].forEach((step) => this.playTone(step, startTime))
    } catch (error) {
      console.warn('Sound effect playback is unavailable.', error)
    }
  }

  private playTone(step: ToneStep, startTime: number) {
    if (!this.audioContext) return
    const startsAt = startTime + (step.delay ?? 0)
    const endsAt = startsAt + step.duration
    const oscillator = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    oscillator.type = step.type ?? 'sine'
    oscillator.frequency.setValueAtTime(step.frequency, startsAt)
    gain.gain.setValueAtTime(0.0001, startsAt)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, (step.gain ?? 0.12) * this.volume), startsAt + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, endsAt)
    oscillator.connect(gain)
    gain.connect(this.audioContext.destination)
    oscillator.start(startsAt)
    oscillator.stop(endsAt + 0.01)
    this.activeOscillators.add(oscillator)
    oscillator.addEventListener('ended', () => {
      this.activeOscillators.delete(oscillator)
      oscillator.disconnect()
      gain.disconnect()
    }, { once: true })
  }
}

export const audioManager = new AudioManager()
