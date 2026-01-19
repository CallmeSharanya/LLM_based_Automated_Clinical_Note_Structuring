import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    UserGroupIcon,
    ClipboardDocumentListIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    AcademicCapIcon,
    DocumentTextIcon,
    Bars3Icon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const navigation = [
    { name: 'Patient Portal', href: '/patient', icon: UserGroupIcon, description: 'Patient intake & triage' },
    { name: 'Doctor Dashboard', href: '/doctor', icon: ClipboardDocumentListIcon, description: 'View & manage patients' },
    { name: 'Process Notes', href: '/process', icon: DocumentTextIcon, description: 'Upload & structure notes' },
    { name: 'Clinical Chat', href: '/chat', icon: ChatBubbleLeftRightIcon, description: 'Query clinical data' },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, description: 'View statistics' },
    { name: 'AI Learning', href: '/learning', icon: AcademicCapIcon, description: 'System insights' },
];

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <div className={clsx(
                'fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex items-center justify-between h-16 px-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg gradient-medical flex items-center justify-center">
                            <span className="text-white text-xl">🏥</span>
                        </div>
                        <span className="font-bold text-gray-900">Clinical EHR</span>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav className="p-4 space-y-1">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                                location.pathname === item.href
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.description}</div>
                            </div>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
                    {/* Logo */}
                    <div className="flex h-16 shrink-0 items-center gap-3">
                        <div className="w-10 h-10 rounded-lg gradient-medical flex items-center justify-center">
                            <span className="text-white text-xl">🏥</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">Clinical EHR</h1>
                            <p className="text-xs text-gray-500">Hospital Management</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-1 flex-col">
                        <ul className="flex flex-1 flex-col gap-y-1">
                            {navigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        to={item.href}
                                        className={clsx(
                                            'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                                            location.pathname === item.href
                                                ? 'bg-primary-50 text-primary-700 font-medium'
                                                : 'text-gray-600 hover:bg-gray-100'
                                        )}
                                    >
                                        <item.icon className={clsx(
                                            'w-5 h-5',
                                            location.pathname === item.href ? 'text-primary-600' : 'text-gray-400'
                                        )} />
                                        <div>
                                            <div>{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.description}</div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        {/* Footer */}
                        <div className="mt-auto pt-4 border-t">
                            <div className="px-4 py-3 rounded-lg bg-gradient-to-r from-primary-50 to-purple-50">
                                <p className="text-xs text-gray-600">Powered by</p>
                                <p className="font-medium text-primary-700">AI Multi-Agent System</p>
                                <p className="text-xs text-gray-500 mt-1">Gemini + Custom Agents</p>
                            </div>
                        </div>
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-72">
                {/* Top bar */}
                <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Bars3Icon className="h-6 w-6" />
                    </button>

                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
                            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                System Online
                            </div>
                            <div className="h-6 w-px bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="text-primary-700 font-medium text-sm">AD</span>
                                </div>
                                <span className="hidden sm:block text-sm font-medium text-gray-700">Admin</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="py-6 px-4 sm:px-6 lg:px-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
