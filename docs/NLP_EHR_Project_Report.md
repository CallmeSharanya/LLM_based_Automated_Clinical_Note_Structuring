# NLP_EHR: Intelligent Clinical Note Structuring and Analytics

Date: January 21, 2026  
Version: 1.0

---

## Abstract
This report presents an end-to-end system for transforming unstructured clinical notes into structured, searchable, and analyzable representations using OCR, de-identification, large language models (LLMs), ICD-10 mapping, vector embeddings, retrieval-augmented generation (RAG), and a custom multi-agent orchestrator. The solution enables healthcare providers to process uploaded patient notes, extract SOAP-format summaries, perform ICD coding support, run analytics, and power clinical Q&A—while emphasizing patient privacy and operational practicality.

---

## Table of Contents
1. Introduction  
2. Problem Statement  
3. Objectives  
4. Significance and Need  
5. Methodology  
   5.1 Data Ingestion and OCR  
   5.2 De-identification  
   5.3 LLM-based Structuring (SOAP)  
   5.4 ICD-10 Mapping  
   5.5 Embeddings and RAG  
   5.6 Quality Assurance Agent  
   5.7 Analytics Pipeline  
6. System Architecture  
7. Technology Stack  
8. Implementation Details  
9. Data Privacy and Security  
10. Evaluation and Results  
11. Discussion  
12. Limitations  
13. Future Work  
14. Conclusion  
15. References  
Appendix A: API Endpoints  
Appendix B: Agent Roles and Prompts (High-Level)  
Appendix C: Deployment and Setup  
Appendix D: Example User Flows  
Appendix E: Risk Register and Mitigations  
Glossary

---

## 1. Introduction
Electronic Health Records (EHRs) contain a wealth of unstructured text in clinical notes. These notes capture patient-reported symptoms, clinician observations, diagnoses, and treatment plans. However, free text is difficult to query, analyze, and reuse for coding and decision support. Manual abstraction and traditional rule-based NLP pipelines are time-consuming and brittle.

NLP_EHR addresses this gap by providing a modular, privacy-aware system that:
- Ingests clinical notes (TXT, PDF, images) with OCR where needed.
- Removes personally identifiable information (PII/PHI) via de-identification.
- Structures content into SOAP format (Subjective, Objective, Assessment, Plan) using a Gemini LLM-based agentic pipeline.
- Suggests ICD-10 codes from Assessment text using fuzzy matching.
- Embeds notes for semantic search and powers RAG-based clinical Q&A.
- Runs analytics (e.g., ICD distributions, trends) across stored notes.

The backend is built with FastAPI and a custom Gemini-based multi-agent orchestrator; the frontend is a modern React SPA; Supabase provides storage and vector-enabled similarity search. The architecture emphasizes practicality, extensibility, and traceability.

---

## 2. Problem Statement
Healthcare organizations struggle to extract consistent value from unstructured clinical text:
- Manual coding and abstraction are slow, expensive, and inconsistent.
- Structured EHR fields often lack clinical nuance and context.
- Rule-based NLP pipelines require heavy maintenance and fail to generalize.
- Legacy scanned documents (PDFs/images) remain under-utilized.

Problem: How can clinical notes—across heterogeneous formats—be reliably transformed into structured, privacy-conscious representations that enable coding assistance, semantic retrieval, analytics, and clinician-facing Q&A, while minimizing manual effort and maximizing auditability?

---

## 3. Objectives
- Automate structuring of clinical notes into SOAP format with high completeness.
- Support ICD-10 code suggestion and frequency analytics to reduce coding burden.
- Ensure privacy-preserving ingestion via de-identification of emails, phones, names, dates, and MRN-like tokens.
- Provide semantic search and RAG-based clinical Q&A grounded in de-identified notes.
- Offer a usable web UX for clinicians to upload, process, search, and review notes.
- Design for extensibility: agents, models, storage, and prompts are swappable.

---

## 4. Significance and Need
NLP_EHR addresses industry-wide needs for accelerating clinical documentation workflows, aiding coding teams, and enabling population-level insights without additional clinician burden. The system:
- Unlocks value from legacy and mixed-format records via OCR.
- Improves coding consistency and throughput with ICD suggestions and analytics.
- Supports care quality and operations through search, trends, and Q&A.
- Encourages responsible AI adoption with privacy safeguards and modular design.

---

