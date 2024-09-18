import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendWelcomeEmail(to: string) {
  console.log('Attempting to send welcome email to:', to);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: 'Willkommen bei BonlivreChat',
    html: `
      <p>Vielen Dank, dass Sie sich registriert haben. Wir freuen uns sehr, Sie als Teil unserer wachsenden Community begrüßen zu dürfen.</p>
      <p>Da BonlivreChat sich aktuell in der Betaphase befindet, sind wir besonders dankbar für Ihr Feedback. Ihre Anregungen und Ideen helfen uns, die Plattform stetig zu verbessern.</p>
      <p>Besuchen Sie auch gerne unseren Shop unter <a href="https://www.bonlivre.ch">www.bonlivre.ch</a>!</p>
      <p>Bei Fragen oder Anliegen stehen wir Ihnen selbstverständlich gerne zur Verfügung.</p>
      <p>Ihr Bonlivre-Team</p>
    `
  };

  try {
    console.log('Transporter configuration:', JSON.stringify(transporter.options));
    const info = await transporter.sendMail(mailOptions);
    console.log('Willkommens-E-Mail gesendet:', info.response);
    return info;
  } catch (error) {
    console.error('Fehler beim Senden der Willkommens-E-Mail:', error);
    throw error;
  }
}
