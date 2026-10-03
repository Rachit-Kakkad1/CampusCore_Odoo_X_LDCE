# Student Organization System — Database Setup & Run Guide

This guide provides the exact steps to configure, initialize, seed, and verify the local PostgreSQL database for the **Odoo × LDCE Student Organization Management MVP**.

---

## 1. Prerequisites

Ensure you have the following installed on your system:
* **Node.js** (v18+) & **npm**
* **PostgreSQL** (v14+) running locally

---

## 2. Install Dependencies

Install the project dependencies (`pg`, `dotenv`, `bcryptjs`):

```bash
npm install
```

---

## 3. Create the Local PostgreSQL Database

If you have PostgreSQL running with the default `postgres` superuser, create the `student_org` database using `createdb`:

```bash
# If running standard local postgres on port 5432:
createdb -U postgres student_org

# Or via psql directly:
psql -U postgres -c "CREATE DATABASE student_org;"
```

*(If your PostgreSQL requires a password, add `-W` to prompt for password, or `-p <port>` if running on a custom port).*

---

## 4. Configure Environment Variables

1. Copy the example configuration to create your `.env` file:

```bash
cp backend/.env.example .env
```

2. Open `.env` and fill in your local PostgreSQL credentials:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=student_org
DB_USER=postgres
DB_PASSWORD=your_local_password
```

> **Note**: `.env` is ignored by git and will never be committed.

---

## 5. Initialize the Database Schema

Run the SQL migration to create all 14 core MVP tables, constraints, and indexes:

```bash
psql -U postgres -d student_org -f backend/db/schema.sql
```

---

## 6. Seed Demo Data

Run the seed script to populate the demo personas (Admin, Tara, Ethan, Vik, Maya, Eddie, Greg, Pia), events, merchandise with size stocks, fundraisers, tasks, and announcements:

```bash
psql -U postgres -d student_org -f backend/db/seed.sql
```

---

## 7. Verify Node.js Database Connection

Test the database connection pool from Node.js:

```bash
npm run db:test
# or: node backend/config/database.js
```

**Expected output:**
```text
PostgreSQL connection successful
Database: student_org | User: postgres | Server Time: ...
```

---

## 8. Run Full Database Verification Suite

To automatically verify table creation, primary keys, foreign keys, unique constraints, check constraints, intentional rejection of invalid data, and seeded records:

```bash
npm run db:verify
# or: node backend/db/verify.js
```

**Expected output:**
```text
================================================================
VERIFICATION COMPLETE: 60 PASSED, 0 FAILED
================================================================
```
