import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Settings from '../models/Settings.js';

const ensureDefaultSettings = async () => {
  const defaults = [
    {
      key: 'site.name',
      value: 'ExamAI',
      description: 'Default site display name',
    },
    {
      key: 'site.logo',
      value: '',
      description: 'Logo URL for the site',
    },
    {
      key: 'ai.defaultProvider',
      value: 'gemini',
      description: 'Default AI provider for grading and generation',
    },
  ];

  for (const item of defaults) {
    await Settings.findOneAndUpdate(
      { key: item.key },
      { $set: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
};

const ensureApplicationIndexes = async () => {
  const indexes = [
    { model: 'User', index: { email: 1 } },
    { model: 'User', index: { role: 1, isActive: 1 } },
    { model: 'Exam', index: { createdBy: 1, status: 1 } },
    { model: 'Response', index: { exam: 1, student: 1, attemptNumber: 1 } },
    { model: 'Settings', index: { key: 1 } },
  ];

  for (const entry of indexes) {
    const Model = mongoose.models[entry.model];
    if (!Model) continue;

    try {
      await Model.collection.createIndex(entry.index, { background: true, unique: Boolean(entry.index.unique) });
    } catch (error) {
      if (error.code !== 85) {
        console.warn(`Migration skipped for ${entry.model}: ${error.message}`);
      }
    }
  }
};

const runMigrations = async () => {
  try {
    await connectDB();
    await ensureDefaultSettings();
    await ensureApplicationIndexes();
    console.log('Database migration checks completed successfully.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
};

runMigrations();
