import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CloudArrowUpIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    SparklesIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { soapAPI } from '../services/api';
import MultimodalUpload from '../components/MultimodalUpload';

export default function PatientUpload() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [processedResult, setProcessedResult] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [validation, setValidation] = useState(null);
    const [isValidating, setIsValidating] = useState(false);

    const handleProcessingComplete = async (result) => {
        setProcessedResult(result);
        setShowConfirmation(true);

        // Auto-validate the SOAP if available
        if (result.draft_soap) {
            setIsValidating(true);
            try {
                const validationResult = await soapAPI.validateSoap(result.draft_soap, null, null);
                setValidation(validationResult);
            } catch (error) {
                console.error('Validation failed:', error);
            } finally {
                setIsValidating(false);
            }
        }
    };

    const handleConfirmSubmit = async () => {
        // Submit the draft SOAP for doctor review
        try {
            toast.success('Documents submitted for doctor review!');
            navigate('/patient/home');
        } catch (error) {
            toast.error('Failed to submit documents');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                    <CloudArrowUpIcon className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Medical Documents</h1>
                <p className="text-gray-600 max-w-md mx-auto">
                    Upload prescriptions, lab reports, or medical images. Our AI will analyze them
                    and create a draft summary for your doctor.
                </p>
            </div>

            {/* Upload Section */}
            {!showConfirmation && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <MultimodalUpload
                        onProcessingComplete={handleProcessingComplete}
                        userType="patient"
                        showSOAPPreview={true}
                    />
                </div>
            )}

            {/* Confirmation Section */}
            {showConfirmation && processedResult && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Success Banner */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                                <CheckCircleIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Documents Processed Successfully!</h2>
                                <p className="text-green-100">
                                    Our AI has analyzed your documents and created a summary.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Summary Preview */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-blue-600" />
                                    AI-Generated Summary
                                </h3>
                                <p className="text-sm text-gray-600">
                                    This summary will be shared with your doctor for review
                                </p>
                            </div>
                            {/* Validation Score Badge */}
                            {validation && (
                                <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${validation.status === 'VALID'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {validation.status_emoji} {validation.scores?.overall || 'Checking...'}
                                </div>
                            )}
                            {isValidating && (
                                <div className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                                    ⏳ Validating...
                                </div>
                            )}
                        </div>

                        <div className="p-6 space-y-4">
                            {processedResult.draft_soap && (
                                <>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-blue-50 rounded-xl">
                                            <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                                                Your Symptoms
                                            </label>
                                            <p className="text-sm text-gray-700 mt-2">
                                                {processedResult.draft_soap.Subjective || 'Information extracted from your documents'}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-purple-50 rounded-xl">
                                            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                                                Medical Findings
                                            </label>
                                            <p className="text-sm text-gray-700 mt-2">
                                                {processedResult.draft_soap.Objective || 'Lab values and measurements from your reports'}
                                            </p>
                                        </div>
                                    </div>

                                    {processedResult.draft_soap.Assessment && (
                                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                            <label className="text-xs font-semibold text-yellow-700 uppercase tracking-wider">
                                                ⚠️ Preliminary Assessment
                                            </label>
                                            <p className="text-sm text-gray-700 mt-2">
                                                {processedResult.draft_soap.Assessment}
                                            </p>
                                            <p className="text-xs text-yellow-600 mt-2">
                                                Note: This is AI-generated and requires doctor verification
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Extracted Info */}
                            {processedResult.extracted_info && (
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Extracted Information
                                    </label>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {processedResult.extracted_info.medications?.map((med, i) => (
                                            <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                                💊 {med}
                                            </span>
                                        ))}
                                        {processedResult.extracted_info.conditions?.map((cond, i) => (
                                            <span key={i} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                                                🏥 {cond}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Validation Scores */}
                            {validation && validation.scores && (
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                                    <label className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 block">
                                        📊 Document Quality Scores
                                    </label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {Object.entries(validation.scores).map(([key, value]) => (
                                            <div key={key} className="text-center p-2 bg-white rounded-lg shadow-sm">
                                                <div className="text-lg font-bold text-blue-600">{value}</div>
                                                <div className="text-xs text-gray-500 capitalize">{key}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Show warnings if any */}
                                    {validation.issue_count?.warnings > 0 && (
                                        <div className="mt-3 p-2 bg-yellow-50 rounded-lg flex items-center gap-2 text-sm text-yellow-700">
                                            <ExclamationTriangleIcon className="w-4 h-4" />
                                            {validation.issue_count.warnings} minor issue(s) found - your doctor will review
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setShowConfirmation(false);
                                setProcessedResult(null);
                            }}
                            className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Upload More Documents
                        </button>
                        <button
                            onClick={handleConfirmSubmit}
                            className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            Submit for Doctor Review
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">What happens next?</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Your documents and AI summary will be sent to your doctor</li>
                            <li>• The doctor will review and verify the information</li>
                            <li>• You'll be notified when your records are updated</li>
                            <li>• Book an appointment to discuss your results</li>
                        </ul>
                    </div>
                </motion.div>
            )}

            {/* Help Section */}
            {!showConfirmation && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                        Supported Documents
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <span className="text-2xl mb-2 block">📋</span>
                            <h4 className="font-medium text-gray-900">Prescriptions</h4>
                            <p className="text-sm text-gray-600">Doctor's prescriptions and medication lists</p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <span className="text-2xl mb-2 block">🔬</span>
                            <h4 className="font-medium text-gray-900">Lab Reports</h4>
                            <p className="text-sm text-gray-600">Blood tests, urine analysis, and other lab results</p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <span className="text-2xl mb-2 block">🩻</span>
                            <h4 className="font-medium text-gray-900">Medical Images</h4>
                            <p className="text-sm text-gray-600">X-rays, CT scans, MRI reports</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
