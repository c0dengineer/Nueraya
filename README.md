# Neuraya

Neuraya is an early-development screening prototype for parents and
caregivers. It combines a structured behavioural questionnaire with
open-ended parent observations and presents a non-diagnostic Low, Moderate, or
High screening estimate with practical next steps.

> **Medical notice:** Neuraya is an educational screening aid, not a medical
> diagnosis and not a replacement for a pediatrician, developmental specialist,
> speech-language pathologist, psychologist, or other qualified professional.

## Features

- Parent signup and sign-in demo.
- Child profiles, profile editing, and multiple children per account.
- Separate screening histories for each child.
- 24 structured questions across four domains:
  - Social Connection & Interaction
  - Communication & Language
  - Sensory Experiences
  - Emotional Regulation & Adaptability
- Four open-ended parent-observation questions.
- Optional AI-backed language analysis for open-ended answers.
- Conservative local fallback analysis when an AI provider is unavailable.
- Guest screening flow with a temporary browser report.
- Signed-in dashboard with screening history and domain breakdown.
- Report page with estimated risk level, explanations, guidance, and support
  links.
- Responsive static frontend using HTML, CSS, JavaScript, and Bootstrap.

## Architecture

1. The browser serves the static frontend from the `Frontend` directory.
2. Parents create or select a child profile and complete the screening flow.
3. The questionnaire stores structured answers by section and question index.
4. Open-ended answers are sent to the FastAPI text-analysis endpoint when it is
   available.
5. The backend uses the OpenAI Responses API when `OPENAI_API_KEY` is
   configured. Otherwise, it returns a conservative local vocabulary-based
   fallback.
6. The frontend combines structured questionnaire scores and language signals
   into domain results.
7. The browser displays the analysis loading page and then the screening report.

The backend is used for open-ended language analysis only. The current
signup, child-profile, and screening-history flows are browser-local demo
implementations rather than a production authentication or clinical records
system.

## Project Structure

```text
Nueraya/
|-- Backend/
|   |-- app/
|   |   |-- main.py                 # FastAPI text-analysis API
|   |-- requirements.txt            # Python dependencies
|   `-- .env.example                # Safe environment template
|-- Frontend/
|   |-- index.html                  # Landing page
|   |-- about.html                  # About and screening information
|   |-- login.html                  # Demo sign-in
|   |-- signup.html                 # Demo account creation
|   |-- forgotpass.html              # Demo password reset flow
|   |-- childinfo.html               # Child profile creation
|   |-- editchild.html               # Child profile editing
|   |-- disclaimer.html              # Screening disclaimer
|   |-- test.html                    # Questionnaire page
|   |-- test.js                      # Questionnaire data and navigation
|   |-- analyzer.html                # Analysis loading page
|   |-- report.html                  # Screening report
|   |-- dashboard.html               # Parent dashboard and history
|   |-- script.js                    # Shared frontend logic and scoring
|   |-- style.css                    # Shared styles
|   `-- image/                       # Frontend image assets, ignored by Git
|-- .gitignore                      # Local secrets and generated files
`-- README.md
```

## Requirements

- Python 3.10 or later.
- A modern browser such as Chrome, Edge, or Firefox.
- Internet access for Bootstrap CDN assets and optional AI analysis.
- An OpenAI API key only if model-backed text analysis is required.

The application can still run without an OpenAI key. In that case, the
backend and browser use conservative fallback analysis.

## Backend Setup

### Windows PowerShell

From the repository root:

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

If PowerShell blocks script activation, either allow local scripts for your
user account or run the backend with the virtual-environment executable:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### Linux/macOS

```bash
cd Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

The backend is available at:

- Service status: `http://127.0.0.1:8000/`
- Health check: `http://127.0.0.1:8000/health`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

## Frontend Setup

Serve the repository root so the application opens at the same path used by
the project:

```powershell
cd C:\Users\navya\Desktop\PROJECTS\Nueraya
python -m http.server 5500
```

Open:

```text
http://127.0.0.1:5500/Frontend/index.html
```

Do not open the HTML file directly from the filesystem when testing API
requests. A local HTTP server avoids browser file-origin restrictions.

## Run the Complete Application

Use two terminals at the same time.

**Terminal 1: backend API**

