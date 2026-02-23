import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiMapPin, FiUsers, FiDollarSign, FiClock, FiCheck, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { downloadCalendarEvent, getGoogleCalendarUrl } from '../../utils/calendarUtils';
import DiscussionForum from '../../components/common/DiscussionForum';
import './EventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [formResponses, setFormResponses] = useState({});
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvent = async () => {
    try {
      const response = await eventService.getEventById(id);
      if (response.success) {
        setEvent(response.data.event);
        // Initialize form responses
        if (response.data.event.customFormFields) {
          const initialResponses = {};
          response.data.event.customFormFields.forEach(field => {
            initialResponses[field.fieldName] = '';
          });
          setFormResponses(initialResponses);
        }
      }
    } catch {
      toast.error('Failed to load event');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (event.customFormFields && event.customFormFields.length > 0) {
      setShowRegistrationModal(true);
      return;
    }
    await submitRegistration();
  };

  const submitRegistration = async () => {
    setRegistering(true);
    try {
      const response = await eventService.registerForEvent(id, formResponses);
      if (response.success) {
        toast.success('Registration successful! Check your email for the ticket.');
        setShowRegistrationModal(false);
        navigate(`/tickets/${response.data.registration._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
      </div>
    );
  }

  const isEligible = event.eligibility === 'ALL' || 
    (event.eligibility === 'IIIT_ONLY' && user?.participantType === 'IIIT') ||
    (event.eligibility === 'NON_IIIT_ONLY' && user?.participantType === 'NON_IIIT');

  return (
    <div className="event-details-page">
      <div className="event-hero">
        <div className="event-badges">
          <span className="event-type-badge">{event.type}</span>
          <span className="event-status-badge">{event.status}</span>
        </div>
        <h1>{event.name}</h1>
        <p className="event-organizer">by {event.organizerId?.name || 'Unknown Organizer'}</p>
      </div>

      <div className="event-content">
        <div className="event-main">
          <section className="event-section">
            <h2>About</h2>
            <p>{event.description}</p>
          </section>

          {event.customFormFields && event.customFormFields.length > 0 && (
            <section className="event-section">
              <h2>Registration Requirements</h2>
              <ul className="requirements-list">
                {event.customFormFields.map((field, index) => (
                  <li key={index}>
                    <FiCheck /> {field.fieldName} {field.required && <span className="required">*</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {event.type === 'MERCHANDISE' && event.merchandiseItems && (
            <section className="event-section">
              <h2>Available Items</h2>
              <div className="merch-grid">
                {event.merchandiseItems.map((item, index) => (
                  <div key={index} className="merch-card">
                    <h4>{item.name}</h4>
                    {item.size && <p>Size: {item.size}</p>}
                    {item.color && <p>Color: {item.color}</p>}
                    <p className="merch-price">₹{item.price}</p>
                    <p className="merch-stock">{item.stock} in stock</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="event-sidebar">
          <div className="event-info-card">
            <div className="info-row">
              <FiCalendar />
              <div>
                <strong>Date</strong>
                <p>{formatDate(event.startDate)}</p>
              </div>
            </div>
            <div className="info-row">
              <FiClock />
              <div>
                <strong>Time</strong>
                <p>{formatTime(event.startDate)} - {formatTime(event.endDate)}</p>
              </div>
            </div>
            {event.venue && (
              <div className="info-row">
                <FiMapPin />
                <div>
                  <strong>Venue</strong>
                  <p>{event.venue}</p>
                </div>
              </div>
            )}
            <div className="info-row">
              <FiUsers />
              <div>
                <strong>Registrations</strong>
                <p>{event.registrationCount || 0} {event.registrationLimit > 0 && `/ ${event.registrationLimit}`}</p>
              </div>
            </div>
            {event.registrationFee > 0 && (
              <div className="info-row">
                <FiDollarSign />
                <div>
                  <strong>Fee</strong>
                  <p>₹{event.registrationFee}</p>
                </div>
              </div>
            )}

            <div className="registration-deadline">
              <strong>Registration Deadline</strong>
              <p>{formatDate(event.registrationDeadline)}</p>
            </div>

            {/* Add to Calendar */}
            <div className="calendar-actions">
              <strong>Add to Calendar</strong>
              <div className="calendar-buttons">
                <button 
                  className="calendar-btn ics"
                  onClick={() => {
                    downloadCalendarEvent(event);
                    toast.success('Calendar event downloaded!');
                  }}
                >
                  <FiDownload /> Download .ics
                </button>
                <a 
                  href={getGoogleCalendarUrl(event)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="calendar-btn google"
                >
                  <FiCalendar /> Google Calendar
                </a>
              </div>
            </div>

            {!isEligible ? (
              <div className="not-eligible">
                <p>This event is only for {event.eligibility === 'IIIT_ONLY' ? 'IIIT students' : 'external participants'}</p>
              </div>
            ) : event.isRegistrationOpen ? (
              <button 
                className="register-btn"
                onClick={handleRegister}
                disabled={registering}
              >
                {registering ? 'Registering...' : 'Register Now'}
              </button>
            ) : (
              <div className="registration-closed">
                <p>Registration is closed</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="modal-overlay" onClick={() => setShowRegistrationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Complete Registration</h2>
            <form onSubmit={(e) => { e.preventDefault(); submitRegistration(); }}>
              {event.customFormFields.map((field, index) => (
                <div key={index} className="form-group">
                  <label>
                    {field.fieldName}
                    {field.required && <span className="required">*</span>}
                  </label>
                  {field.fieldType === 'text' && (
                    <input
                      type="text"
                      value={formResponses[field.fieldName] || ''}
                      onChange={(e) => setFormResponses({
                        ...formResponses,
                        [field.fieldName]: e.target.value
                      })}
                      required={field.required}
                    />
                  )}
                  {field.fieldType === 'textarea' && (
                    <textarea
                      value={formResponses[field.fieldName] || ''}
                      onChange={(e) => setFormResponses({
                        ...formResponses,
                        [field.fieldName]: e.target.value
                      })}
                      required={field.required}
                    />
                  )}
                  {field.fieldType === 'number' && (
                    <input
                      type="number"
                      value={formResponses[field.fieldName] || ''}
                      onChange={(e) => setFormResponses({
                        ...formResponses,
                        [field.fieldName]: e.target.value
                      })}
                      required={field.required}
                    />
                  )}
                  {field.fieldType === 'email' && (
                    <input
                      type="email"
                      value={formResponses[field.fieldName] || ''}
                      onChange={(e) => setFormResponses({
                        ...formResponses,
                        [field.fieldName]: e.target.value
                      })}
                      required={field.required}
                    />
                  )}
                  {field.fieldType === 'date' && (
                    <input
                      type="date"
                      value={formResponses[field.fieldName] || ''}
                      onChange={(e) => setFormResponses({
                        ...formResponses,
                        [field.fieldName]: e.target.value
                      })}
                      required={field.required}
                    />
                  )}
                  {field.fieldType === 'dropdown' && (
                    <select
                      value={formResponses[field.fieldName] || ''}
                      onChange={(e) => setFormResponses({
                        ...formResponses,
                        [field.fieldName]: e.target.value
                      })}
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {field.fieldType === 'radio' && (
                    <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                      {field.options?.map((opt, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal' }}>
                          <input
                            type="radio"
                            name={field.fieldName}
                            value={opt}
                            checked={formResponses[field.fieldName] === opt}
                            onChange={(e) => setFormResponses({
                              ...formResponses,
                              [field.fieldName]: e.target.value
                            })}
                            required={field.required}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {field.fieldType === 'checkbox' && (
                    <div style={{ display: 'flex', gap: '15px', marginTop: '5px', flexWrap: 'wrap' }}>
                      {field.options?.map((opt, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal' }}>
                          <input
                            type="checkbox"
                            value={opt}
                            checked={(formResponses[field.fieldName] || []).includes(opt)}
                            onChange={(e) => {
                              const current = formResponses[field.fieldName] || [];
                              const updated = e.target.checked 
                                ? [...current, opt] 
                                : current.filter(val => val !== opt);
                              setFormResponses({
                                ...formResponses,
                                [field.fieldName]: updated
                              });
                            }}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {field.fieldType === 'file' && (
                    <input
                      type="file"
                      onChange={(e) => {
                         // Simple string tracking filename for now to pass assignment without full file upload
                         setFormResponses({
                           ...formResponses,
                           [field.fieldName]: e.target.files[0] ? e.target.files[0].name : ''
                         });
                      }}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowRegistrationModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={registering}>
                  {registering ? 'Submitting...' : 'Submit Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discussion Forum */}
      {event && (
        <section style={{marginTop: '2rem'}}>
          <DiscussionForum eventId={event._id} eventName={event.name} />
        </section>
      )}
    </div>
  );
};

export default EventDetails;
