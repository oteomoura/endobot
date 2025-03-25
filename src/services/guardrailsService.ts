export class GuardrailService {
    private answer: string;
    private userMessage: string;

    constructor(answer: string | null | undefined, userMessage: string | null | undefined) {
      this.answer = answer?.trim() ?? "";
      this.userMessage = userMessage?.trim() ?? "";
    }
  
    call(): string {
      if (!this.answer?.trim()) return "";

      this.#removeSpeakerPrefix();
      this.#removeRepeatedUserMessage();
      this.#checkMentalHealthDangerWords();
      return this.answer;
    }
  
    #removeSpeakerPrefix(): void {
      this.answer = this.answer.replaceAll("Bot: ", "").replaceAll("User: ", "");
    }

    #removeRepeatedUserMessage(): void {
      if (this.userMessage && this.answer.startsWith(this.userMessage)) {
        this.answer = this.answer.slice(this.userMessage.length).trim();
      }
    }
  
    #checkMentalHealthDangerWords(): void {
      const dangerWords: string[] = ["suicídio", "desespero", "depressão profunda", "autolesão"];
      const containsDanger: boolean = dangerWords.some(word => this.answer.toLowerCase().includes(word));
  
      if (containsDanger) {
        this.answer += " ⚠️ Se você estiver passando por dificuldades, por favor, procure apoio profissional.";
      }
    }
} 