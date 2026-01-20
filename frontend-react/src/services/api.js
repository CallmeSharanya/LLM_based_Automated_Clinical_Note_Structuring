import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
    const user = localStorage.getItem('ehr_user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            if (userData.token) {
                config.headers.Authorization = `Bearer ${userData.token}`;
            }
        } catch (e) { }
    }
    return config;
});

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export const authAPI = {
    // Login
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    // Signup
    signup: async (userData) => {
        const response = await api.post('/auth/signup', userData);
        return response.data;
    },

    // Quick signup for emergency
    quickSignup: async (userData) => {
        const response = await api.post('/auth/quick-signup', userData);
        return response.data;
    },

    // Get current user
    getCurrentUser: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    // Update profile
    updateProfile: async (updates) => {
        const response = await api.put('/auth/profile', updates);
        return response.data;
    },
};

// ============================================================================
// PATIENT INTAKE API
// ============================================================================

export const intakeAPI = {
    // Start a new intake session
    startSession: async (patientId = null) => {
        const formData = new FormData();
        if (patientId) formData.append('patient_id', patientId);
        const response = await api.post('/intake/start', formData);
        return response.data;
    },

    // Send a message in intake conversation
    sendMessage: async (sessionId, message, patientId = null) => {
        const response = await api.post('/intake/message', {
            session_id: sessionId,
            message: message,
            patient_id: patientId,
        });
        return response.data;
    },

    // Get session details
    getSession: async (sessionId) => {
        const response = await api.get(`/intake/session/${sessionId}`);
        return response.data;
    },

    // List all sessions
    listSessions: async () => {
        const response = await api.get('/intake/sessions');
        return response.data;
    },
};

// ============================================================================
// DOCTOR MATCHING API
// ============================================================================

export const doctorAPI = {
    // Match doctors based on symptoms
    matchDoctors: async (symptoms, triagePriority = 'green', preferredLanguage = null) => {
        const response = await api.post('/doctors/match', {
            symptoms,
            triage_priority: triagePriority,
            preferred_language: preferredLanguage,
        });
        return response.data;
    },

    // Assign doctor to session
    assignDoctor: async (sessionId, doctorId, slot) => {
        const response = await api.post('/doctors/assign', {
            session_id: sessionId,
            doctor_id: doctorId,
            slot: slot,
        });
        return response.data;
    },

    // Get available specialties
    getSpecialties: async () => {
        const response = await api.get('/doctors/specialties');
        return response.data;
    },
};

// ============================================================================
// SOAP PROCESSING API
// ============================================================================

export const soapAPI = {
    // Process a clinical note file
    processNote: async (file, patientId = null, specialty = null, validate = true) => {
        const formData = new FormData();
        formData.append('file', file);
        if (patientId) formData.append('patient_id', patientId);
        if (specialty) formData.append('specialty', specialty);
        formData.append('validate', validate);

        const response = await api.post('/process_note/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Validate a SOAP note
    validateSoap: async (soapNote, symptoms = null, specialty = null) => {
        const response = await api.post('/validate/soap', {
            soap_note: soapNote,
            extracted_symptoms: symptoms,
            specialty: specialty,
        });
        return response.data;
    },
};

// ============================================================================
// PATIENT SUMMARY API
// ============================================================================

export const summaryAPI = {
    // Generate patient summary
    generate: async (soapNote, diagnoses = null, medications = null, patientName = 'Patient', doctorName = 'Your doctor') => {
        const response = await api.post('/summary/generate', {
            soap_note: soapNote,
            diagnoses,
            medications,
            patient_name: patientName,
            doctor_name: doctorName,
        });
        return response.data;
    },

    // Generate SMS summary
    generateSMS: async (soapNote, patientName = 'Patient') => {
        const response = await api.post('/summary/sms', {
            soap_note: soapNote,
            patient_name: patientName,
        });
        return response.data;
    },
};

// ============================================================================
// ENCOUNTER API
// ============================================================================

export const encounterAPI = {
    // Update encounter with doctor edits
    update: async (encounterId, editedSoap = null, doctorNotes = null, vitals = null) => {
        const response = await api.post('/encounter/update', {
            encounter_id: encounterId,
            edited_soap: editedSoap,
            doctor_notes: doctorNotes,
            vitals: vitals,
        });
        return response.data;
    },

    // Finalize encounter
    finalize: async (encounterId, finalSoap, generateSummary = true) => {
        const formData = new FormData();
        formData.append('encounter_id', encounterId);
        formData.append('final_soap', JSON.stringify(finalSoap));
        formData.append('generate_patient_summary', generateSummary);

        const response = await api.post('/encounter/finalize', formData);
        return response.data;
    },
};

// ============================================================================
// CHAT API
// ============================================================================

export const chatAPI = {
    // Send a clinical query
    sendQuery: async (query) => {
        const formData = new FormData();
        formData.append('query', query);
        const response = await api.post('/chat', formData);
        return response.data;
    },
};

// ============================================================================
// ANALYTICS API
// ============================================================================

export const analyticsAPI = {
    // Run analytics
    runAnalytics: async () => {
        const response = await api.get('/analytics/run');
        return response.data;
    },

    // Get ICD stats
    getICDStats: async () => {
        const response = await api.get('/analytics/icd');
        return response.data;
    },
};

// ============================================================================
// LEARNING API
// ============================================================================

export const learningAPI = {
    // Get metrics
    getMetrics: async (specialty = null) => {
        const params = specialty ? { specialty } : {};
        const response = await api.get('/learning/metrics', { params });
        return response.data;
    },

    // Get patterns
    getPatterns: async (specialty = null) => {
        const params = specialty ? { specialty } : {};
        const response = await api.get('/learning/patterns', { params });
        return response.data;
    },

    // Get insights
    getInsights: async (specialty = null) => {
        const params = specialty ? { specialty } : {};
        const response = await api.get('/learning/insights', { params });
        return response.data;
    },

    // Get improvements
    getImprovements: async (specialty = null) => {
        const params = specialty ? { specialty } : {};
        const response = await api.get('/learning/improvements', { params });
        return response.data;
    },
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

export const healthCheck = async () => {
    const response = await api.get('/health');
    return response.data;
};

export default api;
