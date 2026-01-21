import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function Login() {
    const [selectedRole, setSelectedRole] = useState(null);
    const [formData, setFormData] = useState({ id: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const roles = [
        {
            id: ROLES.PATIENT,
            title: 'Patient',
            icon: '👤',
            color: 'from-blue-500 to-cyan-500',
            description: 'Access your health records & book appointments',
        },
        {
            id: ROLES.DOCTOR,
            title: 'Doctor',
            icon: '👨‍⚕️',
            color: 'from-green-500 to-emerald-500',
            description: 'View appointments & manage patients',
        },
        {
            id: ROLES.HOSPITAL,
            title: 'Hospital Admin',
            icon: '🏥',
            color: 'from-purple-500 to-pink-500',
            description: 'Analytics & system management',
        },
    ];

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedRole) {
            setError('Please select a role');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await authAPI.login({
                id: formData.id,
                password: formData.password,
                role: selectedRole,
            });

            login(response.user);

            // Navigate based on role
            switch (selectedRole) {
                case ROLES.PATIENT:
                    navigate('/patient/home');
                    break;
                case ROLES.DOCTOR:
                    navigate('/doctor/dashboard');
                    break;
                case ROLES.HOSPITAL:
                    navigate('/hospital/dashboard');
                    break;
                default:
                    navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Demo login for testing
    const handleDemoLogin = (role) => {
        const demoUsers = {
            [ROLES.PATIENT]: {
                id: 'demo-patient-1',
                email: 'patient@demo.com',
                name: 'John Doe',
                role: ROLES.PATIENT,
                phone: '+91 9876543210',
                age: 35,
                blood_group: 'O+',
            },
            [ROLES.DOCTOR]: {
                id: 'doc-001',
                email: 'doctor@demo.com',
                name: 'Dr. Priya Sharma',
                role: ROLES.DOCTOR,
                specialty: 'Cardiology',
                experience_years: 15,
            },
            [ROLES.HOSPITAL]: {
                id: 'hospital-1',
                email: 'admin@hospital.com',
                name: 'City Hospital Admin',
                role: ROLES.HOSPITAL,
                hospital_name: 'City General Hospital',
            },
        };

        login(demoUsers[role]);

        switch (role) {
            case ROLES.PATIENT:
                navigate('/patient/home');
                break;
            case ROLES.DOCTOR:
                navigate('/doctor/dashboard');
                break;
            case ROLES.HOSPITAL:
                navigate('/hospital/dashboard');
                break;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-5xl relative z-10">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 mb-6 shadow-2xl shadow-indigo-500/30 ring-4 ring-white/10">
                        <span className="text-4xl">🏥</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Clinical EHR Portal</h1>
                    <p className="text-gray-400 text-lg">AI-Powered Hospital Management System</p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                        <span className="text-emerald-400 text-sm font-medium">System Online</span>
                    </div>
                </div>

                {/* Role Selection */}
                {!selectedRole ? (
                    <div className="space-y-8">
                        <h2 className="text-xl font-semibold text-white text-center">Select your role to continue</h2>
                        <div className="grid md:grid-cols-3 gap-5">
                            {roles.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => handleRoleSelect(role.id)}
                                    className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-500 hover:scale-[1.03] hover:border-white/30 hover:shadow-2xl hover:shadow-indigo-500/20"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:shadow-xl transition-all duration-500 ring-4 ring-white/10`}>
                                        <span className="text-4xl">{role.icon}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{role.title}</h3>
                                    <p className="text-gray-400">{role.description}</p>
                                    <div className="mt-6 flex items-center justify-center gap-2 text-white/60 group-hover:text-white transition-colors">
                                        <span className="text-sm font-medium">Continue</span>
                                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Demo Access */}
                        <div className="mt-12 pt-8 border-t border-white/10">
                            <p className="text-center text-gray-400 mb-6 text-sm uppercase tracking-wider font-medium">Quick Demo Access</p>
                            <div className="flex flex-wrap justify-center gap-4">
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        onClick={() => handleDemoLogin(role.id)}
                                        className={`px-6 py-3 rounded-xl bg-gradient-to-r ${role.color} text-white font-semibold hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-lg flex items-center gap-2`}
                                    >
                                        <span>{role.icon}</span>
                                        Demo as {role.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Login Form */
                    <div className="max-w-md mx-auto">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                            <button
                                onClick={() => setSelectedRole(null)}
                                className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-colors group"
                            >
                                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to role selection
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${roles.find(r => r.id === selectedRole)?.color} flex items-center justify-center shadow-lg ring-4 ring-white/10`}>
                                    <span className="text-3xl">{roles.find(r => r.id === selectedRole)?.icon}</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">
                                        {roles.find(r => r.id === selectedRole)?.title} Login
                                    </h2>
                                    <p className="text-gray-400">Enter your credentials to continue</p>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        Id
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.id}
                                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300"
                                        placeholder="Id"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-4 rounded-xl bg-gradient-to-r ${roles.find(r => r.id === selectedRole)?.color} text-white font-bold text-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 shadow-xl flex items-center justify-center gap-2`}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                            </form>

                            {selectedRole === ROLES.PATIENT && (
                                <div className="mt-8 text-center">
                                    <p className="text-gray-400">
                                        New patient?{' '}
                                        <Link to="/signup/patient" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                                            Create an account
                                        </Link>
                                    </p>
                                </div>
                            )}

                            {/* Demo login button */}
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <button
                                    onClick={() => handleDemoLogin(selectedRole)}
                                    className="w-full py-3 text-gray-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 hover:bg-white/5 rounded-xl"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Continue with Demo Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
