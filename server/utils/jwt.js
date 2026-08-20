import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export const generateToken = (userId, role) =>
  jwt.sign({ id: userId, role }, config.jwtSecret, { expiresIn: config.jwtExpire });

export const verifyToken = (token) => jwt.verify(token, config.jwtSecret);

export const getTokenFromHeader = (req) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
};
