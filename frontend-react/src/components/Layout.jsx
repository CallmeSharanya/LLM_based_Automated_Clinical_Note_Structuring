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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <div className={clsx(
                'fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-out lg:hidden',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex items-center justify-between h-20 px-6 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                            <span className="text-white text-2xl">🏥</span>
                        </div>
                        <div>
                            <span className="font-bold text-white text-lg">Clinical EHR</span>
                            <p className="text-white/70 text-xs">AI-Powered Platform</p>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav className="p-5 space-y-2">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={clsx(
                                'flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200',
                                location.pathname === item.href
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                                    : 'text-gray-600 hover:bg-gray-100'
                            )}
                        >
                            <item.icon className={clsx(
                                'w-5 h-5',
                                location.pathname === item.href ? 'text-white' : 'text-gray-400'
                            )} />
                            <div>
                                <div className={clsx('font-semibold', location.pathname === item.href ? 'text-white' : 'text-gray-700')}>{item.name}</div>
                                <div className={clsx('text-xs', location.pathname === item.href ? 'text-white/70' : 'text-gray-500')}>{item.description}</div>
                            </div>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-80 lg:flex-col">
                <div className="flex grow flex-col gap-y-6 overflow-y-auto bg-white border-r border-gray-100 px-6 pb-4 shadow-soft">
                    {/* Logo */}
                    <div className="flex h-20 shrink-0 items-center gap-4 border-b border-gray-100 -mx-6 px-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-4 ring-white">
                            <span className="text-white text-2xl">🏥</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 text-lg">Clinical EHR</h1>
                            <p className="text-xs text-gray-500">AI-Powered Platform</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-1 flex-col">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</p>
                        <ul className="flex flex-1 flex-col gap-y-2">
                            {navigation.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        to={item.href}
                                        className={clsx(
                                            'flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group',
                                            location.pathname === item.href
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                                                : 'text-gray-600 hover:bg-gray-50'
                                        )}
                                    >
                                        <item.icon className={clsx(
                                            'w-5 h-5 transition-colors',
                                            location.pathname === item.href ? 'text-white' : 'text-gray-400 group-hover:text-indigo-500'
                                        )} />
                                        <div>
                                            <div className={clsx('font-semibold', location.pathname === item.href ? 'text-white' : 'text-gray-700')}>{item.name}</div>
                                            <div className={clsx('text-xs', location.pathname === item.href ? 'text-white/70' : 'text-gray-500')}>{item.description}</div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        {/* Footer */}
                        <div className="mt-auto pt-6 border-t border-gray-100">
                            <div className="px-4 py-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                    <p className="text-xs text-gray-600 font-medium">Powered by</p>
                                </div>
                                <p className="font-bold text-indigo-700">AI Multi-Agent System</p>
                                <p className="text-xs text-gray-500 mt-1">Gemini + Custom Agents</p>
                            </div>
                        </div>
                    </nav>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-80">
                {/* Top bar */}
                <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-100 bg-white/80 backdrop-blur-xl px-4 shadow-soft sm:gap-x-6 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-gray-700 lg:hidden hover:bg-gray-100 rounded-xl transition-colors"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Bars3Icon className="h-6 w-6" />
                    </button>

                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
                            <div className="hidden sm:flex items-center gap-2.5 text-sm bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full font-medium">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                System Online
                            </div>
                            <div className="h-6 w-px bg-gray-200" />
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md ring-2 ring-white">
                                    <span className="text-white font-bold text-sm">AD</span>
                                </div>
                                <span className="hidden sm:block text-sm font-semibold text-gray-700">Admin</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page content */}
                <main className="py-8 px-4 sm:px-6 lg:px-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
