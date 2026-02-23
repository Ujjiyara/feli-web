import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/common/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import ParticlesBackground from './components/common/ParticlesBackground';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Participant pages
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import EventDetails from './pages/participant/EventDetails';
import Profile from './pages/participant/Profile';
import Organizers from './pages/participant/Organizers';

// Participant pages (continued)
import OrganizerDetails from './pages/participant/OrganizerDetails';
import TicketView from './pages/participant/TicketView';
import Onboarding from './pages/participant/Onboarding';

// Organizer pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import OrganizerEventDetails from './pages/organizer/EventDetails';
import OrganizerProfile from './pages/organizer/Profile';
import PaymentApprovals from './pages/organizer/PaymentApprovals';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageOrganizers from './pages/admin/ManageOrganizers';
import PasswordResetRequests from './pages/admin/PasswordResetRequests';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-container">
          <ParticlesBackground />
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />


              {/* Participant routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <ParticipantDashboard />
                </ProtectedRoute>
              } />
              <Route path="/events" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <BrowseEvents />
                </ProtectedRoute>
              } />
              <Route path="/events/:id" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <EventDetails />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/organizers" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <Organizers />
                </ProtectedRoute>
              } />
              <Route path="/organizers/:id" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <OrganizerDetails />
                </ProtectedRoute>
              } />
              <Route path="/tickets/:id" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <TicketView />
                </ProtectedRoute>
              } />
              <Route path="/onboarding" element={
                <ProtectedRoute allowedRoles={['participant']}>
                  <Onboarding />
                </ProtectedRoute>
              } />

              {/* Organizer routes */}
              <Route path="/organizer/dashboard" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <OrganizerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/organizer/events/create" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <CreateEvent />
                </ProtectedRoute>
              } />
              <Route path="/organizer/events/:id" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <OrganizerEventDetails />
                </ProtectedRoute>
              } />
              <Route path="/organizer/profile" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <OrganizerProfile />
                </ProtectedRoute>
              } />
              <Route path="/organizer/payments" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <PaymentApprovals />
                </ProtectedRoute>
              } />

              {/* Admin routes */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/organizers" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ManageOrganizers />
                </ProtectedRoute>
              } />
              <Route path="/admin/password-resets" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PasswordResetRequests />
                </ProtectedRoute>
              } />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '10px'
            }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
