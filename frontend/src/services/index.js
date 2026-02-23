import api from './api';
export { authService } from './authService';

export const eventService = {
  // Get all events with filters
  getAllEvents: async (params = {}) => {
    const response = await api.get('/events', { params });
    return response.data;
  },

  // Get trending events
  getTrendingEvents: async () => {
    const response = await api.get('/events/trending');
    return response.data;
  },

  // Get event by ID
  getEventById: async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  // Register for event
  registerForEvent: async (eventId, formResponses = {}) => {
    const response = await api.post(`/events/${eventId}/register`, { formResponses });
    return response.data;
  },

  // Purchase merchandise
  purchaseMerchandise: async (eventId, items) => {
    const response = await api.post(`/events/${eventId}/purchase`, { items });
    return response.data;
  },

  // Cancel registration
  cancelRegistration: async (registrationId) => {
    const response = await api.post(`/events/registrations/${registrationId}/cancel`);
    return response.data;
  }
};

export const participantService = {
  // Get profile
  getProfile: async () => {
    const response = await api.get('/participant/profile');
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await api.put('/participant/profile', data);
    return response.data;
  },

  // Complete onboarding
  completeOnboarding: async (preferences) => {
    const response = await api.post('/participant/onboarding', preferences);
    return response.data;
  },

  // Get my events
  getMyEvents: async () => {
    const response = await api.get('/participant/my-events');
    return response.data;
  },

  // Get ticket
  getTicket: async (registrationId) => {
    const response = await api.get(`/participant/tickets/${registrationId}`);
    return response.data;
  },

  // Get organizers
  getOrganizers: async () => {
    const response = await api.get('/participant/organizers');
    return response.data;
  },

  // Get organizer by ID
  getOrganizerById: async (id) => {
    const response = await api.get(`/participant/organizers/${id}`);
    return response.data;
  },

  // Follow/unfollow organizer
  toggleFollowOrganizer: async (organizerId) => {
    const response = await api.post(`/participant/organizers/${organizerId}/follow`);
    return response.data;
  }
};

export const organizerService = {
  // Get dashboard
  getDashboard: async () => {
    const response = await api.get('/organizer/dashboard');
    return response.data;
  },

  // Create event
  createEvent: async (eventData) => {
    const response = await api.post('/organizer/events', eventData);
    return response.data;
  },

  // Get event details
  getEventDetails: async (eventId) => {
    const response = await api.get(`/organizer/events/${eventId}`);
    return response.data;
  },

  // Update event
  updateEvent: async (eventId, eventData) => {
    const response = await api.put(`/organizer/events/${eventId}`, eventData);
    return response.data;
  },

  // Publish event
  publishEvent: async (eventId) => {
    const response = await api.post(`/organizer/events/${eventId}/publish`);
    return response.data;
  },

  // Update event status
  updateEventStatus: async (eventId, status) => {
    const response = await api.patch(`/organizer/events/${eventId}/status`, { status });
    return response.data;
  },

  // Get participants
  getParticipants: async (eventId, params = {}) => {
    const response = await api.get(`/organizer/events/${eventId}/participants`, { params });
    return response.data;
  },

  // Export CSV
  exportParticipantsCSV: async (eventId) => {
    const response = await api.get(`/organizer/events/${eventId}/export-csv`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get profile
  getProfile: async () => {
    const response = await api.get('/organizer/profile');
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await api.put('/organizer/profile', data);
    return response.data;
  },

  // Request password reset
  requestPasswordReset: async (reason) => {
    const response = await api.post('/organizer/password-reset/request', { reason });
    return response.data;
  },

  // Get my reset requests
  getMyResetRequests: async () => {
    const response = await api.get('/organizer/password-reset/my-requests');
    return response.data;
  },

  // Get event (alias for getEventDetails)
  getEvent: async (eventId) => {
    const response = await api.get(`/organizer/events/${eventId}`);
    return response.data;
  },

  // Get event registrations
  getEventRegistrations: async (eventId) => {
    const response = await api.get(`/organizer/events/${eventId}/participants`);
    return response.data;
  },

  // Mark attendance (by ticketId or registrationId)
  markAttendance: async (eventId, registrationId, ticketId) => {
    const body = {};
    if (ticketId) body.ticketId = ticketId;
    if (registrationId) body.registrationId = registrationId;
    const response = await api.post('/organizer/attendance/mark', body);
    return response.data;
  },

  // Cancel event
  cancelEvent: async (eventId) => {
    const response = await api.patch(`/organizer/events/${eventId}/status`, { status: 'CANCELLED' });
    return response.data;
  }
};

export const adminService = {
  // Get dashboard
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // Get all organizers
  getAllOrganizers: async () => {
    const response = await api.get('/admin/organizers');
    return response.data;
  },

  // Create organizer
  createOrganizer: async (data) => {
    const response = await api.post('/admin/organizers', data);
    return response.data;
  },

  // Toggle organizer status
  toggleOrganizerStatus: async (organizerId) => {
    const response = await api.patch(`/admin/organizers/${organizerId}/toggle-status`);
    return response.data;
  },

  // Delete organizer
  deleteOrganizer: async (organizerId) => {
    const response = await api.delete(`/admin/organizers/${organizerId}`);
    return response.data;
  },

  // Reset organizer password
  resetOrganizerPassword: async (organizerId) => {
    const response = await api.post(`/admin/organizers/${organizerId}/reset-password`);
    return response.data;
  },

  // Get password reset requests
  getPasswordResetRequests: async () => {
    const response = await api.get('/admin/password-reset-requests');
    return response.data;
  },

  // Process password reset request
  processPasswordResetRequest: async (requestId, action, adminNote) => {
    const response = await api.post(`/admin/password-reset-requests/${requestId}`, { action, adminNote });
    return response.data;
  }
};
