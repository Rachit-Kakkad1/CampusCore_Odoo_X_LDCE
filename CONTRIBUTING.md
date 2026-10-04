# Contributing to LDCE Student Organization Platform (CampusCore)

Thank you for your interest in contributing! This document outlines guidelines and steps for developing, testing, and submitting contributions.

---

## 1. Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to project maintainers.

---

## 2. Development Setup

### Prerequisites
- **Node.js**: v18 or higher (v20+ recommended)
- **PostgreSQL**: v14 or higher
- **Git**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Rachit-Kakkad1/Odoo_X_LDCE.git
   cd Odoo_X_LDCE
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   cp .env.example .env # Configure your DB_USER, DB_PASSWORD, JWT_SECRET, etc.
   npm run migrate     # Run database migrations
   npm run dev         # Starts backend on http://localhost:5000
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   npm run dev         # Starts Vite dev server on http://localhost:5173
   ```

---

## 3. Running Automated Tests

Before submitting a Pull Request, ensure that all automated test suites pass without error:

```bash
cd backend
node tests/runAllTests.js
```

All 11 automated test suites covering authentication, memberships, events, door scanning, volunteer task delegation, merchandise, fundraisers, and concurrency must pass (100% success).

To verify the frontend build:
```bash
cd frontend
npm run build
```

---

## 4. Branching and Pull Request Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Write clean, modular, and self-documenting code following repository architecture conventions.
3. Commit changes with clear, descriptive commit messages.
4. Push your branch and open a Pull Request against `main`.
5. Ensure CI tests and lint checks pass cleanly.

---

## 5. Security & Responsible Disclosure

For any security vulnerabilities or concerns, please review our [Security Policy](SECURITY.md) and avoid opening public issues for sensitive exploits.
