import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Protected route wrapper
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    const dashboardRoutes = {
      participant: '/dashboard',
      organizer: '/organizer/dashboard',
      admin: '/admin/dashboard'
    };
    return <Navigate to={dashboardRoutes[user?.role] || '/login'} replace />;
  }

  return children;
};

// Public route - redirects if already logged in
export const PublicRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Send new participants to onboarding first
    if (user?.role === 'participant' && !user?.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    const dashboardRoutes = {
      participant: '/dashboard',
      organizer: '/organizer/dashboard',
      admin: '/admin/dashboard'
    };
    return <Navigate to={dashboardRoutes[user?.role] || '/dashboard'} replace />;
  }

  return children;
};
