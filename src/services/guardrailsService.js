export class GuardrailService {
    constructor(answer, userMessage) {
      this.answer = answer?.trim() ?? "";
      this.userMessage = userMessage?.trim() ?? "";
    }
  
    call() {
      if (!answer?.trim()) return "";

      this.#removeSpeakerPrefix();
      this.#removeRepeatedUserMessage();
      this.#checkMentalHealthDangerWords();
      return this.answer;
    }
  
    #removeSpeakerPrefix() {
      this.answer = this.answer.replaceAll("Bot: ", "").replaceAll("User: ", "");
    }

    #removeRepeatedUserMessage() {
      if (this.userMessage && this.answer.startsWith(this.userMessage)) {
        this.answer = this.answer.slice(this.userMessage.length).trim();
      }
    }
  
    #checkMentalHealthDangerWords() {
      const dangerWords = ["suicídio", "desespero", "depressão profunda", "autolesão"];
      const containsDanger = dangerWords.some(word => this.answer.toLowerCase().includes(word));
  
      if (containsDanger) {
        this.answer += " ⚠️ Se você estiver passando por dificuldades, por favor, procure apoio profissional.";
      }
    }
}
