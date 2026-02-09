#  Intelligent Clinical Documentation System

<div align="center">

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-green.svg)
![React](https://img.shields.io/badge/react-18.2-61dafb.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

**AI-powered Electronic Health Records Management with SOAP Structuring, Patient Intake, and Clinical Analytics**

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

NLP_EHR is a comprehensive clinical documentation system that transforms unstructured clinical notes into structured, searchable, and analyzable representations. The system leverages advanced NLP techniques, Large Language Models (LLMs), and a multi-agent architecture to automate healthcare documentation workflows.

### Key Capabilities

- **OCR Processing**: Extract text from PDFs, images, and scanned documents
- **De-identification**: Automatic removal of PHI/PII before processing
- **SOAP Structuring**: AI-powered conversion of clinical notes to SOAP format
- **ICD-10 Coding**: Automated code suggestions with fuzzy matching
- **Semantic Search**: Vector-based similarity search across patient records
- **Clinical Q&A**: RAG-powered chatbot for clinical queries

---

## Features

### For Patients
- **Smart Intake System**: Conversational AI-driven symptom collection
- **Appointment Booking**: Schedule appointments with matched specialists
- **Health Portal**: View records, summaries, and upcoming appointments
- **Patient Summaries**: Easy-to-understand visit summaries

### For Doctors
- **Patient Queue Management**: Triage-prioritized patient queue
- **SOAP Editor**: Edit and validate AI-generated clinical notes
- **Dual Validation**: Two-stage validation for SOAP note quality
- **Learning Insights**: Track documentation patterns and improvements

### For Hospitals
- **Analytics Dashboard**: ICD code distributions, trends, and KPIs
- **Doctor Management**: Manage specialties, availability, and assignments
- **Encounter Persistence**: Complete audit trail of all clinical encounters

### AI Agents

| Agent | Purpose |
|-------|---------|
| Intake Triage Agent | Conversational symptom collection with priority scoring |
| Doctor Matching Agent | Match patients to specialists based on symptoms |
| Structuring Agent | Convert clinical text to SOAP format |
| Dual Validator Agent | Two-pass validation for completeness and consistency |
| Reflexion Agent | Self-improving SOAP refinement |
| Patient Summary Agent | Generate patient-friendly documentation |
| Analytics Agent | Clinical insights and trend analysis |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  Landing │ Patient Portal │ Doctor Dashboard │ Hospital Admin   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API
┌─────────────────────────────▼───────────────────────────────────┐
│                     Backend (FastAPI)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   AI Agent Orchestrator                  │   │
│  │  Intake │ Matching │ Structuring │ Validation │ Summary  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  OCR Engine  │  │ De-identify  │  │    ICD-10 Mapper     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                        Data Layer                               │
│      Supabase (PostgreSQL + pgvector) │ Google Gemini API       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Language | Python 3.9+ |
| LLM | Google Gemini |
| Database | Supabase (PostgreSQL + pgvector) |
| OCR | Tesseract (pytesseract) |
| PDF Processing | pdf2image, Pillow |
| Text Matching | RapidFuzz |
| Embeddings | Google Generative AI |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| State Management | React Context |
| Routing | React Router v6 |
| Charts | Recharts |
| Animations | Framer Motion |
| HTTP Client | Axios |
| Notifications | React Hot Toast |

---

## Project Structure

```
NLP_EHR/
├── backend/
│   ├── agents/                    # AI Agent implementations
│   │   ├── intake_triage_agent.py
│   │   ├── doctor_matching_agent.py
│   │   ├── dual_validator_agent.py
│   │   ├── patient_summary_agent.py
│   │   ├── reflexion_agent.py
│   │   ├── structuring_agent.py
│   │   ├── analytics_agent.py
│   │   ├── chat_agent.py
│   │   └── custom_orchestrator.py
│   ├── data/
│   │   ├── icd10.csv              # ICD-10 code database
│   │   └── sample_notes/          # Sample clinical notes
│   ├── database/
│   │   └── schema.sql             # Database schema
│   ├── main_v3.py                 # Main FastAPI application
│   ├── auth.py                    # Authentication logic
│   ├── ocr_utils.py               # OCR processing utilities
│   ├── utils.py                   # De-identification & helpers
│   ├── icd_mapper.py              # ICD-10 code matching
│   ├── llm_structurer.py          # LLM integration
│   ├── db_utils.py                # Database utilities
│   ├── supabase_client.py         # Supabase client wrapper
│   └── requirements.txt
│
├── frontend-react/
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Layout.jsx
│   │   │   ├── DoctorLayout.jsx
│   │   │   ├── PatientLayout.jsx
│   │   │   ├── HospitalLayout.jsx
│   │   │   ├── MultimodalUpload.jsx
│   │   │   └── VoiceInput.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Authentication context
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── PatientIntake.jsx
│   │   │   ├── PatientPortal.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   ├── HospitalDashboard.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── ClinicalChat.jsx
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.js             # API service layer
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── docs/
│   └── NLP_EHR_Project_Report.md  # Detailed project documentation
│
└── README.md
```

---

## Installation

### Prerequisites

- **Python** 3.9 or higher
- **Node.js** 18.x or higher
- **Tesseract OCR** installed on system
- **Supabase** account with project configured
- **Google Cloud** account with Gemini API access

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the backend directory:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   ICD_PATH=data/icd10.csv
   ```

5. **Start the server**
   ```bash
   uvicorn main_v3:app --reload --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API endpoint**
   
   Update the API base URL in `src/services/api.js` if needed:
   ```javascript
   const API_BASE_URL = 'http://localhost:8000';
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   
   Open `http://localhost:5173` in your browser.

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_API_KEY` | Google Gemini API key | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase anonymous key | Yes |
| `ICD_PATH` | Path to ICD-10 CSV file | No (default: `data/icd10.csv`) |

### Supabase Schema

Run the SQL schema from `backend/database/schema.sql` to set up required tables:
- `doctors` - Doctor profiles and specialties
- `appointments` - Patient appointments
- `encounters` - Clinical encounters with SOAP notes
- `clinical_notes` - Processed clinical notes with embeddings

---

## Usage

### Patient Flow

1. **Sign Up/Login** → Create account or login
2. **Start Intake** → Answer symptom questions via AI chat
3. **View Doctors** → See matched specialists
4. **Book Appointment** → Select time slot
5. **View Summary** → Access visit summary post-consultation

### Doctor Flow

1. **Login** → Access doctor dashboard
2. **View Queue** → See triage-prioritized patients
3. **Review Encounter** → View AI-generated SOAP notes
4. **Edit & Validate** → Modify and validate documentation
5. **Generate Summary** → Create patient-friendly summary

### Hospital Admin Flow

1. **Login** → Access hospital dashboard
2. **View Analytics** → ICD distributions, trends
3. **Manage Doctors** → Add/update doctor profiles
4. **Monitor Queue** → Overview of all patients

---

## API Documentation

Once the backend is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/intake/start` | POST | Start patient intake session |
| `/intake/message` | POST | Send message in intake conversation |
| `/doctors/match` | POST | Match doctors to symptoms |
| `/soap/validate` | POST | Validate SOAP note |
| `/summary/generate` | POST | Generate patient summary |
| `/process_note/` | POST | Process clinical note file |
| `/chat` | POST | Clinical Q&A query |
| `/analytics/icd-distribution` | GET | Get ICD code statistics |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---



**Built with care for better healthcare documentation**

</div>
