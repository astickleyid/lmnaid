// Gemini AI Service - stub implementation
// Replace with real API calls when GEMINI_API_KEY is configured

const API_KEY = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';

export async function getChatResponse(
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
  prompt: string,
  thinkingMode?: boolean
): Promise<string> {
  if (!API_KEY) return '[AI disabled — no GEMINI_API_KEY configured]';
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const result = await ai.models.generateContent({
    model: thinkingMode ? 'gemini-2.0-flash-thinking-exp' : 'gemini-2.0-flash',
    contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
  });
  return result.text ?? '';
}

export async function analyzeMedia(base64Data: string, mimeType: string, prompt: string): Promise<string> {
  if (!API_KEY) return '[AI disabled — no GEMINI_API_KEY configured]';
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }],
  });
  return result.text ?? '';
}

export async function transcribeAudio(base64Audio: string): Promise<string> {
  return analyzeMedia(base64Audio, 'audio/webm', 'Transcribe this audio accurately.');
}

export async function generateSpeech(_text: string): Promise<ArrayBuffer> {
  // Stub - return empty buffer
  return new ArrayBuffer(0);
}

export async function generatePostContent(prompt: string): Promise<string> {
  return getChatResponse([], prompt);
}

export async function generateBio(currentBio: string): Promise<string> {
  return getChatResponse([], `Generate a creative short bio. Current bio: "${currentBio}". Return only the new bio text.`);
}

export async function getAgentResponse(
  agentPrompt: string,
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
  userMessage: string
): Promise<string> {
  const systemHistory = [
    { role: 'user', parts: [{ text: agentPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
    ...history,
  ];
  return getChatResponse(systemHistory, userMessage);
}

export function getLiveClient(): any {
  if (!API_KEY) {
    console.warn('No GEMINI_API_KEY — live client unavailable');
    return null;
  }
  // Return a lazy proxy that imports on demand
  return {
    async connect(config: any) {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      return ai.live.connect({ model: 'gemini-2.0-flash-exp', ...config });
    },
  };
}
