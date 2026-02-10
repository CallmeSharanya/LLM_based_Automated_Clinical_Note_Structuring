import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add auth token to requests if available and set proper content-type
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

    // Only set Content-Type to JSON if not FormData
    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
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

    // Update a session with edited SOAP
    updateSession: async (sessionId, updates) => {
        const response = await api.post('/intake/update', {
            session_id: sessionId,
            preliminary_soap: updates.preliminary_soap,
            final_soap: updates.final_soap,
            doctor_notes: updates.doctor_notes,
        });
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

    // Finalize an encounter (save SOAP note)
    finalize: async (encounterId, soapNote, generateSummary = true, patientId = null) => {
        const formData = new FormData();
        formData.append('encounter_id', encounterId);
        formData.append('final_soap', JSON.stringify(soapNote));
        formData.append('generate_summary', generateSummary);
        if (patientId) formData.append('patient_id', patientId);

        const response = await api.post('/encounter/finalize', formData);
        return response.data;
    },

    // Get patient encounters
    getPatientEncounters: async (patientId) => {
        const response = await api.get(`/encounters/patient/${patientId}`);
        return response.data;
    },

    // Get specific encounter
    getEncounter: async (encounterId) => {
        const response = await api.get(`/encounters/${encounterId}`);
        return response.data;
    }
};

// ============================================================================
// APPOINTMENT API
// ============================================================================

