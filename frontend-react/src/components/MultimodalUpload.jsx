import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CloudArrowUpIcon,
    DocumentTextIcon,
    PhotoIcon,
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { multimodalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ACCEPTED_TYPES = {
    'image/jpeg': 'Image (JPEG)',
    'image/png': 'Image (PNG)',
    'image/webp': 'Image (WebP)',
    'application/pdf': 'PDF Document',
    'text/plain': 'Text File',
};

export default function MultimodalUpload({
    onProcessingComplete,
    userType = 'patient',
    showSOAPPreview = true
}) {
    const { user } = useAuth();  // Get logged-in user
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedResults, setProcessedResults] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
    }, []);

    const handleFileInput = (e) => {
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
    };

    const addFiles = (newFiles) => {
        const validFiles = newFiles.filter(file => {
            const isValidType = Object.keys(ACCEPTED_TYPES).includes(file.type);
            const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max

            if (!isValidType) {
                toast.error(`${file.name}: Unsupported file type`);
            }
            if (!isValidSize) {
                toast.error(`${file.name}: File too large (max 10MB)`);
            }

            return isValidType && isValidSize;
        });

        setFiles(prev => [...prev, ...validFiles.map(file => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            status: 'pending', // pending, processing, complete, error
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        }))]);
    };

    const removeFile = (id) => {
        setFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file?.preview) {
                URL.revokeObjectURL(file.preview);
            }
            return prev.filter(f => f.id !== id);
        });
    };

    const processFiles = async () => {
        if (files.length === 0) {
            toast.error('Please add at least one file');
            return;
        }

        setIsProcessing(true);
        setProcessedResults(null);

        try {
            // Update all files to processing status
            setFiles(prev => prev.map(f => ({ ...f, status: 'processing' })));

            // Create FormData with all files
            const formData = new FormData();
            files.forEach(({ file }) => {
                formData.append('files', file);
            });

            // Add patient_id if user is logged in (for linking to doctor review)
            if (user?.id) {
                formData.append('patient_id', user.id);
            }

            // Call the multimodal processing API
            const result = await multimodalAPI.processMultimodal(formData);

            // Update file statuses
            setFiles(prev => prev.map(f => ({ ...f, status: 'complete' })));

            setProcessedResults(result);
            toast.success('Documents processed successfully!');

            if (onProcessingComplete) {
                onProcessingComplete(result);
            }
        } catch (error) {
            console.error('Processing failed:', error);
            setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
            toast.error('Failed to process documents. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const getFileIcon = (file) => {
        if (file.type.startsWith('image/')) {
            return <PhotoIcon className="w-8 h-8 text-purple-500" />;
        }
        return <DocumentTextIcon className="w-8 h-8 text-blue-500" />;
    };

    const getStatusIndicator = (status) => {
        switch (status) {
            case 'processing':
                return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'complete':
                return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'error':
                return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <div
                className={clsx(
                    'relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200',
                    dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    multiple
                    accept={Object.keys(ACCEPTED_TYPES).join(',')}
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="text-center">
                    <CloudArrowUpIcon className={clsx(
                        'w-16 h-16 mx-auto mb-4 transition-colors',
                        dragActive ? 'text-blue-500' : 'text-gray-400'
                    )} />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {dragActive ? 'Drop files here' : 'Upload Medical Documents'}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">
                        Drag and drop files, or click to browse
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {Object.values(ACCEPTED_TYPES).map((type) => (
                            <span key={type} className="px-3 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200">
                                {type}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* File List */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">
                                {files.length} file{files.length > 1 ? 's' : ''} selected
                            </h4>
                            <button
                                onClick={() => setFiles([])}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                                Clear all
                            </button>
                        </div>

                        <div className="space-y-2">
                            {files.map(({ id, file, status, preview }) => (
                                <motion.div
                                    key={id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                                >
                                    {/* Preview/Icon */}
                                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {preview ? (
                                            <img src={preview} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            getFileIcon(file)
                                        )}
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {ACCEPTED_TYPES[file.type]} • {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>

                                    {/* Status */}
                                    <div className="flex items-center gap-3">
                                        {getStatusIndicator(status)}
                                        {status === 'pending' && (
                                            <button
                                                onClick={() => removeFile(id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Process Button */}
                        <button
                            onClick={processFiles}
                            disabled={isProcessing || files.every(f => f.status !== 'pending')}
                            className={clsx(
                                'w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2',
                                isProcessing || files.every(f => f.status !== 'pending')
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl'
                            )}
                        >
                            {isProcessing ? (
                                <>
                                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                    Processing with AI...
                                </>
                            ) : (
                                <>
                                    <CloudArrowUpIcon className="w-5 h-5" />
                                    Process Documents
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Processed Results */}
            <AnimatePresence>
                {processedResults && showSOAPPreview && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Processing Complete</h3>
                                    <p className="text-sm text-gray-600">AI-generated SOAP note ready for review</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Extracted Text */}
                            {processedResults.extracted_text && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Content</h4>
                                    <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 max-h-40 overflow-y-auto">
                                        {processedResults.extracted_text.slice(0, 500)}
                                        {processedResults.extracted_text.length > 500 && '...'}
                                    </div>
                                </div>
                            )}

                            {/* Draft SOAP */}
                            {processedResults.draft_soap && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-gray-700">Draft SOAP Note</h4>
                                    {['Subjective', 'Objective', 'Assessment', 'Plan'].map((section) => (
                                        <div key={section} className="p-4 bg-gray-50 rounded-xl">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                {section}
                                            </label>
                                            <p className="text-sm text-gray-700 mt-1">
                                                {processedResults.draft_soap[section] || 'Not available'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Image Analysis */}
                            {processedResults.image_analysis && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Image Analysis</h4>
                                    <div className="p-4 bg-purple-50 rounded-xl">
                                        <p className="text-sm text-purple-700">
                                            {processedResults.image_analysis}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
