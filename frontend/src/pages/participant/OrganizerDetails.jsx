import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { participantService } from '../../services';
import { FiCalendar, FiMail, FiHeart, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { formatDateShort as formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import './OrganizerDetails.css';

const OrganizerDetails = () => {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const [organizer, setOrganizer] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const response = await participantService.getOrganizerById(id);
      if (response.success) {
        setOrganizer(response.data.organizer);
        
        // The backend returns upcomingEvents and pastEvents separately
        setUpcomingEvents(response.data.upcomingEvents || []);
        setPastEvents(response.data.pastEvents || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load organizer');
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    try {
      const response = await participantService.toggleFollowOrganizer(id);
      if (response.success) {
        const isFollowing = response.data.isFollowing;
        toast.success(isFollowing ? 'Now following!' : 'Unfollowed');
        
        const currentFollowed = user.followedOrganizers || [];
        const updated = isFollowing
          ? [...currentFollowed, id]
          : currentFollowed.filter(orgId => orgId !== id);
        updateUser({ followedOrganizers: updated });
      }
    } catch {
      toast.error('Failed to update follow status');
    }
  };

  const isFollowing = user?.followedOrganizers?.includes(id);



  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!organizer) {
    return (
      <div className="not-found">
        <h2>Organizer not found</h2>
        <Link to="/organizers">Back to Organizers</Link>
      </div>
    );
  }

  return (
    <div className="organizer-details-page">
      {/* Hero Section */}
      <div className="org-hero">
        <div className="org-avatar-large">
          {organizer.name.charAt(0).toUpperCase()}
        </div>
        <div className="org-info-main">
          <h1>{organizer.name}</h1>
          <span className="category-tag">{organizer.category}</span>
          <p className="org-description">{organizer.description || 'No description available'}</p>
          
          <div className="org-stats-row">
            <div className="stat">
              <FiCalendar />
              <span>{upcomingEvents.length + pastEvents.length} Events</span>
            </div>
            <div className="stat">
              <FiUsers />
              <span>{organizer.followerCount || 0} Followers</span>
            </div>
          </div>

          <button 
            className={`follow-btn-large ${isFollowing ? 'following' : ''}`}
            onClick={toggleFollow}
          >
            <FiHeart />
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>

      {/* Contact Info */}
      {organizer.email && (
        <div className="contact-section">
          <h3>Contact</h3>
          <a href={`mailto:${organizer.email}`} className="contact-link">
            <FiMail /> {organizer.email}
          </a>
        </div>
      )}

      {/* Events Sections */}
      <div className="events-section">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--neon-cyan)' }}>Upcoming Events</h2>
        {upcomingEvents.length === 0 ? (
          <div className="no-events" style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '12px' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>No upcoming events scheduled</p>
          </div>
        ) : (
          <div className="events-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {upcomingEvents.map((event) => (
              <Link key={event._id} to={`/events/${event._id}`} className="event-card-mini" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', border: '1px solid rgba(255,45,117,0.3)', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', textDecoration: 'none' }}>
                <span className={`event-type-mini ${event.type.toLowerCase()}`} style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: event.type === 'MERCHANDISE' ? 'var(--hot-pink)' : 'var(--neon-cyan)', color: 'black', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {event.type}
                </span>
                <h4 style={{ color: 'white', margin: '0.5rem 0', fontSize: '1.2rem' }}>{event.name}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                    <FiCalendar /> {formatDate(event.startDate)}
                  </p>
                  {event.registrationFee > 0 && (
                    <p style={{ color: 'var(--neon-cyan)', margin: 0, fontWeight: 'bold' }}>₹{event.registrationFee}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="events-section" style={{ marginTop: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.7)' }}>Past Events</h2>
        {pastEvents.length === 0 ? (
          <div className="no-events" style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '12px' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>No past events</p>
          </div>
        ) : (
          <div className="events-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {pastEvents.map((event) => (
              <div key={event._id} className="event-card-mini" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', opacity: 0.7 }}>
                <span className={`event-type-mini ${event.type.toLowerCase()}`} style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {event.type}
                </span>
                <h4 style={{ color: 'white', margin: '0.5rem 0', fontSize: '1.2rem' }}>{event.name}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                    <FiCalendar /> {formatDate(event.endDate)}
                  </p>
                  {event.registrationFee > 0 && (
                    <p style={{ margin: 0 }}>₹{event.registrationFee}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDetails;
