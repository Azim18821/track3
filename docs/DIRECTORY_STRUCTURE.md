# Directory Structure

This document provides an overview of the repository's directory structure and the purpose of each major component.

## Root Directory

- `.config/` - Configuration files for tools and services
- `attached_assets/` - Images and assets attached by users during development
- `client/` - Frontend React application
- `server/` - Backend Express.js application
- `shared/` - Shared code between client and server
- `utils/` - Utility scripts and testing tools
- `docs/` - Documentation files
- `.gitignore` - Git ignore file
- `README.md` - Main project documentation
- `drizzle.config.ts` - Drizzle ORM configuration
- `package.json` - Project dependencies and scripts
- `vite.config.ts` - Vite bundler configuration
- `tsconfig.json` - TypeScript configuration

## Client Directory

### Structure

```
client/
├── public/             # Public assets
│   ├── offline.html    # Offline fallback page
│   └── serviceWorker.js # Service worker for offline support
├── src/                # Source code
│   ├── components/     # UI components
│   │   ├── admin/      # Admin-specific components
│   │   ├── dashboard/  # Dashboard components
│   │   ├── exercises/  # Exercise-related components
│   │   ├── nutrition/  # Nutrition-related components
│   │   ├── ui/         # Reusable UI components
│   │   └── workout/    # Workout-related components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   │   └── hooks/      # Library-specific hooks
│   ├── pages/          # Application pages
│   ├── App.tsx         # Main application component
│   ├── index.css       # Global CSS
│   └── main.tsx        # Application entry point
└── index.html          # HTML entry point
```

### Key Components

- `components/` - Reusable UI components
  - `Layout.tsx` - Main application layout
  - `Sidebar.tsx` - Navigation sidebar
  - `MessagingInterface.tsx` - Real-time messaging component
  - `OfflineIndicator.tsx` - Offline status indicator
- `hooks/` - Custom React hooks
  - `use-auth.tsx` - Authentication management hook
  - `use-service-worker.ts` - Service worker registration
- `lib/` - Utilities and helpers
  - `websocket.ts` - WebSocket connection management
  - `offlineDB.ts` - IndexedDB for offline storage
- `pages/` - Application pages
  - `Dashboard.tsx` - User dashboard
  - `TrainerDashboard.tsx` - Trainer dashboard
  - `*Page.tsx` - Various feature pages

## Server Directory

### Structure

```
server/
├── services/          # Service modules
│   └── email.ts       # Email service
├── adminLibraryUpdates.ts  # Admin library update functions
├── adminRoutes.ts     # Admin API routes
├── auth.ts            # Authentication logic
├── chatbot.ts         # AI chatbot implementation
├── db.ts              # Database connection
├── index.ts           # Server entry point
├── mealRecipes.ts     # Meal recipe functions
├── openai.ts          # OpenAI integration
├── passwordResetRoutes.ts # Password reset routes
├── routes.ts          # Main API routes
├── storage.ts         # Data storage interface
├── updateExerciseLibrary.ts # Exercise library updates
└── vite.ts            # Vite server integration
```

### Key Components

- `routes.ts` - Main API routes including WebSocket server
- `auth.ts` - Authentication logic and user management
- `storage.ts` - Data storage interface
- `chatbot.ts` - AI fitness plan generation
- `services/` - Backend service modules

## Shared Directory

```
shared/
└── schema.ts         # Database schema and shared types
```

The schema.ts file contains:
- Database schema definitions
- TypeScript types used across client and server
- Zod validation schemas

## Utils Directory

```
utils/
├── user-creation/     # Test user creation scripts
│   ├── createAzimUser.ts
│   ├── createAzim3User.ts
│   └── createTestUser.ts
├── emailTest.ts       # Email testing utility
├── gmailTest.ts       # Gmail testing utility
├── test-websocket.js  # WebSocket testing utility
├── README.md          # Utils documentation
└── WEBSOCKET.md       # WebSocket documentation
```

## Docs Directory

```
docs/
├── DIRECTORY_STRUCTURE.md  # This file
├── INTEGRATION_GUIDE.md    # Integration documentation
└── API_DOCUMENTATION.md    # API documentation (todo)
```

## Usage Patterns

- **Server-side logic**: Implement in the `server/` directory
- **UI components**: Add to `client/src/components/`
- **New pages**: Create in `client/src/pages/` and add routes in `App.tsx`
- **Database schema changes**: Update `shared/schema.ts` and run migrations
- **Utility scripts**: Add to `utils/` directory
- **Documentation**: Add to `docs/` directory