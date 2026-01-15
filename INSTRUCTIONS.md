# 🏥 Clinical Note Structurer - Quick Start Guide

**Project Status:** ✅ Fixed & Ready for Submission
**Tech Stack:** FastAPI (Backend), Streamlit (Frontend), Gemini (AI), Supabase (DB)

---

## 🚀 1. Setup Environment (Do this first)

Open a terminal in the project root or `backend` folder and run checks.
We will use the **venv** environment for everything to ensure consistency.


# Install all dependencies (Backend + Frontend)
.\venv\Scripts\pip install -r requirements.txt
```

> **Note:** This installs `fastapi`, `streamlit`, `google-generativeai`, `pandas`, `requests`, etc.

---

## 🖥️ 2. Run the Backend API

Open a **NEW Terminal** (keep it open).

```powershell

.\venv\Scripts\python -m uvicorn main:app --reload
```

**Verify:** Wait for `Application startup complete`.
*Ignore any "Supabase not configured" warnings if you haven't set up the DB. Structuring will still work!*

---

## 🌐 3. Run the Frontend Dashboard

Open a **SECOND New Terminal**.

```powershell

..\backend\venv\Scripts\streamlit run app.py
```

**Access:** The app will open in your browser at `http://localhost:8501`.

---

## 🧪 4. How to Test (Submission Script)

### **A. Structuring (The Core Feature)**
1. Go to **"Process Notes"** tab.
2. Drag & Drop a sample file from `backend/data/sample_notes/`
3. Click **Process Note**.
4. **Observe:**
   - **Confidence Score:** Should be >80% (Green).
   - **SOAP Sections:** Fully filled out.
   - **Extracted Entities:** Click to expand and see structured data.

### **B. Clinical Chat**
1. Go to **"Clinical Chat"** tab.
2. Ask: *"What is the diagnosis for the chest pain patient?"*
3. **Observe:** It finds the note and gives a clinical answer.

### **C. Analytics**
1. Go to **"Analytics"** tab.
2. Click **Generate Report**.
3. **Observe:** Charts showing ICD codes.

---


