const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {Array} options.attachments - Optional attachments
 */
const sendEmail = async (options) => {
  const mailOptions = {
    from: `"Felicity Events" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments || []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send ticket confirmation email
 */
const sendTicketEmail = async (participant, event, registration) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .ticket-box { border: 2px dashed #667eea; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
        .ticket-id { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; }
        .qr-code { margin: 20px 0; }
        .qr-code img { width: 200px; height: 200px; }
        .event-details { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .event-details h3 { margin-top: 0; color: #333; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Registration Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${participant.firstName},</p>
          <p>Your registration for <strong>${event.name}</strong> has been confirmed!</p>
          
          <div class="ticket-box">
            <p style="margin: 0; color: #666;">Your Ticket ID</p>
            <p class="ticket-id">${registration.ticketId}</p>
            <div class="qr-code">
              <img src="${registration.qrCode}" alt="QR Code" />
            </div>
            <p style="margin: 0; font-size: 12px; color: #666;">Show this QR code at the event</p>
          </div>
          
          <div class="event-details">
            <h3>Event Details</h3>
            <div class="detail-row">
              <span>Event</span>
              <span><strong>${event.name}</strong></span>
            </div>
            <div class="detail-row">
              <span>Date</span>
              <span>${new Date(event.startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="detail-row">
              <span>Time</span>
              <span>${new Date(event.startDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          
          <p>See you at the event! 🚀</p>
        </div>
        <div class="footer">
          <p>Felicity Event Management System</p>
          <p>IIIT Hyderabad</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: participant.email,
    subject: `🎟️ Ticket Confirmed - ${event.name}`,
    html
  });
};

module.exports = {
  sendEmail,
  sendTicketEmail
};