## 5. Methodology
### 5.1 Data Ingestion and OCR
- Accepts TXT, PDF, PNG/JPG/TIFF/BMP, audio.  
- For PDFs/images, converts pages to images (pdf2image) and extracts text (pytesseract).  
- Code reference: backend/ocr_utils.py.

### 5.2 De-identification
- Regex-based redaction of emails, phone numbers, date patterns, common name patterns, and MRN-like tokens.  
- Emphasis on reducing PHI exposure before any LLM calls.  
- Code reference: backend/utils.py.  
- Production guidance: replace with medical-grade PHI tooling.

### 5.3 LLM-based Structuring (SOAP)
- Custom multi-agent orchestrator using Gemini (Google Generative AI).  
- Two-step process:  
  1) Entity extraction (symptoms, vitals, labs, PE, diagnoses, meds, procedures, history).  
  2) SOAP assembly with strict rules (patient-reported in Subjective, clinician-measured in Objective, etc.).  
- Quality checks for completeness and flags.  
- Code reference: backend/agents/custom_orchestrator.py.

### 5.4 ICD-10 Mapping
- Loads ICD-10 codes from local CSV (data/icd10.csv).  
- Fuzzy matching via rapidfuzz on Assessment text to suggest likely ICD codes.  
- Used for analytics and as coding support.

### 5.5 Embeddings and RAG
- Generates embeddings using Gemini (text-embedding-004).  
- Stores vectors in Supabase (Postgres) and performs similarity search.  
- Chat Agent uses retrieved similar notes as grounding context for clinical Q&A.  
- Code reference: backend/llm_structurer.py, backend/db_utils.py, backend/agents/custom_orchestrator.py.

### 5.6 Quality Assurance Agent
- Scores completeness for each SOAP section and overall.  
- Flags missing or suspect content and provides recommendations.  
- Code reference: backend/agents/custom_orchestrator.py (QualityAgent).

### 5.7 Analytics Pipeline
- Computes ICD distributions, top codes, and trends.  
- Generates narrative summaries of common conditions and treatments.  
- Code reference: backend/agents/custom_orchestrator.py (AnalyticsAgent), backend/main.py endpoints.

---

## 6. System Architecture
- Frontend (React/Vite/Tailwind): clinician-facing upload, review, search, and Q&A.  
- Backend (FastAPI): orchestrates OCR, de-identification, structuring, ICD matching, embeddings, storage, and analytics.  
- LLM Orchestration: custom Gemini-based agents for Structuring, Chat, Analytics, Quality.  
- Storage: Supabase (Postgres + vectors) for clinical notes, embeddings, and metadata.  
- Interfaces: REST endpoints for note processing, chat, analytics, health.

### 6.1 Multi-Agent Architecture (Deep Dive)
- Orchestrator: Central coordinator implemented in [backend/agents/custom_orchestrator.py](backend/agents/custom_orchestrator.py). Manages agent lifecycles, data handoffs, and error handling with retries and model fallbacks.
- Agents and Responsibilities:
  - StructuringAgent: Two-step extraction (entities → SOAP) with strict placement rules and JSON-only output constraints.
  - QualityAgent: Heuristic completeness scoring per SOAP section, issues and recommendations, overall quality score.
  - ChatAgent: Retrieval-augmented answering using similar notes as grounding context, avoids speculation when context is insufficient.
  - AnalyticsAgent: ICD frequency distributions, top codes, and narrative analytics summaries across stored notes.
- Data Flow:
  1) Ingest → OCR (if PDF/image) → De-identify (regex)  
  2) StructuringAgent → SOAP JSON  
  3) QualityAgent → section scores, flags  
  4) ICD mapping from Assessment (rapidfuzz over local ICD dictionary)  
  5) Embedding (Gemini text-embedding-004) → store vectors  
  6) Persist record in Supabase  
  7) ChatAgent uses vector similarity to ground answers  
  8) AnalyticsAgent aggregates trends and summaries
- Prompting Strategy:
  - Entity-first pass improves recall and reduces hallucination in SOAP assembly.
  - Constrained, JSON-only prompts with clear SOAP definitions; JSON parsing includes guards for code-fenced outputs.
- Reliability & Governance:
  - Backoff on 429 quota errors; fallback to a compatible model on 404; capture raw model output on parse errors with flags.
  - Clear separation of patient-said vs clinician-measured content; meds prescribed in Plan vs current meds in Subjective.