export const appointmentAPI = {
    // Get all doctors from Supabase (optionally filtered by specialty)
    getDoctors: async (specialty = null) => {
        const params = specialty ? { specialty } : {};
        const response = await api.get('/doctors', { params });
        return response.data;
    },

    // Book an appointment
    book: async (patientId, doctorId, date, time, specialty, sessionId = null, type = 'Consultation') => {
        const response = await api.post('/appointments/book', {
            patient_id: patientId,
            doctor_id: doctorId,
            appointment_date: new Date().toISOString().split('T')[0],
            appointment_time: time,
            specialty: specialty,
            session_id: sessionId,
            type: type
        });
        return response.data;
    },

    // Get patient's appointments
    getPatientAppointments: async (patientId) => {
        const response = await api.get(`/appointments/patient/${patientId}`);
        return response.data;
    },

    // Get doctor's appointments (with optional date filter for today's schedule)
    getDoctorAppointments: async (doctorId, date = null) => {
        const params = date ? { date } : {};
        const response = await api.get(`/appointments/doctor/${doctorId}`, { params });
        return response.data;
    }
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

    // Extract SOAP from raw interview text using TinyLlama API
    extractFromInterview: async (conversation) => {
        const response = await api.post('/soap/extract-from-interview', {
            conversation
        });
        return response.data;
    },

    // Save a draft SOAP note
    saveDraft: async (patientId, draftSoap, source = 'intake', sessionId = null, appointmentId = null, symptoms = null, triage = null) => {
        const response = await api.post('/soap/draft/save', {
            patient_id: patientId,
            session_id: sessionId,
            appointment_id: appointmentId,
            draft_soap: draftSoap,
            source: source,
            symptoms: symptoms,
            triage: triage
        });
        return response.data;
    },

    // Get all drafts for a patient
    getPatientDrafts: async (patientId) => {
        const response = await api.get(`/soap/draft/patient/${patientId}`);
        return response.data;
    },

    // Get pending draft SOAPs for a doctor
    getDoctorPendingSOAPs: async (doctorId) => {
        const response = await api.get(`/soap/draft/doctor/${doctorId}`);
        return response.data;
    },

    // Get a specific draft by ID
    getDraft: async (draftId, patientId) => {
        const response = await api.get(`/soap/draft/${draftId}`, { params: { patient_id: patientId } });
        return response.data;
    },

    // Finalize a draft SOAP
    finalizeSoap: async (draftId, patientId, doctorId, finalSoap, diagnosisCodes = null, notes = null) => {
        const response = await api.post('/soap/finalize', {
            draft_id: draftId,
            patient_id: patientId,
            doctor_id: doctorId,
            final_soap: finalSoap,
            diagnosis_codes: diagnosisCodes,
            notes: notes
        });
        return response.data;
    }
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
// CHAT API
// ============================================================================

export const chatAPI = {
    // Send a clinical query (used by ClinicalChat component)
    send: async (query, sessionId = null) => {
        const formData = new FormData();
        formData.append('query', query);
        const response = await api.post('/chat', formData);
        return {
            response: response.data.answer || response.data.response || 'No response',
            sources: response.data.similar_notes || [],
            session_id: sessionId || `session-${Date.now()}`
        };
    },

    // Query method (alias for DoctorDashboard)
    query: async (query) => {
        const formData = new FormData();
        formData.append('query', query);
        const response = await api.post('/chat', formData);
        return {
            answer: response.data.answer || 'No response generated.',
            similar_notes: response.data.similar_notes || [],
            sources_used: response.data.sources_used || 0
        };
    },

    // Send a clinical query (alias)
    sendQuery: async (query) => {
        const formData = new FormData();
        formData.append('query', query);
        const response = await api.post('/chat', formData);
        return response.data;
    },

    // Clear chat history (no-op for now, sessions are stateless)
    clearHistory: async (sessionId) => {
        // The current chat implementation is stateless
        return { success: true };
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

    // Get Summary Stats (Maps to runAnalytics)
    getSummary: async () => {
        try {
            const response = await api.get('/analytics/run');
            // Map backend keys to frontend expectations
            // Note: backend returns { message: "...", result: { total_notes: N, ... } }
            const result = response.data.result || {};

            return {
                total_patients: 1, // Mock for now until patient count endpoint exists
                total_encounters: result.total_notes || 0,
                avg_validation_score: result.accuracy || 87,
                avg_processing_time: result.avg_processing_time || 2.3,
                specialty_distribution: [],
                triage_distribution: []
            };
        } catch (error) {
            console.error("Error fetching summary:", error);
            return null;
        }
    },

    // Get Encounter Trends (Mock for now)
    getEncounterTrends: async (range) => {
        // Return mock trends until backend endpoint exists
        return {
            daily_counts: [
                { date: 'Mon', encounters: 2 },
                { date: 'Tue', encounters: 5 },
                { date: 'Wed', encounters: 3 },
                { date: 'Thu', encounters: 7 },
                { date: 'Fri', encounters: 4 },
                { date: 'Sat', encounters: 1 },
                { date: 'Sun', encounters: 1 }
            ]
        };
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
// MULTIMODAL PROCESSING API
// ============================================================================

export const multimodalAPI = {
    // Process multiple files (images, PDFs, text)
    processMultimodal: async (formData) => {
        const response = await api.post('/multimodal/process', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Process conversation to generate SOAP
    processConversation: async (message, previousMessages = []) => {
        const response = await api.post('/multimodal/conversation', {
            message,
            previous_messages: previousMessages,
        });
        return response.data;
    },

    // Generate SOAP from conversation
    generateSOAP: async (messages) => {
        const response = await api.post('/multimodal/generate-soap', {
            messages,
        });
        return response.data;
    },

    // Process single image with Groq/Gemini Vision
    processImage: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/multimodal/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

// ============================================================================
// HOSPITAL API
// ============================================================================

export const hospitalAPI = {
    // Get all appointments for hospital
    getAllAppointments: async (date = null, status = null) => {
        const params = {};
        if (date) params.date = date;
        if (status) params.status = status;
        const response = await api.get('/hospital/appointments', { params });
        return response.data;
    },

    // Get disease statistics
    getDiseaseStats: async (dateRange = 'week') => {
        const response = await api.get('/hospital/disease-stats', {
            params: { date_range: dateRange }
        });
        return response.data;
    },

    // Get doctor performance
    getDoctorStats: async () => {
        const response = await api.get('/hospital/doctor-stats');
        return response.data;
    },

    // Get real-time activity feed
    getActivityFeed: async () => {
        const response = await api.get('/hospital/activity');
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
