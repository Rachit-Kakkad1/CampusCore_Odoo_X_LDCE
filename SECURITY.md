# Security Policy

## Supported Versions

We release patches and security fixes for the active development branch.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The security and integrity of user data, authentication tokens, cryptographic ticket verification, and financial ledgers are of paramount importance to the CampusCore / Odoo_X_LDCE project.

If you discover a security vulnerability, please do **NOT** open a public issue. Instead, follow responsible disclosure:

1. **Email Contact**: Send details of the vulnerability to the project maintainers or security team.
2. **Details to Include**:
   - Description of the vulnerability and attack vector
   - Step-by-step reproduction steps or Proof of Concept (PoC)
   - Potential impact (e.g. privilege escalation, payment race condition, QR forgery, injection)
   - Suggested mitigations (if available)
3. **Response Timeline**:
   - Acknowledgement within **48 hours**
   - Vulnerability confirmation and assessment within **5 business days**
   - Security patch release and public attribution (upon coordinator consensus)

## Security Architecture Highlights

- **Authentication**: Stateless, cryptographically signed JSON Web Tokens (JWT) with HMAC-SHA256.
- **Authorization**: Strict Role-Based Access Control (RBAC) enforced on backend route middlewares (`admin`, `event_manager`, `treasurer`, `volunteer`, `member`, `guest`).
- **QR Code Signing**: Cryptographic HMAC signatures for event admission tickets, preventing ticket duplication or forgery.
- **Financial Double-Entry & Idempotency**: Atomic PostgreSQL transactions, unique checkout idempotency keys, and constraints preventing double-spending or over-capacity ticket sales.
- **Data Protection**: Sensitive parameters (passwords, payment credentials) are hashed using `bcrypt` and never leaked in API payloads or client-side storage.
