export class GuardrailService {
    constructor(answer) {
      this.answer = answer;
    }
  
    call() {
      if (!this.answer?.trim()) return "";

      this.#removeSpeakerPrefix();
      this.#checkMentalHealthDangerWords();
      return this.answer;
    }
  
    #removeSpeakerPrefix() {
      this.answer = this.answer.replaceAll("Bot: ", "").replaceAll("User: ", "");
    }
  
    #checkMentalHealthDangerWords() {
      const dangerWords = ["suicídio", "desespero", "depressão profunda", "autolesão"];
      const containsDanger = dangerWords.some(word => this.answer.toLowerCase().includes(word));
  
      if (containsDanger) {
        this.answer += " ⚠️ Se você estiver passando por dificuldades, por favor, procure apoio profissional.";
      }
    }
}
