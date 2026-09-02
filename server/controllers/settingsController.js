import { Settings } from '../models/index.js';
import config from '../config/index.js';
import AppError, { asyncHandler, sendSuccess } from '../utils/helpers.js';

const SENSITIVE_KEYS = ['gemini_api_key', 'openai_api_key'];

const maskKey = (key) => {
  if (!key || typeof key !== 'string') return '';
  if (key.length < 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.find();
  const map = {};
  settings.forEach((s) => {
    map[s.key] = SENSITIVE_KEYS.includes(s.key) ? maskKey(s.value) : s.value;
  });

  // Defaults from env
  if (!map.ai_provider) map.ai_provider = config.ai.defaultProvider;
  if (!map.gemini_api_key && config.ai.geminiKey) map.gemini_api_key = maskKey(config.ai.geminiKey);
  if (!map.openai_api_key && config.ai.openaiKey) map.openai_api_key = maskKey(config.ai.openaiKey);
  if (!map.site_name) map.site_name = 'ExamAI';
  if (!map.allow_registration) map.allow_registration = true;
  if (map.marketing_mode === undefined) map.marketing_mode = config.marketingMode;
  if (map.student_limit === undefined) map.student_limit = config.studentLimit;

  sendSuccess(res, { settings: map });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    throw new AppError('Settings object required', 400);
  }

  const results = [];
  for (const [key, value] of Object.entries(updates)) {
    // Skip masked values that weren't changed
    if (SENSITIVE_KEYS.includes(key) && typeof value === 'string' && value.includes('...')) {
      continue;
    }

    const setting = await Settings.findOneAndUpdate(
      { key },
      { key, value, updatedBy: req.user._id },
      { upsert: true, new: true }
    );
    results.push(setting);
  }

  sendSuccess(res, { settings: results }, 'Settings updated');
});

export const getAIConfig = asyncHandler(async (req, res) => {
  const settings = await Settings.find({
    key: { $in: ['ai_provider', 'gemini_api_key', 'openai_api_key'] },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  sendSuccess(res, {
    provider: map.ai_provider || config.ai.defaultProvider,
    geminiConfigured: !!(map.gemini_api_key || config.ai.geminiKey),
    openaiConfigured: !!(map.openai_api_key || config.ai.openaiKey),
    gemini_api_key: maskKey(map.gemini_api_key || config.ai.geminiKey),
    openai_api_key: maskKey(map.openai_api_key || config.ai.openaiKey),
  });
});

export const updateAIConfig = asyncHandler(async (req, res) => {
  const { provider, gemini_api_key, openai_api_key } = req.body;

  if (provider) {
    if (!['gemini', 'openai'].includes(provider)) {
      throw new AppError('Provider must be gemini or openai', 400);
    }
    await Settings.findOneAndUpdate(
      { key: 'ai_provider' },
      { key: 'ai_provider', value: provider, updatedBy: req.user._id },
      { upsert: true }
    );
  }

  if (gemini_api_key && !gemini_api_key.includes('...')) {
    await Settings.findOneAndUpdate(
      { key: 'gemini_api_key' },
      { key: 'gemini_api_key', value: gemini_api_key, updatedBy: req.user._id },
      { upsert: true }
    );
  }

  if (openai_api_key && !openai_api_key.includes('...')) {
    await Settings.findOneAndUpdate(
      { key: 'openai_api_key' },
      { key: 'openai_api_key', value: openai_api_key, updatedBy: req.user._id },
      { upsert: true }
    );
  }

  sendSuccess(res, null, 'AI configuration updated');
});
