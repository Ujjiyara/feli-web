/**
 * Calendar utility for generating .ics files
 * Allows participants to add events to their calendar
 */

/**
 * Format date for ICS file (YYYYMMDDTHHMMSSZ format)
 */
const formatICSDate = (date) => {
  const d = new Date(date);
  return d.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, -1) + 'Z';
};

/**
 * Escape special characters for ICS format
 */
const escapeICS = (text) => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Generate ICS file content for an event
 * @param {Object} event - Event object with name, description, startDate, endDate, venue
 * @returns {string} ICS file content
 */
export const generateICSContent = (event) => {
  const now = new Date();
  const uid = `${event._id || event.id}@felicity.iiit.ac.in`;
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Felicity//Event Management System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(event.startDate)}`,
    `DTEND:${formatICSDate(event.endDate)}`,
    `SUMMARY:${escapeICS(event.name)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    event.venue ? `LOCATION:${escapeICS(event.venue)}` : '',
    event.organizerId?.name ? `ORGANIZER:${escapeICS(event.organizerId.name)}` : '',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Event reminder: ${escapeICS(event.name)} starts in 1 hour`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line).join('\r\n');

  return icsContent;
};

/**
 * Download ICS file for an event
 * @param {Object} event - Event object
 */
export const downloadCalendarEvent = (event) => {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.name.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate Google Calendar URL for an event
 * @param {Object} event - Event object
 * @returns {string} Google Calendar URL
 */
export const getGoogleCalendarUrl = (event) => {
  const startDate = formatICSDate(event.startDate).replace('Z', '');
  const endDate = formatICSDate(event.endDate).replace('Z', '');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${startDate}/${endDate}`,
    details: event.description || '',
    location: event.venue || '',
    ctz: 'Asia/Kolkata'
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

export default {
  generateICSContent,
  downloadCalendarEvent,
  getGoogleCalendarUrl
};
