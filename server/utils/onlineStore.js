import config from '../config/index.js';
import { Response } from '../models/index.js';

const memory = new Map(); // examId -> Map(studentId -> meta)

let redisClient = null;
let redisReady = false;
let redisUnavailable = false;

const redisKey = (examId) => `examai:online:${examId}`;

async function getRedis() {
  if (!config.redisUrl || redisUnavailable) return null;
  if (redisClient && redisReady) return redisClient;

  try {
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redisClient.on('error', (err) => {
      console.warn('[onlineStore] Redis error, falling back to memory:', err.message);
      redisReady = false;
    });
    await redisClient.connect();
    redisReady = true;
    return redisClient;
  } catch (err) {
    redisUnavailable = true;
    console.warn('[onlineStore] Redis unavailable, using in-memory store:', err.message);
    return null;
  }
}

function memoryGetMap(examId) {
  if (!memory.has(examId)) memory.set(examId, new Map());
  return memory.get(examId);
}

export async function setStudent(examId, studentId, meta) {
  const id = String(studentId);
  const map = memoryGetMap(examId);
  map.set(id, meta);

  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.hset(redisKey(examId), id, JSON.stringify(meta));
    await redis.expire(redisKey(examId), 86_400);
  } catch {
    // memory store already updated
  }
}

export async function removeStudent(examId, studentId) {
  const id = String(studentId);
  const map = memory.get(examId);
  map?.delete(id);
  if (map && map.size === 0) memory.delete(examId);

  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.hdel(redisKey(examId), id);
  } catch {
    // memory store already updated
  }
}

export async function listFromStore(examId) {
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.hgetall(redisKey(examId));
      const students = Object.values(raw)
        .map((value) => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (students.length) return students;
    } catch {
      // fall through to memory
    }
  }

  const map = memory.get(examId);
  if (!map) return [];
  return Array.from(map.values());
}

export async function listStudentsForExam(examId) {
  const fromStore = await listFromStore(examId);
  const seen = new Set(fromStore.map((s) => String(s.studentId)));

  const inProgress = await Response.find({ exam: examId, status: 'in_progress' })
    .populate('student', 'firstName lastName')
    .select('student startedAt')
    .lean();

  const merged = [...fromStore];
  for (const response of inProgress) {
    const student = response.student;
    if (!student) continue;
    const studentId = String(student._id);
    if (seen.has(studentId)) continue;
    merged.push({
      studentId: student._id,
      name: `${student.firstName} ${student.lastName}`,
      joinedAt: response.startedAt,
      responseId: response._id,
      source: 'db',
    });
  }

  return merged;
}
