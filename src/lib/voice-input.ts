export class VoiceInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any;
  private onTranscript: ((transcript: string) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private onStart: (() => void) | null = null;
  private onEnd: (() => void) | null = null;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.recognition = new SR();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.onTranscript?.(transcript);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onerror = (event: any) => {
      this.onError?.(event.error);
    };

    this.recognition.onstart = () => {
      this.onStart?.();
    };

    this.recognition.onend = () => {
      this.onEnd?.();
    };
  }

  public start() {
    this.recognition.start();
  }

  public stop() {
    this.recognition.stop();
  }

  public setOnTranscript(callback: (transcript: string) => void) {
    this.onTranscript = callback;
  }

  public setOnError(callback: (error: string) => void) {
    this.onError = callback;
  }

  public setOnStart(callback: () => void) {
    this.onStart = callback;
  }

  public setOnEnd(callback: () => void) {
    this.onEnd = callback;
  }
}
