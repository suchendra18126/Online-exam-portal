# Online Exam Portal

A full-stack online examination platform built with **Python, FastAPI,
React, and MongoDB Atlas**. The application supports role-based access
for students and administrators, scheduled exams, automatic MCQ grading,
results, and a responsive dark-themed interface.

> **Project status:** This README documents the implementation described
> by the project owner. Confirm endpoint payloads, environment variable
> names, frontend build commands, and available tests against the
> current source code before treating this document as an API contract
> or production deployment guide.

## Contents

-   [Overview](#overview)
-   [Features](#features)
-   [Technology stack](#technology-stack)
-   [Architecture](#architecture)
-   [Project structure](#project-structure)
-   [Requirements](#requirements)
-   [Quick start](#quick-start)
-   [Environment configuration](#environment-configuration)
-   [Run the application](#run-the-application)
-   [Demo accounts](#demo-accounts)
-   [Roles and permissions](#roles-and-permissions)
-   [Exam scheduling and submission
    flow](#exam-scheduling-and-submission-flow)
-   [API reference](#api-reference)
-   [MongoDB collections](#mongodb-collections)
-   [Security notes](#security-notes)
-   [Testing and verification](#testing-and-verification)
-   [Troubleshooting](#troubleshooting)
-   [Development workflow](#development-workflow)
-   [Contributing](#contributing)
-   [Roadmap](#roadmap)
-   [License](#license)

## Overview

The Online Exam Portal lets administrators create and schedule
assessments while students sign in, take available exams, submit
answers, and review their results. The FastAPI backend provides REST
endpoints and enforces permissions. MongoDB Atlas stores application
data. The React frontend provides the user interface.

### Main goals

-   Keep exam creation and answer-key management restricted to
    administrators.
-   Allow only student accounts to take and submit exams.
-   Prevent students from receiving correct answers before submission.
-   Enforce exam start and end times on the server.
-   Provide clear submission confirmation and result feedback.
-   Keep the codebase approachable for student developers and
    contributors.

## Features

### Student experience

-   Student registration and login.
-   JWT-based authenticated sessions.
-   Dashboard showing exams and their availability.
-   Exam start controls based on the configured schedule.
-   Question navigation and a countdown timer.
-   Tab-switch warning during an exam.
-   Answer submission and automatically graded MCQs.
-   Result/score review, where enabled by the application.
-   Submission-success confirmation after the server accepts an exam.

### Administrator experience

-   Separate administrator login.
-   Create, update, publish, and delete exams, subject to backend
    permissions.
-   Add MCQ questions and configure correct answers.
-   Set the exam start and end date/time.
-   Review exams and submission information.
-   View analytics, where implemented.

### Interface

-   Responsive, dark glassmorphism-inspired design.
-   Navigation with a back button on secondary screens.
-   Status indicators for upcoming, live, and ended exams.
-   Forms and dashboards designed for desktop and mobile screens.

> Browser-based tab-switch detection is a warning mechanism, not a
> guarantee against cheating. It cannot reliably prevent screenshots,
> external devices, or all forms of copying.

## Technology stack

  -----------------------------------------------------------------------
  Layer                               Technology
  ----------------------------------- -----------------------------------
  Backend API                         Python, FastAPI

  ASGI server                         Uvicorn

  Database                            MongoDB Atlas

  Database driver                     PyMongo and `dnspython`

  Validation                          Pydantic

  Authentication                      JWT (`PyJWT`)

  Password hashing                    Passlib / bcrypt, depending on the
                                      installed versions

  Frontend                            React

  Frontend tooling                    Vite or the setup currently present
                                      in `frontend/`

  Configuration                       Environment variables via
                                      `python-dotenv`

  API testing                         FastAPI interactive docs, `curl`,
                                      and/or automated tests
  -----------------------------------------------------------------------

Use the actual dependencies and versions in the repository's dependency
files as the source of truth.

## Architecture

``` text
Browser
  |
  | React UI / HTTP requests
  v
FastAPI application
  |-- Authentication and JWT validation
  |-- Role-based authorization
  |-- Exam management
  |-- Schedule validation
  |-- Submission and MCQ grading
  |-- Analytics
  |
  v
MongoDB Atlas
  |-- users
  |-- exams
  |-- submissions
```

The frontend should treat the backend as the authority for permissions,
exam timing, grading, and successful submission. Hiding a button in
React is not a security boundary; protected API endpoints must validate
the user's identity and role.

## Project structure

The following is the intended layout based on the described
implementation. Keep this section synchronized with the actual
repository.

``` text
online-exam-portal/
├── backend/
│   ├── __init__.py
│   ├── main.py          # FastAPI application and API routes
│   ├── config.py        # Environment/configuration
│   ├── database.py      # MongoDB connection
│   ├── auth.py          # Password hashing and JWT helpers
│   ├── models.py        # Pydantic request/response schemas
│   └── seed.py          # Demo data setup
├── frontend/
│   ├── index.html
│   ├── package.json     # Expected for a Vite-based frontend
│   └── src/
│       ├── App.jsx
│       └── styles.css
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

If your project uses different filenames or a CDN-based frontend instead
of Vite, update the tree and commands accordingly.

## Requirements

Install the following before starting:

-   Python 3.10 or newer (use the version supported by your
    dependencies).
-   `pip` and Python virtual-environment support.
-   Node.js and npm if the frontend uses Vite.
-   A MongoDB Atlas cluster and a database user.
-   Git (recommended).

Check your installed versions:

``` bash
python3 --version
python3 -m pip --version
node --version
npm --version
git --version
```

If the frontend is served directly by FastAPI and does not use a Node
build, Node.js may not be required to run the built application. It is
still useful for frontend development with Vite.

## Quick start

### 1. Get the source code

If the project is hosted in Git, clone it and enter the directory:

``` bash
git clone <YOUR_REPOSITORY_URL>
cd online-exam-portal
```

Replace `<YOUR_REPOSITORY_URL>` with your repository's actual clone URL.
If you already have the project locally, open a terminal in its root
directory instead.

### 2. Create and activate a Python virtual environment

Linux/macOS:

``` bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:

``` powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Install backend dependencies

``` bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If a dependency installation fails, check the Python version and the
package versions pinned by the project. Do not randomly upgrade
authentication packages in a working deployment without testing
compatibility.

### 4. Configure MongoDB Atlas

1.  Open MongoDB Atlas and select your cluster.
2.  Create a dedicated database user with a strong password.
3.  In **Network Access**, allow the IP address from which the backend
    will connect. Avoid `0.0.0.0/0` for production.
4.  Copy the cluster's Python connection string.
5.  Put the connection string in the local `.env` file as described
    below.

The URI normally has this shape:

``` text
mongodb+srv://<db_user>:<db_password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
```

Replace every placeholder with your own values. URL-encode special
characters in the database username/password if required. Never commit a
real URI or database password to Git.

### 5. Create the environment file

Create `.env` in the project root if that is where `backend/config.py`
loads it. If the code loads environment variables from a different
directory, use that location.

Example `.env.example`:

``` dotenv
MONGODB_URI=mongodb+srv://<db_user>:<db_password>@<cluster-host>/online_exam_portal?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_NAME=online_exam_portal
```

Copy the example for local development:

``` bash
cp .env.example .env
```

Then edit `.env` with real values. **The names above are recommended
examples; verify the exact names read by your current
`backend/config.py`.** Do not use the sample secret in a real
deployment.

Generate a secret locally if needed:

``` bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Make sure `.env` is excluded from version control:

``` gitignore
.env
.venv/
__pycache__/
*.py[cod]
.pytest_cache/
node_modules/
frontend/dist/
```

### 6. Seed demo data (optional)

If the repository includes the seed module and it is safe to run against
your configured database:

``` bash
python -m backend.seed
```

Read `backend/seed.py` before running it. Confirm whether it inserts,
updates, or deletes existing records. Seed scripts should be idempotent
where possible and should never create publicly usable default
administrator credentials in production.

### 7. Start the backend

From the project root:

``` bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

-   Application: <http://127.0.0.1:8000>
-   Health check: <http://127.0.0.1:8000/api/health> (if implemented)
-   Swagger UI: <http://127.0.0.1:8000/docs>
-   ReDoc: <http://127.0.0.1:8000/redoc>

`--reload` is intended for local development, not production. If the
React build is hosted by FastAPI, the frontend may be available at the
application root. If it is a separate Vite app, start it in the next
step.

### 8. Start the frontend (Vite setup only)

Open a second terminal:

``` bash
cd frontend
npm install
npm run dev
```

Use the local URL printed by Vite. Configure the frontend API base URL
to point to the backend, commonly `http://127.0.0.1:8000`. Check
`frontend/package.json` and the frontend source for the actual scripts
and configuration variable names.

For a Vite production build, if configured:

``` bash
npm run build
```

Follow the project's existing deployment setup to serve the generated
build. Do not assume FastAPI automatically serves the frontend unless
static-file mounting is configured in `backend/main.py`.

## Demo accounts

The project history describes these development accounts:

  Role            Email                Password
  --------------- -------------------- ---------------
  Administrator   `admin@exam.com`     `admin123`
  Student         `student@exam.com`   `password123`

Use these only if the current seed script creates them with these
credentials. Verify the instructor account, if present, in
`backend/seed.py`.

**Security warning:** these are example development credentials. Do not
deploy them, expose them publicly, or reuse them for real accounts.
Remove or disable demo-account creation in production and use a secure
administrator-provisioning process.

## Roles and permissions

  -------------------------------------------------------------------------
  Action                                  Student             Administrator
  --------------------- ------------------------- -------------------------
  Register a student                          Yes            Not applicable
  account                                         

  Sign in                                     Yes                       Yes

  View available exams                        Yes       As permitted by the
                                                                     UI/API

  Take and submit an                          Yes                        No
  exam                                            

  Create or edit exams                         No                       Yes

  Set correct answers                          No                       Yes

  Configure exam                               No                       Yes
  schedule                                        

  View own                                    Yes         Yes, if the admin
  submissions/results                                   endpoint permits it

  View portal analytics          No or restricted       Yes, if implemented
  -------------------------------------------------------------------------

These permissions must be enforced on the server for every protected
endpoint. A client-side role check alone is insufficient.

## Exam scheduling and submission flow

1.  An administrator signs in.
2.  The administrator creates an exam, adds questions and answer keys,
    and configures its start and end date/time.
3.  The backend validates that the schedule is valid, including that the
    end is later than the start.
4.  A student signs in and views the exam status.
5.  The backend determines whether the exam is upcoming, live, or ended.
6.  Only an authenticated student can start and submit an exam within
    the allowed window.
7.  The backend grades submitted MCQs and stores the submission.
8.  The frontend displays a clear **"Exam submitted successfully"**
    confirmation only after the server confirms that the submission was
    accepted.
9.  The student can view the result when it is available.

The backend must re-check the schedule when accepting a submission. Do
not rely on the browser timer or the student's device clock. Consider
storing timestamps in UTC and displaying them in the user's local
timezone.

## API reference

The routes below reflect the endpoints described for this project. Open
`/docs` on a running server to see the actual request schemas, response
schemas, status codes, and authentication requirements.

  ---------------------------------------------------------------------------------------------------
  Method            Endpoint                            Purpose            Expected access
  ----------------- ----------------------------------- ------------------ --------------------------
  `POST`            `/api/auth/register`                Register a student Public; student role only
                                                        account            

  `POST`            `/api/auth/login`                   Authenticate and   Public
                                                        issue a token      

  `POST`            `/api/auth/demo-login`              Development/demo   Development only
                                                        login, if enabled  recommended

  `GET`             `/api/auth/me`                      Return the current Authenticated
                                                        authenticated user 

  `GET`             `/api/exams`                        List exams         Authenticated or public,
                                                        available to the   per implementation
                                                        current user       

  `POST`            `/api/exams`                        Create an exam     Administrator

  `GET`             `/api/exams/{id}`                   Get an exam's      Authenticated; hide answer
                                                        details            keys from students

  `PUT`             `/api/exams/{id}`                   Update an exam     Administrator

  `DELETE`          `/api/exams/{id}`                   Delete an exam     Administrator

  `POST`            `/api/submissions`                  Submit an exam     Student
                                                        attempt            

  `GET`             `/api/submissions/my`               List the current   Student
                                                        student's          
                                                        submissions        

  `GET`             `/api/submissions/exam/{exam_id}`   List submissions   Administrator/restricted
                                                        for an exam        

  `GET`             `/api/analytics`                    Retrieve portal    Administrator/restricted
                                                        analytics          

  `POST`            `/api/seed`                         Insert sample      Development only
                                                        data, if exposed   recommended

  `GET`             `/api/health`                       Check application  Usually public, minimal
                                                        health, if         output
                                                        implemented        
  ---------------------------------------------------------------------------------------------------

### Authentication

Protected requests typically send the JWT access token in the HTTP
`Authorization` header:

``` http
Authorization: Bearer <access_token>
```

Example using `curl` (adapt the JSON fields to the schema shown in
`/docs`):

``` bash
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@exam.com","password":"password123"}'
```

Use the token returned by the actual login response for authenticated
requests. Never put JWT signing secrets in the React frontend. In
production, use HTTPS and define a deliberate token-expiry, refresh, and
logout strategy.

## MongoDB collections

The application is described as storing these core entities. Actual
collection names and field definitions are determined by
`backend/database.py`, `backend/models.py`, and the code that writes to
MongoDB.

-   **Users:** identity, email, password hash, and role.
-   **Exams:** title, description, questions, marks, duration,
    publication state, and start/end times.
-   **Submissions:** student/exam references, submitted answers, score,
    timestamps, and result details.

Recommended data practices:

-   Store password hashes, never plaintext passwords.
-   Add a unique index on normalized user email.
-   Validate MongoDB ObjectId values and request payloads.
-   Use indexes for frequent queries, such as exams by status/schedule
    and submissions by student or exam.
-   Avoid storing answer keys in student-facing responses.
-   Use database credentials with only the permissions the application
    needs.
-   Back up important data and test restore procedures.

## Security notes

Before exposing this project to the internet, review the following:

-   [ ] Replace all default demo credentials and development secrets.
-   [ ] Store secrets in environment variables or a managed secret
    store.
-   [ ] Require HTTPS in production.
-   [ ] Restrict MongoDB Atlas network access and database-user
    privileges.
-   [ ] Enforce roles on the backend, including on update, delete,
    analytics, and submission routes.
-   [ ] Never return `correct_option`, answer keys, or private
    explanations in student exam payloads before submission.
-   [ ] Validate exam ownership/permissions, IDs, timestamps, answer
    choices, and request sizes.
-   [ ] Prevent duplicate submissions or define explicit retake rules.
-   [ ] Ensure a student can access only their own submissions.
-   [ ] Configure CORS with the actual frontend origins instead of
    allowing every origin in production.
-   [ ] Rate-limit login and registration, and return generic
    authentication errors where appropriate.
-   [ ] Keep dependencies patched and pin/test compatible versions.
-   [ ] Add structured logging without logging passwords, JWTs, or
    database URIs.
-   [ ] Disable public seed/demo-login routes in production.
-   [ ] Add automated tests for authorization and schedule boundaries.

A working local application is not automatically production-ready.
Security review, automated tests, deployment configuration, monitoring,
backups, and recovery procedures are still necessary.

## Testing and verification

### Basic health check

If `/api/health` is implemented:

``` bash
curl -i http://127.0.0.1:8000/api/health
```

A successful response should indicate that the application is healthy.
If the endpoint checks MongoDB as well, verify the database status in
its response.

### Manual acceptance checklist

-   [ ] Register a new student; confirm that public registration cannot
    assign an admin role.
-   [ ] Sign in as a student and administrator using valid credentials.
-   [ ] Confirm that invalid passwords are rejected.
-   [ ] Confirm that unauthenticated requests to protected endpoints are
    rejected.
-   [ ] Confirm that a student cannot create, edit, or delete exams.
-   [ ] Confirm that an administrator cannot submit an exam as a
    student.
-   [ ] Create an exam with multiple-choice questions and correct
    answers.
-   [ ] Confirm that the student-facing exam response does not expose
    correct answers.
-   [ ] Set a future start time and verify that the exam cannot be
    started early.
-   [ ] Verify that submissions are rejected after the end time.
-   [ ] Submit an exam and confirm the success message appears only
    after a successful API response.
-   [ ] Confirm that scores and stored submissions match the submitted
    answers.
-   [ ] Test browser refresh, back navigation, and logout/session
    expiry.
-   [ ] Test layout and exam controls on both mobile and desktop widths.
-   [ ] Test behavior when MongoDB is unavailable.

### Automated tests

If the project includes a test suite, document and run its actual
command. A common Python setup is:

``` bash
pip install pytest httpx
pytest
```

This command will only work if tests and test configuration exist. Add
tests for authentication, role-based access, exam scheduling, grading,
duplicate submissions, and database failures before production use.

## Troubleshooting

### `Address already in use` on port 8000

Another process is already listening on the port. Either stop the
existing server or use a different port.

Linux:

``` bash
ss -ltnp | grep :8000
```

If you identify a process you own and intend to stop, terminate it
safely. Alternatively:

``` bash
uvicorn backend.main:app --reload --port 8001
```

Then use port `8001` in the browser and API requests.

### MongoDB Atlas reports `ReplicaSetNoPrimary` or a server-selection timeout

Check these items:

1.  Confirm the cluster is running and available in Atlas.
2.  Check **Network Access** and allow the backend machine's current
    public IP.
3.  Verify the database username/password and URL-encode special
    characters.
4.  Confirm that `MONGODB_URI` is loaded from the correct `.env` file.
5.  Check local internet access, DNS resolution, firewall rules, and
    outbound access to MongoDB.
6.  Ensure the connection string was copied from Atlas for the correct
    cluster.
7.  Review the full exception and driver timeout configuration.

A message saying that some nodes are secondaries does not by itself
prove the cluster is broken. A primary-selection timeout can be caused
by network access, cluster health, DNS, credentials, or replica-set
discovery. Increasing a timeout alone will not fix an inaccessible
cluster.

### Login returns `401 Unauthorized`

-   Check the email and password.
-   Confirm that the account exists in the configured database.
-   Check whether the seed script created the expected account.
-   Verify that the backend and seed script use the same database.
-   Review password-hashing compatibility and the backend logs without
    printing secrets.

### Protected endpoint returns `403 Forbidden`

The user may be authenticated but lack the required role. Confirm the
token belongs to the intended account and that role checks are working
as designed.

### Frontend cannot reach the backend

-   Confirm that FastAPI is running.
-   Verify the frontend API base URL and port.
-   Check browser developer tools for CORS or network errors.
-   Ensure the backend CORS configuration includes the frontend's exact
    development origin.
-   Check whether the frontend is configured for a separate Vite server
    or is served by FastAPI.

### Environment variables appear to be ignored

Confirm the `.env` file location and how `backend/config.py` loads it.
Restart the backend after changing configuration. Do not print the full
environment or secrets into logs.

## Development workflow

A suggested workflow for contributors:

1.  Create a branch for one focused change.
2.  Create or activate a virtual environment.
3.  Install dependencies from `requirements.txt`.
4.  Configure a development MongoDB database.
5.  Run the backend and frontend.
6.  Make the smallest change that solves the issue.
7.  Add or update tests.
8.  Run tests and manually verify the affected user flow.
9.  Review the diff for secrets, debug statements, and unrelated edits.
10. Open a pull request with a clear description and test evidence.

Use clear commit messages, for example:

``` text
feat: add exam scheduling validation
fix: hide answer keys from student responses
test: cover submission time boundaries
docs: improve local setup instructions
```

## Contributing

Contributions, bug reports, and documentation improvements are welcome.

### Before opening an issue

Include:

-   A concise description of the problem.
-   Steps to reproduce it.
-   Expected behavior and actual behavior.
-   Relevant API response/status code, if applicable.
-   Operating system and Python/Node versions.
-   Sanitized logs or screenshots, when useful.

**Never include passwords, JWTs, MongoDB URIs, `.env` contents, or real
student data in issues.**

### Pull request checklist

-   [ ] The change addresses one clear issue or feature.
-   [ ] Existing behavior is preserved unless the change intentionally
    updates it.
-   [ ] Backend authorization and validation are included where needed.
-   [ ] Tests are added or updated.
-   [ ] Documentation and example configuration are updated.
-   [ ] No secrets or personal data are included.
-   [ ] The change has been tested locally.

If the repository does not yet have a contribution template, consider
adding `CONTRIBUTING.md` and issue/pull-request templates.

## Roadmap

Potential improvements for a more robust production release:

-   Automated unit and integration tests in CI.
-   Email verification and password reset.
-   Secure refresh-token/session lifecycle and server-side logout
    strategy.
-   Admin account provisioning without default credentials.
-   Question banks, randomization, and configurable retake policies.
-   More detailed audit logs for exam creation and grading changes.
-   Pagination and indexes for large exam/submission collections.
-   Accessibility review and keyboard navigation.
-   Docker-based development and deployment.
-   Monitoring, backups, restore drills, and documented incident
    procedures.
-   Stronger integrity controls and clear privacy policies for exam
    monitoring.

## License

No license has been specified here. Before publishing or accepting
external contributions, choose a license and add a `LICENSE` file. Do
not claim that the project is MIT-licensed or otherwise open source
until that file is present.

------------------------------------------------------------------------

**Maintainer:** Project owner / contributors\
**Project:** Online Exam Portal\
**Backend:** FastAPI · **Frontend:** React · **Database:** MongoDB Atlas