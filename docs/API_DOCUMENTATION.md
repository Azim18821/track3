# API Documentation

This document provides detailed information about the API endpoints available in the TrackMadeEazE fitness application.

## Base URL

All API endpoints are relative to the base URL of the application.

## Authentication

Most endpoints require authentication. Include session cookies with each request.

### Authentication Endpoints

#### Register User

```
POST /api/register
```

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "isAdmin": "boolean",
    "isTrainer": "boolean",
    "isApproved": "boolean"
  }
}
```

#### Login

```
POST /api/login
```

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "isAdmin": "boolean",
    "isTrainer": "boolean",
    "isApproved": "boolean"
  }
}
```

#### Logout

```
POST /api/logout
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### Get Current User

```
GET /api/user
```

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "isAdmin": "boolean",
  "isTrainer": "boolean",
  "isApproved": "boolean"
}
```

## User Management (Admin Only)

#### Get All Users

```
GET /api/admin/users
```

**Response:**
```json
[
  {
    "id": "number",
    "username": "string",
    "email": "string",
    "isAdmin": "boolean",
    "isTrainer": "boolean",
    "isApproved": "boolean",
    "registeredAt": "string"
  }
]
```

#### Approve User

```
POST /api/admin/approve/:id
```

**Response:**
```json
{
  "message": "User approved",
  "user": {
    "id": "number",
    "username": "string",
    "isApproved": true
  }
}
```

#### Get User Details

```
GET /api/admin/users/:id
```

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "isAdmin": "boolean",
  "isTrainer": "boolean",
  "isApproved": "boolean",
  "registeredAt": "string"
}
```

#### Update User

```
PUT /api/admin/users/:id
```

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "isAdmin": "boolean",
  "isTrainer": "boolean",
  "isApproved": "boolean"
}
```

**Response:**
```json
{
  "message": "User updated",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "isAdmin": "boolean",
    "isTrainer": "boolean",
    "isApproved": "boolean"
  }
}
```

## Fitness Plans

#### Create Fitness Plan

```
POST /api/fitness-plans
```

**Request Body:**
```json
{
  "preferences": {
    "goal": "string",
    "currentWeight": "number",
    "targetWeight": "number",
    "unit": "string",
    "workoutDaysPerWeek": "number",
    "dietaryRestrictions": ["string"],
    "preferredFoods": ["string"],
    "fitnessLevel": "string"
  }
}
```

**Response:**
```json
{
  "id": "number",
  "userId": "number",
  "preferences": "object",
  "workoutPlan": "object",
  "mealPlan": "object",
  "createdAt": "string"
}
```

#### Get User Fitness Plans

```
GET /api/fitness-plans
```

**Response:**
```json
[
  {
    "id": "number",
    "userId": "number",
    "preferences": "object",
    "workoutPlan": "object",
    "mealPlan": "object",
    "createdAt": "string"
  }
]
```

#### Get Fitness Plan

```
GET /api/fitness-plans/:id
```

**Response:**
```json
{
  "id": "number",
  "userId": "number",
  "preferences": "object",
  "workoutPlan": "object",
  "mealPlan": "object",
  "createdAt": "string"
}
```

#### Update Fitness Plan

```
PUT /api/fitness-plans/:id
```

**Request Body:**
```json
{
  "preferences": "object",
  "workoutPlan": "object",
  "mealPlan": "object"
}
```

**Response:**
```json
{
  "id": "number",
  "userId": "number",
  "preferences": "object",
  "workoutPlan": "object",
  "mealPlan": "object",
  "updatedAt": "string"
}
```

#### Delete Fitness Plan

```
DELETE /api/fitness-plans/:id
```

**Response:**
```json
{
  "message": "Fitness plan deleted"
}
```

## Workouts

#### Log Workout

```
POST /api/workouts
```

**Request Body:**
```json
{
  "name": "string",
  "date": "string",
  "exercises": [
    {
      "name": "string",
      "sets": "number",
      "reps": "number",
      "weight": "number",
      "duration": "number"
    }
  ],
  "notes": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "userId": "number",
  "name": "string",
  "date": "string",
  "exercises": "array",
  "notes": "string",
  "createdAt": "string"
}
```

#### Get User Workouts

```
GET /api/workouts
```

**Query Parameters:**
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response:**
```json
[
  {
    "id": "number",
    "userId": "number",
    "name": "string",
    "date": "string",
    "exercises": "array",
    "notes": "string",
    "createdAt": "string"
  }
]
```

#### Get Workout

```
GET /api/workouts/:id
```

**Response:**
```json
{
  "id": "number",
  "userId": "number",
  "name": "string",
  "date": "string",
  "exercises": "array",
  "notes": "string",
  "createdAt": "string"
}
```

#### Update Workout

```
PUT /api/workouts/:id
```

**Request Body:**
```json
{
  "name": "string",
  "date": "string",
  "exercises": "array",
  "notes": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "userId": "number",
  "name": "string",
  "date": "string",
  "exercises": "array",
  "notes": "string",
  "updatedAt": "string"
}
```

#### Delete Workout

```
DELETE /api/workouts/:id
```

**Response:**
```json
{
  "message": "Workout deleted"
}
```

## Nutrition

#### Log Nutrition

```
POST /api/nutrition
```

**Request Body:**
```json
{
  "date": "string",
  "meals": [
    {
      "name": "string",
      "type": "string",
      "calories": "number",
      "protein": "number",
      "carbs": "number",
      "fat": "number"
    }
  ],
  "totalCalories": "number",
  "totalProtein": "number",
  "totalCarbs": "number",
  "totalFat": "number",
  "notes": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "userId": "number",
  "date": "string",
  "meals": "array",
  "totalCalories": "number",
  "totalProtein": "number",
  "totalCarbs": "number",
  "totalFat": "number",
  "notes": "string",
  "createdAt": "string"
}
```

#### Get User Nutrition

```
GET /api/nutrition
```

**Query Parameters:**
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response:**
```json
[
  {
    "id": "number",
    "userId": "number",
    "date": "string",
    "meals": "array",
    "totalCalories": "number",
    "totalProtein": "number",
    "totalCarbs": "number",
    "totalFat": "number",
    "notes": "string",
    "createdAt": "string"
  }
]
```

## Messages

#### Send Message

```
POST /api/messages
```

**Request Body:**
```json
{
  "recipientId": "number",
  "content": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "senderId": "number",
  "recipientId": "number",
  "content": "string",
  "createdAt": "string",
  "isRead": false
}
```

#### Get User Messages

```
GET /api/messages
```

**Query Parameters:**
- `contactId` (optional): Filter by contact ID

**Response:**
```json
[
  {
    "id": "number",
    "senderId": "number",
    "recipientId": "number",
    "content": "string",
    "createdAt": "string",
    "isRead": "boolean"
  }
]
```

#### Mark Message as Read

```
PUT /api/messages/:id/read
```

**Response:**
```json
{
  "id": "number",
  "isRead": true
}
```

## WebSocket API

The WebSocket API is available at `/ws`. It uses the following message format:

```json
{
  "type": "string",
  "content": "string",
  "senderId": "number",
  "recipientId": "number",
  "timestamp": "string",
  "messageId": "string"
}
```

### Message Types

- `chat`: User-to-user chat message
- `notification`: System notification
- `status`: Connection status update

## Error Responses

All endpoints return standard error responses:

```json
{
  "message": "Error message",
  "status": "number"
}
```

Common status codes:
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error