import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiMapPin, FiUsers, FiDollarSign, FiClock, FiCheck, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { formatDate, formatTime } from '../../utils/dateUtils';
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
  const [showMerchModal, setShowMerchModal] = useState(false);
  const [selectedMerch, setSelectedMerch] = useState({}); // { itemId: { quantity, size, color, price } }

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
    if (event.type === 'MERCHANDISE') {
      setShowMerchModal(true);
      return;
    }
    if (event.customFormFields && event.customFormFields.length > 0) {
      setShowRegistrationModal(true);
      return;
    }
    await submitRegistration();
  };

  const submitMerchPurchase = async () => {
    const items = Object.entries(selectedMerch)
      .filter(([, data]) => data.quantity > 0)
      .map(([itemId, data]) => ({
        itemId,
        quantity: data.quantity,
        size: data.size,
        color: data.color
      }));

    if (items.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    setRegistering(true);
    try {
      const response = await eventService.purchaseMerchandise(id, items);
      if (response.success) {
        toast.success(response.message || 'Order placed successfully!');
        setShowMerchModal(false);
        navigate(`/tickets/${response.data.registration.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Purchase failed');
    } finally {
      setRegistering(false);
    }
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
              <h2>Available Merchandise</h2>
              <div className="merch-grid">
                {event.merchandiseItems.map((item, index) => (
                  <div key={index} className="merch-card" style={{ border: '2px solid rgba(255,45,117,0.3)', padding: '1rem', borderRadius: '12px' }}>
                    <h4 style={{ color: 'var(--hot-pink)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>{item.name}</h4>
                    <p className="merch-price" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>₹{item.price}</p>
                    <p className="merch-stock" style={{ color: item.stock > 0 ? 'var(--neon-cyan)' : 'gray' }}>
                      {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                    </p>
                    {(item.size || item.color) && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                        {item.size && <p>Sizes: {item.size}</p>}
                        {item.color && <p>Colors: {item.color}</p>}
                      </div>
                    )}
                    {item.purchaseLimit > 1 && (
                      <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Max {item.purchaseLimit} per person</p>
                    )}
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

      {/* Merchandise Registration Modal */}
      {showMerchModal && (
        <div className="modal-overlay" onClick={() => setShowMerchModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <h2>Select Merchandise</h2>
            <p style={{ marginBottom: '1.5rem', color: 'rgba(255,255,255,0.7)' }}>
              Choose the items and quantities you'd like to purchase.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); submitMerchPurchase(); }}>
              <div className="merch-selection-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                {event.merchandiseItems.map((item) => {
                  const selected = selectedMerch[item._id] || { quantity: 0, size: '', color: '' };
                  const sizes = item.size ? item.size.split(',').map(s => s.trim()) : [];
                  const colors = item.color ? item.color.split(',').map(c => c.trim()) : [];
                  
                  return (
                    <div key={item._id} className="merch-selection-card" style={{ padding: '1rem', border: '1px solid currentColor', borderColor: selected.quantity > 0 ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{item.name}</h4>
                          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--hot-pink)' }}>₹{item.price}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button 
                            type="button" 
                            style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: 'white' }}
                            onClick={() => {
                              if (selected.quantity > 0) {
                                setSelectedMerch(prev => ({
                                  ...prev,
                                  [item._id]: { ...selected, quantity: selected.quantity - 1 }
                                }));
                              }
                            }}
                          >-</button>
                          <span style={{ minWidth: '20px', textAlign: 'center' }}>{selected.quantity}</span>
                          <button 
                            type="button" 
                            style={{ padding: '0.2rem 0.5rem', background: 'var(--neon-cyan)', border: 'none', borderRadius: '4px', color: 'black' }}
                            onClick={() => {
                              if (selected.quantity < Math.min(item.stock, item.purchaseLimit || 1)) {
                                setSelectedMerch(prev => ({
                                  ...prev,
                                  [item._id]: { 
                                    ...selected, 
                                    quantity: selected.quantity + 1,
                                    size: selected.quantity === 0 && sizes.length > 0 ? sizes[0] : selected.size,
                                    color: selected.quantity === 0 && colors.length > 0 ? colors[0] : selected.color
                                  }
                                }));
                              } else {
                                toast.error(`Maximum allowed: ${Math.min(item.stock, item.purchaseLimit || 1)}`);
                              }
                            }}
                          >+</button>
                        </div>
                      </div>
                      
                      {selected.quantity > 0 && (sizes.length > 0 || colors.length > 0) && (
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                          {sizes.length > 0 && (
                            <div className="form-group" style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.8rem' }}>Size</label>
                              <select 
                                value={selected.size}
                                onChange={(e) => setSelectedMerch(prev => ({
                                  ...prev,
                                  [item._id]: { ...selected, size: e.target.value }
                                }))}
                                style={{ padding: '0.5rem' }}
                                required
                              >
                                <option value="">Select size</option>
                                {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          )}
                          {colors.length > 0 && (
                            <div className="form-group" style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.8rem' }}>Color</label>
                              <select 
                                value={selected.color}
                                onChange={(e) => setSelectedMerch(prev => ({
                                  ...prev,
                                  [item._id]: { ...selected, color: e.target.value }
                                }))}
                                style={{ padding: '0.5rem' }}
                                required
                              >
                                <option value="">Select color</option>
                                {colors.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Total Amount</span>
                  <h3 style={{ margin: 0, color: 'var(--neon-cyan)', fontSize: '1.5rem' }}>
                    ₹{Object.entries(selectedMerch).reduce((sum, [id, data]) => {
                      const item = event.merchandiseItems.find(i => i._id === id);
                      return sum + (data.quantity * (item?.price || 0));
                    }, 0)}
                  </h3>
                </div>
                <div className="modal-actions" style={{ marginTop: 0 }}>
                  <button type="button" onClick={() => setShowMerchModal(false)} style={{ background: 'transparent' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={registering || Object.values(selectedMerch).every(d => d.quantity === 0)} style={{ background: 'var(--neon-cyan)', color: 'black' }}>
                    {registering ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
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
