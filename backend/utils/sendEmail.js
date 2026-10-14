const { Resend } = require('resend');

let resendInstance = null;
const getResendClient = () => {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
};

const sendEmail = async (options) => {
  const resend = getResendClient();
  if (!resend) {
    console.warn(`[EMAIL SKIPPED] RESEND_API_KEY is not configured. Email to ${options.email} not sent.`);
    return { id: 'mock-email-id' };
  }

  console.log(`Sending email via Resend to: ${options.email}...`);

  try {
    const fromName = process.env.FROM_NAME || 'RateFlix';
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: options.email,
      subject: options.subject,
      text: options.message || options.text,
      html: options.html || options.message || options.text,
    });

    if (error) {
      console.error('Resend Error:', error);
      throw new Error(error.message);
    }

    console.log('Message sent successfully via Resend:', data.id);
    return data;
  } catch (err) {
    console.error('Error sending email:', err.message);
    throw err;
  }
};

module.exports = sendEmail;
