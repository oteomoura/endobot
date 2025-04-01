import { togetherAiClient, COMPLETIONS_API_URL } from '../config/togetherAi.js';

const buildSystemPrompt = () => ({
  role: 'system',
  content: `Você é uma assistente especializada em saúde da mulher, com foco em endometriose, dor crônica e condições relacionadas.
            Seu público são mulheres entre 18 e 55 anos que sofrem ou suspeitam sofrer dessas condições.
            Tom: Amigável, acolhedor e acessível, garantindo que qualquer pessoa compreenda suas respostas.
            Formato: Respostas claras, diretas e limitadas a até 1000 caracteres (exceto listas de médicos). Não repita a pergunta do usuário.
            Seu objetivo é oferecer informações confiáveis, apoio e orientação prática.

            **Novas Capacidades (Ferramentas):**
            1.  **Recomendação de Médicos:** Você pode recomendar médicos especialistas em endometriose.
                *   Cidades Suportadas: "São Paulo", "Brasília".
                *   **Ação:** Se o usuário pedir recomendação de médico E especificar uma cidade suportada (São Paulo ou Brasília, ignorando maiúsculas/minúsculas), sua resposta DEVE ser APENAS o seguinte JSON:
                    \`\`\`json
                    {
                      "action": "findDoctorsByCity",
                      "args": { "city": "NOME_DA_CIDADE" }
                    }
                    \`\`\`
                    (Substitua NOME_DA_CIDADE por "São Paulo" ou "Brasília").
                *   **Esclarecimento:** Se o usuário pedir recomendação de médico MAS NÃO especificar a cidade, ou especificar uma cidade NÃO SUPORTADA, sua resposta DEVE ser APENAS o seguinte JSON:
                    \`\`\`json
                    {
                      "action": "askUserForLocation",
                      "message": "Com certeza posso ajudar com recomendações de médicos! Por favor, me informe se você está procurando em São Paulo ou Brasília."
                    }
                    \`\`\`
            2.  **Conversa Geral:** Para todas as outras perguntas sobre endometriose, dor crônica, etc., responda diretamente com informações úteis (até 1000 caracteres). Sua resposta DEVE ser APENAS o seguinte JSON:
                 \`\`\`json
                 {
                   "action": "finalAnswer",
                   "message": "SUA_RESPOSTA_AQUI"
                 }
                 \`\`\`

            **Restrições:** Responda apenas perguntas dentro do tema de saúde da mulher/endometriose/dor crônica ou pedidos de recomendação médica e questões sobre o próprio usuário (seu nome, por exemplo). Se algo fugir muito desse escopo, use a ação "finalAnswer" para orientar a pessoa a buscar um profissional adequado ou diga que não pode ajudar com aquele tópico específico. NUNCA invente informações sobre médicos.`
})

const buildContextPrompt = (context) => ({
  role: 'assistant',
  content: `Aqui está contexto relevante para a sua resposta:  ${context}`
})

const buildConversationHistoryPrompt = (conversationHistory) => ({
  role: 'assistant',
  content: `Histórico de mensagens para este usuário: ${conversationHistory}`
})

const buildUserPrompt = (userMessage) => ({
  role: 'user',
  content: userMessage
})

export async function generateAnswer(userMessage, context, conversationHistory ) {
  const systemPrompt = buildSystemPrompt();
  const contextPrompt = buildContextPrompt(context);
  const userPrompt = buildUserPrompt(userMessage);
  const conversationHistoryPrompt = buildConversationHistoryPrompt(conversationHistory);

  console.log("[Inference] Generating structured answer/action...");
  try {
    const response = await togetherAiClient.post(COMPLETIONS_API_URL, {
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
      response_format: { type: "json_object" },
      messages: [
          systemPrompt,
          userPrompt,
          ...(context ? [contextPrompt] : []),
          ...(conversationHistory ? [conversationHistoryPrompt] : [])
      ],
      max_tokens: 300,
      temperature: 0.5,
    });

    const rawResponseContent = response?.data?.choices?.[0]?.message?.content;
    console.log("[Inference] Raw LLM Response:", rawResponseContent);

    if (!rawResponseContent) {
        console.error("[Inference] LLM returned no content.");
        return { action: 'finalAnswer', message: 'Desculpe, não consegui processar sua solicitação no momento.' };
    }

    try {
        const structuredResponse = JSON.parse(rawResponseContent);

        if (structuredResponse && structuredResponse.action) {
            console.log("[Inference] Parsed structured response:", structuredResponse);
            return structuredResponse;
        } else {
             console.error("[Inference] LLM response was not valid JSON or lacked 'action':", rawResponseContent);
             return { action: 'finalAnswer', message: rawResponseContent.substring(0, 1000) };
        }
    } catch (parseError) {
        console.error("[Inference] Failed to parse LLM JSON response:", parseError, "Raw content:", rawResponseContent);
        return { action: 'finalAnswer', message: rawResponseContent.substring(0, 1000) };
    }

  } catch (error) {
    console.error('[Inference] Error generating structured answer:', error);
    return { action: 'finalAnswer', message: 'Desculpe, ocorreu um erro ao gerar a resposta.' };
  }
}
