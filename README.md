# TrackMadeEazE Fitness Application

A cross-platform fitness tracking application that provides personalized nutrition and workout insights through advanced AI technologies. Combines intelligent recommendation systems with engaging user experience design and adaptive learning.

![Fitness Tracking Application](https://source.unsplash.com/random/800x400/?fitness,workout)

## Features

- **Personalized Fitness Plans**: AI-generated workout and nutrition plans tailored to user preferences
- **Workout Tracking**: Log exercises, sets, reps, and weights with progress visualization
- **Nutrition Tracking**: Track meals and nutritional intake with daily goals
- **Goal Setting**: Set and track fitness goals with progress indicators
- **Real-time Messaging**: WebSocket-based communication between trainers and clients
- **Offline Support**: Continue using the app even when offline with progressive web app capabilities
- **Multi-platform**: Works on web, iOS, and Android platforms

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **Real-time**: WebSocket communication for instant messaging
- **AI Integration**: OpenAI for personalized plan generation
- **Offline Support**: Service workers and IndexedDB
- **Mobile**: React Native for cross-platform mobile development

## Architecture

The application follows a modern web architecture:

- **Client**: React frontend with React Query for data fetching and state management
- **Server**: Express.js backend with RESTful API endpoints
- **Database**: PostgreSQL for data persistence
- **Messaging**: WebSocket for real-time communication
- **Authentication**: Session-based authentication with role-based access control

## Project Structure

```
├── client/               # Frontend React application
│   ├── public/           # Static assets and service worker
│   └── src/              # Source code
│       ├── components/   # UI components
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Utilities and helpers
│       └── pages/        # Application pages
├── server/               # Express.js backend
│   ├── services/         # Service modules
│   └── routes.ts         # API routes
├── shared/               # Shared code between client and server
│   └── schema.ts         # Database schema and types
├── utils/                # Utility scripts and tools
│   ├── user-creation/    # Test user creation scripts
│   └── README.md         # Utils documentation
├── docs/                 # Documentation files
│   ├── API_DOCUMENTATION.md # API endpoints documentation
│   ├── DIRECTORY_STRUCTURE.md # Detailed directory structure
│   └── INTEGRATION_GUIDE.md # Integration guidelines
└── README.md             # This file
```

For detailed documentation, see:
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Directory Structure](./docs/DIRECTORY_STRUCTURE.md)
- [Integration Guide](./docs/INTEGRATION_GUIDE.md)
- [WebSocket Documentation](./utils/WEBSOCKET.md)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- For mobile development: Android Studio and/or Xcode

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Initialize database: `npm run db:push`
5. Start the application: `npm run dev`

## Development

The application uses Vite for frontend development and tsx for TypeScript execution on the backend.

- `npm run dev`: Start both frontend and backend in development mode
- `npm run db:push`: Push schema changes to the database
- `npm run build`: Build the frontend for production
- `npm run start`: Start the production server

## Deployment

### Web Deployment (Render)

The application is configured to be deployed on Render with the following steps:

1. Connect your GitHub repository to Render
2. Create a Web Service with the following settings:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
   - Environment variables: Set up your database connection and other environment variables
3. Render will automatically deploy your application

A `render.yaml` file is provided for easier deployment configuration.

### PWA Installation

The application is configured as a Progressive Web App (PWA) and can be installed on any device:

1. Visit the application URL in a supported browser (Chrome, Edge, Safari, etc.)
2. For desktop: Click the install button in the browser's address bar
3. For mobile: Tap "Add to Home Screen" in the browser menu

### Mobile App Deployment (Capacitor)

For native mobile deployment using Capacitor:

1. Build the web application: `./capacitor-build.sh`
2. For Android:
   - Run `npx cap open android` to open in Android Studio
   - Build and deploy from Android Studio
3. For iOS:
   - Run `npx cap open ios` to open in Xcode
   - Build and deploy from Xcode

Make sure to update the `capacitor.config.ts` file with your specific configuration before building.

## User Roles

- **Admin**: Manage users, system settings, and content
- **Trainer**: Manage clients, create workout plans, and communicate with clients
- **Client**: Track workouts, nutrition, and communicate with trainers

## WebSocket Communication

Real-time features use WebSockets for communication. The WebSocket server is initialized in `server/routes.ts` and clients connect in `client/src/lib/websocket.ts`.

## Offline Support

The application includes service workers for offline functionality. Key features:
- Offline data storage using IndexedDB
- Background sync for pending changes
- Cached assets for offline access

## Utilities

See the [utils README](./utils/README.md) for information about development utilities.

## License

Proprietary - All Rights Reserved