import { Settings } from '../models/index.js';
import config from '../config/index.js';

const getAIConfig = async () => {
  const settings = await Settings.find({
    key: { $in: ['ai_provider', 'gemini_api_key', 'openai_api_key'] },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return {
    provider: map.ai_provider || config.ai.defaultProvider,
    geminiKey: map.gemini_api_key || config.ai.geminiKey,
    openaiKey: map.openai_api_key || config.ai.openaiKey,
  };
};

const buildPrompt = ({ studentAnswer, referenceAnswer, rubric, maxMarks }) => `
You are an expert academic examiner. Grade the student essay answer fairly and consistently.

Maximum Marks: ${maxMarks}
Reference Answer: ${referenceAnswer || 'Not provided'}
Grading Rubric: ${rubric || 'Assess clarity, accuracy, completeness, and relevance.'}

Student Answer:
"""
${studentAnswer}
"""

Respond ONLY with valid JSON in this exact format:
{
  "score": <number between 0 and ${maxMarks}>,
  "feedback": "<constructive feedback for the student>",
  "reasoning": "<brief explanation of how you arrived at the score>",
  "suggestions": "<suggestions for improvement>"
}
`;

const parseAIJson = (text) => {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain valid JSON');
  return JSON.parse(match[0]);
};

const gradeWithGemini = async (prompt, apiKey) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { parsed: parseAIJson(text), raw: data };
};

const gradeWithOpenAI = async (prompt, apiKey) => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert academic examiner. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '{}';
  return { parsed: parseAIJson(text), raw: data };
};

export const gradeEssayWithAI = async ({ studentAnswer, referenceAnswer, rubric, maxMarks }) => {
  const aiConfig = await getAIConfig();
  const prompt = buildPrompt({ studentAnswer, referenceAnswer, rubric, maxMarks });

  let result;
  let provider = aiConfig.provider;

  if (provider === 'openai' && aiConfig.openaiKey) {
    result = await gradeWithOpenAI(prompt, aiConfig.openaiKey);
  } else if (aiConfig.geminiKey) {
    provider = 'gemini';
    result = await gradeWithGemini(prompt, aiConfig.geminiKey);
  } else if (aiConfig.openaiKey) {
    provider = 'openai';
    result = await gradeWithOpenAI(prompt, aiConfig.openaiKey);
  } else {
    // Fallback heuristic grading when no API key is configured
    const score = heuristicGrade(studentAnswer, referenceAnswer, maxMarks);
    return {
      provider: 'gemini',
      score,
      feedback: 'AI API keys not configured. Applied heuristic grading based on answer length and keyword overlap. Configure Gemini or OpenAI in Settings for full AI grading.',
      reasoning: 'Fallback heuristic used because no AI provider API key was found.',
      suggestions: 'Provide more detail and cover key points from the reference answer.',
      rawResponse: null,
    };
  }

  const score = Math.min(maxMarks, Math.max(0, Number(result.parsed.score) || 0));
  return {
    provider,
    score,
    feedback: result.parsed.feedback || '',
    reasoning: result.parsed.reasoning || '',
    suggestions: result.parsed.suggestions || '',
    rawResponse: result.raw,
  };
};

const heuristicGrade = (studentAnswer, referenceAnswer, maxMarks) => {
  if (!studentAnswer || !studentAnswer.trim()) return 0;
  const words = studentAnswer.trim().split(/\s+/).length;
  let score = Math.min(maxMarks * 0.4, (words / 100) * maxMarks * 0.4);

  if (referenceAnswer) {
    const refWords = new Set(referenceAnswer.toLowerCase().split(/\W+/).filter(Boolean));
    const stuWords = studentAnswer.toLowerCase().split(/\W+/).filter(Boolean);
    const overlap = stuWords.filter((w) => refWords.has(w)).length;
    const ratio = refWords.size ? overlap / refWords.size : 0;
    score += ratio * maxMarks * 0.6;
  } else {
    score = Math.min(maxMarks * 0.7, (words / 150) * maxMarks);
  }

  return Math.round(Math.min(maxMarks, score) * 10) / 10;
};

export default { gradeEssayWithAI, getAIConfig };
