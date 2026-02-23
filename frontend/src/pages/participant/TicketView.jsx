import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { participantService } from '../../services';
import { FiCalendar, FiMapPin, FiUser, FiDownload, FiArrowLeft } from 'react-icons/fi';
import { formatDate, formatTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import './TicketView.css';

const TicketView = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

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

        <button className="download-btn" onClick={downloadTicket}>
          <FiDownload /> Download Ticket
        </button>
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
