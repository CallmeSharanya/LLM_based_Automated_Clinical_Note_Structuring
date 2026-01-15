# 🏥 Clinical Note Structurer - Quick Start Guide

**Project Status:** ✅ Fixed & Ready for Submission
**Tech Stack:** FastAPI (Backend), Streamlit (Frontend), Gemini (AI), Supabase (DB)

---

## 🚀 1. Setup Environment (Do this first)

Open a terminal in the project root or `backend` folder and run checks.
We will use the **venv_b** environment for everything to ensure consistency.

```powershell
cd "c:\Users\Lenovo\RVCE Projects\NLP_EHR\backend"

# Install all dependencies (Backend + Frontend)
.\venv_b\Scripts\pip install -r requirements.txt
```

> **Note:** This installs `fastapi`, `streamlit`, `google-generativeai`, `pandas`, `requests`, etc.

---

## 🖥️ 2. Run the Backend API

Open a **NEW Terminal** (keep it open).

```powershell
cd "c:\Users\Lenovo\RVCE Projects\NLP_EHR\backend"
.\venv_b\Scripts\python -m uvicorn main:app --reload
```

**Verify:** Wait for `Application startup complete`.
*Ignore any "Supabase not configured" warnings if you haven't set up the DB. Structuring will still work!*

---

## 🌐 3. Run the Frontend Dashboard

Open a **SECOND New Terminal**.

```powershell
cd "c:\Users\Lenovo\RVCE Projects\NLP_EHR\frontend"
..\backend\venv_b\Scripts\streamlit run app.py
```

**Access:** The app will open in your browser at `http://localhost:8501`.

---

## 🧪 4. How to Test (Submission Script)

### **A. Structuring (The Core Feature)**
1. Go to **"Process Notes"** tab.
2. Drag & Drop a sample file from `backend/data/sample_notes/` (I created 5 samples for you!).
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

## ⚠️ Troubleshooting

**1. "Parse Error: No valid JSON found" / Empty Output**
- **Cause:** The AI model key wasn't loaded or model failed.
- **Fix:** I fixed this by adding `load_dotenv()` to the top of `custom_orchestrator.py`. Ensure your `.env` file matches the one I previously saw and has `GOOGLE_API_KEY`.

**2. "Database not configured"**
- **Cause:** `SUPABASE_URL` or `KEY` is missing in `.env`.
- **Fix:** This is **safe to ignore**. The structuring works 100% fine without the DB. The app will just warn you that it couldn't save the record permanently.

**3. "Module not found: pandas / requests / streamlit"**
- **Fix:** Run the `pip install` command in Step 1 again.

---

**Good luck with your submission! 🚀**
