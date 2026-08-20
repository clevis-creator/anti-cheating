import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';

const run = async () => {
  try {
    console.log('Checking MongoDB connectivity...');
    await connectDB();
    console.log('MongoDB connectivity OK');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('MongoDB connectivity check failed:', err.message);
    process.exit(1);
  }
};

run();