- Extensibility:
  - Pluggable agents for coding, ontology validation, guideline checks; swappable LLM backends; configurable prompts and thresholds.

Key endpoints (from backend/main.py):
- POST /process_note: uploads, OCR (if needed), de-identifies, structures SOAP, maps ICD, embeds, stores.  
- POST /chat: RAG-powered clinical Q&A using similar notes.  
- GET /analytics: returns ICD stats and summary.  
- GET /run_agents: triggers analytics pipeline (custom orchestrator).  
- GET /health: simple status.

---

## 7. Technology Stack
- Backend: FastAPI, Python 3.10+, pydantic, uvicorn, python-dotenv.  
- LLM & Embeddings: Google Generative AI (Gemini: gemini-2.5-flash, text-embedding-004).  
- Agents: Custom orchestrator (Structuring, Chat, Analytics, Quality).  
- OCR: pdf2image, Pillow, pytesseract (requires Poppler system install).  
- Storage: Supabase (Postgres; RPC for similarity; optional vector support).  
- Frontend: React, Vite, Tailwind CSS.  
- Supporting: numpy, pandas, rapidfuzz, requests, python-multipart, sentence-transformers (optional).

### 7.1 Backend & Service Libraries
- API & Core: FastAPI, pydantic, uvicorn, python-dotenv, python-multipart, requests
- Data & Utils: numpy, pandas
- OCR Pipeline: pdf2image (Poppler), Pillow, pytesseract (Tesseract OCR)
- NLP & IR: google-generativeai (Gemini), sentence-transformers (optional), rapidfuzz (ICD matching)
- Storage & Retrieval: supabase (Postgres client; vectors + RPC for similarity)

### 7.2 NLP/ML Techniques Used
- OCR & Text Normalization: page rasterization (pdf2image), Tesseract OCR, basic cleanup.
- De-identification: regex-based redaction for emails, phones, dates, MRN-like tokens, simple name patterns.
- Information Extraction: LLM-driven clinical NER (symptoms, vitals, labs, PE, diagnoses, meds, procedures, history).
- Structured Mapping: SOAP assembly with strict placement rules to reduce leakage across sections.
- Coding Assistance: Fuzzy string matching (rapidfuzz) from Assessment to ICD-10 dictionary.
- Semantic Retrieval: Text embeddings (Gemini text-embedding-004) + vector similarity in Postgres via Supabase.
- RAG Answering: Grounded responses over top-k similar notes with transparency when context is insufficient.
- Quality Validation: Heuristic completeness scoring and flags for missing/incomplete sections.

### 7.3 Frontend & Dev Tooling
- Frontend: React, Vite, Tailwind CSS
- DX & Ops: .env configuration, CORS configuration, optional Streamlit prototypes

---

## 8. Implementation Details
- FastAPI service in backend/main.py configures CORS, loads ICD codes, and exposes endpoints.  
- Orchestrator (backend/agents/custom_orchestrator.py) encapsulates agents and handles:
  - Entity-first extraction → SOAP assembly.  
  - Rate limits and fallback handling for Gemini models.  
  - RAG query answering over similar notes.  
  - ICD analytics and narrative summaries.  
  - Quality scoring and recommendations.
- Database utilities (backend/db_utils.py) integrate Supabase for inserts, similarity queries, and listing notes.  
- OCR utilities (backend/ocr_utils.py) convert PDFs to images and extract text.  
- De-identification (backend/utils.py) applies regex-based redactions.  
- llm_structurer.py provides a simplified one-shot SOAP extraction utility as an alternative.

---

## 9. Data Privacy and Security
- De-identification applied prior to LLM processing to reduce PHI exposure.  
- Environment variables (GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_KEY) are managed via dotenv; keys not checked into source.  
- Supabase access is secured by keys and can be combined with RLS policies.  
- Transport security via HTTPS recommended end-to-end; encrypt data at rest.  
- Production recommendations: RBAC, audit logging, PHI-grade redaction, incident response procedures, periodic access reviews.

---

## 10. Evaluation and Results
### 10.1 SOAP Completeness and Fidelity
- The two-step entity-first approach improves coverage versus single-pass prompting.  
- Quality Agent scores sections and overall; short or noisy notes may receive lower completeness scores, guiding remediation.

### 10.2 ICD Suggestion Utility
- Fuzzy matching over Assessment text surfaces candidate ICD codes, aiding coding teams and enabling frequency analytics.  
- Accuracy depends on Assessment clarity and ICD dictionary coverage.

