import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { organizerService } from '../../services';
import { FiCalendar, FiUsers, FiTrendingUp, FiPlus, FiEye, FiEdit } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './OrganizerDashboard.css';

const OrganizerDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const currentFilter = searchParams.get('filter');

  const getFilteredEvents = () => {
    if (!dashboard?.events) return [];
    if (currentFilter === 'ongoing') {
      return dashboard.events.filter(e => e.status === 'ONGOING');
    }
    return dashboard.events;
  };

  const displayEvents = getFilteredEvents();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await organizerService.getDashboard();
      if (response.success) {
        setDashboard(response.data);
      }
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="organizer-dashboard">
      <div className="dashboard-header">
        <h1>Organizer Dashboard</h1>
        <Link to="/organizer/events/create" className="create-btn">
          <FiPlus /> Create Event
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FiCalendar />
          </div>
          <div className="stat-info">
            <h3>{dashboard?.stats?.totalEvents || 0}</h3>
            <p>Total Events</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <FiTrendingUp />
          </div>
          <div className="stat-info">
            <h3>{dashboard?.stats?.activeEvents || 0}</h3>
            <p>Active Events</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon users">
            <FiUsers />
          </div>
          <div className="stat-info">
            <h3>{dashboard?.stats?.totalRegistrations || 0}</h3>
            <p>Total Registrations</p>
          </div>
        </div>
      </div>

      {/* Events Carousel */}
      <section className="events-section">
        <h2>{currentFilter === 'ongoing' ? 'Ongoing Events' : 'Your Events'}</h2>
        
        {displayEvents.length === 0 ? (
          <div className="empty-events">
            <p>{currentFilter === 'ongoing' ? 'No ongoing events found.' : "You haven't created any events yet."}</p>
            {currentFilter !== 'ongoing' && (
              <Link to="/organizer/events/create" className="cta-btn">
                Create Your First Event
              </Link>
            )}
          </div>
        ) : (
          <div className="events-carousel">
            {displayEvents.map((event) => (
              <div key={event._id} className="event-carousel-card">
                <div className="carousel-card-header">
                  <span className={`type-badge ${event.type?.toLowerCase()}`}>{event.type}</span>
                  <span className={`status-badge ${event.status.toLowerCase()}`}>{event.status}</span>
                </div>
                <h3 className="carousel-card-title">{event.name}</h3>
                <div className="carousel-card-meta">
                  <span><FiCalendar /> {formatDate(event.startDate)}</span>
                  <span><FiUsers /> {event.registrationCount || 0} registered</span>
                </div>
                <div className="carousel-card-actions">
                  <Link to={`/organizer/events/${event._id}`} className="action-btn view">
                    <FiEye /> View
                  </Link>
                  {event.status === 'DRAFT' && (
                    <Link to={`/organizer/events/${event._id}/edit`} className="action-btn edit">
                      <FiEdit /> Edit
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default OrganizerDashboard;
