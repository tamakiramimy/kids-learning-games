export class AudioManager {
  private synth: SpeechSynthesis | undefined
  private speaking = false
  private muted = true
  private volume = 1

  constructor() {
    this.synth = window.speechSynthesis
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (muted) this.synth?.cancel()
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume))
  }

  speak(text: string, rate = 0.8, pitch = 1.1, language = 'zh-CN') {
    if (this.muted || !this.synth || typeof SpeechSynthesisUtterance === 'undefined') return
    this.synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = this.volume
    this.speaking = true
    utterance.onend = () => { this.speaking = false }
    this.synth.speak(utterance)
  }

  speakPinyin(pinyin: string) {
    // Prepend a slight pause for clearer pronunciation
    this.speak(pinyin, 0.6, 1.0)
  }

  speakEncouragement() {
    const phrases = ['太棒了', '真厉害', '答对了', '好聪明', '真棒']
    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    this.speak(phrase, 0.9, 1.2)
  }

  speakTryAgain() {
    const phrases = ['再试一次', '差一点点', '加油', '别灰心']
    const phrase = phrases[Math.floor(Math.random() * phrases.length)]
    this.speak(phrase, 0.8, 1.0)
  }

  isSpeaking() {
    return this.speaking
  }

  stop() {
    this.synth?.cancel()
    this.speaking = false
  }
}

export const audioManager = new AudioManager()
