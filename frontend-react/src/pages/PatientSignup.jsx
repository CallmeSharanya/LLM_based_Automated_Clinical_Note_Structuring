import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function PatientSignup() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isEmergency, setIsEmergency] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        // Basic Info
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        // Personal Details
        date_of_birth: '',
        gender: '',
        blood_group: '',
        // Emergency Contact
        emergency_name: '',
        emergency_phone: '',
        emergency_relation: '',
        // Medical Info
        allergies: '',
        chronic_conditions: '',
        current_medications: '',
        // Address
        address_line: '',
        city: '',
        state: '',
        pincode: '',
    });

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEmergencySOSClick = () => {
        setIsEmergency(true);
    };

    const handleCallAmbulance = () => {
        // In production, this would trigger actual emergency services
        alert('🚨 Emergency services notified!\n\nAmbulance dispatched to your location.\nPlease stay calm and wait for help.\n\nEmergency Helpline: 108');
        // Could also use: window.location.href = 'tel:108';
    };

    const handleQuickIntake = async () => {
        // Minimal signup for emergency - just phone number
        if (!formData.phone) {
            setError('Please provide a phone number for emergency contact');
            return;
        }

        setLoading(true);
        try {
            const quickData = {
                phone: formData.phone,
                name: formData.name || 'Emergency Patient',
                role: ROLES.PATIENT,
                is_emergency: true,
            };

            const response = await authAPI.quickSignup(quickData);
            login(response.user);
            navigate('/patient/intake?emergency=true');
        } catch (err) {
            // For demo, create a quick session
            const quickUser = {
                id: `emergency-${Date.now()}`,
                phone: formData.phone,
                name: formData.name || 'Emergency Patient',
                role: ROLES.PATIENT,
                is_emergency: true,
            };
            login(quickUser);
            navigate('/patient/intake?emergency=true');
        } finally {
            setLoading(false);
        }
    };

    const validateStep = () => {
        switch (step) {
            case 1:
                if (!formData.name || !formData.phone || !formData.password) {
                    setError('Please fill in all required fields');
                    return false;
                }
                if (formData.password !== formData.confirmPassword) {
                    setError('Passwords do not match');
                    return false;
                }
                if (formData.password.length < 6) {
                    setError('Password must be at least 6 characters');
                    return false;
                }
                break;
            case 2:
                if (!formData.date_of_birth || !formData.gender) {
                    setError('Please provide your date of birth and gender');
                    return false;
                }
                break;
            case 3:
                if (!formData.emergency_phone) {
                    setError('Emergency contact phone is required');
                    return false;
                }
                break;
        }
        setError('');
        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep(step + 1);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;

        setLoading(true);
        setError('');

        try {
            const payload = {
                ...formData,
                role: ROLES.PATIENT,
                allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()) : [],
                chronic_conditions: formData.chronic_conditions ? formData.chronic_conditions.split(',').map(s => s.trim()) : [],
                current_medications: formData.current_medications ? formData.current_medications.split(',').map(s => s.trim()) : [],
                emergency_contact: {
                    name: formData.emergency_name,
                    phone: formData.emergency_phone,
                    relation: formData.emergency_relation,
                },
                address: {
                    line: formData.address_line,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.pincode,
                    full: `${formData.address_line}, ${formData.city}, ${formData.state} ${formData.pincode}`.replace(/^, |, $|, , /g, '').trim()
                },
            };

            const response = await authAPI.signup(payload);
            login(response.user);
            navigate('/patient/home');
        } catch (err) {
            // For demo, create user locally
            const newUser = {
                id: `patient-${Date.now()}`,
                ...formData,
                role: ROLES.PATIENT,
            };
            login(newUser);
            navigate('/patient/home');
        } finally {
            setLoading(false);
        }
    };

    // Emergency Mode UI
    if (isEmergency) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-orange-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <span className="text-4xl">🚨</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Emergency Mode</h1>
                        <p className="text-red-200 mb-6">Get immediate help or quick registration</p>

                        {/* Call Ambulance Button */}
                        <button
                            onClick={handleCallAmbulance}
                            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-lg rounded-xl mb-4 flex items-center justify-center gap-3 transition-colors"
                        >
                            <span className="text-2xl">🚑</span>
                            Call Ambulance (108)
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/20"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-transparent text-white/60">or quick registration</span>
                            </div>
                        </div>

                        {/* Quick Registration */}
                        <div className="space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1">Your Phone *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1">Your Name (optional)</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                                    placeholder="Your name"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleQuickIntake}
                                disabled={loading}
                                className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Quick Start Intake →'}
                            </button>
                        </div>

                        <button
                            onClick={() => setIsEmergency(false)}
                            className="mt-6 text-white/60 hover:text-white text-sm"
                        >
                            ← Back to regular signup
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-3">
                        <span className="text-3xl">👤</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Patient Registration</h1>
                    <p className="text-gray-400 text-sm">Create your account to access healthcare services</p>
                </div>

                {/* Emergency SOS Button */}
                <button
                    onClick={handleEmergencySOSClick}
                    className="w-full mb-6 py-3 bg-red-600/20 border-2 border-red-500 text-red-400 font-semibold rounded-xl hover:bg-red-600/30 transition-colors flex items-center justify-center gap-2"
                >
                    <span className="text-xl">🚨</span>
                    Emergency? Click here for SOS / Call Ambulance
                </button>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${s === step
                                    ? 'bg-blue-500 text-white'
                                    : s < step
                                        ? 'bg-green-500 text-white'
                                        : 'bg-white/10 text-gray-400'
                                    }`}
                            >
                                {s < step ? '✓' : s}
                            </div>
                            {s < 4 && <div className={`w-12 h-1 ${s < step ? 'bg-green-500' : 'bg-white/10'}`}></div>}
                        </div>
                    ))}
                </div>

                {/* Form Card */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email (optional)</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password *</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Personal Details */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Personal Details</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Date of Birth *</label>
                                    <input
                                        type="date"
                                        name="date_of_birth"
                                        value={formData.date_of_birth}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Gender *</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="" className="bg-gray-800">Select gender</option>
                                        {genders.map((g) => (
                                            <option key={g} value={g} className="bg-gray-800">{g}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Blood Group</label>
                                <select
                                    name="blood_group"
                                    value={formData.blood_group}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="" className="bg-gray-800">Select blood group</option>
                                    {bloodGroups.map((bg) => (
                                        <option key={bg} value={bg} className="bg-gray-800">{bg}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Emergency Contact */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Emergency Contact</h2>
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
                                <p className="text-yellow-400 text-sm">
                                    ⚠️ This information will be used in case of medical emergencies
                                </p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Contact Name</label>
                                    <input
                                        type="text"
                                        name="emergency_name"
                                        value={formData.emergency_name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                        placeholder="Emergency contact name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Relationship</label>
                                    <input
                                        type="text"
                                        name="emergency_relation"
                                        value={formData.emergency_relation}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Spouse, Parent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Contact Phone *</label>
                                <input
                                    type="tel"
                                    name="emergency_phone"
                                    value={formData.emergency_phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Medical Info */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">Medical Information (Optional)</h2>
                            <p className="text-gray-400 text-sm mb-4">
                                This helps doctors provide better care. You can skip or update later.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Known Allergies</label>
                                <input
                                    type="text"
                                    name="allergies"
                                    value={formData.allergies}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Penicillin, Peanuts (comma separated)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Chronic Conditions</label>
                                <input
                                    type="text"
                                    name="chronic_conditions"
                                    value={formData.chronic_conditions}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Diabetes, Hypertension (comma separated)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Current Medications</label>
                                <input
                                    type="text"
                                    name="current_medications"
                                    value={formData.current_medications}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Metformin 500mg (comma separated)"
                                />
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                ← Back
                            </button>
                        ) : (
                            <Link to="/login" className="px-6 py-2 text-gray-400 hover:text-white transition-colors">
                                ← Login
                            </Link>
                        )}

                        {step < 4 ? (
                            <button
                                onClick={handleNext}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Continue →
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {loading ? 'Creating Account...' : 'Create Account ✓'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Skip to quick signup */}
                <div className="text-center mt-6">
                    <button
                        onClick={() => {
                            if (formData.phone && formData.name) {
                                handleQuickIntake();
                            } else {
                                setError('Please provide at least your name and phone number');
                            }
                        }}
                        className="text-gray-400 hover:text-white text-sm"
                    >
                        In a hurry? Quick signup with just phone number →
                    </button>
                </div>
            </div>
        </div>
    );
}
