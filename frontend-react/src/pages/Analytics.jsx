import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CalendarIcon,
    UsersIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
    LineChart, Line,
    AreaChart, Area
} from 'recharts';
import toast from 'react-hot-toast';
import { analyticsAPI } from '../services/api';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];

export default function Analytics() {
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('week');
    const [stats, setStats] = useState({
        totalPatients: 0,
        totalEncounters: 0,
        avgValidationScore: 0,
        avgProcessingTime: 0
    });
    const [icdStats, setIcdStats] = useState([]);
    const [encounterTrends, setEncounterTrends] = useState([]);
    const [specialtyDistribution, setSpecialtyDistribution] = useState([]);
    const [triageDistribution, setTriageDistribution] = useState([]);

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        setIsLoading(true);
        try {
            const [icdData, trends, summary] = await Promise.all([
                analyticsAPI.getIcdStats(),
                analyticsAPI.getEncounterTrends(dateRange),
                analyticsAPI.getSummary()
            ]);

            // ICD Stats
            setIcdStats(icdData?.top_codes?.slice(0, 10).map(item => ({
                code: item.code,
                count: item.count,
                description: item.description?.substring(0, 30) + '...'
            })) || mockIcdStats);

            // Encounter Trends
            setEncounterTrends(trends?.daily_counts || mockEncounterTrends);

            // Summary Stats
            setStats({
                totalPatients: summary?.total_patients || 1247,
                totalEncounters: summary?.total_encounters || 3582,
                avgValidationScore: summary?.avg_validation_score || 87,
                avgProcessingTime: summary?.avg_processing_time || 2.3
            });

            // Specialty Distribution
            setSpecialtyDistribution(summary?.specialty_distribution || mockSpecialtyData);

            // Triage Distribution
            setTriageDistribution(summary?.triage_distribution || mockTriageData);

        } catch (error) {
            console.error('Failed to load analytics:', error);
            // Use mock data
            setIcdStats(mockIcdStats);
            setEncounterTrends(mockEncounterTrends);
            setSpecialtyDistribution(mockSpecialtyData);
            setTriageDistribution(mockTriageData);
        } finally {
            setIsLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {trend === 'up' ? (
                                <ArrowTrendingUpIcon className="w-4 h-4" />
                            ) : (
                                <ArrowTrendingDownIcon className="w-4 h-4" />
                            )}
                            <span>{trendValue}</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg bg-${color}-100`}>
                    <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ChartBarIcon className="w-7 h-7 text-primary-600" />
                        Analytics Dashboard
                    </h1>
                    <p className="text-gray-600">Clinical insights and performance metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="input-field py-2"
                    >
                        <option value="week">Last 7 days</option>
                        <option value="month">Last 30 days</option>
                        <option value="quarter">Last 90 days</option>
                        <option value="year">Last year</option>
                    </select>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Patients"
                    value={stats.totalPatients.toLocaleString()}
                    icon={UsersIcon}
                    trend="up"
                    trendValue="+12% from last period"
                />
                <StatCard
                    title="Total Encounters"
                    value={stats.totalEncounters.toLocaleString()}
                    icon={DocumentTextIcon}
                    trend="up"
                    trendValue="+8% from last period"
                />
                <StatCard
                    title="Avg Validation Score"
                    value={`${stats.avgValidationScore}%`}
                    icon={ClipboardDocumentCheckIcon}
                    trend="up"
                    trendValue="+3% improvement"
                />
                <StatCard
                    title="Avg Processing Time"
                    value={`${stats.avgProcessingTime}s`}
                    icon={ChartBarIcon}
                    trend="down"
                    trendValue="-0.5s faster"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Encounter Trends */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Encounter Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={encounterTrends}>
                            <defs>
                                <linearGradient id="colorEncounters" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Area
                                type="monotone"
                                dataKey="encounters"
                                stroke="#4F46E5"
                                fillOpacity={1}
                                fill="url(#colorEncounters)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Top ICD Codes */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Top ICD-10 Codes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={icdStats} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} width={60} />
                            <Tooltip
                                formatter={(value, name, props) => [value, props.payload.description]}
                            />
                            <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Specialty Distribution */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">By Specialty</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={specialtyDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {specialtyDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend
                                layout="horizontal"
                                verticalAlign="bottom"
                                formatter={(value) => <span className="text-xs">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Triage Distribution */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Triage Priority</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={triageDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {triageDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend
                                layout="horizontal"
                                verticalAlign="bottom"
                                formatter={(value) => <span className="text-xs">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Validation Score Trend */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Validation Scores</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={mockValidationTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis domain={[70, 100]} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={{ fill: '#10B981', r: 3 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Processing Activity</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-gray-200">
                                <th className="pb-3 text-sm font-medium text-gray-500">Time</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">Patient</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">Type</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">Validation</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">ICD Codes</th>
                                <th className="pb-3 text-sm font-medium text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockRecentActivity.map((item, i) => (
                                <tr key={i} className="border-b border-gray-100 last:border-0">
                                    <td className="py-3 text-sm text-gray-600">{item.time}</td>
                                    <td className="py-3 text-sm font-medium text-gray-900">{item.patient}</td>
                                    <td className="py-3 text-sm text-gray-600">{item.type}</td>
                                    <td className="py-3">
                                        <span className={`text-sm font-medium ${item.validation >= 90 ? 'text-green-600' :
                                                item.validation >= 70 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                            {item.validation}%
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <div className="flex gap-1">
                                            {item.icdCodes.map((code, j) => (
                                                <span key={j} className="badge-blue text-xs">{code}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'Complete' ? 'bg-green-100 text-green-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Mock data for charts
const mockIcdStats = [
    { code: 'I10', count: 245, description: 'Essential hypertension' },
    { code: 'E11.9', count: 189, description: 'Type 2 diabetes' },
    { code: 'J06.9', count: 156, description: 'Upper respiratory infection' },
    { code: 'M54.5', count: 134, description: 'Low back pain' },
    { code: 'F32.9', count: 98, description: 'Major depressive disorder' },
    { code: 'K21.0', count: 87, description: 'GERD with esophagitis' },
    { code: 'J45.909', count: 76, description: 'Unspecified asthma' },
    { code: 'R51', count: 65, description: 'Headache' }
];

const mockEncounterTrends = [
    { date: 'Mon', encounters: 45 },
    { date: 'Tue', encounters: 52 },
    { date: 'Wed', encounters: 61 },
    { date: 'Thu', encounters: 58 },
    { date: 'Fri', encounters: 67 },
    { date: 'Sat', encounters: 32 },
    { date: 'Sun', encounters: 28 }
];

const mockSpecialtyData = [
    { name: 'Cardiology', value: 28 },
    { name: 'General', value: 24 },
    { name: 'Pulmonology', value: 18 },
    { name: 'Neurology', value: 15 },
    { name: 'Orthopedics', value: 15 }
];

const mockTriageData = [
    { name: 'Green', value: 45, color: '#10B981' },
    { name: 'Yellow', value: 30, color: '#F59E0B' },
    { name: 'Orange', value: 18, color: '#F97316' },
    { name: 'Red', value: 7, color: '#EF4444' }
];

const mockValidationTrend = [
    { date: 'Week 1', score: 82 },
    { date: 'Week 2', score: 84 },
    { date: 'Week 3', score: 85 },
    { date: 'Week 4', score: 87 },
    { date: 'Week 5', score: 89 },
    { date: 'Week 6', score: 88 },
    { date: 'Week 7', score: 91 }
];

const mockRecentActivity = [
    { time: '2 min ago', patient: 'John D.', type: 'SOAP Note', validation: 94, icdCodes: ['I10', 'E11.9'], status: 'Complete' },
    { time: '15 min ago', patient: 'Sarah M.', type: 'Intake', validation: 88, icdCodes: ['J06.9'], status: 'Complete' },
    { time: '32 min ago', patient: 'Robert K.', type: 'SOAP Note', validation: 76, icdCodes: ['M54.5', 'R51'], status: 'Review' },
    { time: '1 hr ago', patient: 'Emily W.', type: 'SOAP Note', validation: 91, icdCodes: ['F32.9'], status: 'Complete' },
    { time: '2 hrs ago', patient: 'Michael B.', type: 'Intake', validation: 85, icdCodes: ['K21.0'], status: 'Complete' }
];
