export interface Case {
  case_number: string;
  setting: string;
  crime: string;
  briefing: string;
  suspect_name: string;
  suspect_role: string;
  suspect_true_story: string;
  suspect_cover_story: string;
  the_lie: string;
  the_truth: string;
  the_contradiction: string;
  stress_triggers: string[];
  deflection_tactics: string[];
  difficulty: string;
}

export interface GameState {
  case: Case | null;
  timer: number;
  maxTime: number;
  isRunning: boolean;
  stressLevel: number;
  conversationHistory: string[];
  clues: string[];
  gameStatus: 'intro' | 'active' | 'win' | 'lose';
}

export class GameManager {
  private state: GameState;
  private timerInterval: NodeJS.Timeout | null;

  constructor() {
    this.state = {
      case: null,
      timer: 300, // 5 minutes in seconds
      maxTime: 300,
      isRunning: false,
      stressLevel: 0,
      conversationHistory: [],
      clues: [],
      gameStatus: 'intro',
    };
    this.timerInterval = null;
  }

  public startGame(caseData: Case) {
    this.state = {
      case: caseData,
      timer: 300,
      maxTime: 300,
      isRunning: true,
      stressLevel: 0,
      conversationHistory: [],
      clues: [],
      gameStatus: 'active',
    };

    this.startTimer();
  }

  public endGame(status: 'win' | 'lose') {
    this.state.isRunning = false;
    this.state.gameStatus = status;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public updateStressLevel(level: number) {
    this.state.stressLevel = Math.min(10, Math.max(0, level));
  }

  public addClue(clue: string) {
    if (clue && !this.state.clues.includes(clue)) {
      this.state.clues.push(clue);
    }
  }

  public addToConversation(entry: string) {
    this.state.conversationHistory.push(entry);
  }

  public getState(): GameState {
    return this.state;
  }

  private startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this.state.timer -= 1;
      if (this.state.timer <= 0) {
        this.endGame('lose');
      }
    }, 1000);
  }

  public cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}