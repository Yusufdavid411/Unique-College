# Unique College of Health Science and Technology

Stage 1 foundation for a scalable School Management System. Production readiness
requires the deployment and database acceptance checks described below.

## Stack

- React, React Router, Axios, pure CSS
- Node.js, Express REST API
- PostgreSQL through Prisma ORM
- JWT authentication and role-based admin access
- Local upload storage structured for future cloud or self-hosted migration

## Structure

```text
backend/
  prisma/
  src/
    config/
    controllers/
    middleware/
    routes/
    services/
    utils/
  uploads/
frontend/
  src/
    api/
    components/
    context/
    data/
    pages/
    styles/
```

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL`, `JWT_SECRET`, and `CLIENT_URL`.
3. Install dependencies:

```bash
npm run install:all
```

4. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed the first admin:

```bash
npm run seed
```

Default seeded admin credentials can be changed in `backend/.env`.

6. Start both apps:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Deployment

The target is Vercel + Neon PostgreSQL with portable upload storage. See
[Architecture](docs/ARCHITECTURE.md), [Vercel + Neon deployment](docs/VERCEL_NEON_DEPLOYMENT.md),
[Operations](docs/OPERATIONS.md), [Storage](docs/STORAGE.md), and
[Archive design](docs/ARCHIVE_DESIGN.md). The existing Render configuration is
retained as a transitional Node-host deployment option.

- Backend is Render-ready. Set the environment variables from `backend/.env.example`.
- The seed script preserves an existing admin password by default. To intentionally reset the seeded admin password on Render, set `ADMIN_RESET_PASSWORD=true` for one deploy, then set it back to `false`.
- Frontend builds with `npm run build --prefix frontend`.
- Database is portable PostgreSQL. No Supabase-specific logic is used; future migration requires exporting PostgreSQL, importing it into the new host, and changing `DATABASE_URL`.

## Uploads

Files are stored on the local server under:

- `backend/uploads/applications`
- `backend/uploads/gallery`
- `backend/uploads/documents`
- `backend/uploads/profiles`

The database stores only file path, file type, file size, and upload metadata.

On Render, `UPLOAD_ROOT` is set to `/var/data/uploads`. Attach a persistent disk at `/var/data` so uploaded news, gallery, and application files survive redeploys and restarts.
