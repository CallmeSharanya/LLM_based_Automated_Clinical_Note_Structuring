import streamlit as st
import requests
import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

st.set_page_config(page_title="Clinical Structurer & Chatbot", layout="wide")

# --- Sidebar ---
st.sidebar.title("⚙️ Settings")
backend_url = st.sidebar.text_input("Backend URL", BACKEND_URL)
st.sidebar.info("Ensure FastAPI backend is running.")

# --- Main Tabs ---
tabs = st.tabs(["🩺 Process Clinical Notes", "💬 Chat with Data", "📊 Analytics Dashboard"])

# ==========================================================
# TAB 1: Upload & Structure Clinical Notes
# ==========================================================
with tabs[0]:
    st.header("🩺 Upload & Structure a Clinical Note")
    st.markdown("Upload handwritten or text-based clinical notes to structure them automatically.")

    patient_id = st.text_input("Patient ID (optional)", "")
    uploaded_file = st.file_uploader("Upload clinical note", type=["pdf", "png", "jpg", "jpeg", "txt"])

    if uploaded_file and st.button("Process Note"):
        with st.spinner("Processing note... ⏳"):
            files = {"file": uploaded_file}
            data = {"patient_id": patient_id}
            try:
                response = requests.post(f"{backend_url}/process_note", files=files, data=data)
                if response.status_code == 200:
                    res = response.json()
                    st.success("✅ Note processed successfully!")
                    st.subheader("📄 Structured SOAP Output")
                    st.json(res["soap"])
                    st.subheader("🧾 Matched ICD Codes")
                    st.json(res["icd"])
                    st.subheader("💾 Saved Record")
                    st.json(res["saved_record"])
                else:
                    st.error(f"❌ Error: {response.text}")
            except Exception as e:
                st.error(f"Request failed: {e}")

# ==========================================================
# TAB 2: Chatbot
# ==========================================================
with tabs[1]:
    st.header("💬 Chat with Structured Data")

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
            with st.spinner("Thinking... 🤖"):
                try:
                    resp = requests.post(f"{backend_url}/chat", data={"query": user_query})
                    if resp.status_code == 200:
                        answer = resp.json().get("answer", "No response.")
                        st.markdown(answer)
                        st.session_state.chat_history.append({"role": "assistant", "content": answer})
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

    if st.button("Generate Analytics Report"):
        with st.spinner("Analyzing stored records... ⏳"):
            try:
                resp = requests.get(f"{backend_url}/run_agents")
                if resp.status_code == 200:
                    data = resp.json()["result"]
                    st.success("✅ Analytics generated successfully!")
                    st.subheader("Top ICD Codes in Stored Records")
                    st.json(data["icd_stats"])
                else:
                    st.error("Error fetching analytics: " + resp.text)
            except Exception as e:
                st.error(f"Request failed: {e}")
