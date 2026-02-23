import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { participantService } from '../../services';
import { FiCalendar, FiMapPin, FiUser, FiDownload, FiArrowLeft, FiUpload } from 'react-icons/fi';
import { formatDate, formatTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import './TicketView.css';

const TicketView = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentProofPreview, setPaymentProofPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTicket = async () => {
    try {
      const response = await participantService.getTicket(id);
      if (response.success) {
        setTicket(response.data);
      }
    } catch {
      toast.error('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };



  const downloadTicket = () => {
    // Create a printable version
    window.print();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!paymentProofPreview) {
      toast.error('Please select an image first');
      return;
    }
    
    setUploading(true);
    try {
      const response = await participantService.uploadPaymentProof(id, paymentProofPreview);
      if (response.success) {
        toast.success(response.message || 'Payment proof uploaded');
        fetchTicket(); // Refresh to show uploaded state
        setPaymentProofPreview('');
      }
    } catch {
      toast.error('Failed to upload payment proof');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="ticket-not-found">
        <h2>Ticket not found</h2>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="ticket-page">
      <Link to="/dashboard" className="back-link">
        <FiArrowLeft /> Back to Dashboard
      </Link>

      <div className="ticket-card">
        <div className="ticket-header">
          <span className="event-type">{ticket.event?.type || 'EVENT'}</span>
          <h1>{ticket.event?.name}</h1>
          <p className="organizer">by {ticket.event?.organizer}</p>
        </div>

        <div className="ticket-qr">
          {ticket.qrCode ? (
            <img src={ticket.qrCode} alt="QR Code" />
          ) : (
            <div className="qr-placeholder">QR Code</div>
          )}
          <p className="ticket-id">{ticket.ticketId}</p>
        </div>

        <div className="ticket-details">
          <div className="detail-row">
            <FiUser />
            <div>
              <strong>Attendee</strong>
              <p>{ticket.participant?.firstName} {ticket.participant?.lastName}</p>
              <p className="email">{ticket.participant?.email}</p>
            </div>
          </div>

          <div className="detail-row">
            <FiCalendar />
            <div>
              <strong>Date & Time</strong>
              <p>Start: {formatDate(ticket.event?.startDate)}, {formatTime(ticket.event?.startDate)}</p>
              <p>End: {formatDate(ticket.event?.endDate)}, {formatTime(ticket.event?.endDate)}</p>
            </div>
          </div>

          {ticket.event?.venue && (
            <div className="detail-row">
              <FiMapPin />
              <div>
                <strong>Venue</strong>
                <p>{ticket.event.venue}</p>
              </div>
            </div>
          )}
        </div>

        <div className="ticket-status">
          <span className={`status-badge ${ticket.status?.toLowerCase()}`}>
            {ticket.status}
          </span>
          {ticket.attended && (
            <span className="attended-badge">✓ Attended</span>
          )}
        </div>

        {ticket.status === 'PENDING' && ticket.merchandiseOrder && (
          <div className="payment-proof-section" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,45,117,0.1)', borderRadius: '12px', border: '1px solid var(--hot-pink)' }}>
            <h3 style={{ color: 'var(--hot-pink)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiUpload /> Payment Proof Required
            </h3>
            
            {ticket.merchandiseOrder.paymentProof ? (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem' }}>Your payment proof has been uploaded. Waiting for organizer approval.</p>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(0, 255, 255, 0.2)', display: 'inline-block' }}>
                  <img src={ticket.merchandiseOrder.paymentProof} alt="Payment Proof" style={{ maxWidth: '200px', maxHeight: '300px', borderRadius: '4px', objectFit: 'contain' }} />
                </div>
              </div>
            ) : (
              <form onSubmit={handleUploadProof}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Please upload a screenshot of your successful transaction to complete your merchandise order.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                      required
                    />
                    <button 
                      type="submit" 
                      disabled={uploading || !paymentProofPreview}
                      style={{ background: 'var(--hot-pink)', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: (uploading || !paymentProofPreview) ? 'not-allowed' : 'pointer' }}
                    >
                      {uploading ? 'Uploading...' : 'Submit Proof'}
                    </button>
                  </div>
                  
                  {paymentProofPreview && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Image Preview:</p>
                      <img src={paymentProofPreview} alt="Selected proof" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.3)' }} />
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {ticket.status !== 'PENDING' && (
          <button className="download-btn" onClick={downloadTicket} style={{ marginTop: '2rem' }}>
            <FiDownload /> Download Ticket
          </button>
        )}
      </div>

      <div className="ticket-instructions">
        <h3>Important Instructions</h3>
        <ul>
          <li>Present this QR code at the event entrance</li>
          <li>Keep a screenshot or printout ready</li>
          <li>Ticket is non-transferable</li>
          <li>Arrive 15 minutes before the event starts</li>
        </ul>
      </div>
    </div>
  );
};

export default TicketView;