### 10.3 RAG Answer Quality
- Embedding-based retrieval of similar notes provides grounded answers for clinical Q&A.  
- Answers cite context patterns; if insufficient context exists, the system responds transparently.

### 10.4 Performance and Robustness
- Suitable for near-real-time clinician workflows under moderate loads.  
- Handles free-tier LLM rate limits with backoff and optional fallbacks.

---

## 11. Discussion
NLP_EHR demonstrates a practical path from unstructured clinical text to structured, analyzable data products. The modular, agentic design makes it adaptable to evolving models and requirements. The system turns legacy records into assets for search, analytics, and clinician support, with privacy safeguards and operational guardrails.

---

## 12. Limitations
- OCR quality constraints for low-resolution scans.  
- Potential LLM hallucination if prompts or constraints are insufficient.  
- Regex-based redaction may over/under-redact; use PHI-grade tooling in production.  
- Embedding and RAG relevance depend on note quality and volume.  
- External service dependencies (LLM APIs, Supabase) require careful key and quota management.

---

## 13. Future Work
- Integrate medical-grade PHI redaction and human-in-the-loop validation.  
- Enrich with clinical ontologies (SNOMED, LOINC) and rule-based validators.  
- Cohort analytics, outcomes tracking, and timelines.  
- Continuous evaluation dashboards for SOAP and ICD accuracy.  
- FHIR/EHR API ingestion for streaming note intake.  
- Expand prompts, templates, and error-recovery strategies.

---

## 14. Conclusion
NLP_EHR shows how OCR, de-identification, agentic LLM orchestration, ICD mapping, embeddings, and RAG can transform clinical text into actionable data. The approach accelerates documentation workflows, supports coding, and enables analytics while maintaining privacy and extensibility.

---

## 15. References
- FastAPI Documentation  
- Google Generative AI (Gemini) Documentation  
- Supabase Documentation  
- pdf2image and Poppler Guides  
- pytesseract (Tesseract OCR) Documentation  
- ICD-10-CM Official Guidelines

---

## Appendix A: API Endpoints
- POST /process_note: Upload file (TXT/PDF/Image), OCR if needed, de-identify, structure SOAP, map ICD, embed, store.  
- POST /chat (form field `query`): Generate RAG-grounded response using similar notes.  
- GET /analytics: Return ICD stats and summary.  
- GET /run_agents: Trigger analytics pipeline.  
- GET /health: Health check.

---

## Appendix B: Agent Roles and Prompts (High-Level)
- Structuring Agent: Two-step entity extraction → SOAP assembly with strict placement rules.  
- Chat Agent: Uses similar notes as context to ground answers; avoids speculation.  
- Analytics Agent: ICD distributions, top codes, narrative summaries.  
- Quality Agent: Completeness scoring per SOAP section; flags and recommendations.

---

## Appendix C: Deployment and Setup
- Backend (FastAPI): ensure Python 3.10+, install requirements; set GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_KEY.  
- OCR: Install system Poppler; Tesseract available via pytesseract.  
- Supabase: Create table `clinical_notes` with JSON and vector columns; configure RPC for similarity.  
- Frontend: React/Vite/Tailwind; configure API base URL and auth as required.  
- Observability: add request logging, error tracking, and basic metrics.

---

## Appendix D: Example User Flows
1) Note Processing: Upload → OCR → De-identify → SOAP structuring → ICD mapping → Store/Embed → Review.  
2) Clinical Q&A: Pose query → Embed → Retrieve similar notes → Grounded answer → Show sources.  
3) Analytics: Aggregate stored notes → ICD frequencies → Trends → Narrative summary.

---

## Appendix E: Risk Register and Mitigations
- PHI Exposure Risk → Early de-identification, access controls, encryption, audits.  
- LLM Hallucination → Constrained prompts, grounded context, quality checks, human review options.  
- OCR Errors → DPI tuning, denoising, guidance for scan quality.  
- Rate Limits/Outages → Backoff, retries, model fallback, graceful degradation.  
- Data Drift → Continuous evaluation, prompt updates, ontology-backed validators.

---

## Glossary
- SOAP: Subjective, Objective, Assessment, Plan note structure.  
- RAG: Retrieval-Augmented Generation.  
- ICD-10: International Classification of Diseases, Tenth Revision.  
- PHI/PII: Protected/Personally Identifiable Information.  
- OCR: Optical Character Recognition.
