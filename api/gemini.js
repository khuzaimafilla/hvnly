import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contents, generationConfig, safetySettings } = req.body;
  if (!contents) {
    return res.status(400).json({ error: 'Contents required' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });  // Model stable

    const result = await model.generateContent({
      contents,
      generationConfig,
      safetySettings,
    });

    const response = await result.response;
    res.status(200).json(response);
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}