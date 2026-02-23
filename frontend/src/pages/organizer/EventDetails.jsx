import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { organizerService } from '../../services';
import { FiUsers, FiMail, FiDownload, FiCheck, FiX, FiArrowLeft, FiEdit, FiTrash2, FiCamera, FiSearch } from 'react-icons/fi';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { formatDateTime as formatDate } from '../../utils/dateUtils';
import './EventDetails.css';

const OrganizerEventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [scanTicketId, setScanTicketId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    fetchEventData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEventData = async () => {
    try {
      const [eventRes, regsRes] = await Promise.all([
        organizerService.getEventDetails(id),
        organizerService.getEventRegistrations(id)
      ]);
      if (eventRes.success) {
        setEvent(eventRes.data.event);
        setAnalytics(eventRes.data.analytics);
      }
      if (regsRes.success) setRegistrations(regsRes.data.registrations || []);
    } catch {
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      let response;
      if (newStatus === 'PUBLISHED') {
        response = await organizerService.publishEvent(id);
      } else if (newStatus === 'CANCELLED') {
        if (!window.confirm('Are you sure you want to cancel this event?')) return;
        response = await organizerService.cancelEvent(id);
      } else if (newStatus === 'ONGOING' || newStatus === 'COMPLETED') {
        if (newStatus === 'COMPLETED' && !window.confirm('Are you sure you want to mark this event as completed?')) return;
        response = await organizerService.updateEventStatus(id, newStatus);
      }
      if (response?.success) {
        toast.success(`Event ${newStatus.toLowerCase()}`);
        fetchEventData();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleCheckIn = async (registrationId) => {
    try {
      const response = await organizerService.markAttendance(id, registrationId);
      if (response.success) {
        toast.success('Marked as attended');
        fetchEventData();
      }
    } catch {
      toast.error('Failed to mark attendance');
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanTicketId.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const response = await organizerService.markAttendance(id, null, scanTicketId.trim());
      if (response.success) {
        setScanResult({ success: true, data: response.data });
        toast.success('Attendance marked!');
        setScanTicketId('');
        fetchEventData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to mark attendance';
      setScanResult({ success: false, message: msg, data: err.response?.data?.data });
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const processScanResult = async (decodedText) => {
    // Prevent scanning the same code multiple times rapidly
    if (scanning) return;
    
    setScanning(true);
    setScanResult(null);
    setScanTicketId(decodedText);
    
    try {
      // Try resolving it as a direct ticket ID
      let ticketIdToVerify = decodedText;
      
      // If it's a JSON string from our system QR code
      if (decodedText.startsWith('{') && decodedText.includes('ticketId')) {
        try {
          const parsed = JSON.parse(decodedText);
          ticketIdToVerify = parsed.ticketId;
          setScanTicketId(ticketIdToVerify);
        } catch {
          // ignore parse error, fallback to raw text
        }
      }
      
      const response = await organizerService.markAttendance(id, null, ticketIdToVerify);
      if (response.success) {
        setScanResult({ success: true, data: response.data });
        toast.success('Attendance marked!');
        fetchEventData();
        
        // Hide success message after 3 seconds for continuous scanning
        setTimeout(() => {
          setScanResult(null);
          setScanTicketId('');
        }, 3000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to mark attendance';
      setScanResult({ success: false, message: msg, data: err.response?.data?.data });
      toast.error(msg);
      
      // Keep error visible for 5 seconds
      setTimeout(() => {
        setScanResult(null);
        setScanTicketId('');
      }, 5000);
    } finally {
      setScanning(false);
    }
  };

  // Scanner Component
  const QRScanner = () => {
    useEffect(() => {
      const scanner = new Html5QrcodeScanner('qr-reader', { 
        qrbox: { width: 250, height: 250 }, 
        fps: 5,
      });
    
      scanner.render(processScanResult, () => {
        // Ignore normal scan errors (when it's just looking for a code)
      });
      
      return () => {
        scanner.clear().catch(console.error);
      };
    }, []);

    return <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', background: 'white' }}></div>;
  };

  const exportToCSV = () => {
    if (registrations.length === 0) {
      toast.error('No registrations to export');
      return;
    }

    // Build CSV content
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Attended', 'Registered At'];
    const rows = registrations.map(reg => [
      `${reg.userId?.firstName || ''} ${reg.userId?.lastName || ''}`,
      reg.userId?.email || '',
      reg.userId?.contactNumber || '',
      reg.status,
      reg.attended ? 'Yes' : 'No',
      new Date(reg.createdAt).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name}_registrations.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export complete');
  };



  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="not-found">
        <h2>Event not found</h2>
        <button onClick={() => navigate('/organizer/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="org-event-details">
      <button className="back-btn" onClick={() => navigate('/organizer/dashboard')}>
        <FiArrowLeft /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="event-header">
        <div className="event-title">
          <h1>{event.name}</h1>
          <span className={`status-badge ${event.status.toLowerCase()}`}>{event.status}</span>
        </div>
        <div className="event-actions">
          {['DRAFT', 'PUBLISHED'].includes(event.status) && (
            <button className="action-btn edit" onClick={() => navigate(`/organizer/events/${id}/edit`)}>
              <FiEdit /> Edit
            </button>
          )}
          {event.status === 'DRAFT' && (
            <button className="action-btn publish" onClick={() => handleStatusChange('PUBLISHED')}>
              Publish Event
            </button>
          )}
          {event.status === 'PUBLISHED' && (
            <>
              <button className="action-btn" style={{ background: '#cce5ff', color: '#004085' }} onClick={() => handleStatusChange('ONGOING')}>
                Start Event (Ongoing)
              </button>
              <button className="action-btn publish" onClick={() => handleStatusChange('COMPLETED')}>
                <FiCheck /> Mark as Completed
              </button>
              <button className="action-btn cancel" onClick={() => handleStatusChange('CANCELLED')}>
                <FiX /> Cancel Event
              </button>
            </>
          )}
          {event.status === 'ONGOING' && (
            <button className="action-btn publish" onClick={() => handleStatusChange('COMPLETED')}>
              <FiCheck /> Mark as Completed
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'details' ? 'active' : ''} 
          onClick={() => setActiveTab('details')}
        >
          Event Details
        </button>
        <button 
          className={activeTab === 'participants' ? 'active' : ''} 
          onClick={() => setActiveTab('participants')}
        >
          <FiUsers /> Participants ({registrations.length})
        </button>
        <button 
          className={activeTab === 'scanner' ? 'active' : ''} 
          onClick={() => setActiveTab('scanner')}
        >
          <FiCamera /> QR Scanner
        </button>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="details-tab">
          <div className="detail-card">
            <h3>Event Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Type</label>
                <p>{event.type}</p>
              </div>
              <div className="detail-item">
                <label>Eligibility</label>
                <p>{event.eligibility}</p>
              </div>
              <div className="detail-item">
                <label>Start Date</label>
                <p>{formatDate(event.startDate)}</p>
              </div>
              <div className="detail-item">
                <label>End Date</label>
                <p>{formatDate(event.endDate)}</p>
              </div>
              <div className="detail-item">
                <label>Venue</label>
                <p>{event.venue || 'Not specified'}</p>
              </div>
              <div className="detail-item">
                <label>Registration Fee</label>
                <p>₹{event.registrationFee || 0}</p>
              </div>
              <div className="detail-item">
                <label>Registrations</label>
                <p>{registrations.length} / {event.registrationLimit || '∞'}</p>
              </div>
              <div className="detail-item">
                <label>Registration Deadline</label>
                <p>{event.registrationDeadline ? formatDate(event.registrationDeadline) : 'No deadline'}</p>
              </div>
            </div>
          </div>
          
          {/* Analytics Section */}
          <div className="detail-card">
            <h3>Analytics Overview</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Registrations / Sales</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <p style={{ margin: 0 }}>{analytics?.totalRegistrations || 0} Total</p>
                  <span style={{ fontSize: '0.8rem', color: '#28a745' }}>{analytics?.confirmedRegistrations || 0} Confirmed</span>
                </div>
              </div>
              <div className="detail-item">
                <label>Attendance Status</label>
                <p>{analytics?.attendance || 0} Checked In</p>
              </div>
              <div className="detail-item">
                <label>Total Revenue</label>
                <p style={{ color: '#28a745', fontWeight: 'bold' }}>
                  ₹{analytics?.revenue?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
          
          {event.description && (
            <div className="description">
              <label>Description</label>
              <p>{event.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Participants Tab */}
      {activeTab === 'participants' && (
        <div className="participants-tab">
          <div className="participants-header">
            <h3><FiUsers /> Registered Participants</h3>
            <button className="export-btn" onClick={exportToCSV}>
              <FiDownload /> Export CSV
            </button>
          </div>

          {registrations.length === 0 ? (
            <div className="empty-state">
              <p>No registrations yet</p>
            </div>
          ) : (
            <div className="participants-table">
              <div className="table-header">
                <span>Name</span>
                <span>Email</span>
                <span>Reg Date</span>
                <span>Payment</span>
                <span>Team</span>
                <span>Attended</span>
                <span>Actions</span>
              </div>
              {registrations.map((reg) => (
                <div key={reg._id} className="table-row">
                  <span className="name">
                    {reg.userId?.firstName} {reg.userId?.lastName}
                  </span>
                  <span>{reg.userId?.email}</span>
                  <span>{new Date(reg.createdAt).toLocaleDateString()}</span>
                  <span>
                    {reg.paymentAmount ? `₹${reg.paymentAmount}` : 'Free'}
                  </span>
                  <span>
                    {reg.teamId ? reg.teamId.name || 'Yes' : '-'}
                  </span>
                  <span>
                    {reg.attended ? (
                      <span className="attended-yes"><FiCheck /> Yes</span>
                    ) : (
                      <span className="attended-no">No</span>
                    )}
                  </span>
                  <span className="actions">
                    {!reg.attended && reg.status === 'CONFIRMED' && (
                      <button 
                        className="checkin-btn" 
                        onClick={() => handleCheckIn(reg._id)}
                        title="Mark as attended"
                      >
                        <FiCheck /> Check In
                      </button>
                    )}
                    <button className="email-btn" title="Send email">
                      <FiMail />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Scanner Tab */}
      {activeTab === 'scanner' && (
        <div className="scanner-tab">
          <div className="scanner-card">
            <div className="scanner-icon">
              <FiCamera size={48} />
            </div>
            <h3>Scan QR Code or Enter Ticket ID</h3>
            
            <div className="scanner-toggle-container" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <button 
                className={`btn ${cameraActive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCameraActive(true)}
              >
                Use Camera
              </button>
              <button 
                className={`btn ${!cameraActive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setCameraActive(false);
                  setScanResult(null);
                }}
              >
                Manual Entry
              </button>
            </div>

            {cameraActive ? (
              <div className="camera-container" style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '12px', border: '3px solid #000', marginBottom: '1.5rem' }}>
                <QRScanner />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>Point your camera at the participant's event QR code.</p>
              </div>
            ) : (
              <>
                <p>Enter the ticket ID manually to mark attendance</p>
                <form onSubmit={handleScanSubmit} className="scanner-form">
              <div className="scanner-input">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Enter Ticket ID (e.g. FEL-NOR-A1B2C3D4)"
                  value={scanTicketId}
                  onChange={(e) => setScanTicketId(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={scanning || !scanTicketId.trim()}>
                {scanning ? 'Checking...' : 'Mark Attendance'}
              </button>
            </form>
            </>
            )}

            {scanResult && (
              <div className={`scan-result ${scanResult.success ? 'success' : 'error'}`}>
                {scanResult.success ? (
                  <>
                    <FiCheck size={24} />
                    <div>
                      <strong>✅ Checked In!</strong>
                      <p>{scanResult.data?.registration?.participant?.firstName} {scanResult.data?.registration?.participant?.lastName}</p>
                      <small>Ticket: {scanResult.data?.registration?.ticketId}</small>
                    </div>
                  </>
                ) : (
                  <>
                    <FiX size={24} />
                    <div>
                      <strong>❌ {scanResult.message}</strong>
                      {scanResult.data?.participant && (
                        <p>Participant: {scanResult.data.participant.firstName} {scanResult.data.participant.lastName}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="attendance-stats">
              <div className="stat">
                <strong>{registrations.filter(r => r.attended).length}</strong>
                <span>Checked In</span>
              </div>
              <div className="stat">
                <strong>{registrations.filter(r => !r.attended && r.status === 'CONFIRMED').length}</strong>
                <span>Pending</span>
              </div>
              <div className="stat">
                <strong>{registrations.length}</strong>
                <span>Total</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerEventDetails;
