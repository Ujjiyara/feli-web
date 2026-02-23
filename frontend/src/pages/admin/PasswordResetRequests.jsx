import { useState, useEffect } from 'react';
import { adminService } from '../../services';
import { FiCheck, FiX, FiClock, FiUser, FiMessageSquare, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './PasswordResetRequests.css';

const PasswordResetRequests = () => {
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showNoteFor, setShowNoteFor] = useState(null);
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await adminService.getPasswordResetRequests();
      setRequests(response.data?.requests || []);
    } catch {
      toast.error('Failed to fetch password reset requests');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (requestId, action) => {
    setProcessing(requestId);
    try {
      const response = await adminService.processPasswordResetRequest(requestId, action, adminNote, customPassword);
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      
      if (action === 'approve' && response.data?.credentials?.password) {
        const reqData = requests.find(r => r._id === requestId);
        setCredentials({
          organizerName: reqData?.organizerId?.name || 'Organizer',
          organizerEmail: response.data.credentials.email,
          newPassword: response.data.credentials.password
        });
      }
      
      setAdminNote('');
      setCustomPassword('');
      setShowNoteFor(null);
      fetchRequests();
    } catch {
      toast.error(`Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="status-badge pending"><FiClock /> Pending</span>;
      case 'APPROVED':
        return <span className="status-badge approved"><FiCheck /> Approved</span>;
      case 'REJECTED':
        return <span className="status-badge rejected"><FiX /> Rejected</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) {
    return <div className="pwr-page"><div className="loading">Loading requests...</div></div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const historyRequests = requests.filter(r => r.status !== 'PENDING');
  const displayedRequests = activeTab === 'PENDING' ? pendingRequests : historyRequests;

  return (
    <div className="pwr-page">
      <div className="pwr-header">
        <h1><FiAlertCircle /> Password Reset Requests</h1>
        <p>Review and process organizer password reset requests</p>
      </div>

      <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => setActiveTab('PENDING')}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: activeTab === 'PENDING' ? '#3b82f6' : 'transparent', color: activeTab === 'PENDING' ? 'white' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Pending ({pendingRequests.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
          onClick={() => setActiveTab('HISTORY')}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: activeTab === 'HISTORY' ? '#3b82f6' : 'transparent', color: activeTab === 'HISTORY' ? 'white' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
        >
          History ({historyRequests.length})
        </button>
      </div>

      {credentials && (
        <div className="credentials-modal-overlay" onClick={() => setCredentials(null)}>
          <div className="credentials-modal" onClick={e => e.stopPropagation()}>
            <h2>New Password Generated</h2>
            <div className="credential-row">
              <label>Organizer</label>
              <span>{credentials.organizerName}</span>
            </div>
            <div className="credential-row">
              <label>Email</label>
              <code>{credentials.organizerEmail}</code>
            </div>
            <div className="credential-row">
              <label>New Password</label>
              <code>{credentials.newPassword}</code>
              <button onClick={() => { navigator.clipboard.writeText(credentials.newPassword); toast.success('Copied!'); }}>
                Copy
              </button>
            </div>
            <p className="credential-note">Share these credentials with the organizer securely.</p>
            <button className="close-modal-btn" onClick={() => setCredentials(null)}>Done</button>
          </div>
        </div>
      )}

      {displayedRequests.length === 0 ? (
        <div className="empty-state">
          <FiMessageSquare size={48} />
          <h3>No requests found</h3>
          <p>{activeTab === 'PENDING' ? 'When organizers request a password reset, they will appear here.' : 'No processed requests found in history.'}</p>
        </div>
      ) : (
        <div className="requests-list">
          {displayedRequests.map(req => (
            <div key={req._id} className={`request-card ${req.status?.toLowerCase()}`}>
              <div className="request-header">
                <div className="request-info">
                  <h3><FiUser /> {req.organizerId?.name || 'Unknown Organizer'}</h3>
                  <span className="request-email">{req.organizerId?.email}</span>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div className="request-body">
                <div className="request-reason">
                  <strong>Reason:</strong>
                  <p>{req.reason}</p>
                </div>
                <div className="request-date">
                  Requested: {new Date(req.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
                {req.adminNote && (
                  <div className="admin-note">
                    <strong>Admin Note:</strong> {req.adminNote}
                  </div>
                )}
              </div>

              {req.status === 'PENDING' && (
                <div className="request-actions">
                  {showNoteFor === req._id ? (
                    <div className="note-input-area">
                      <input
                        type="text"
                        placeholder="Add a note (optional)..."
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        style={{ marginBottom: '10px' }}
                      />
                      <input
                        type="text"
                        placeholder="Custom password (optional, leave blank to auto-generate)..."
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                      />
                      <div className="action-buttons">
                        <button
                          className="approve-btn"
                          onClick={() => handleProcess(req._id, 'approve')}
                          disabled={processing === req._id}
                        >
                          <FiCheck /> {processing === req._id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => handleProcess(req._id, 'reject')}
                          disabled={processing === req._id}
                        >
                          <FiX /> Reject
                        </button>
                        <button
                          className="cancel-action-btn"
                          onClick={() => { setShowNoteFor(null); setAdminNote(''); setCustomPassword(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="review-btn" onClick={() => setShowNoteFor(req._id)}>
                      Review Request
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordResetRequests;
