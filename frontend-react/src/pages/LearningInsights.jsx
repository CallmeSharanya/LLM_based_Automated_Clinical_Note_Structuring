import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    AcademicCapIcon,
    LightBulbIcon,
    ArrowPathIcon,
    ChartBarIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { learningAPI } from '../services/api';

export default function LearningInsights() {
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);
    const [insights, setInsights] = useState([]);
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [metricsData, insightsData] = await Promise.all([
                learningAPI.getMetrics(),
                learningAPI.getInsights()
            ]);

            setMetrics(metricsData || mockMetrics);
            setInsights(insightsData || mockInsights);
        } catch (error) {
            console.error('Failed to load learning data:', error);
            setMetrics(mockMetrics);
            setInsights(mockInsights);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerAnalysis = async () => {
        setIsRefreshing(true);
        try {
            await learningAPI.triggerAnalysis();
            toast.success('Learning analysis triggered');
            await loadData();
        } catch (error) {
            toast.error('Failed to trigger analysis');
        } finally {
            setIsRefreshing(false);
        }
    };

    const getInsightIcon = (type) => {
        switch (type) {
            case 'improvement':
                return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'pattern':
                return <LightBulbIcon className="w-5 h-5 text-yellow-500" />;
            case 'warning':
                return <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />;
            default:
                return <SparklesIcon className="w-5 h-5 text-primary-500" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-700';
            case 'medium':
                return 'bg-yellow-100 text-yellow-700';
            default:
                return 'bg-green-100 text-green-700';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <AcademicCapIcon className="w-7 h-7 text-primary-600" />
                        AI Learning Insights
                    </h1>
                    <p className="text-gray-600">Reflexion-based continuous improvement metrics</p>
                </div>
                <button
                    onClick={triggerAnalysis}
                    disabled={isRefreshing}
                    className="btn-secondary flex items-center gap-2"
                >
                    <ArrowPathIcon className={clsx('w-5 h-5', isRefreshing && 'animate-spin')} />
                    Analyze Patterns
                </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Edits Analyzed"
                    value={metrics?.total_edits || 0}
                    icon={DocumentTextIcon}
                    subtext="Doctor corrections tracked"
                />
                <MetricCard
                    title="Edit Rate"
                    value={`${((metrics?.edit_rate || 0) * 100).toFixed(1)}%`}
                    icon={ChartBarIcon}
                    subtext="Notes requiring edits"
                    trend={metrics?.edit_rate < 0.15 ? 'positive' : 'negative'}
                />
                <MetricCard
                    title="Patterns Identified"
                    value={metrics?.patterns_found || 0}
                    icon={LightBulbIcon}
                    subtext="Recurring corrections"
                />
                <MetricCard
                    title="Last Analysis"
                    value={formatTimeAgo(metrics?.last_analysis)}
                    icon={ClockIcon}
                    subtext="Pattern analysis run"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Edit Rate Trend */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Edit Rate Trend</h3>
                    <p className="text-sm text-gray-500 mb-4">Lower is better - AI learning from corrections</p>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={metrics?.edit_rate_trend || mockEditRateTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                            <YAxis
                                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                tick={{ fontSize: 12 }}
                                domain={[0, 0.5]}
                            />
                            <Tooltip
                                formatter={(value) => [`${(value * 100).toFixed(1)}%`, 'Edit Rate']}
                            />
                            <Line
                                type="monotone"
                                dataKey="rate"
                                stroke="#4F46E5"
                                strokeWidth={2}
                                dot={{ fill: '#4F46E5', r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Edit Categories */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Correction Categories</h3>
                    <p className="text-sm text-gray-500 mb-4">Types of edits doctors make most often</p>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={metrics?.edit_categories || mockEditCategories}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Section Performance Radar */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">SOAP Section Performance</h3>
                    <p className="text-sm text-gray-500 mb-4">Accuracy by section (higher = better)</p>
                    <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={metrics?.section_performance || mockSectionPerformance}>
                            <PolarGrid stroke="#E5E7EB" />
                            <PolarAngleAxis dataKey="section" tick={{ fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Radar
                                name="Accuracy"
                                dataKey="accuracy"
                                stroke="#4F46E5"
                                fill="#4F46E5"
                                fillOpacity={0.3}
                            />
                            <Radar
                                name="Completeness"
                                dataKey="completeness"
                                stroke="#10B981"
                                fill="#10B981"
                                fillOpacity={0.3}
                            />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Specialty Comparison */}
                <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4">Performance by Specialty</h3>
                    <p className="text-sm text-gray-500 mb-4">AI accuracy varies by medical specialty</p>
                    <div className="space-y-3">
                        {(metrics?.specialty_performance || mockSpecialtyPerformance).map((spec, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <span className="w-28 text-sm text-gray-600">{spec.specialty}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${spec.accuracy}%` }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                        className={clsx(
                                            'h-3 rounded-full',
                                            spec.accuracy >= 90 ? 'bg-green-500' :
                                                spec.accuracy >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                                        )}
                                    />
                                </div>
                                <span className="w-12 text-sm font-medium text-gray-700">{spec.accuracy}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Insights Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Insights List */}
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">AI Learning Insights</h3>
                            <span className="text-sm text-gray-500">{insights.length} insights</span>
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {insights.map((insight, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => setSelectedInsight(insight)}
                                    className={clsx(
                                        'p-4 rounded-lg border cursor-pointer transition-all',
                                        selectedInsight?.id === insight.id
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        {getInsightIcon(insight.type)}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                                                <span className={clsx(
                                                    'px-2 py-0.5 rounded text-xs font-medium',
                                                    getPriorityColor(insight.priority)
                                                )}>
                                                    {insight.priority}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">{insight.description}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                <span>Section: {insight.section}</span>
                                                <span>Occurrences: {insight.occurrences}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Selected Insight Detail */}
                <div>
                    <div className="card sticky top-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Insight Details</h3>
                        {selectedInsight ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4"
                            >
                                <div>
                                    <span className={clsx(
                                        'px-2 py-1 rounded text-xs font-medium',
                                        getPriorityColor(selectedInsight.priority)
                                    )}>
                                        {selectedInsight.priority} priority
                                    </span>
                                </div>
                                <h4 className="font-medium text-gray-900">{selectedInsight.title}</h4>
                                <p className="text-sm text-gray-600">{selectedInsight.description}</p>

                                {selectedInsight.examples && (
                                    <div>
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Examples:</h5>
                                        <div className="space-y-2">
                                            {selectedInsight.examples.map((ex, i) => (
                                                <div key={i} className="text-sm p-2 bg-gray-100 rounded">
                                                    <p className="text-red-600 line-through">{ex.before}</p>
                                                    <p className="text-green-600">→ {ex.after}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedInsight.recommendation && (
                                    <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                                        <h5 className="text-sm font-medium text-primary-800 mb-1">
                                            💡 Recommendation
                                        </h5>
                                        <p className="text-sm text-primary-700">{selectedInsight.recommendation}</p>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Section:</span>
                                            <span className="ml-2 font-medium">{selectedInsight.section}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Occurrences:</span>
                                            <span className="ml-2 font-medium">{selectedInsight.occurrences}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Impact:</span>
                                            <span className="ml-2 font-medium">{selectedInsight.impact}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Confidence:</span>
                                            <span className="ml-2 font-medium">{(selectedInsight.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <LightBulbIcon className="w-12 h-12 mx-auto mb-2" />
                                <p>Select an insight to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Metric Card Component
function MetricCard({ title, value, icon: Icon, subtext, trend }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-100 rounded-lg">
                    <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-sm text-gray-500">{title}</span>
            </div>
            <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {trend && (
                    <span className={clsx(
                        'text-xs font-medium',
                        trend === 'positive' ? 'text-green-600' : 'text-red-600'
                    )}>
                        {trend === 'positive' ? '✓ Good' : '↑ High'}
                    </span>
                )}
            </div>
            <p className="text-xs text-gray-400 mt-1">{subtext}</p>
        </motion.div>
    );
}

// Helper function
function formatTimeAgo(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
}

// Mock Data
const mockMetrics = {
    total_edits: 847,
    edit_rate: 0.12,
    patterns_found: 23,
    last_analysis: new Date(Date.now() - 3600000).toISOString()
};

const mockEditRateTrend = [
    { week: 'W1', rate: 0.28 },
    { week: 'W2', rate: 0.24 },
    { week: 'W3', rate: 0.21 },
    { week: 'W4', rate: 0.18 },
    { week: 'W5', rate: 0.15 },
    { week: 'W6', rate: 0.13 },
    { week: 'W7', rate: 0.12 }
];

const mockEditCategories = [
    { category: 'Med Dosage', count: 156 },
    { category: 'Diagnosis', count: 134 },
    { category: 'Vitals', count: 98 },
    { category: 'History', count: 87 },
    { category: 'Plan Details', count: 76 },
    { category: 'Formatting', count: 45 }
];

const mockSectionPerformance = [
    { section: 'Subjective', accuracy: 92, completeness: 88 },
    { section: 'Objective', accuracy: 85, completeness: 78 },
    { section: 'Assessment', accuracy: 88, completeness: 82 },
    { section: 'Plan', accuracy: 79, completeness: 75 }
];

const mockSpecialtyPerformance = [
    { specialty: 'General Medicine', accuracy: 94 },
    { specialty: 'Cardiology', accuracy: 89 },
    { specialty: 'Pulmonology', accuracy: 86 },
    { specialty: 'Neurology', accuracy: 82 },
    { specialty: 'Orthopedics', accuracy: 78 }
];

const mockInsights = [
    {
        id: 1,
        type: 'pattern',
        title: 'Medication Dosage Format Inconsistency',
        description: 'AI frequently outputs medications without dosage frequency. Doctors consistently add "twice daily", "as needed" etc.',
        section: 'Plan',
        priority: 'high',
        occurrences: 45,
        impact: 'High',
        confidence: 0.92,
        recommendation: 'Update prompt to explicitly request dosage frequency for all medications.',
        examples: [
            { before: 'Lisinopril 10mg', after: 'Lisinopril 10mg once daily' },
            { before: 'Metformin 500mg', after: 'Metformin 500mg twice daily with meals' }
        ]
    },
    {
        id: 2,
        type: 'improvement',
        title: 'Vital Signs Formatting Improved',
        description: 'After prompt update, AI now correctly formats vital signs with units. Edit rate decreased by 34%.',
        section: 'Objective',
        priority: 'low',
        occurrences: 12,
        impact: 'Medium',
        confidence: 0.88,
        recommendation: 'Continue current formatting guidelines.',
        examples: []
    },
    {
        id: 3,
        type: 'warning',
        title: 'Assessment Terminology Mismatch',
        description: 'AI uses "suspected" while doctors prefer "clinical impression of" for unconfirmed diagnoses.',
        section: 'Assessment',
        priority: 'medium',
        occurrences: 28,
        impact: 'Medium',
        confidence: 0.85,
        recommendation: 'Add terminology preference to specialty templates.',
        examples: [
            { before: 'Suspected Type 2 Diabetes', after: 'Clinical impression of Type 2 Diabetes' }
        ]
    },
    {
        id: 4,
        type: 'pattern',
        title: 'Follow-up Timeline Missing',
        description: 'Plan section frequently lacks specific follow-up timeframe. Doctors add "in 2 weeks", "in 1 month".',
        section: 'Plan',
        priority: 'medium',
        occurrences: 34,
        impact: 'Medium',
        confidence: 0.87,
        recommendation: 'Prompt should request specific follow-up intervals.',
        examples: [
            { before: 'Follow up as needed', after: 'Follow up in 2 weeks' }
        ]
    },
    {
        id: 5,
        type: 'improvement',
        title: 'Chief Complaint Capture Rate Up',
        description: 'Subjective section now captures chief complaint accurately 96% of the time, up from 82%.',
        section: 'Subjective',
        priority: 'low',
        occurrences: 8,
        impact: 'Low',
        confidence: 0.94,
        recommendation: 'No action needed - monitoring.',
        examples: []
    }
];
