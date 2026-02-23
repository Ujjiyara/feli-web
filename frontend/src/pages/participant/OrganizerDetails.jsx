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
  const [events, setEvents] = useState([]);
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
        const upcoming = response.data.upcomingEvents || [];
        const past = response.data.pastEvents || [];
        setEvents([...upcoming, ...past]);
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
        const isFollowing = response.data.following;
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
              <span>{events.length} Events</span>
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

      {/* Events Section */}
      <div className="events-section">
        <h2>Events by {organizer.name}</h2>
        
        {events.length === 0 ? (
          <div className="no-events">
            <p>No upcoming events at the moment</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <Link key={event._id} to={`/events/${event._id}`} className="event-card-mini">
                <span className={`event-type-mini ${event.type.toLowerCase()}`}>{event.type}</span>
                <h4>{event.name}</h4>
                <p className="event-date">
                  <FiCalendar /> {formatDate(event.startDate)}
                </p>
                {event.registrationFee > 0 && (
                  <p className="event-fee">₹{event.registrationFee}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDetails;
