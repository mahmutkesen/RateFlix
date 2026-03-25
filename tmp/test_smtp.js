const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const testEmail = async () => {
  console.log('Testing SMTP with User:', process.env.EMAIL_USER);
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"RateFlix Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'SMTP Test',
      text: 'If you see this, SMTP is working!'
    });
    console.log('Success! Message sent:', info.messageId);
  } catch (err) {
    console.error('SMTP Test Failed:', err);
  }
};

testEmail();
