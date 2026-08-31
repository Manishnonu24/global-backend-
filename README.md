# Global Backend

> The **Dashboard & CRM portal** extracted from `ahealthplace-next-main`.  
> This application serves **only** admin/operator-facing surfaces — it does **not** serve any public-facing pages.

---

## What This Is

`global-backend` is a **Next.js 16** application that contains:

| Surface | Path |
|---|---|
| **Admin Dashboard** | `/dashboard/**` |
| **CRM Portal** | `/crm/**` |
| **Auth (Login / Reset)** | `/login`, `/forgot-password`, `/reset-password` |
| **Dashboard API** | `/api/dashboard/**` |
| **CRM API** | `/api/crm/**` |
| **Auth API** | `/api/auth/**` |
| **Admin API** | `/api/admin/**` |
| **Media API** | `/api/media/**` |
| **Settings / SEO / Sites** | `/api/settings/**`, `/api/seo/**`, `/api/websites/**` |

All public-facing pages (`/blogs`, `/recipes`, `/magazine`, `/quizzes`, etc.) and their API routes have been removed.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MySQL via Prisma ORM
- **Cache / Queues**: Redis + BullMQ
- **Notifications**: Novu
- **Auth**: next-auth v4 (dashboard session)
- **Storage**: Cloudinary + AWS S3
- **Email**: Nodemailer + Resend
- **Multi-tenant**: Yes — site scoping is preserved

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp env.example .env
# Fill in all required values (DB, Redis, Novu, Cloudinary, etc.)
```

### 3. Generate Prisma client
```bash
npm run db:generate
```

### 4. Run migrations (if needed)
```bash
npm run db:migrate
```

### 5. Start dev server
```bash
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) — you'll be redirected to login.

---

## Project Structure

```
global-backend/
├── prisma/               # Schema, migrations, seed
├── src/
│   ├── app/
│   │   ├── api/          # All backend API routes
│   │   ├── crm/          # CRM portal pages
│   │   ├── dashboard/    # Admin dashboard pages
│   │   ├── login/        # Auth pages
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── components/
│   │   ├── dashboard/    # Dashboard UI components
│   │   ├── cms/          # Block editor & CMS components
│   │   ├── media/        # Media picker components
│   │   └── providers/    # Auth, theme providers
│   ├── core/             # Repository base, service base, events
│   ├── lib/              # Auth, Prisma, Redis, email, Novu, etc.
│   ├── mappers/          # Data mapping utilities
│   ├── repositories/     # Database repositories
│   ├── services/         # Business logic services
│   └── utils/            # Shared utilities
└── scripts/              # DB migration, reindex scripts
```

---

## Relationship to `ahealthplace-next-main`

| | `ahealthplace-next-main` | `global-backend` |
|---|---|---|
| Public pages | ✅ | ❌ |
| Dashboard | ✅ | ✅ |
| CRM | ✅ | ✅ |
| Same DB schema | ✅ | ✅ |
| Same services/repos | ✅ | ✅ |

Both applications share the **same Prisma schema and database** — they are separate deployable surfaces of the same platform.