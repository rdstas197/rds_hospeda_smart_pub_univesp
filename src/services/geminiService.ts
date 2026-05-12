import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenAI({ apiKey });

export const getGeminiResponse = async (prompt: string, context?: any) => {
  try {
    const model = "gemini-3-flash-preview";
    const systemInstruction = `
      Você é o Assistente Inteligente do Hotel Master, um sistema de gestão hoteleira.
      Seu objetivo é ajudar o gerente do hotel com insights, sugestões de ocupação, 
      redação de mensagens para clientes e auxílio na gestão geral.
      
      Contexto atual do hotel: ${JSON.stringify(context || {})}
      
      Responda de forma profissional, prestativa e em Português do Brasil.
      Mantenha as respostas concisas e úteis.
    `;

    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Desculpe, tive um problema ao processar sua solicitação. Verifique se a chave da API está configurada corretamente.";
  }
};
