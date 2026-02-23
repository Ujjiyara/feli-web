import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { eventService } from '../../services';
import { FiSearch, FiFilter, FiCalendar, FiUsers, FiDollarSign, FiTrendingUp, FiHeart } from 'react-icons/fi';
import { formatDateShort as formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import './BrowseEvents.css';

const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    type: searchParams.get('type') || '',
    eligibility: searchParams.get('eligibility') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    followedOnly: searchParams.get('followedOnly') === 'true'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchTrendingEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchParams.get('search')) params.search = searchParams.get('search');
      if (searchParams.get('type')) params.type = searchParams.get('type');
      if (searchParams.get('eligibility')) params.eligibility = searchParams.get('eligibility');
      if (searchParams.get('dateFrom')) params.dateFrom = searchParams.get('dateFrom');
      if (searchParams.get('dateTo')) params.dateTo = searchParams.get('dateTo');
      if (searchParams.get('followedOnly') === 'true') params.followedOnly = true;

      const response = await eventService.getAllEvents(params);
      if (response.success) {
        setEvents(response.data.events || []);
      }
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingEvents = async () => {
    try {
      const response = await eventService.getTrendingEvents();
      if (response.success) {
        setTrendingEvents(response.data?.events || []);
      }
    } catch {
      // Silently fail for trending
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (filters.search) {
      newParams.set('search', filters.search);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const applyFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    if (filters.type) newParams.set('type', filters.type);
    else newParams.delete('type');
    if (filters.eligibility) newParams.set('eligibility', filters.eligibility);
    else newParams.delete('eligibility');
    if (filters.dateFrom) newParams.set('dateFrom', filters.dateFrom);
    else newParams.delete('dateFrom');
    if (filters.dateTo) newParams.set('dateTo', filters.dateTo);
    else newParams.delete('dateTo');
    if (filters.followedOnly) newParams.set('followedOnly', 'true');
    else newParams.delete('followedOnly');
    setSearchParams(newParams);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({ search: '', type: '', eligibility: '', dateFrom: '', dateTo: '', followedOnly: false });
    setSearchParams({});
    setShowFilters(false);
  };



  return (
    <div className="browse-events">
      <div className="browse-header">
        <h1>Browse Events</h1>
        <p>Discover amazing events happening at Felicity</p>
      </div>

      {/* Trending Section */}
      {trendingEvents.length > 0 && !searchParams.toString() && (
        <div className="trending-section">
          <h2><FiTrendingUp /> Trending Now</h2>
          <div className="trending-scroll">
            {trendingEvents.map((event) => (
              <Link to={`/events/${event._id}`} key={event._id} className="trending-card">
                <span className="trending-rank">🔥</span>
                <div className="trending-info">
                  <h4>{event.name}</h4>
                  <span className="trending-org">{event.organizerId?.name}</span>
                  <span className="trending-regs"><FiUsers /> {event.registrationCount || 0} registered</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <form onSubmit={handleSearch} className="search-form">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search events..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <button type="submit">Search</button>
        </form>
        <button className="filter-btn" onClick={() => setShowFilters(!showFilters)}>
          <FiFilter /> Filters
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>Event Type</label>
            <select 
              value={filters.type} 
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="NORMAL">Normal Event</option>
              <option value="MERCHANDISE">Merchandise</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Eligibility</label>
            <select 
              value={filters.eligibility} 
              onChange={(e) => setFilters({ ...filters, eligibility: e.target.value })}
            >
              <option value="">All</option>
              <option value="ALL">Open to All</option>
              <option value="IIIT_ONLY">IIIT Only</option>
              <option value="NON_IIIT_ONLY">External Only</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
          <div className="filter-group followed-filter">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filters.followedOnly}
                onChange={(e) => setFilters({ ...filters, followedOnly: e.target.checked })}
              />
              <FiHeart /> Followed Clubs Only
            </label>
          </div>
          <div className="filter-actions">
            <button onClick={applyFilters} className="apply-btn">Apply</button>
            <button onClick={clearFilters} className="clear-btn">Clear</button>
          </div>
        </div>
      )}

      {/* Events Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <h3>No events found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <Link to={`/events/${event._id}`} key={event._id} className="event-card">
              <div className="event-header">
                <span className="event-type">{event.type}</span>
                <span className="event-eligibility">{event.eligibility.replace('_', ' ')}</span>
              </div>
              <h3>{event.name}</h3>
              <p className="event-org">{event.organizerId?.name}</p>
              <p className="event-desc">{event.description?.slice(0, 100)}...</p>
              <div className="event-footer">
                <span><FiCalendar /> {formatDate(event.startDate)}</span>
                <span><FiUsers /> {event.registrationCount || 0} registered</span>
                {event.registrationFee > 0 && (
                  <span><FiDollarSign /> ₹{event.registrationFee}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseEvents;
