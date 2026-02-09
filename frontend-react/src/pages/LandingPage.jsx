import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingPage() {
    const features = [
        {
            icon: '🏥',
            title: 'General Physicians',
            description: 'Expert primary care and general medicine specialists available 24/7.',
        },
        {
            icon: '💓',
            title: 'Surgical Specialists',
            description: 'Board-certified surgeons across all major specialties.',
        },
        {
            icon: '👨‍⚕️',
            title: 'Primary Care Practitioners',
            description: 'Comprehensive healthcare for your entire family.',
        },
        {
            icon: '❤️',
            title: 'Cardiovascular Experts',
            description: 'Leading cardiologists for heart health management.',
        },
        {
            icon: '💊',
            title: 'Anesthesia',
            description: 'Expert anesthesiologists ensuring safe procedures.',
        },
        {
            icon: '🔬',
            title: 'Clinical Sub-specialties',
            description: 'Specialized care for complex medical conditions.',
        },
    ];

    const steps = [
        {
            number: '01',
            title: 'Secure Profile Creation',
            description: 'Create your profile with our secure platform. Your health data is protected with enterprise-grade security.',
        },
        {
            number: '02',
            title: 'AI-Powered Triage',
            description: 'Our intelligent system analyzes your symptoms and connects you with the right specialist instantly.',
        },
        {
            number: '03',
            title: 'Seamless Consultation',
            description: 'Book appointments, chat with doctors, and receive AI-structured SOAP notes for your records.',
        },
    ];

    const testimonials = [
        {
            quote: "Health+ transformed my healthcare experience. The AI-powered triage saved me hours and connected me with the perfect specialist.",
            author: "Dr. Sarah Mitchell",
            role: "Chief Medical Officer",
            avatar: "👩‍⚕️",
        },
        {
            quote: "The SOAP structuring is incredibly accurate. It's made my documentation workflow seamless and stress-free.",
            author: "Dr. Rajesh Kumar",
            role: "Senior Cardiologist",
            avatar: "👨‍⚕️",
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <span className="text-white text-xl">❤️</span>
                            </div>
                            <span className="font-bold text-xl text-gray-900">Health<span className="text-blue-600">+</span></span>
                        </div>

                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Features</a>
                            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">How It Works</a>
                            <a href="#specialties" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Specialties</a>
                            <a href="#testimonials" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">Testimonials</a>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                to="/login"
                                className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900 transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/signup/patient"
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white"></div>
                <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%234F46E5\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-700 font-medium text-sm mb-6">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                AI-Powered Healthcare Platform
                            </div>
                            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                                The Global Standard in{' '}
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Medical Care
                                </span>
                            </h1>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                An innovative platform built with AI to transform healthcare delivery.
                                Experience intelligent triage, automated SOAP structuring, and seamless
                                doctor-patient connections.
                            </p>

                            <div className="flex flex-wrap gap-4 mb-12">
                                <Link
                                    to="/signup/patient"
                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all flex items-center gap-2"
                                >
                                    Start Your Journey
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                                <a
                                    href="#how-it-works"
                                    className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Watch Demo
                                </a>
                            </div>

                            <div className="flex items-center gap-8">
                                <div>
                                    <div className="text-3xl font-bold text-gray-900">500+</div>
                                    <div className="text-sm text-gray-500">Registered Doctors</div>
                                </div>
                                <div className="w-px h-12 bg-gray-200"></div>
                                <div>
                                    <div className="text-3xl font-bold text-gray-900">10+</div>
                                    <div className="text-sm text-gray-500">Medical Specialties</div>
                                </div>
                                <div className="w-px h-12 bg-gray-200"></div>
                                <div>
                                    <div className="text-3xl font-bold text-gray-900">24/7</div>
                                    <div className="text-sm text-gray-500">Available Care</div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative"
                        >
                            <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 shadow-2xl shadow-blue-500/30">
                                <img
                                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
                                    alt="Healthcare Professional"
                                    className="w-full h-80 object-cover rounded-2xl shadow-lg"
                                />
                                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">Appointment Confirmed</div>
                                            <div className="text-sm text-gray-500">Dr. Priya Sharma • 2:00 PM</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-4 shadow-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="text-2xl">⭐</div>
                                        <div>
                                            <div className="font-bold text-gray-900">4.9</div>
                                            <div className="text-xs text-gray-500">Rating</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Trusted By Section */}
            <section className="py-16 bg-gray-50 border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-gray-500 font-medium mb-8">
                        A Trusted Partner for Medical Professionals
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
                        <span className="text-2xl font-bold text-gray-400">🏥 Apollo</span>
                        <span className="text-2xl font-bold text-gray-400">💚 Fortis</span>
                        <span className="text-2xl font-bold text-gray-400">🏨 Manipal</span>
                        <span className="text-2xl font-bold text-gray-400">❤️ Max</span>
                        <span className="text-2xl font-bold text-gray-400">🌟 AIIMS</span>
                    </div>
                </div>
            </section>

            {/* Specialties Section */}
            <section id="specialties" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Our Specialties</span>
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">
                            Recruitment Across Key Medical Fields
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Our platform connects you with healthcare providers in a range of specializations. We offer consulting & support for healthcare organizations.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group"
                            >
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-24 bg-gradient-to-br from-gray-50 to-blue-50/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Our Process</span>
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-4">
                            A Seamless Path to Quality Care
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Our AI-first workflow ensures you receive the best care with minimal friction. Get started in minutes.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.number}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.15 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 relative"
                            >
                                <div className="text-6xl font-bold text-blue-100 absolute top-4 right-6">{step.number}</div>
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mb-6">
                                        {step.number}
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
                            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-2 mb-6">
                                Built on Global Medical Standards
                            </h2>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Our AI-first healthcare system is designed with compliance and patient safety at its core.
                                Experience HIPAA-compliant care delivery with automated SOAP documentation.
                            </p>

                            <div className="space-y-4">
                                {[
                                    { icon: '🔒', title: 'HIPAA Compliance', desc: 'Enterprise-grade security for your health data' },
                                    { icon: '🤖', title: 'AI-Powered Triage', desc: 'Intelligent symptom analysis and doctor matching' },
                                    { icon: '📋', title: 'Automated SOAP Notes', desc: 'Structured clinical documentation in real-time' },
                                    { icon: '🔄', title: 'Seamless Integration', desc: 'Works with your existing healthcare systems' },
                                ].map((item) => (
                                    <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg">{item.icon}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                                            <p className="text-sm text-gray-600">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <img
                                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                alt="Medical Technology"
                                className="rounded-2xl shadow-2xl"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-24 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-blue-200 font-semibold text-sm uppercase tracking-wider">Testimonials</span>
                        <h2 className="text-3xl lg:text-4xl font-bold mt-2 mb-4">
                            Voices from the Medical Community
                        </h2>
                        <p className="text-blue-100 max-w-2xl mx-auto">
                            Hear what healthcare professionals are saying about their experience with our platform.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
                            >
                                <p className="text-lg mb-6 leading-relaxed">"{testimonial.quote}"</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <div className="font-semibold">{testimonial.author}</div>
                                        <div className="text-sm text-blue-200">{testimonial.role}</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Launch Your Healthcare Journey
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                        Join thousands of patients and healthcare providers who trust Health+
                        for their medical care needs.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/signup/patient"
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
                        >
                            Patient Registration
                        </Link>
                        <Link
                            to="/login"
                            className="px-8 py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                        >
                            Doctor/Hospital Login
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <span className="text-xl">❤️</span>
                                </div>
                                <span className="font-bold text-xl">Health+</span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                AI-powered healthcare platform transforming patient care with intelligent
                                triage and automated clinical documentation.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Platform</h4>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">For Patients</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">For Doctors</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">For Hospitals</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">API Access</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Company</h4>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">HIPAA Compliance</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
                        © 2026 Health+. All rights reserved. Built with ❤️ for better healthcare.
                    </div>
                </div>
            </footer>
        </div>
    );
}
