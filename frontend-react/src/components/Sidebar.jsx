import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import {
    HomeIcon,
    CalendarDaysIcon,
    DocumentTextIcon,
    ChatBubbleLeftRightIcon,
    UserCircleIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    HeartIcon,
    ClipboardDocumentListIcon,
    ChartBarIcon,
    UserGroupIcon,
    CloudArrowUpIcon,
    AcademicCapIcon,
    BuildingOffice2Icon,
    Bars3Icon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';

// Patient Navigation Items
const patientNavigation = [
    { name: 'Dashboard', href: '/patient/home', icon: HomeIcon },
    { name: 'Book Appointment', href: '/patient/intake', icon: CalendarDaysIcon },
    { name: 'My Records', href: '/patient/records', icon: DocumentTextIcon },
    { name: 'Upload Documents', href: '/patient/upload', icon: CloudArrowUpIcon },
    { name: 'Chat with Doctor', href: '/patient/chat', icon: ChatBubbleLeftRightIcon },
    { name: 'Health Summary', href: '/patient/health', icon: HeartIcon },
];

// Doctor Navigation Items
const doctorNavigation = [
    { name: 'Dashboard', href: '/doctor/dashboard', icon: HomeIcon },
    { name: 'Patient Queue', href: '/doctor/patients', icon: UserGroupIcon },
    { name: 'SOAP Editor', href: '/doctor/soap-editor', icon: ClipboardDocumentListIcon },
    { name: 'Upload & Process', href: '/doctor/upload', icon: CloudArrowUpIcon },
    { name: 'Clinical Chat', href: '/doctor/chat', icon: ChatBubbleLeftRightIcon },
    { name: 'Analytics', href: '/doctor/analytics', icon: ChartBarIcon },
];

// Hospital Navigation Items
const hospitalNavigation = [
    { name: 'Dashboard', href: '/hospital/dashboard', icon: HomeIcon },
    { name: 'Appointments', href: '/hospital/appointments', icon: CalendarDaysIcon },
    { name: 'Doctors', href: '/hospital/doctors', icon: UserGroupIcon },
    { name: 'Analytics', href: '/hospital/analytics', icon: ChartBarIcon },
    { name: 'Disease Stats', href: '/hospital/disease-stats', icon: HeartIcon },
    { name: 'AI Chatbot', href: '/hospital/chat', icon: ChatBubbleLeftRightIcon },
];

export default function Sidebar({ userType = 'patient', collapsed = false, onToggle }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Select navigation based on user type
    const getNavigation = () => {
        switch (userType) {
            case 'doctor':
                return doctorNavigation;
            case 'hospital':
                return hospitalNavigation;
            default:
                return patientNavigation;
        }
    };

    const navigation = getNavigation();

    // Get logo/branding based on user type
    const getBranding = () => {
        switch (userType) {
            case 'doctor':
                return { icon: '👨‍⚕️', title: 'Doctor Portal', gradient: 'from-emerald-500 to-teal-600' };
            case 'hospital':
                return { icon: '🏥', title: 'Hospital Admin', gradient: 'from-purple-500 to-pink-600' };
            default:
                return { icon: '❤️', title: 'Health+', gradient: 'from-blue-500 to-indigo-600' };
        }
    };

    const branding = getBranding();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100/50">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${branding.gradient} flex items-center justify-center shadow-lg ring-2 ring-white`}>
                    <span className="text-xl">{branding.icon}</span>
                </div>
                {!collapsed && (
                    <div>
                        <h1 className="font-bold text-gray-900 text-lg tracking-tight">{branding.title}</h1>
                        <p className="text-xs text-gray-500">AI-Powered Healthcare</p>
                    </div>
                )}
            </div>

            {/* Search */}
            {!collapsed && (
                <div className="px-4 py-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 py-2 overflow-y-auto">
                <ul className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <li key={item.name}>
                                <Link
                                    to={item.href}
                                    className={clsx(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                                        isActive
                                            ? `bg-gradient-to-r ${branding.gradient} text-white shadow-lg shadow-blue-500/20`
                                            : 'text-gray-600 hover:bg-gray-100'
                                    )}
                                >
                                    <item.icon className={clsx(
                                        'w-5 h-5 flex-shrink-0',
                                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                                    )} />
                                    {!collapsed && (
                                        <span className={clsx(
                                            'font-medium text-sm',
                                            isActive ? 'text-white' : 'text-gray-700'
                                        )}>
                                            {item.name}
                                        </span>
                                    )}
                                    {isActive && !collapsed && (
                                        <div className="ml-auto w-2 h-2 rounded-full bg-white/50"></div>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Profile Section */}
            <div className="border-t border-gray-100 p-4">
                {!collapsed && (
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 mb-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${branding.gradient} flex items-center justify-center text-white font-semibold shadow-md`}>
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                                {user?.name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user?.email || 'user@example.com'}
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                    <Link
                        to={`/${userType}/profile`}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <UserCircleIcon className="w-5 h-5 text-gray-400" />
                        {!collapsed && <span className="text-sm font-medium">Profile</span>}
                    </Link>
                    <Link
                        to={`/${userType}/settings`}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
                        {!collapsed && <span className="text-sm font-medium">Settings</span>}
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        {!collapsed && <span className="text-sm font-medium">Logout</span>}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg border border-gray-200"
            >
                {mobileOpen ? (
                    <XMarkIcon className="w-6 h-6 text-gray-600" />
                ) : (
                    <Bars3Icon className="w-6 h-6 text-gray-600" />
                )}
            </button>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={clsx(
                'lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300',
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <SidebarContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside className={clsx(
                'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 bg-white border-r border-gray-100 shadow-soft transition-all duration-300',
                collapsed ? 'lg:w-20' : 'lg:w-72'
            )}>
                <SidebarContent />
            </aside>
        </>
    );
}
