import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contents, generationConfig, safetySettings } = req.body;
  if (!contents) {
    return res.status(400).json({ error: 'Contents required' });
  }

  console.log('API Key loaded:', !!process.env.GEMINI_API_KEY ? 'Yes' : 'No');  // Debug log

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });  // Fix: Model stable
    const result = await model.generateContent({
      contents,
      generationConfig: generationConfig || { temperature: 0.7, maxOutputTokens: 200 },
      safetySettings: safetySettings || [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }],
    });
    const response = result.response;
    res.status(200).json(response);
  } catch (error) {
    console.error('Full Gemini Error:', error.message, error);  // Log detail
    res.status(500).json({ error: `Gemini failed: ${error.message}` });
  }
}