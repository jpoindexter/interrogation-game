export class VoiceOutput {
  private synthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private onStart: (() => void) | null = null;
  private onEnd: (() => void) | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.loadVoices();
    this.synthesis.onvoiceschanged = () => this.loadVoices();
  }

  private loadVoices() {
    this.voices = this.synthesis.getVoices();
  }

  public speak(text: string, rate = 1.0, pitch = 1.0) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;

    const selectedVoice =
      this.voices.find((v) => v.lang === 'en-US' && v.name.includes('Male')) ||
      this.voices.find((v) => v.lang === 'en-US') ||
      this.voices[0];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => this.onStart?.();
    utterance.onend = () => this.onEnd?.();

    this.synthesis.speak(utterance);
  }

  public stop() {
    this.synthesis.cancel();
  }

  public isSpeaking() {
    return this.synthesis.speaking;
  }

  public setOnStart(callback: () => void) {
    this.onStart = callback;
  }

  public setOnEnd(callback: () => void) {
    this.onEnd = callback;
  }
}
