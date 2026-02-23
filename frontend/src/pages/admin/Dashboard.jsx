import { useState, useEffect } from 'react';
import { adminService } from '../../services';
import { FiUsers, FiCalendar, FiUserPlus, FiToggleLeft, FiTrash2, FiKey } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [organizers, setOrganizers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrganizer, setNewOrganizer] = useState({
    name: '',
    email: '',
    category: 'Cultural'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, orgsRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getAllOrganizers()
      ]);
      if (dashRes.success) setStats(dashRes.data.stats || {});
      if (orgsRes.success) setOrganizers(orgsRes.data.organizers || []);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganizer = async (e) => {
    e.preventDefault();
    try {
      const response = await adminService.createOrganizer(newOrganizer);
      if (response.success) {
        toast.success(`Organizer created! Password: ${response.data.tempPassword}`);
        setShowCreateModal(false);
        setNewOrganizer({ name: '', email: '', category: 'Cultural' });
        fetchData();
      }
    } catch {
      toast.error('Failed to create organizer');
    }
  };

  const toggleStatus = async (orgId) => {
    try {
      const response = await adminService.toggleOrganizerStatus(orgId);
      if (response.success) {
        toast.success('Status updated');
        fetchData();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const resetPassword = async (orgId) => {
    if (!window.confirm('Reset password for this organizer?')) return;
    try {
      const response = await adminService.resetOrganizerPassword(orgId);
      if (response.success) {
        toast.success(`New password: ${response.data.newPassword}`);
      }
    } catch {
      toast.error('Failed to reset password');
    }
  };

  const deleteOrganizer = async (orgId) => {
    if (!window.confirm('Are you sure you want to delete this organizer?')) return;
    try {
      await adminService.deleteOrganizer(orgId);
      toast.success('Organizer deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete organizer');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          <FiUserPlus /> Add Organizer
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <FiUsers className="stat-icon" />
          <div>
            <h3>{stats.totalOrganizers || 0}</h3>
            <p>Total Organizers</p>
          </div>
        </div>
        <div className="stat-card">
          <FiCalendar className="stat-icon" />
          <div>
            <h3>{stats.totalEvents || 0}</h3>
            <p>Total Events</p>
          </div>
        </div>
        <div className="stat-card">
          <FiUsers className="stat-icon users" />
          <div>
            <h3>{stats.totalParticipants || 0}</h3>
            <p>Total Participants</p>
          </div>
        </div>
      </div>

      {/* Organizers Table */}
      <section className="organizers-section">
        <h2>Manage Organizers</h2>
        <div className="organizers-table">
          <div className="table-header">
            <span>Name</span>
            <span>Email</span>
            <span>Category</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {organizers.map((org) => (
            <div key={org._id} className="table-row">
              <span className="org-name">{org.name}</span>
              <span>{org.email}</span>
              <span className="category-badge">{org.category}</span>
              <span>
                <span className={`status ${org.isActive ? 'active' : 'inactive'}`}>
                  {org.isActive ? 'Active' : 'Inactive'}
                </span>
              </span>
              <span className="actions">
                <button onClick={() => toggleStatus(org._id)} title="Toggle Status">
                  <FiToggleLeft />
                </button>
                <button onClick={() => resetPassword(org._id)} title="Reset Password">
                  <FiKey />
                </button>
                <button onClick={() => deleteOrganizer(org._id)} className="delete" title="Delete">
                  <FiTrash2 />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add New Organizer</h2>
            <form onSubmit={handleCreateOrganizer}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newOrganizer.name}
                  onChange={(e) => setNewOrganizer({...newOrganizer, name: e.target.value})}
                  required
                  placeholder="Club or Organization Name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newOrganizer.email}
                  onChange={(e) => setNewOrganizer({...newOrganizer, email: e.target.value})}
                  required
                  placeholder="organizer@email.com"
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={newOrganizer.category}
                  onChange={(e) => setNewOrganizer({...newOrganizer, category: e.target.value})}
                >
                  <option value="Cultural">Cultural</option>
                  <option value="Technical">Technical</option>
                  <option value="Sports">Sports</option>
                  <option value="Literary">Literary</option>
                  <option value="Social">Social</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit">Create Organizer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
