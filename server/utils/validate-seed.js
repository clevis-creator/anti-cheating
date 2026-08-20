import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import {
  User,
  Settings,
} from '../models/index.js';

const check = async () => {
  try {
    console.log('Connecting to DB for seed validation...');
    await connectDB();

    const admin = await User.findOne({ email: 'admin@examai.com' }).lean();
    const teacher = await User.findOne({ email: 'teacher@examai.com' }).lean();
    const student = await User.findOne({ email: 'student@examai.com' }).lean();

    const missing = [];
    if (!admin) missing.push('admin@examai.com');
    if (!teacher) missing.push('teacher@examai.com');
    if (!student) missing.push('student@examai.com');

    const siteName = await Settings.findOne({ key: 'site.name' }).lean();
    if (!siteName) missing.push('settings: site.name');

    if (missing.length) {
      console.error('Seed validation failed. Missing expected records:', missing);
      process.exit(1);
    }

    console.log('Found admin, teacher, student, and default settings. Seed validation OK');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed validation error:', err.message);
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    process.exit(1);
  }
};

check();
