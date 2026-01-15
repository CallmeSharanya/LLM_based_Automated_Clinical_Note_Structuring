import streamlit as st
import requests
import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

st.set_page_config(
    page_title="Clinical Note Structurer - EHR System",
    page_icon="🏥",
    layout="wide"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .stTabs [data-baseweb="tab-list"] {
        gap: 24px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 10px 20px;
        background-color: #f0f2f6;
        border-radius: 4px;
    }
    .stTabs [aria-selected="true"] {
        background-color: #1f77b4;
        color: white;
    }
    .confidence-high { color: #28a745; font-weight: bold; }
    .confidence-medium { color: #ffc107; font-weight: bold; }
    .confidence-low { color: #dc3545; font-weight: bold; }
    .soap-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 10px;
        color: white;
        margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)

# --- Sidebar ---
st.sidebar.title("⚙️ Settings")
backend_url = st.sidebar.text_input("Backend URL", BACKEND_URL)
st.sidebar.success("✅ Using Custom Agent Orchestrator (No OpenAI required!)")
st.sidebar.info("All processing uses Gemini LLM - 100% Free")

# --- Main Title ---
st.title("🏥 Clinical Note Structurer")
st.markdown("**Automated SOAP Structuring with Multi-Agent AI System**")

# --- Main Tabs ---
tabs = st.tabs(["🩺 Process Notes", "💬 Clinical Chat", "📊 Analytics", "ℹ️ About"])

# ==========================================================
# TAB 1: Upload & Structure Clinical Notes
# ==========================================================
with tabs[0]:
    st.header("🩺 Upload & Structure a Clinical Note")
    st.markdown("Upload handwritten or text-based clinical notes to structure them into **SOAP format** automatically.")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        patient_id = st.text_input("Patient ID (optional)", "", help="Enter patient identifier")
        uploaded_file = st.file_uploader(
            "Upload clinical note", 
            type=["pdf", "png", "jpg", "jpeg", "txt"],
            help="Supported: PDF, Images, Text files"
        )
    
    with col2:
        st.markdown("### 📋 What is SOAP?")
        st.markdown("""
        - **S**ubjective: Patient reports
        - **O**bjective: Clinical observations
        - **A**ssessment: Diagnosis
        - **P**lan: Treatment plan
        """)

    if uploaded_file and st.button("🚀 Process Note", type="primary"):
        with st.spinner("Processing note with multi-step AI extraction... ⏳"):
            files = {"file": uploaded_file}
            data = {"patient_id": patient_id}
            try:
                response = requests.post(f"{backend_url}/process_note/", files=files, data=data)
                if response.status_code == 200:
                    res = response.json()
                    st.success("✅ Note processed successfully!")
                    
                    # Display confidence scores
                    confidence = res.get("confidence", {})
                    overall_conf = confidence.get("overall", 0)
                    
                    if overall_conf >= 0.8:
                        st.markdown(f"### 🎯 Confidence Score: <span class='confidence-high'>{overall_conf:.0%}</span>", unsafe_allow_html=True)
                    elif overall_conf >= 0.5:
                        st.markdown(f"### 🎯 Confidence Score: <span class='confidence-medium'>{overall_conf:.0%}</span>", unsafe_allow_html=True)
                    else:
                        st.markdown(f"### 🎯 Confidence Score: <span class='confidence-low'>{overall_conf:.0%}</span>", unsafe_allow_html=True)
                    
                    # Display SOAP sections in columns
                    st.subheader("📄 Structured SOAP Output")
                    soap = res.get("soap", {})
                    
                    col1, col2 = st.columns(2)
                    with col1:
                        st.markdown("#### 📝 Subjective")
                        st.info(soap.get("Subjective", "Not documented"))
                        
                        st.markdown("#### 🔬 Objective")
                        st.info(soap.get("Objective", "Not documented"))
                    
                    with col2:
                        st.markdown("#### 🩺 Assessment")
                        st.warning(soap.get("Assessment", "Not documented"))
                        
                        st.markdown("#### 📋 Plan")
                        st.success(soap.get("Plan", "Not documented"))
                    
                    # Quality check results
                    quality = res.get("quality", {})
                    if quality:
                        st.subheader("✅ Quality Check")
                        if quality.get("is_valid"):
                            st.success(f"Note is complete! Completeness: {quality.get('completeness_score', 0):.0%}")
                        else:
                            st.warning("Note has some issues:")
                            for issue in quality.get("issues", []):
                                st.markdown(f"- ⚠️ {issue}")
                    
                    # Flags/warnings
                    flags = res.get("flags", [])
                    if flags:
                        st.subheader("⚠️ Flags & Warnings")
                        for flag in flags:
                            st.warning(flag)
                    
                    # ICD Codes
                    st.subheader("🧾 Matched ICD-10 Codes")
                    icd = res.get("icd", [])
                    if icd:
                        for code in icd:
                            st.markdown(f"- **{code.get('code', 'N/A')}**: {code.get('description', 'N/A')}")
                    else:
                        st.info("No ICD codes matched")
                    
                    # Extracted entities (collapsible)
                    entities = res.get("entities", {})
                    if entities:
                        with st.expander("🔍 View Extracted Entities"):
                            st.json(entities)
                    
                    # Saved record (collapsible)
                    with st.expander("💾 View Saved Record"):
                        st.json(res.get("saved_record", {}))
                else:
                    st.error(f"❌ Error: {response.text}")
            except Exception as e:
                st.error(f"Request failed: {e}")

# ==========================================================
# TAB 2: Chatbot
# ==========================================================
with tabs[1]:
    st.header("💬 Chat with Clinical Data")
    st.markdown("Ask questions about stored clinical notes using AI-powered semantic search.")

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    for chat in st.session_state.chat_history:
        with st.chat_message(chat["role"]):
            st.markdown(chat["content"])

    user_query = st.chat_input("Ask a question about stored clinical notes...")

    if user_query:
        st.session_state.chat_history.append({"role": "user", "content": user_query})
        with st.chat_message("user"):
            st.markdown(user_query)

        with st.chat_message("assistant"):
            with st.spinner("Searching clinical records... 🔍"):
                try:
                    resp = requests.post(f"{backend_url}/chat", data={"query": user_query})
                    if resp.status_code == 200:
                        data = resp.json()
                        answer = data.get("answer", "No response.")
                        st.markdown(answer)
                        st.session_state.chat_history.append({"role": "assistant", "content": answer})
                        
                        # Show sources
                        sources = data.get("sources_used", 0)
                        if sources > 0:
                            st.caption(f"📚 Based on {sources} similar clinical notes")
                    else:
                        st.error("Error: " + resp.text)
                except Exception as e:
                    st.error(f"Request failed: {e}")

# ==========================================================
# TAB 3: Analytics Dashboard
# ==========================================================
with tabs[2]:
    st.header("📊 Clinical Analytics Dashboard")
    st.markdown("View trends and statistics from stored structured notes.")

    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📈 Generate Analytics Report", type="primary"):
            with st.spinner("Analyzing stored records... ⏳"):
                try:
                    resp = requests.get(f"{backend_url}/analytics")
                    if resp.status_code == 200:
                        data = resp.json()
                        st.success(f"✅ Analyzed {data.get('total_notes', 0)} clinical notes!")
                        
                        st.subheader("🏥 Top ICD Codes")
                        icd_stats = data.get("icd_stats", {}).get("top_10_codes", {})
                        if icd_stats:
                            import pandas as pd
                            df = pd.DataFrame(list(icd_stats.items()), columns=["ICD Code", "Count"])
                            st.bar_chart(df.set_index("ICD Code"))
                            st.dataframe(df)
                        else:
                            st.info("No ICD codes found in records")
                        
                        st.subheader("📝 Clinical Summary")
                        st.markdown(data.get("summary", "No summary available"))
                    else:
                        st.error("Error fetching analytics: " + resp.text)
                except Exception as e:
                    st.error(f"Request failed: {e}")
    
    with col2:
        if st.button("🔄 Run Multi-Agent Pipeline"):
            with st.spinner("Running agent orchestration... ⏳"):
                try:
                    resp = requests.get(f"{backend_url}/run_agents")
                    if resp.status_code == 200:
                        data = resp.json()
                        st.success("✅ Multi-agent pipeline complete!")
                        st.json(data.get("result", {}))
                    else:
                        st.error("Error: " + resp.text)
                except Exception as e:
                    st.error(f"Request failed: {e}")

# ==========================================================
# TAB 4: About
# ==========================================================
with tabs[3]:
    st.header("ℹ️ About This System")
    
    st.markdown("""
    ## 🏥 Clinical Note Structurer for EHR Systems
    
    This system uses **AI-powered multi-agent architecture** to automatically structure 
    unstructured clinical notes into the standardized **SOAP format**.
    
    ### ✨ Key Features
    
    | Feature | Description |
    |---------|-------------|
    | 📝 **Multi-Step SOAP Extraction** | Uses entity extraction → categorization → validation pipeline |
    | 🎯 **Confidence Scores** | Each section has a confidence score for reliability |
    | ✅ **Quality Validation** | Automatic completeness checks |
    | 🧾 **ICD-10 Mapping** | Auto-matches diagnoses to ICD-10 codes |
    | 💬 **Clinical Chat** | Query stored notes using natural language |
    | 📊 **Analytics** | Track disease trends and code distributions |
    
    ### 🤖 Agent Architecture
    
    ```
    ┌─────────────────────────────────────────────┐
    │         Custom Agent Orchestrator           │
    │  (100% Gemini-powered, No OpenAI required)  │
    ├─────────────────────────────────────────────┤
    │  ┌─────────────┐  ┌─────────────────────┐  │
    │  │ Structuring │  │   Quality Agent     │  │
    │  │   Agent     │→ │ (Validation)        │  │
    │  └─────────────┘  └─────────────────────┘  │
    │  ┌─────────────┐  ┌─────────────────────┐  │
    │  │   Chat      │  │   Analytics         │  │
    │  │   Agent     │  │   Agent             │  │
    │  └─────────────┘  └─────────────────────┘  │
    └─────────────────────────────────────────────┘
    ```
    
    ### 🛠️ Technology Stack
    
    - **LLM**: Google Gemini 2.0 Flash (Free tier)
    - **Backend**: FastAPI + Python
    - **Frontend**: Streamlit
    - **Database**: Supabase (PostgreSQL + pgvector)
    - **Embeddings**: Gemini text-embedding-004
    
    ### 📚 SOAP Format Reference
    
    - **Subjective**: Patient's reported symptoms, complaints, and medical history
    - **Objective**: Measurable clinical findings (vitals, labs, exam)
    - **Assessment**: Clinical diagnosis and impressions
    - **Plan**: Treatment plan, medications, follow-up
    """)
    
    st.markdown("---")
    st.markdown("*Built for EHR automation research*")
