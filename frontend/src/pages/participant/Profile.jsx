import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { participantService } from '../../services';
import { FiUser, FiMail, FiPhone, FiLock, FiSave, FiHeart, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import './Profile.css';

const INTEREST_OPTIONS = [
  { id: 'technical', label: 'Technical', icon: '💻' },
  { id: 'cultural', label: 'Cultural', icon: '🎭' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'literary', label: 'Literary', icon: '📚' },
  { id: 'social', label: 'Social', icon: '🤝' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', icon: '🚀' },
  { id: 'design', label: 'Design', icon: '🎨' }
];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    collegeName: ''
  });
  const [interests, setInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [followedOrganizers, setFollowedOrganizers] = useState([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);

  useEffect(() => {
    fetchFullProfile();
  }, []);

  const fetchFullProfile = async () => {
    try {
      const [profileRes, orgsRes] = await Promise.all([
        participantService.getProfile(),
        participantService.getOrganizers()
      ]);
      if (profileRes.success) {
        const u = profileRes.data.user;
        setFormData({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          contactNumber: u.contactNumber || '',
          collegeName: u.collegeName || ''
        });
        setInterests(u.interests || []);
        setFollowedOrganizers((u.followedOrganizers || []).map(o => o._id || o));
      }
      if (orgsRes.success) {
        setOrganizers(orgsRes.data?.organizers || []);
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const toggleInterest = (id) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleFollow = (orgId) => {
    setFollowedOrganizers(prev =>
      prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
    );
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await participantService.updateProfile({
        ...formData,
        interests,
        followedOrganizers
      });
      if (response.success) {
        updateUser({ ...formData, interests, followedOrganizers });
        toast.success('Profile updated successfully!');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (response.success) {
        toast.success('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
      }
    } catch {
      toast.error('Failed to change password. Check your current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (fetchingProfile) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <h1>My Profile</h1>

      <div className="profile-grid">
        <div className="profile-card">
          <h2><FiUser /> Personal Information</h2>
          <form onSubmit={handleProfileSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label><FiMail /> Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="disabled"
              />
              <small>Email cannot be changed</small>
            </div>

            <div className="form-group">
              <label><FiPhone /> Contact Number</label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="form-group">
              <label>College/Organization</label>
              {user?.participantType === 'NON_IIIT' ? (
                <input
                  type="text"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleChange}
                />
              ) : (
                <input type="text" value="IIIT Hyderabad" disabled className="disabled" />
              )}
            </div>

            <div className="participant-type">
              <strong>Account Type:</strong>
              <span className={`type-badge ${user?.participantType?.toLowerCase()}`}>
                {user?.participantType === 'IIIT' ? 'IIIT Student' : 'External Participant'}
              </span>
            </div>

            {/* Interests Section */}
            <div className="preferences-section">
              <h3><FiStar /> Selected Interests</h3>
              <div className="interest-chips">
                {INTEREST_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`interest-chip ${interests.includes(opt.id) ? 'selected' : ''}`}
                    onClick={() => toggleInterest(opt.id)}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Followed Clubs Section */}
            <div className="preferences-section">
              <h3><FiHeart /> Followed Clubs</h3>
              {organizers.length === 0 ? (
                <p className="no-clubs">No clubs available to follow.</p>
              ) : (
                <div className="clubs-list">
                  {organizers.map(org => (
                    <button
                      key={org._id}
                      type="button"
                      className={`club-chip ${followedOrganizers.includes(org._id) ? 'followed' : ''}`}
                      onClick={() => toggleFollow(org._id)}
                    >
                      <span className="club-avatar">{org.name?.[0]?.toUpperCase()}</span>
                      <span className="club-name">{org.name}</span>
                      <span className="club-category">{org.category}</span>
                      {followedOrganizers.includes(org._id) 
                        ? <FiHeart className="heart-icon filled" /> 
                        : <FiHeart className="heart-icon" />
                      }
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="save-btn" disabled={loading}>
              <FiSave /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="profile-card">
          <h2><FiLock /> Security</h2>
          
          {!showPasswordForm ? (
            <button 
              className="change-password-toggle"
              onClick={() => setShowPasswordForm(true)}
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="password-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowPasswordForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={changingPassword}>
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
