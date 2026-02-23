import { useState, useEffect } from 'react';
import { FiUser, FiMail, FiPhone, FiEdit2, FiSave, FiLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { organizerService } from '../../services';
import './OrganizerProfile.css';

const OrganizerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [requestingReset, setRequestingReset] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/organizer/profile');
      if (response.data.success) {
        setProfile(response.data.data.organizer);
        setFormData(response.data.data.organizer);
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await api.put('/organizer/profile', {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        contactEmail: formData.contactEmail,
        contactNumber: formData.contactNumber,
        discordWebhook: formData.discordWebhook
      });
      if (response.data.success) {
        setProfile(response.data.data.organizer);
        setEditing(false);
        toast.success('Profile updated!');
      }
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setRequestingReset(true);
    try {
      const response = await organizerService.requestPasswordReset(resetReason);
      if (response.success) {
        toast.success('Password reset request sent to Admin!');
        setShowResetModal(false);
        setResetReason('');
      } else {
        toast.error(response.message || 'Failed to send request');
      }
    } catch {
      toast.error('Failed to send request');
    } finally {
      setRequestingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="organizer-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h1>{profile?.name || 'Organizer'}</h1>
          <span className="category-tag">{profile?.category}</span>
        </div>
        <button
          className={`edit-btn ${editing ? 'saving' : ''}`}
          onClick={editing ? handleSave : () => setEditing(true)}
        >
          {editing ? <><FiSave /> Save</> : <><FiEdit2 /> Edit</>}
        </button>
      </div>

      <div className="profile-grid">
        {/* Info Section */}
        <div className="profile-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Organization Info</h2>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => setShowResetModal(true)}
            >
              Request Password Reset
            </button>
          </div>

          <div className="field-group">
            <label><FiUser /> Name</label>
            {editing ? (
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            ) : (
              <p>{profile?.name}</p>
            )}
          </div>

          <div className="field-group">
            <label><FiMail /> Login Email</label>
            <p className="read-only">{profile?.email}</p>
          </div>

          <div className="field-group">
            <label>Category</label>
            {editing ? (
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="Cultural">Cultural</option>
                <option value="Technical">Technical</option>
                <option value="Sports">Sports</option>
                <option value="Literary">Literary</option>
                <option value="Social">Social</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <p>{profile?.category}</p>
            )}
          </div>

          <div className="field-group">
            <label>Description</label>
            {editing ? (
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                placeholder="Tell participants about your club..."
              />
            ) : (
              <p>{profile?.description || <span className="placeholder-text">No description set</span>}</p>
            )}
          </div>
        </div>

        {/* Contact Section */}
        <div className="profile-card">
          <h2>Contact Details</h2>

          <div className="field-group">
            <label><FiMail /> Contact Email</label>
            {editing ? (
              <input
                type="email"
                value={formData.contactEmail || ''}
                onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                placeholder="contact@club.com"
              />
            ) : (
              <p>{profile?.contactEmail || <span className="placeholder-text">Not set</span>}</p>
            )}
          </div>

          <div className="field-group">
            <label><FiPhone /> Contact Number</label>
            {editing ? (
              <input
                type="text"
                value={formData.contactNumber || ''}
                onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                placeholder="+91 XXXXXXXXXX"
              />
            ) : (
              <p>{profile?.contactNumber || <span className="placeholder-text">Not set</span>}</p>
            )}
          </div>

          <div className="field-group">
            <label><FiLink /> Discord Webhook</label>
            {editing ? (
              <input
                type="url"
                value={formData.discordWebhook || ''}
                onChange={(e) => setFormData({...formData, discordWebhook: e.target.value})}
                placeholder="https://discord.com/api/webhooks/..."
              />
            ) : (
              <p>
                {profile?.discordWebhook
                  ? <span className="webhook-set">✓ Configured</span>
                  : <span className="placeholder-text">Not configured</span>
                }
              </p>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="profile-actions">
          <button className="cancel-btn" onClick={() => {
            setEditing(false);
            setFormData(profile);
          }}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave}>
            <FiSave /> Save Changes
          </button>
        </div>
      )}

      {/* Password Reset Request Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Request Password Reset</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Submit a request to the Admin to review and reset your password. Once approved, the Admin will share the new password with you securely.
            </p>
            <form onSubmit={handleRequestReset}>
              <div className="form-group">
                <label>Reason for Reset (Optional)</label>
                <textarea
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="E.g., Former organizer left the club, passing on access to the newly appointed members."
                  rows={4}
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e0e0e0', borderRadius: '8px' }}
                />
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => setShowResetModal(false)}
                  disabled={requestingReset}
                  style={{ flex: 1, padding: '0.8rem', background: '#f0f0f0', border: 'none', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn" 
                  disabled={requestingReset}
                  style={{ flex: 1, padding: '0.8rem', background: 'var(--hot-pink)', color: 'white', border: '3px solid #000', borderRadius: '8px' }}
                >
                  {requestingReset ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerProfile;
