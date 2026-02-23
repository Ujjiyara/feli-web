import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { organizerService } from '../../services';
import { FiSave, FiTrash2, FiCalendar, FiDollarSign, FiUsers, FiFile, FiPlus } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import './CreateEvent.css'; // Reuse CSS

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    type: 'NORMAL',
    eligibility: 'ALL',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    venue: '',
    registrationLimit: 0,
    registrationFee: 0,
    customFormFields: [],
    merchandiseItems: []
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setEventData({
      ...eventData,
      [name]: type === 'number' ? Number(value) : value
    });
  };

  const addCustomField = () => {
    setEventData({
      ...eventData,
      customFormFields: [
        ...eventData.customFormFields,
        { fieldName: '', fieldType: 'text', required: false, options: [], order: eventData.customFormFields.length }
      ]
    });
  };

  const updateCustomField = (index, updates) => {
    const fields = [...eventData.customFormFields];
    fields[index] = { ...fields[index], ...updates };
    setEventData({ ...eventData, customFormFields: fields });
  };

  const removeCustomField = (index) => {
    const fields = eventData.customFormFields.filter((_, i) => i !== index);
    // Reassign order
    setEventData({
      ...eventData,
      customFormFields: fields.map((f, i) => ({ ...f, order: i }))
    });
  };

  const moveCustomField = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === eventData.customFormFields.length - 1)) return;
    const fields = [...eventData.customFormFields];
    const temp = fields[index];
    fields[index] = fields[index + direction];
    fields[index + direction] = temp;
    // Reassign order
    setEventData({
      ...eventData,
      customFormFields: fields.map((f, i) => ({ ...f, order: i }))
    });
  };

  // Merchandise Items
  const addMerchItem = () => {
    setEventData({
      ...eventData,
      merchandiseItems: [
        ...eventData.merchandiseItems,
        { name: '', price: 0, stock: 0, size: '', color: '', purchaseLimit: 1 }
      ]
    });
  };

  const updateMerchItem = (index, updates) => {
    const items = [...eventData.merchandiseItems];
    items[index] = { ...items[index], ...updates };
    setEventData({ ...eventData, merchandiseItems: items });
  };

  const removeMerchItem = (index) => {
    setEventData({
      ...eventData,
      merchandiseItems: eventData.merchandiseItems.filter((_, i) => i !== index)
    });
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await organizerService.getEventDetails(id);
        if (response.success && response.data.event) {
          const e = response.data.event;
          setEventData({
            name: e.name || '',
            description: e.description || '',
            type: e.type || 'NORMAL',
            eligibility: e.eligibility || 'ALL',
            startDate: e.startDate ? new Date(e.startDate) : '',
            endDate: e.endDate ? new Date(e.endDate) : '',
            registrationDeadline: e.registrationDeadline ? new Date(e.registrationDeadline) : '',
            venue: e.venue || '',
            registrationLimit: e.registrationLimit || 0,
            registrationFee: e.registrationFee || 0,
            customFormFields: e.formFields || [],
            merchandiseItems: e.merchandiseItems || []
          });
        }
      } catch (error) {
        console.error("Failed to load event details:", error);
        toast.error('Failed to load event details');
        navigate('/organizer/dashboard');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchEvent();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!eventData.startDate || !eventData.endDate || !eventData.registrationDeadline) {
      toast.error('Please fill all date fields');
      return;
    }

    if (new Date(eventData.endDate) <= new Date(eventData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...eventData,
        formFields: eventData.customFormFields
      };
      delete payload.customFormFields;

      const response = await organizerService.updateEvent(id, payload);
      if (response.success) {
        toast.success('Event updated successfully');
        navigate(`/organizer/events/${id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading event data...</p>
      </div>
    );
  }

  return (
    <div className="create-event-container">
      <div className="create-event-header">
        <h1>Edit Event</h1>
        <p>Update your event details</p>
      </div>
      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <section className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label>Event Name *</label>
            <input
              type="text"
              name="name"
              value={eventData.name}
              onChange={handleChange}
              placeholder="Enter event name"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={eventData.description}
              onChange={handleChange}
              placeholder="Describe your event..."
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Event Type</label>
              <select name="type" value={eventData.type} onChange={handleChange}>
                <option value="NORMAL">Normal Event</option>
                <option value="MERCHANDISE">Merchandise</option>
              </select>
            </div>
            <div className="form-group">
              <label>Eligibility</label>
              <select name="eligibility" value={eventData.eligibility} onChange={handleChange}>
                <option value="ALL">Open to All</option>
                <option value="IIIT_ONLY">IIIT Only</option>
                <option value="NON_IIIT_ONLY">External Only</option>
              </select>
            </div>
          </div>
        </section>

        {/* Date & Time */}
        <section className="form-section">
          <h2><FiCalendar /> Date & Time</h2>
          
          <div className="form-row three-col">
            <div className="form-group">
              <label>Start Date *</label>
              <DatePicker
                selected={eventData.startDate ? new Date(eventData.startDate) : null}
                onChange={(date) => setEventData({ ...eventData, startDate: date })}
                showTimeSelect
                timeFormat="h:mm aa"
                timeIntervals={15}
                dateFormat="MMM d, yyyy h:mm aa"
                placeholderText="Select start date"
                className="date-picker-input"
                required
              />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <DatePicker
                selected={eventData.endDate ? new Date(eventData.endDate) : null}
                onChange={(date) => setEventData({ ...eventData, endDate: date })}
                showTimeSelect
                timeFormat="h:mm aa"
                timeIntervals={15}
                dateFormat="MMM d, yyyy h:mm aa"
                placeholderText="Select end date"
                className="date-picker-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Registration Deadline</label>
              <DatePicker
                selected={eventData.registrationDeadline ? new Date(eventData.registrationDeadline) : null}
                onChange={(date) => setEventData({ ...eventData, registrationDeadline: date })}
                showTimeSelect
                timeFormat="h:mm aa"
                timeIntervals={15}
                dateFormat="MMM d, yyyy h:mm aa"
                placeholderText="Select deadline"
                className="date-picker-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Venue</label>
            <input
              type="text"
              name="venue"
              value={eventData.venue}
              onChange={handleChange}
              placeholder="Event venue"
            />
          </div>
        </section>

        {/* Registration Settings */}
        <section className="form-section">
          <h2><FiUsers /> Registration Settings</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label><FiUsers /> Registration Limit (0 = unlimited)</label>
              <input
                type="number"
                name="registrationLimit"
                value={eventData.registrationLimit}
                onChange={handleChange}
                min={0}
              />
            </div>
            <div className="form-group">
              <label><FiDollarSign /> Registration Fee (₹)</label>
              <input
                type="number"
                name="registrationFee"
                value={eventData.registrationFee}
                onChange={handleChange}
                min={0}
              />
            </div>
          </div>
        </section>

        {/* Custom Form Fields */}
        {eventData.type === 'NORMAL' && (
          <section className="form-section">
            <h2><FiFile /> Custom Registration Fields</h2>
            <p className="section-hint">Add custom fields participants need to fill during registration</p>
            
            {eventData.customFormFields.map((field, index) => (
              <div key={index} className="custom-field-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Field name"
                    value={field.fieldName}
                    onChange={(e) => updateCustomField(index, { fieldName: e.target.value })}
                  />
                  <select
                    value={field.fieldType}
                    onChange={(e) => updateCustomField(index, { fieldType: e.target.value })}
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Long Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="date">Date</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="radio">Radio</option>
                    <option value="file">File Upload</option>
                  </select>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
                    <button type="button" className="move-btn" onClick={() => moveCustomField(index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" className="move-btn" onClick={() => moveCustomField(index, 1)} disabled={index === eventData.customFormFields.length - 1}>↓</button>
                    <button type="button" className="remove-btn" onClick={() => removeCustomField(index)}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                {['dropdown', 'radio', 'checkbox'].includes(field.fieldType) && (
                  <div>
                    <input 
                      type="text" 
                      placeholder="Comma separated options (e.g. S, M, L)" 
                      value={field.options.join(', ')} 
                      onChange={(e) => updateCustomField(index, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>
            ))}
            
            <button type="button" className="add-btn" onClick={addCustomField}>
              <FiPlus /> Add Field
            </button>
          </section>
        )}

        {/* Merchandise Items */}
        {eventData.type === 'MERCHANDISE' && (
          <section className="form-section">
            <h2>Merchandise Items</h2>
            <p className="section-hint">Add items available for purchase</p>
            
            {eventData.merchandiseItems.map((item, index) => (
              <div key={index} className="merch-item-card" style={{ padding: '15px', border: '1px solid var(--neon-cyan)', borderRadius: '8px', marginBottom: '15px', background: 'rgba(0, 255, 255, 0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, color: 'var(--neon-cyan)' }}>Item {index + 1}</h4>
                  <button type="button" className="remove-btn" onClick={() => removeMerchItem(index)}>
                    <FiTrash2 /> Remove
                  </button>
                </div>
                
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Item Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Felicity '26 T-Shirt"
                      value={item.name}
                      onChange={(e) => updateMerchItem(index, { name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={item.price}
                      onChange={(e) => updateMerchItem(index, { price: Number(e.target.value) })}
                      min={0}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Total Stock *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={item.stock}
                      onChange={(e) => updateMerchItem(index, { stock: Number(e.target.value) })}
                      min={0}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Max per User</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={item.purchaseLimit || 1}
                      onChange={(e) => updateMerchItem(index, { purchaseLimit: Number(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Available Sizes (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., S, M, L, XL"
                      value={item.size || ''}
                      onChange={(e) => updateMerchItem(index, { size: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Available Colors (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., Black, White, Navy"
                      value={item.color || ''}
                      onChange={(e) => updateMerchItem(index, { color: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button type="button" className="add-btn" onClick={addMerchItem}>
              <FiPlus /> Add Item
            </button>
          </section>
        )}

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={() => navigate(`/organizer/events/${id}`)}>
            Cancel
          </button>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Saving...' : <><FiSave /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditEvent;
