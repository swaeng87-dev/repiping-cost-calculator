// netlify/functions/send-email.js
//
// Sends form submissions straight to your own mailbox via Zoho's SMTP server.
// No third-party form service ever sees this data — it goes from this function
// directly to smtp.zoho.com using your own account credentials.

const nodemailer = require('nodemailer');

exports.handler = async function (event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Never trust client-side validation alone — check required fields again here
  if (!data.name || !data.email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: name and email' }),
    };
  }

  // Very basic email format check
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email address' }) };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true, // true for port 465
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_APP_PASSWORD,
      },
    });

    const isLead = data.formType === 'lead';
    const subject = isLead
      ? `New Repiping Estimate Lead — ${data.name}`
      : `New Contact Form Message — ${data.name}`;

    // Build a plain-text body from whatever fields were sent, skipping formType
    const bodyLines = Object.entries(data)
      .filter(([key]) => key !== 'formType')
      .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
      .join('\n');

    await transporter.sendMail({
      from: `"Website Form" <${process.env.ZOHO_EMAIL}>`,
      to: process.env.ZOHO_EMAIL,
      replyTo: data.email,
      subject: subject,
      text: bodyLines,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Email send error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' }),
    };
  }
};
