# School Admission System

A full-stack School Admission System developed using ASP.NET Core (.NET 8), React, PostgreSQL, and Docker.

## Features
- Morning and Day Shift selection
- Class creation and seat management
- Student identification using a 17-digit birth registration number
- Temporary seat reservation with an expiry timer
- Admission confirmation and cancellation
- Automatic seat availability updates
- Concurrency control to prevent overbooking

## How to Run

**Requirement:** Docker Desktop

1. Clone the GitHub repository.
2. Open a terminal in the project root folder.
3. Run:

```bash
docker compose up --build
```

4. Open the application:
   - **Frontend:** http://localhost:5173
   - **Backend API:** http://localhost:8080/classes

## Project Demonstration

A ZIP file containing a video demonstration of the website's functionality has been attached separately. The video shows how the School Admission System operates, including class creation, shift selection, seat reservation, and admission management.

## Technologies
- **Frontend:** React
- **Backend:** ASP.NET Core (.NET 8)
- **Database:** PostgreSQL
- **Deployment:** Docker Compose
