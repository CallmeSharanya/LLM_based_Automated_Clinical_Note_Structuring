import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    CloudArrowUpIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    BeakerIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { soapAPI } from '../services/api';

export default function ProcessNotes() {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [patientId, setPatientId] = useState('');
    const [specialty, setSpecialty] = useState('');

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
        }
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const processNote = async () => {
        if (!file) {
            toast.error('Please select a file first');
            return;
        }

        setIsProcessing(true);
        setResult(null);

        try {
            const response = await soapAPI.processNote(file, patientId, specialty, true);
            setResult(response);
            toast.success('Note processed successfully!');
        } catch (error) {
            toast.error('Failed to process note');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const getConfidenceColor = (score) => {
        if (score >= 0.8) return 'text-green-600';
        if (score >= 0.5) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getConfidenceBar = (score) => {
        if (score >= 0.8) return 'bg-green-500';
        if (score >= 0.5) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Process Clinical Notes</h1>
                <p className="text-gray-600">Upload clinical notes to structure them into SOAP format</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div className="space-y-4">
                    {/* Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={clsx(
                            'card border-2 border-dashed transition-all duration-200 cursor-pointer',
                            isDragging
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-300 hover:border-primary-400',
                            file && 'border-green-500 bg-green-50'
                        )}
                        onClick={() => document.getElementById('file-input').click()}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.txt"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <div className="flex flex-col items-center justify-center py-12">
                            {file ? (
                                <>
                                    <DocumentTextIcon className="w-16 h-16 text-green-500 mb-4" />
                                    <p className="font-medium text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                        className="mt-4 text-sm text-red-600 hover:underline"
                                    >
                                        Remove file
                                    </button>
                                </>
                            ) : (
                                <>
                                    <CloudArrowUpIcon className={clsx(
                                        'w-16 h-16 mb-4',
                                        isDragging ? 'text-primary-500' : 'text-gray-400'
                                    )} />
                                    <p className="font-medium text-gray-900">
                                        Drop your clinical note here
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        or click to browse
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Supports: PDF, Images (PNG, JPG), Text files
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="card">
                        <h3 className="font-semibold text-gray-900 mb-4">Options</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Patient ID (optional)
                                </label>
                                <input
                                    type="text"
                                    value={patientId}
                                    onChange={(e) => setPatientId(e.target.value)}
                                    placeholder="Enter patient ID"
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Specialty (optional)
                                </label>
                                <select
                                    value={specialty}
                                    onChange={(e) => setSpecialty(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="">Auto-detect</option>
                                    <option value="Cardiology">Cardiology</option>
                                    <option value="Pulmonology">Pulmonology</option>
                                    <option value="Neurology">Neurology</option>
                                    <option value="Orthopedics">Orthopedics</option>
                                    <option value="General Medicine">General Medicine</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Process Button */}
                    <button
                        onClick={processNote}
                        disabled={!file || isProcessing}
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <BeakerIcon className="w-5 h-5" />
                                Process Note
                            </>
                        )}
                    </button>
                </div>

                {/* Results Section */}
                <div className="space-y-4">
                    {!result && !isProcessing && (
                        <div className="card flex flex-col items-center justify-center py-16 text-center">
                            <DocumentTextIcon className="w-16 h-16 text-gray-300 mb-4" />
                            <p className="text-gray-500">
                                Upload and process a note to see results
                            </p>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="card flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
                            <p className="text-gray-600">Processing note with AI...</p>
                            <p className="text-sm text-gray-400 mt-2">This may take a few seconds</p>
                        </div>
                    )}

                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {/* Confidence Score */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">Confidence Score</h3>
                                    <span className={clsx(
                                        'text-2xl font-bold',
                                        getConfidenceColor(result.confidence?.overall || 0)
                                    )}>
                                        {((result.confidence?.overall || 0) * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {Object.entries(result.confidence || {}).map(([key, value]) => (
                                        key !== 'overall' && (
                                            <div key={key} className="flex items-center gap-4">
                                                <span className="w-24 text-sm text-gray-600 capitalize">{key}</span>
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={clsx('h-2 rounded-full transition-all', getConfidenceBar(value))}
                                                        style={{ width: `${value * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-gray-600 w-12">{(value * 100).toFixed(0)}%</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* SOAP Output */}
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-4">Structured SOAP Note</h3>
                                <div className="space-y-4">
                                    {['Subjective', 'Objective', 'Assessment', 'Plan'].map((section) => (
                                        <div key={section} className="border-l-4 border-primary-500 pl-4">
                                            <h4 className="font-medium text-gray-900 mb-1">{section}</h4>
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                                {result.soap?.[section] || 'Not documented'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Validation */}
                            {result.validation && (
                                <div className="card">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Validation</h3>
                                        <span className={clsx(
                                            'px-3 py-1 rounded-full text-sm font-medium',
                                            result.validation.status === 'VALID'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                        )}>
                                            {result.validation.status_emoji} {result.validation.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        {Object.entries(result.validation.scores || {}).map(([key, value]) => (
                                            <div key={key} className="text-center">
                                                <div className="text-xl font-bold text-primary-600">{value}</div>
                                                <div className="text-xs text-gray-500 capitalize">{key}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ICD Codes */}
                            {result.icd?.length > 0 && (
                                <div className="card">
                                    <h3 className="font-semibold text-gray-900 mb-4">ICD-10 Codes</h3>
                                    <div className="space-y-2">
                                        {result.icd.map((code, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded font-mono text-sm">
                                                    {code.code}
                                                </span>
                                                <span className="text-sm text-gray-600">{code.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Entities */}
                            {result.entities && Object.keys(result.entities).length > 0 && (
                                <div className="card">
                                    <h3 className="font-semibold text-gray-900 mb-4">Extracted Entities</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.entries(result.entities).map(([key, values]) => (
                                            Array.isArray(values) && values.length > 0 && (
                                                <div key={key}>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-1">
                                                        {values.map((value, i) => (
                                                            <span key={i} className="badge-blue">{value}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Flags */}
                            {result.flags?.length > 0 && (
                                <div className="card bg-yellow-50 border-yellow-200">
                                    <h3 className="font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                                        <ExclamationTriangleIcon className="w-5 h-5" />
                                        Flags & Warnings
                                    </h3>
                                    <ul className="space-y-2">
                                        {result.flags.map((flag, i) => (
                                            <li key={i} className="text-sm text-yellow-700 flex items-start gap-2">
                                                <span>⚠️</span>
                                                <span>{flag}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
