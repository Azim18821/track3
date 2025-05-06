# Architecture Documentation

## Overview

TrackMadeEazE is a cross-platform fitness tracking application designed to provide personalized nutrition and workout insights through AI technologies. The application combines intelligent recommendation systems with an engaging user interface to help users track their fitness journey across web, iOS, and Android platforms.

The system follows a modern client-server architecture with a React frontend, Express.js backend, PostgreSQL database, and various AI integrations. The application supports real-time messaging, offline capabilities, and personalized plan generation.

## System Architecture

### High-Level Architecture

```
┌─────────────┐       ┌────────────┐       ┌───────────────┐
│   Client    │◄─────►│   Server   │◄─────►│   Database    │
│  (React)    │       │ (Express)  │       │ (PostgreSQL)  │
└─────────────┘       └────────────┘       └───────────────┘
       ▲                    ▲                     ▲
       │                    │                     │
       ▼                    ▼                     ▼
┌─────────────┐       ┌────────────┐       ┌───────────────┐
│   Mobile    │       │ WebSockets │       │    External   │
│ (Capacitor) │       │  (Real-time)│      │     APIs      │
└─────────────┘       └────────────┘       └───────────────┘
```

### Client Architecture

The client is built with React and TypeScript, using TailwindCSS and shadcn/ui components for styling. The application employs React Query for data fetching and state management. The client is designed to function across multiple platforms:

- Web application (Progressive Web App)
- iOS application (via Capacitor)
- Android application (via Capacitor)

### Server Architecture

The server is built with Express.js and Node.js, providing RESTful API endpoints for the client. The server architecture includes:

- API routes for various features (workouts, nutrition, user management)
- WebSocket server for real-time messaging between trainers and clients
- Authentication middleware using Passport.js with session-based authentication
- Integration with OpenAI for AI-powered plan generation

### Database Architecture

The application uses PostgreSQL for data persistence, with Drizzle ORM for database interactions. The database schema includes tables for:

- Users and authentication
- Workout and exercise tracking
- Nutrition and meal tracking
- Fitness plans and goals
- Trainer-client relationships

### Messaging Architecture

Real-time communication is implemented using WebSockets, enabling instant messaging between trainers and clients. The WebSocket server is initialized in `server/routes.ts` and client connections are managed in `client/src/lib/websocket.ts`.

## Key Components

### Frontend Components

1. **User Interface**
   - Built with React and TypeScript
   - Styled with TailwindCSS and shadcn/ui components
   - Responsive design for multiple platforms

2. **State Management**
   - React Query for server state management
   - Local state for UI interactions

3. **Cross-Platform Support**
   - Web application
   - iOS application via Capacitor
   - Android application via Capacitor
   - Progressive Web App capabilities for offline support

### Backend Components

1. **API Server**
   - Express.js REST API
   - Route handlers for various features
   - Authentication middleware

2. **WebSocket Server**
   - Real-time messaging between users
   - Trainer-client communication

3. **AI Services**
   - OpenAI integration for personalized plan generation
   - Adaptive coaching through AI-generated recommendations
   - Food recognition using Google Cloud Vision API

4. **Authentication System**
   - Session-based authentication with Passport.js
   - Role-based access control (admin, trainer, user)
   - Password reset functionality

### Data Components

1. **Database**
   - PostgreSQL for persistent storage
   - Drizzle ORM for type-safe database interactions
   - Database migration support

2. **Storage**
   - Server-side storage interface for database operations
   - Client-side IndexedDB for offline functionality

### External Service Integrations

1. **OpenAI Integration**
   - Generation of personalized fitness plans
   - Nutritional analysis and recommendations
   - Ingredient extraction from meal plans

2. **Google Cloud Vision**
   - Food recognition from images
   - Nutritional information extraction

3. **Email Service**
   - Nodemailer for sending emails
   - Password reset emails
   - Plan notifications

4. **Push Notifications**
   - Cross-platform push notification support
   - Notification preferences management

## Data Flow

### Plan Generation Flow

1. User provides fitness preferences and goals
2. Server processes the request and starts a step-wise plan generation
3. OpenAI generates personalized workout and nutrition plans
4. Plans are stored in the database and associated with the user
5. User is notified when plan is ready (email or push notification)
6. Client displays the plan to the user

### Workout Tracking Flow

1. User logs exercises, sets, reps, and weights
2. Data is sent to the server and stored in the database
3. Server processes workout data and updates user progress
4. AI analyzes workout data to provide adaptive recommendations
5. Progress is visualized on the client

### Nutrition Tracking Flow

1. User logs meals and nutritional intake
2. Data is sent to the server and stored in the database
3. Server processes nutrition data and compares against daily goals
4. AI provides nutritional recommendations based on progress
5. Nutritional insights are displayed on the client

### Messaging Flow

1. User (client or trainer) sends a message via WebSocket
2. Server receives the message and identifies the recipient
3. Server forwards the message to the recipient if online
4. Message is stored in the database for offline users
5. Recipient receives the message in real-time if online, or when they come online

## External Dependencies

### Frontend Dependencies

- React, TypeScript: Core frontend technologies
- TailwindCSS, shadcn/ui: UI styling
- React Query: Data fetching and state management
- Capacitor: Cross-platform mobile development
- Service Workers: Offline support

### Backend Dependencies

- Express.js, Node.js: Server framework
- Drizzle ORM: Database ORM
- Passport.js: Authentication
- WebSocket: Real-time messaging
- OpenAI: AI integration
- Google Cloud Vision: Image recognition
- Nodemailer: Email service

### Development Dependencies

- Vite: Build tooling
- ESBuild: JavaScript bundler
- TypeScript: Type checking
- Multer: File upload handling

## Deployment Strategy

The application is configured for deployment on multiple platforms:

### Web Deployment

- Node.js server deployed on a cloud platform
- Static assets served from the server
- Database hosted on Neon (PostgreSQL)

### Mobile Deployment

- iOS application via Capacitor
- Android application via Capacitor
- App stores distribution

### Development Workflow

- Local development with hot reloading
- Replit-based development environment
- Build scripts for web and mobile platforms

### Configuration

- Environment variables for sensitive configuration
- Capacitor configuration for mobile platforms
- Session configuration for authentication

### Continuous Integration

- Build scripts for automation
- Test utilities for quality assurance
- Database migrations for schema evolution

## Security Considerations

- Session-based authentication with secure cookies
- Password hashing using scrypt
- Role-based access control
- HTTPS for all communications
- Content Security Policy for web application
- Secure email communication
- Input validation using Zod schemas

## Future Considerations

- Scaling WebSocket connections for larger user base
- Caching strategies for improved performance
- More advanced AI integrations for personalized recommendations
- Enhanced offline capabilities
- Integration with more fitness tracking devices