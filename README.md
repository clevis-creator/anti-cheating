# ExamAI — AI Examination System

Production-ready examination platform for schools, universities, certification bodies, and organizations. Combines a Google Forms-style exam builder with AI grading, anti-cheating controls, and real-time proctoring.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Framer Motion, React Query, Chart.js, Socket.io Client |
| Backend | Node.js, Express, MongoDB/Mongoose, JWT, bcrypt, Multer, Nodemailer, Socket.io, Helmet, CORS, express-validator, rate limiting |
| AI | Google Gemini API & OpenAI API (switchable in Admin Settings) |

## Features

- **Auth**: Student / Teacher / Admin login, JWT, email verification, forgot password, RBAC
- **Landing**: Modern SaaS page with dark/light mode, pricing, FAQ, contact
- **Dashboards**: Admin, Teacher, and Student portals
- **Exam Builder**: Drag-and-drop questions — MCQ, checkbox, T/F, short answer, essay, fill blank, matching, dropdown, image, video, file upload
- **Auto grading**: Objective types graded automatically
- **AI essay grading**: Rubric-based scoring via Gemini or OpenAI with teacher override
- **Live exams**: Timer, autosave, resume, flags, progress, auto-submit
- **Anti-cheat**: Fullscreen, tab switch, copy/paste block, right-click, selection, DevTools deterrence, warnings → auto-submit
- **Realtime**: Socket.io monitoring of online students, warnings, and submissions
- **Reports**: Analytics charts + CSV / Excel / PDF export

## Project structure

```
client/          React frontend
server/          Express API (MVC)
  controllers/
  models/
  routes/
  middleware/
  services/
  socket/
  validators/
  utils/
```

## Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)

## Setup

### 1. Clone & install

```bash
cd "anti cheating system"
npm run install:all
```

### 2. Configure environment

Copy and edit server env:

```bash
cp server/.env.example server/.env
```

Set at minimum:

```
MONGODB_URI=mongodb://127.0.0.1:27017/examai
# or your Atlas connection string
JWT_SECRET=a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Optional: email (Nodemailer) and AI keys in `.env` or via **Admin → Settings** after login.

Client env (`client/.env`):

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Seed demo data

```bash
npm run seed
```

Demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@examai.com | Admin123! |
| Teacher | teacher@examai.com | Teacher123! |
| Student | student@examai.com | Student123! |

### 4. Run development servers

Terminal 1:

```bash
npm run dev:server
```

Terminal 2:

```bash
npm run dev:client
```

- Frontend: http://localhost:5173  
- API: http://localhost:5000/api/health  

## Production

```bash
npm run build
# Serve client/dist via nginx or CDN
# Set NODE_ENV=production and strong secrets
npm start
```

### Recommended Vercel deployment

Deploy only the `client` directory to Vercel. Deploy the Express API separately on a persistent Node.js host such as Render, Railway, Fly.io, or a VPS, and use MongoDB Atlas for production data.

Vercel settings:

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`

Vercel environment variables:

```dotenv
VITE_API_URL=https://your-api-host.example.com/api
VITE_SOCKET_URL=https://your-api-host.example.com
```

Backend production variables:

```dotenv
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=replace_with_a_long_random_secret
MEDIA_SIGN_SECRET=replace_with_another_long_random_secret
CLIENT_URL=https://your-project.vercel.app
```

Do not use local MongoDB or local filesystem storage for production proctoring media. Configure persistent object storage such as S3-compatible storage or Cloudinary before production use.

Recommended deployment:

1. MongoDB Atlas for the database  
2. Backend on Render / Railway / Fly.io / VPS  
3. Frontend on Vercel / Netlify / static host  
4. Set CORS `CLIENT_URL` and Socket.io origin to your frontend URL  
5. Configure Gemini and/or OpenAI keys in Admin Settings  

## Deployment & Operations

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Docker-based local deployment and smoke tests.
Operational runbook: [docs/OPERATIONAL.md](docs/OPERATIONAL.md)

Quick smoke test (local):

```bash
node tools/smoke-test.js http://127.0.0.1:5000 http://127.0.0.1:5173
```

## API overview

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Register, login, verify, password reset |
| `/api/users` | User CRUD, stats, audit logs |
| `/api/courses` | Course management |
| `/api/exams` | Exam CRUD & publish |
| `/api/questions` | Question bank & exam questions |
| `/api/responses` | Take exam, submit, grade, results |
| `/api/settings` | Site & AI configuration |
| `/api/notifications` | In-app notifications |
| `/api/reports` | Analytics, live monitor, exports |

## Security

- Helmet headers, CORS allowlist, rate limiting  
- Password hashing (bcrypt), JWT auth  
- express-validator input validation  
- mongo-sanitize against NoSQL injection  
- Exam activity logging, IP & device metadata  

## License

Proprietary — built for educational and institutional use.
