-- =============================================================================
-- Clinical EHR Hospital Management System - Database Schema
-- Supabase/PostgreSQL Compatible
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- DOCTORS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    specialty TEXT NOT NULL,           -- 'Cardiology', 'Orthopedics', 'General Medicine', etc.
    subspecialty TEXT,                  -- 'Interventional Cardiology', 'Sports Medicine', etc.
    qualifications TEXT[],              -- ['MBBS', 'MD', 'DM Cardiology']
    languages TEXT[] DEFAULT ARRAY['English'],  -- ['English', 'Hindi', 'Kannada']
    experience_years INTEGER DEFAULT 0,
    current_load INTEGER DEFAULT 0,     -- Active patient count
    max_load INTEGER DEFAULT 20,        -- Maximum capacity per day
    availability JSONB DEFAULT '{
        "monday": ["09:00-13:00", "14:00-17:00"],
        "tuesday": ["09:00-13:00", "14:00-17:00"],
        "wednesday": ["09:00-13:00", "14:00-17:00"],
        "thursday": ["09:00-13:00", "14:00-17:00"],
        "friday": ["09:00-13:00", "14:00-17:00"],
        "saturday": ["09:00-13:00"],
        "sunday": []
    }'::jsonb,
    consultation_fee DECIMAL(10, 2) DEFAULT 500.00,
    is_available BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,     -- Currently online
    rating FLOAT DEFAULT 4.5,
    total_consultations INTEGER DEFAULT 0,
    profile_image_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- PATIENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT UNIQUE NOT NULL,     -- External patient ID (e.g., hospital MRN)
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,
    blood_group TEXT,
    address JSONB,
    emergency_contact JSONB,
    allergies TEXT[],
    chronic_conditions TEXT[],
    current_medications TEXT[],
    insurance_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INTAKE SESSIONS TABLE (Patient Chatbot Conversations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS intake_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id TEXT,
    session_status TEXT DEFAULT 'active',  -- 'active', 'completed', 'cancelled', 'assigned'
    
    -- Conversation Data
    conversation_history JSONB DEFAULT '[]'::jsonb,  -- Array of {role, content, timestamp}
    current_question_index INTEGER DEFAULT 0,
    
    -- Extracted Information
    symptoms JSONB DEFAULT '[]'::jsonb,
    symptom_duration TEXT,
    symptom_severity TEXT,                  -- 'mild', 'moderate', 'severe'
    vital_signs JSONB DEFAULT '{}'::jsonb,
    medical_history JSONB DEFAULT '{}'::jsonb,
    current_medications JSONB DEFAULT '[]'::jsonb,
    allergies JSONB DEFAULT '[]'::jsonb,
    
    -- AI-Generated Outputs
    preliminary_soap JSONB,
    triage_priority TEXT,                   -- 'red' (emergency), 'orange' (urgent), 'yellow' (semi-urgent), 'green' (routine)
    triage_score INTEGER,                   -- 1-10 urgency score
    triage_reasoning TEXT,
    suggested_specialties TEXT[],
    suggested_specialty_primary TEXT,
    
    -- Assignment
    assigned_doctor_id UUID REFERENCES doctors(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    appointment_slot TIMESTAMP WITH TIME ZONE,
    assignment_reasoning TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- ENCOUNTERS TABLE (Doctor-Patient Consultations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intake_session_id UUID REFERENCES intake_sessions(id),
    patient_id TEXT NOT NULL,
    doctor_id UUID REFERENCES doctors(id),
    
    -- Status
    encounter_status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in-progress', 'completed', 'cancelled'
    encounter_type TEXT DEFAULT 'outpatient',  -- 'outpatient', 'inpatient', 'emergency', 'telehealth'
    
    -- Pre-Visit Data (from intake)
    pre_visit_soap JSONB,
    patient_conversation JSONB,
    
    -- Doctor's Input
    doctor_notes TEXT,
    doctor_examination JSONB,
    vitals_recorded JSONB,
    
    -- Final SOAP (after doctor review)
    final_soap JSONB,
    soap_edit_diff JSONB,                   -- Track what doctor changed
    
    -- Validation Scores
    validation_scores JSONB,                 -- {structural: 0.9, clinical: 0.85, overall: 0.87}
    validation_issues TEXT[],
    
    -- Diagnoses & Codes
    diagnoses JSONB DEFAULT '[]'::jsonb,     -- [{code, system, description, type}]
    icd_codes JSONB DEFAULT '[]'::jsonb,
    cpt_codes JSONB DEFAULT '[]'::jsonb,     -- Procedure codes
    
    -- Treatment Plan
    prescriptions JSONB DEFAULT '[]'::jsonb,
    lab_orders JSONB DEFAULT '[]'::jsonb,
    imaging_orders JSONB DEFAULT '[]'::jsonb,
    referrals JSONB DEFAULT '[]'::jsonb,
    follow_up_instructions TEXT,
    follow_up_date DATE,
    
    -- Patient Summary
    patient_summary TEXT,                    -- Plain-language summary for patient
    patient_instructions TEXT[],
    warning_signs TEXT[],
    
    -- Billing
    billing_info JSONB,
    
    -- Timestamps
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SOAP EDIT LOGS TABLE (For Reflexion/Learning)
-- =============================================================================
CREATE TABLE IF NOT EXISTS soap_edit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID REFERENCES encounters(id),
    doctor_id UUID REFERENCES doctors(id),
    specialty TEXT,
    
    -- Original AI Output
    original_soap JSONB NOT NULL,
    
    -- Doctor's Final Version
    edited_soap JSONB NOT NULL,
    
    -- Diff Analysis
    sections_edited TEXT[],                 -- ['Subjective', 'Assessment']
    edit_types JSONB,                       -- {added: [...], removed: [...], modified: [...]}
    edit_distance_score FLOAT,              -- Levenshtein-based similarity
    
    -- Categorization
    edit_category TEXT,                     -- 'correction', 'addition', 'clarification', 'style'
    edit_severity TEXT,                     -- 'minor', 'moderate', 'major'
    
    -- Learning Data
    improvement_suggestions JSONB,          -- AI-generated suggestions from the edit
    was_incorporated BOOLEAN DEFAULT false, -- If feedback was used to improve prompts
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CLINICAL NOTES TABLE (Extended from existing)
-- =============================================================================
-- Note: Assuming this table already exists, adding any missing columns
ALTER TABLE clinical_notes 
ADD COLUMN IF NOT EXISTS encounter_id UUID REFERENCES encounters(id),
ADD COLUMN IF NOT EXISTS validation_score FLOAT,
ADD COLUMN IF NOT EXISTS specialty TEXT;

-- =============================================================================
-- SPECIALTY TEMPLATES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS specialty_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialty TEXT UNIQUE NOT NULL,
    
    -- SOAP Generation Hints
    common_symptoms TEXT[],
    common_diagnoses TEXT[],
    common_medications TEXT[],
    examination_checklist TEXT[],
    
    -- Template Sections
    subjective_template TEXT,
    objective_template TEXT,
    assessment_template TEXT,
    plan_template TEXT,
    
    -- Guidelines
    clinical_guidelines JSONB,
    red_flag_symptoms TEXT[],
    required_vitals TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TRIAGE RULES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS triage_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name TEXT NOT NULL,
    priority TEXT NOT NULL,                 -- 'red', 'orange', 'yellow', 'green'
    
    -- Matching Criteria
    symptom_keywords TEXT[],
    vital_thresholds JSONB,                 -- {heart_rate_max: 120, bp_systolic_min: 90}
    age_range JSONB,                        -- {min: 0, max: 5} for pediatric rules
    
    -- Actions
    recommended_specialty TEXT,
    escalation_required BOOLEAN DEFAULT false,
    immediate_action TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_available ON doctors(is_available, current_load);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_status ON intake_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_patient ON intake_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_doctor ON encounters(doctor_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(encounter_status);
CREATE INDEX IF NOT EXISTS idx_soap_edit_logs_specialty ON soap_edit_logs(specialty);
CREATE INDEX IF NOT EXISTS idx_soap_edit_logs_doctor ON soap_edit_logs(doctor_id);

-- =============================================================================
-- SAMPLE DATA: Doctors
-- =============================================================================
INSERT INTO doctors (name, email, specialty, subspecialty, qualifications, languages, experience_years, consultation_fee, bio) VALUES
('Dr. Priya Sharma', 'priya.sharma@hospital.com', 'Cardiology', 'Interventional Cardiology', ARRAY['MBBS', 'MD', 'DM Cardiology'], ARRAY['English', 'Hindi', 'Kannada'], 15, 1000.00, 'Senior cardiologist with expertise in complex interventions'),
('Dr. Rajesh Kumar', 'rajesh.kumar@hospital.com', 'Orthopedics', 'Sports Medicine', ARRAY['MBBS', 'MS Ortho', 'Fellowship Sports Medicine'], ARRAY['English', 'Hindi'], 12, 800.00, 'Specialist in sports injuries and joint replacements'),
('Dr. Ananya Patel', 'ananya.patel@hospital.com', 'General Medicine', NULL, ARRAY['MBBS', 'MD Medicine'], ARRAY['English', 'Hindi', 'Gujarati'], 8, 500.00, 'General physician with focus on preventive care'),
('Dr. Mohammed Ali', 'mohammed.ali@hospital.com', 'Pulmonology', 'Critical Care', ARRAY['MBBS', 'MD Pulmonology', 'Fellowship Critical Care'], ARRAY['English', 'Hindi', 'Urdu'], 10, 900.00, 'Expert in respiratory diseases and ICU care'),
('Dr. Sneha Reddy', 'sneha.reddy@hospital.com', 'Neurology', 'Stroke Medicine', ARRAY['MBBS', 'DM Neurology'], ARRAY['English', 'Telugu', 'Hindi'], 9, 950.00, 'Neurologist specializing in stroke and headache disorders'),
('Dr. Vikram Singh', 'vikram.singh@hospital.com', 'Gastroenterology', 'Hepatology', ARRAY['MBBS', 'MD', 'DM Gastro'], ARRAY['English', 'Hindi', 'Punjabi'], 11, 850.00, 'GI specialist with expertise in liver diseases'),
('Dr. Meera Nair', 'meera.nair@hospital.com', 'Dermatology', 'Cosmetic Dermatology', ARRAY['MBBS', 'MD Dermatology'], ARRAY['English', 'Malayalam', 'Hindi'], 7, 700.00, 'Dermatologist treating skin conditions and cosmetic procedures'),
('Dr. Arjun Menon', 'arjun.menon@hospital.com', 'Psychiatry', 'Child Psychiatry', ARRAY['MBBS', 'MD Psychiatry'], ARRAY['English', 'Malayalam', 'Hindi'], 6, 800.00, 'Mental health specialist for adults and children'),
('Dr. Kavitha Iyer', 'kavitha.iyer@hospital.com', 'Endocrinology', 'Diabetes', ARRAY['MBBS', 'MD', 'DM Endocrinology'], ARRAY['English', 'Tamil', 'Hindi'], 10, 900.00, 'Expert in diabetes and hormonal disorders'),
('Dr. Sanjay Gupta', 'sanjay.gupta@hospital.com', 'Emergency Medicine', NULL, ARRAY['MBBS', 'MD Emergency Medicine'], ARRAY['English', 'Hindi'], 8, 600.00, 'Emergency physician with trauma expertise')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- SAMPLE DATA: Specialty Templates
-- =============================================================================
INSERT INTO specialty_templates (specialty, common_symptoms, common_diagnoses, red_flag_symptoms, required_vitals, examination_checklist) VALUES
('Cardiology', 
 ARRAY['chest pain', 'shortness of breath', 'palpitations', 'syncope', 'edema', 'fatigue'],
 ARRAY['Hypertension', 'Coronary Artery Disease', 'Heart Failure', 'Arrhythmia', 'Valvular Heart Disease'],
 ARRAY['crushing chest pain', 'radiating arm pain', 'jaw pain', 'diaphoresis', 'severe dyspnea'],
 ARRAY['blood_pressure', 'heart_rate', 'oxygen_saturation', 'respiratory_rate'],
 ARRAY['Heart sounds', 'JVP assessment', 'Peripheral edema', 'Lung auscultation', 'Peripheral pulses']),

('Pulmonology',
 ARRAY['cough', 'shortness of breath', 'wheezing', 'hemoptysis', 'chest tightness'],
 ARRAY['Asthma', 'COPD', 'Pneumonia', 'Bronchitis', 'Pulmonary Fibrosis'],
 ARRAY['severe respiratory distress', 'cyanosis', 'altered consciousness', 'massive hemoptysis'],
 ARRAY['oxygen_saturation', 'respiratory_rate', 'peak_flow'],
 ARRAY['Lung auscultation', 'Chest expansion', 'Accessory muscle use', 'Clubbing']),

('Neurology',
 ARRAY['headache', 'dizziness', 'weakness', 'numbness', 'vision changes', 'seizures', 'memory problems'],
 ARRAY['Migraine', 'Stroke', 'Epilepsy', 'Neuropathy', 'Parkinson Disease', 'Multiple Sclerosis'],
 ARRAY['sudden severe headache', 'focal weakness', 'speech difficulty', 'vision loss', 'altered consciousness'],
 ARRAY['blood_pressure', 'heart_rate', 'temperature'],
 ARRAY['Cranial nerve exam', 'Motor strength', 'Sensory exam', 'Reflexes', 'Gait assessment', 'Mental status']),

('Orthopedics',
 ARRAY['joint pain', 'back pain', 'swelling', 'stiffness', 'limited mobility', 'deformity'],
 ARRAY['Osteoarthritis', 'Fracture', 'Ligament Injury', 'Disc Herniation', 'Tendinitis'],
 ARRAY['open fracture', 'neurovascular compromise', 'compartment syndrome signs', 'spinal cord compression'],
 ARRAY['blood_pressure', 'heart_rate'],
 ARRAY['Range of motion', 'Joint stability', 'Neurovascular status', 'Gait', 'Special tests']),

('General Medicine',
 ARRAY['fever', 'fatigue', 'weight changes', 'general weakness', 'body aches'],
 ARRAY['Viral Infection', 'Diabetes', 'Hypertension', 'Anemia', 'Thyroid Disorders'],
 ARRAY['high fever with rash', 'altered mental status', 'severe dehydration', 'uncontrolled bleeding'],
 ARRAY['temperature', 'blood_pressure', 'heart_rate', 'respiratory_rate', 'oxygen_saturation', 'weight'],
 ARRAY['General appearance', 'HEENT', 'Cardiovascular', 'Respiratory', 'Abdominal', 'Neurological'])
ON CONFLICT (specialty) DO NOTHING;

-- =============================================================================
-- SAMPLE DATA: Triage Rules
-- =============================================================================
INSERT INTO triage_rules (rule_name, priority, symptom_keywords, vital_thresholds, recommended_specialty, escalation_required, immediate_action) VALUES
('Cardiac Emergency', 'red', ARRAY['chest pain', 'crushing pain', 'radiating arm pain', 'cardiac arrest'], 
 '{"heart_rate_max": 150, "heart_rate_min": 40, "bp_systolic_min": 80}'::jsonb,
 'Cardiology', true, 'Immediate ECG, activate cardiac team'),

('Respiratory Distress', 'red', ARRAY['cannot breathe', 'severe shortness of breath', 'choking', 'cyanosis'],
 '{"oxygen_saturation_min": 88, "respiratory_rate_max": 30}'::jsonb,
 'Pulmonology', true, 'Immediate oxygen, prepare for intubation'),

('Stroke Signs', 'red', ARRAY['facial droop', 'arm weakness', 'speech difficulty', 'sudden confusion'],
 '{"bp_systolic_max": 220}'::jsonb,
 'Neurology', true, 'Activate stroke protocol, CT scan'),

('High Fever', 'orange', ARRAY['high fever', 'fever with rash', 'fever and stiff neck'],
 '{"temperature_max": 103}'::jsonb,
 'General Medicine', false, 'Fever workup, blood cultures if indicated'),

('Moderate Pain', 'yellow', ARRAY['moderate pain', 'persistent pain', 'worsening symptoms'],
 '{}'::jsonb,
 'General Medicine', false, 'Standard evaluation'),

('Routine Checkup', 'green', ARRAY['checkup', 'follow-up', 'prescription refill', 'mild symptoms'],
 '{}'::jsonb,
 'General Medicine', false, 'Routine appointment scheduling')
ON CONFLICT DO NOTHING;
