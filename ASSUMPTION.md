Assumptions and Design Decisions
This document records decisions made where the assignment specification left implementation details open.
1. Separate shift capacities. A class and shift combination is treated as its own admission offering, for example Class 6 - Morning Shift and Class 6 - Day Shift. Each has an independent seat limit.
2. First-come-first-served admission. Seats are reserved in request order, subject to database concurrency control; no lottery or ranking system is used.
3. No authentication system. The assignment does not require account registration or login. A 17-digit birth registration number, supplied in the X-Student-Id header, identifies the student for application operations. This is a demonstration mechanism, not secure authentication for production.
4. Administrative actions. Class creation is available in the Administration section of the frontend without a separate administrator login, following the no-login scope of the assignment.
5. Temporary reservations. New applications initially hold a seat. The hold duration is configured through HOLD_DURATION_SECONDS, defaulting to 600 seconds where no value is supplied.
6. Expired holds. An unconfirmed hold that passes its expiry no longer consumes available capacity. Its displayed status should be EXPIRED, even if a background database cleanup has not run.
7. Admission confirmation. Confirming an active hold represents a demonstration of paying the admission fee; no real payment gateway, financial transaction, or money transfer is implemented.
8. Duplicate applications. A student should not be able to maintain more than one active or confirmed application for the same class. This rule must be enforced by the backend, not just the browser.
9. Cancellation. Cancellation is intended for eligible, unconfirmed holds. Confirmed admissions are not automatically refundable or cancellable through the hold-cancellation action.
10. Browser persistence. The frontend remembers the entered student identifier locally to make applications accessible after a refresh. Users should use fictional identifiers when testing and avoid shared computers for real personal data.
11. Persistence. PostgreSQL data is stored in a Docker-managed volume so ordinary container restarts and docker compose down do not delete it. Removing volumes explicitly will delete that data.
12. Local development ports. The Docker setup uses http://localhost:5173 for the frontend and http://localhost:8080 for the backend. These are local development URLs, not publicly hosted endpoints.
13. No initial class data. A fresh database may start with zero classes. The administrator creates Morning and Day shift offerings through the UI.
Production considerations outside the assignment scope
For real-world use, the system would need authenticated administrator and parent accounts, access controls, privacy protections for birth registration numbers, secure secrets management, audit logs, and a real payment integration.
