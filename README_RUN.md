# Student Organization System — Setup & Run Guide
**Odoo × LDCE Hackathon**

This guide provides the instructions to configure, run migrations/seed, start the backend, and verify the PostgreSQL foundation.

---

## 1. Prerequisites
- **Node.js** (v18+) & **npm**
- **PostgreSQL** (v14+) running locally

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `.env` contains your PostgreSQL credentials and server settings:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/skyline_org
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skyline_org
DB_USER=postgres
DB_PASSWORD=your_local_password
JWT_SECRET=super_secret_jwt_key_skyline_2026
QR_SECRET=super_secret_qr_token_skyline_2026
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Run Migrations & Seeding

### Option A: Using Migrations Runner
```bash
npm run migrate
npm run seed
```

### Option B: Direct SQL execution
```bash
psql -U postgres -d skyline_org -f backend/db/schema.sql
psql -U postgres -d skyline_org -f backend/db/seed.sql
```

---

## 5. Start Backend Server

```bash
npm run dev
# or
npm run start
```

---

## 6. Health Check & Verification

### Test API Health:
```bash
curl http://localhost:5000/api/health
```
Expected output:
```json
{"status": "ok"}
```

### Run Verification Suite:
```bash
npm run verify
# or
npm run db:verify
```
