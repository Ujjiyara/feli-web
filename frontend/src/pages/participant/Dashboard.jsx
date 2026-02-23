import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { participantService, eventService } from '../../services';
import { FiCalendar, FiTag, FiStar } from 'react-icons/fi';
import { formatDateShort as formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import './Dashboard.css';

const ParticipantDashboard = () => {
  const [events, setEvents] = useState({ upcoming: [], completed: [], cancelled: [] });
  const [trending, setTrending] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [myEventsRes, trendingRes, recommendedRes] = await Promise.all([
        participantService.getMyEvents(),
        eventService.getTrendingEvents(),
        participantService.getRecommendedEvents()
      ]);

      if (myEventsRes.success) {
        setEvents(myEventsRes.data);
      }
      if (trendingRes.success) {
        setTrending(trendingRes.data.events || []);
      }
      if (recommendedRes.success) {
        setRecommended(recommendedRes.data.events || []);
      }
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const currentEvents = (events[activeTab] || []).filter(reg => {
    if (typeFilter === 'ALL') return true;
    return reg.event?.type === typeFilter;
  });

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>My Dashboard</h1>
        <Link to="/events" className="browse-btn">
          Browse Events →
        </Link>
      </div>

      {/* Trending Events */}
      {trending.length > 0 && (
        <section className="trending-section">
          <h2>🔥 Trending Now</h2>
          <div className="trending-scroll">
            {trending.map((event) => (
              <Link to={`/events/${event._id}`} key={event._id} className="trending-card">
                <div className="trending-type">{event.type}</div>
                <h3>{event.name}</h3>
                <p className="trending-org">{event.organizerId?.name}</p>
                <div className="trending-date">
                  <FiCalendar />
                  {formatDate(event.startDate)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommended for You */}
      {recommended.length > 0 && (
        <section className="trending-section recommended-section">
          <h2><FiStar /> Recommended for You</h2>
          <div className="trending-scroll">
            {recommended.map((event) => (
              <Link to={`/events/${event._id}`} key={event._id} className="trending-card recommended-card">
                <div className="trending-type">{event.type}</div>
                {event._recommendScore > 0 && (
                  <span className="recommend-badge">
                    {event._recommendScore >= 50 ? '💜 Following' : '✨ Matches'}
                  </span>
                )}
                <h3>{event.name}</h3>
                <p className="trending-org">{event.organizerId?.name}</p>
                <div className="trending-date">
                  <FiCalendar />
                  {formatDate(event.startDate)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My Events */}
      <section className="my-events-section">
        <h2>My Events</h2>
        
        <div className="event-tabs">
          <button 
            className={activeTab === 'upcoming' ? 'active' : ''}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({events.upcoming?.length || 0})
          </button>
          <button 
            className={activeTab === 'completed' ? 'active' : ''}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({events.completed?.length || 0})
          </button>
          <button 
            className={activeTab === 'cancelled' ? 'active' : ''}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled ({events.cancelled?.length || 0})
          </button>
        </div>

        <div className="type-filter-tabs">
          <button 
            className={typeFilter === 'ALL' ? 'active' : ''}
            onClick={() => setTypeFilter('ALL')}
          >
            All Types
          </button>
          <button 
            className={typeFilter === 'NORMAL' ? 'active' : ''}
            onClick={() => setTypeFilter('NORMAL')}
          >
            Normal
          </button>
          <button 
            className={typeFilter === 'MERCHANDISE' ? 'active' : ''}
            onClick={() => setTypeFilter('MERCHANDISE')}
          >
            Merchandise
          </button>
        </div>

        {currentEvents.length === 0 ? (
          <div className="empty-state">
            <FiTag className="empty-icon" />
            <h3>No {activeTab} events</h3>
            <p>
              {activeTab === 'upcoming' 
                ? "You haven't registered for any upcoming events yet."
                : `No ${activeTab} events to show.`}
            </p>
            {activeTab === 'upcoming' && (
              <Link to="/events" className="cta-btn">
                Explore Events
              </Link>
            )}
          </div>
        ) : (
          <div className="events-grid">
            {currentEvents.map((reg) => (
              <div key={reg.registrationId} className="event-card">
                <div className="event-type-badge">{reg.event.type}</div>
                <h3>{reg.event.name}</h3>
                <p className="event-organizer">{reg.event.organizer}</p>
                
                <div className="event-meta">
                  <span><FiCalendar /> {formatDate(reg.event.startDate)}</span>
                  <span><FiTag /> {reg.ticketId}</span>
                </div>

                <div className="event-status">
                  <span className={`status-badge ${reg.status.toLowerCase()}`}>
                    {reg.status}
                  </span>
                </div>

                <Link to={`/tickets/${reg.registrationId}`} className="view-ticket-btn">
                  View Ticket
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ParticipantDashboard;
