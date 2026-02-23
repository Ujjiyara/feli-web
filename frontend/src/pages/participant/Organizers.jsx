import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { participantService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { FiMail, FiPhone, FiGlobe, FiHeart, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Organizers.css';

const Organizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, updateUser } = useAuth();

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const response = await participantService.getOrganizers();
      if (response.success) {
        setOrganizers(response.data.organizers || []);
      }
    } catch {
      toast.error('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (organizerId) => {
    try {
      const response = await participantService.toggleFollowOrganizer(organizerId);
      if (response.success) {
        const isFollowing = response.data.following;
        toast.success(isFollowing ? 'Now following!' : 'Unfollowed');
        
        // Update local user state
        const currentFollowed = user.followedOrganizers || [];
        const updated = isFollowing
          ? [...currentFollowed, organizerId]
          : currentFollowed.filter(id => id !== organizerId);
        updateUser({ followedOrganizers: updated });
      }
    } catch {
      toast.error('Failed to update follow status');
    }
  };

  const isFollowing = (organizerId) => {
    return user?.followedOrganizers?.includes(organizerId);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading clubs...</p>
      </div>
    );
  }

  return (
    <div className="organizers-page">
      <div className="page-header">
        <h1>Clubs & Organizers</h1>
        <p>Discover and follow your favorite clubs to stay updated on their events</p>
      </div>

      {organizers.length === 0 ? (
        <div className="empty-state">
          <h3>No organizers found</h3>
          <p>Check back later for clubs and organizers</p>
        </div>
      ) : (
        <div className="organizers-grid">
          {organizers.map((org) => (
            <div key={org._id} className="organizer-card">
              <div className="org-header">
                <div className="org-avatar">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="org-info">
                  <h3>{org.name}</h3>
                  <span className="org-category">{org.category}</span>
                </div>
                <button
                  className={`follow-btn ${isFollowing(org._id) ? 'following' : ''}`}
                  onClick={() => toggleFollow(org._id)}
                >
                  <FiHeart />
                  {isFollowing(org._id) ? 'Following' : 'Follow'}
                </button>
              </div>

              <p className="org-description">
                {org.description || 'No description available'}
              </p>

              <div className="org-stats">
                <div className="stat">
                  <FiCalendar />
                  <span>{org.eventCount || 0} events</span>
                </div>
                <div className="stat">
                  <FiHeart />
                  <span>{org.followerCount || 0} followers</span>
                </div>
              </div>

              <div className="org-contact">
                {org.email && (
                  <a href={`mailto:${org.email}`}>
                    <FiMail /> {org.email}
                  </a>
                )}
              </div>

              <Link to={`/organizers/${org._id}`} className="view-profile-btn">
                View Profile →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Organizers;
