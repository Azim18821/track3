# Development Utilities

This directory contains utility scripts for development and testing purposes only.

## Email Testing

- `emailTest.ts`: Tests email sending using Ethereal (fake SMTP service)
- `gmailTest.ts`: Tests email sending using actual Gmail credentials

Run with:
```bash
npx tsx utils/emailTest.ts
# or
npx tsx utils/gmailTest.ts
```

## WebSocket Testing

- `test-websocket.js`: Tests WebSocket connections to the server

Run with:
```bash
node utils/test-websocket.js
```

## User Creation Scripts

These scripts create test users with predefined credentials for development purposes.

- `user-creation/createTestUser.ts`: Creates standard test users and admins
- `user-creation/createAzimUser.ts`: Creates specific test users for development
- `user-creation/createAzim3User.ts`: Creates a single test user

Run with:
```bash
npx tsx utils/user-creation/createTestUser.ts
```

**IMPORTANT: These scripts should only be used in development environments, never in production, as they create accounts with known credentials.**