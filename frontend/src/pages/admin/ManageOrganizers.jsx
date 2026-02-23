import { useState, useEffect } from 'react';
import { FiUsers, FiUserPlus, FiToggleLeft, FiToggleRight, FiTrash2, FiKey, FiSearch, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminService } from '../../services';
import './ManageOrganizers.css';

const ManageOrganizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCredentials, setShowCredentials] = useState(null);
  const [resetModal, setResetModal] = useState({ show: false, orgId: null, orgName: '', customPassword: '' });
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cultural',
    description: '',
    contactEmail: '',
    contactNumber: ''
  });

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const response = await adminService.getAllOrganizers();
      if (response.success) {
        setOrganizers(response.data.organizers || []);
      }
    } catch {
      toast.error('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await adminService.createOrganizer(formData);
      if (response.success) {
        setShowCredentials(response.data.credentials);
        setShowCreateModal(false);
        setFormData({ name: '', category: 'Cultural', description: '', contactEmail: '', contactNumber: '' });
        fetchOrganizers();
        toast.success('Organizer created!');
      }
    } catch {
      toast.error('Failed to create organizer');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const response = await adminService.toggleOrganizerStatus(id);
      if (response.success) {
        toast.success('Status updated');
        fetchOrganizers();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleResetPasswordClick = (id, name) => {
    setResetModal({ show: true, orgId: id, orgName: name, customPassword: '' });
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to reset the password for ${resetModal.orgName}?`)) return;
    
    try {
      const response = await adminService.resetOrganizerPassword(resetModal.orgId, resetModal.customPassword);
      if (response.success) {
        setShowCredentials(response.data.credentials);
        toast.success('Password reset!');
        setResetModal({ show: false, orgId: null, orgName: '', customPassword: '' });
      }
    } catch {
      toast.error('Failed to reset password');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      await adminService.deleteOrganizer(id);
      toast.success('Organizer deleted');
      fetchOrganizers();
    } catch {
      toast.error('Failed to delete organizer');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const filtered = organizers.filter(org =>
    org.name?.toLowerCase().includes(search.toLowerCase()) ||
    org.email?.toLowerCase().includes(search.toLowerCase()) ||
    org.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading organizers...</p>
      </div>
    );
  }

  return (
    <div className="manage-organizers">
      <div className="page-header">
        <div>
          <h1><FiUsers /> Manage Clubs</h1>
          <p>{organizers.length} organizer{organizers.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          <FiUserPlus /> Add Club
        </button>
      </div>

      {/* Search */}
      <div className="search-bar">
        <FiSearch />
        <input
          type="text"
          placeholder="Search by name, email, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Organizers List */}
      <div className="organizers-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No organizers found.</p>
          </div>
        ) : (
          filtered.map(org => (
            <div key={org._id} className={`org-card ${!org.isActive ? 'disabled' : ''}`}>
              <div className="org-card-header">
                <div className="org-avatar">{org.name?.[0]?.toUpperCase() || '?'}</div>
                <div className="org-info">
                  <h3>{org.name}</h3>
                  <span className="org-email">{org.email}</span>
                </div>
                <span className={`status-badge ${org.isActive ? 'active' : 'inactive'}`}>
                  {org.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>

              <div className="org-meta">
                <span className="category-badge">{org.category}</span>
                {org.contactEmail && <span className="meta-item">📧 {org.contactEmail}</span>}
                {org.contactNumber && <span className="meta-item">📱 {org.contactNumber}</span>}
              </div>

              {org.description && (
                <p className="org-description">{org.description}</p>
              )}

              <div className="org-actions">
                <button
                  className={`action-btn ${org.isActive ? 'disable' : 'enable'}`}
                  onClick={() => handleToggleStatus(org._id)}
                  title={org.isActive ? 'Disable' : 'Enable'}
                >
                  {org.isActive ? <><FiToggleRight /> Disable</> : <><FiToggleLeft /> Enable</>}
                </button>
                <button
                  className="action-btn reset"
                  onClick={() => handleResetPasswordClick(org._id, org.name)}
                  title="Reset Password"
                >
                  <FiKey /> Reset
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(org._id, org.name)}
                  title="Delete"
                >
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Password Reset Modal */}
      {resetModal.show && (
        <div className="modal-overlay" onClick={() => setResetModal({ ...resetModal, show: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Reset Password for {resetModal.orgName}</h2>
            <form onSubmit={handleConfirmReset}>
              <div className="form-group">
                <label>Custom Password (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank to randomly auto-generate..."
                  value={resetModal.customPassword}
                  onChange={(e) => setResetModal({ ...resetModal, customPassword: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setResetModal({ ...resetModal, show: false })}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" style={{ background: '#f59e0b' }}>
                  <FiKey /> Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add New Club / Organizer</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Club Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="e.g., Robotics Club"
                />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Cultural">Cultural</option>
                  <option value="Technical">Technical</option>
                  <option value="Sports">Sports</option>
                  <option value="Literary">Literary</option>
                  <option value="Social">Social</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the club..."
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                    placeholder="contact@club.com"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Number</label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Create Organizer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentials && (
        <div className="modal-overlay" onClick={() => setShowCredentials(null)}>
          <div className="modal-content credentials-modal" onClick={e => e.stopPropagation()}>
            <h2>🔑 Generated Credentials</h2>
            <p className="cred-notice">Share these credentials with the organizer securely. The password cannot be retrieved again.</p>
            <div className="credential-row">
              <label>Email</label>
              <div className="cred-value">
                <code>{showCredentials.email}</code>
                <button onClick={() => copyToClipboard(showCredentials.email)}><FiCopy /></button>
              </div>
            </div>
            <div className="credential-row">
              <label>Password</label>
              <div className="cred-value">
                <code>{showCredentials.password}</code>
                <button onClick={() => copyToClipboard(showCredentials.password)}><FiCopy /></button>
              </div>
            </div>
            <button className="close-modal-btn" onClick={() => setShowCredentials(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageOrganizers;