```powershell
cd C:\Users\navya\Desktop\PROJECTS\Nueraya\Backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

**Terminal 2: frontend site**

```powershell
cd C:\Users\navya\Desktop\PROJECTS\Nueraya
python -m http.server 5500
```

Then visit `http://127.0.0.1:5500/Frontend/index.html`.

The frontend calls `http://127.0.0.1:8000` and the backend allows requests
from both `http://127.0.0.1:5500` and `http://localhost:5500`.

## Environment Configuration

Copy the safe template before adding local configuration:

```powershell
Copy-Item Backend/.env.example Backend/.env
```

The supported variables are:

```dotenv
OPENAI_API_KEY=replace_with_your_server_side_key
OPENAI_MODEL=gpt-5
```

`OPENAI_API_KEY` must remain server-side. Never put it in frontend JavaScript,
commit it to Git, or include it in screenshots. `Backend/.env` is ignored by
Git. If no key is configured, `/health` reports `model_configured: false` and
the local fallback remains available.

## Browser Screening Flow

1. Open the frontend landing page.
2. Create a demo account or continue as a guest.
3. Enter child information and confirm screening consent.
4. Review the disclaimer.
5. Complete all 24 questionnaire questions.
6. Submit the screening and wait on the analysis page.
7. Review the report and domain breakdown.
8. Signed-in users can return to the dashboard to view child-specific history.

Guest results are temporary and are not added to the signed-in dashboard
history. Signed-in demo data remains in browser storage on the current device.

## Scoring and Language Analysis

The four questionnaire sections map to these domains:

| Section | Domain |
| --- | --- |
| 1 | Social connection |
| 2 | Communication |
| 3 | Sensory experiences |
| 4 | Emotional regulation |

When language signals are available, the frontend calculates each domain as:

```text
domain score = 75% structured-questionnaire score
               + 25% language-analysis score
overall estimate = average of the four domain scores
```

The model is instructed to return cautious domain signals from `0` to `4`,
provide short explanations, treat negation carefully, and avoid diagnosis.
The result is a screening estimate only and must not be treated as clinical
advice.

## API

### `GET /`

Returns basic service information and links to the health and text-analysis
routes.

### `GET /health`

Returns service status and whether an OpenAI key is configured:

```json
{
  "status": "ok",
  "model_configured": false
}
```

### `POST /api/v1/analyze-text`

Analyzes one or more open-ended answers. The request must contain at least one
answer. Keys use the `<section>-<question>` format, such as `0-5` for the
sixth question in the first section. Each answer is trimmed and limited to
2,000 characters by the backend.

Example request:

```json
{
  "answers": {
    "0-5": "She plays alone and rarely looks when called.",
    "1-5": "He uses a few words but points to show what he needs."
  }
}
```

Possible response fields include `domain_signals`, `source`, and `notes`.
`source` identifies whether the response came from the model or the local
fallback.

## Data, Privacy, and Security

- Demo accounts and passwords are stored in browser `localStorage`; this is not
  production authentication.
- Child profiles and signed-in screening histories are stored in browser
  storage on the current device.
- Guest screening data is kept temporarily so the report can load.
- Open-ended answers may be sent to the configured AI provider for analysis.
- The project should not be used with real sensitive health information in its
  current form.
- A production version needs server-side authentication, authorization,
  encryption, secure password handling, consent records, retention and deletion
  policies, rate limiting, audit logs, and clinical review.

## Current Limitations

- This is a prototype and does not validate a clinical screening instrument.
- It does not diagnose autism or any other condition.
- It does not identify emergencies or replace professional assessment.
- The demo account system is browser-local and is not secure for deployment.
- The AI result depends on network access and provider availability.
- The browser fallback is intentionally limited compared with model analysis.
- There are currently no automated frontend or backend test suites.

If a child loses skills, is in danger, or a caregiver is seriously concerned,
seek qualified medical support promptly.

## Acknowledgements

Neuraya uses FastAPI, Uvicorn, Pydantic, python-dotenv, the OpenAI Python
client, Bootstrap, and standard browser APIs. Review the licenses of all
third-party dependencies and visual assets before redistribution.

## Team

- Navya Roshni
- Vishakha Talele
- Sania Musliar
- Sneha Nadar
