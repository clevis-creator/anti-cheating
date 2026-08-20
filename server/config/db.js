import mongoose from 'mongoose';

const getMongoUri = () => {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  if (process.env.NODE_ENV === 'production') {
    return 'mongodb://mongo:27017/examai';
  }

  return 'mongodb://127.0.0.1:27017/examai';
};

const requiredIndexes = {
  User: [
    { email: 1 },
    { role: 1, isActive: 1 },
  ],
  Exam: [
    { createdBy: 1, status: 1 },
    { course: 1, status: 1 },
    { startTime: 1, endTime: 1 },
  ],
  Response: [
    { exam: 1, student: 1, attemptNumber: 1 },
    { student: 1, status: 1 },
    { submittedAt: -1 },
  ],
};

export const ensureRequiredIndexes = async () => {
  const models = Object.entries(requiredIndexes);

  for (const [modelName, indexes] of models) {
    const Model = mongoose.models[modelName];
    if (!Model) continue;

    for (const index of indexes) {
      try {
        await Model.collection.createIndex(index, { background: true });
      } catch (error) {
        if (error.code !== 85) {
          console.warn(`Could not create index for ${modelName}: ${error.message}`);
        }
      }
    }
  }
};

const connectDB = async () => {
  const uri = getMongoUri();

  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 20,
      minPoolSize: 1,
      autoIndex: true,
    });

    await ensureRequiredIndexes();
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error('\n--- MongoDB connection failed ---');
    console.error(`URI: ${uri.replace(/\/\/.*@/, '//***@')}`);
    console.error(
      'Start MongoDB locally (port 27017) or set MONGODB_URI in server/.env to a valid Atlas connection string.'
    );
    console.error(`Details: ${err.message}\n`);
    throw err;
  }
};

export default connectDB;
