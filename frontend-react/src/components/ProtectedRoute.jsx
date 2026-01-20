import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * @param {React.ReactNode} children - Child components to render
 * @param {string[]} allowedRoles - Array of roles allowed to access this route
 */
export function ProtectedRoute({ children, allowedRoles = [] }) {
    const { isAuthenticated, role, loading } = useAuth();
    const location = useLocation();

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role access if roles are specified
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        // Redirect to appropriate dashboard based on user's actual role
        switch (role) {
            case ROLES.PATIENT:
                return <Navigate to="/patient/home" replace />;
            case ROLES.DOCTOR:
                return <Navigate to="/doctor/dashboard" replace />;
            case ROLES.HOSPITAL:
                return <Navigate to="/hospital/dashboard" replace />;
            default:
                return <Navigate to="/login" replace />;
        }
    }

    return children;
}

/**
 * PublicRoute - Routes that should redirect authenticated users
 */
export function PublicRoute({ children }) {
    const { isAuthenticated, role, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Redirect authenticated users to their dashboard
    if (isAuthenticated) {
        switch (role) {
            case ROLES.PATIENT:
                return <Navigate to="/patient/home" replace />;
            case ROLES.DOCTOR:
                return <Navigate to="/doctor/dashboard" replace />;
            case ROLES.HOSPITAL:
                return <Navigate to="/hospital/dashboard" replace />;
            default:
                return <Navigate to="/login" replace />;
        }
    }

    return children;
}

export default ProtectedRoute;
