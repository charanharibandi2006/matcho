# Matcho Backend API Documentation

## Version
v1.0

## Project

Matcho – Tournament Management System Backend

## Technology Stack

- Node.js
- Express.js
- JWT Authentication
- Express Validator
- PostgreSQL (Upcoming)
- REST API

---

# Project Overview

Matcho is a Tournament Management Backend developed to manage sports tournaments efficiently.

The backend currently supports:

- User Authentication
- Tournament Management
- Player Registration
- Team Management
- Automatic Team Generation
- Random Fixture Generation
- Manual Fixture Generation
- Match Scheduling
- Leaderboard Generation
- Winner Progression
- Champion Declaration

---

## Base URL

http://localhost:5000/api

---

## Authentication

Most endpoints require JWT authentication.

Header:

Authorization: Bearer <JWT_TOKEN>

# Authentication APIs

---

## Register User

POST /auth/register

### Request

{
    "name": "Cheran",
    "email": "cheran@gmail.com",
    "password": "***********"
}

### Success Response

201 Created

{
    "success": true,
    "message": "User registered successfully"
}

---

## Login

POST /auth/login

### Request

{
    "email": "cheran@gmail.com",
    "password": "***********"
}

### Success Response

200 OK

{
    "message": "Login successful",
    "token": "JWT_TOKEN"
}

# Tournament APIs

---

## Create Tournament

POST /tournaments

Authentication Required

### Request

{
    "name":"Inter College Singles",
    "sport":"Badminton",
    "format":"Singles",
    "fixtureType":"Random",
    "date":"2026-09-10"
}

### Response

201 Created

{
    "message":"Tournament created successfully"
}

---

## Get All Tournaments

GET /tournaments

---

## Get Tournament By ID

GET /tournaments/:id

---

## Update Tournament

PUT /tournaments/:id

---

## Delete Tournament

DELETE /tournaments/:id

# Registration APIs

POST /registrations

Register a player for a tournament.

GET /registrations

View all registrations.

# Team APIs

POST /teams

Create Team Manually

POST /teams/auto/:tournamentId

Generate Teams Automatically

GET /teams

View All Teams

GET /teams/:id

View Team

PUT /teams/:id

Update Team

DELETE /teams/:id

Delete Team

# Fixture APIs

POST /fixtures/random/:tournamentId

Generate Random Fixtures

POST /fixtures/manual/:tournamentId

Generate Manual Fixtures

GET /fixtures/:tournamentId

View Tournament Fixtures

PUT /fixtures/score/:id

Update Match Score

POST /fixtures/next-round/:tournamentId

Generate Next Round

# Match Scheduling APIs

POST /matches

Schedule Match

Request

{
    "fixtureId":1,
    "court":"Court 1",
    "matchDate":"2026-09-15",
    "startTime":"10:00",
    "endTime":"10:45",
    "referee":"Mr Kumar"
}

Features

- Court Allocation

- Date Scheduling

- Time Scheduling

- Referee Assignment

- Overlap Detection

- Duplicate Schedule Prevention

GET /matches

GET /matches/:id

PUT /matches/:id

DELETE /matches/:id

# Leaderboard API

GET /leaderboard/:tournamentId

Returns

- Rank

- Participant Name

- Matches Played

- Wins

- Losses

Supports

- Singles

- Doubles

# Tournament Workflow

Create Tournament

↓

Register Players

↓

Generate Teams (Doubles)

↓

Generate Fixtures

↓

Schedule Matches

↓

Update Scores

↓

Generate Next Round

↓

Declare Champion

↓

Leaderboard

# Features

Authentication

Role Based Authorization

Tournament Management

Player Registration

Team Management

Automatic Team Generation

Manual Team Creation

Random Fixtures

Manual Fixtures

Automatic Winner Progression

Match Scheduling

Court Allocation

Overlap Detection

Leaderboard

Champion Declaration

# Status Codes

200 OK

201 Created

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

500 Internal Server Error

# Future Enhancements

PostgreSQL Integration

React Frontend

Swagger Documentation

Email Notifications

QR Check-In

Live Score Updates

Tournament Analytics

PDF Reports

Excel Export

Mobile Application