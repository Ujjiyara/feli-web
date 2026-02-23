import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiHome, FiCalendar, FiUsers, FiUser, FiLogOut, FiPlusCircle, FiDollarSign, FiKey, FiActivity } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) return null;

  // Participant navigation
  const participantLinks = [
    { to: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/events', icon: <FiCalendar />, label: 'Browse Events' },
    { to: '/organizers', icon: <FiUsers />, label: 'Clubs' },
    { to: '/profile', icon: <FiUser />, label: 'Profile' }
  ];

  // Organizer navigation
  const organizerLinks = [
    { to: '/organizer/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/organizer/events/create', icon: <FiPlusCircle />, label: 'Create Event' },
    { to: '/organizer/payments', icon: <FiDollarSign />, label: 'Payments' },
    { to: '/organizer/profile', icon: <FiUser />, label: 'Profile' },
    { to: '/organizer/dashboard?filter=ongoing', icon: <FiActivity />, label: 'Ongoing Events' }
  ];

  // Admin navigation
  const adminLinks = [
    { to: '/admin/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/admin/organizers', icon: <FiUsers />, label: 'Manage Clubs' },
    { to: '/admin/password-resets', icon: <FiKey />, label: 'Password Resets' }
  ];

  const getLinks = () => {
    switch (user?.role) {
      case 'organizer':
        return organizerLinks;
      case 'admin':
        return adminLinks;
      default:
        return participantLinks;
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'organizer':
        return user.name || 'Organizer';
      case 'admin':
        return 'Admin';
      default:
        return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Participant';
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <NavLink to="/dashboard">
          <span className="logo-text">Felicity</span>
        </NavLink>
      </div>

      <div className="navbar-links">
        {getLinks().map((link) => (
          <NavLink 
            key={link.to} 
            to={link.to} 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="navbar-user">
        <span className="user-name">{getRoleLabel()}</span>
        <button className="logout-btn" onClick={handleLogout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
