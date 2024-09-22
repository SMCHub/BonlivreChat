import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
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
export async function sendVerificationEmail(email: string, token: string) {
  console.time('E-Mail-Versand');
  try {
    console.log('E-Mail-Konfiguration:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE,
      user: process.env.EMAIL_USER
    });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.bonlivrechat.ch';
    const verificationLink = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    let mailOptions = {
      from: '"BonlivreChat" <noreply@bonlivrechat.ch>',
      to: email,
      subject: 'Verifizieren Sie Ihre E-Mail-Adresse',
      text: `Bitte klicken Sie auf den folgenden Link, um Ihre E-Mail-Adresse zu verifizieren: ${verificationLink}`,
      html: `
        <p>Bitte klicken Sie auf den folgenden Link, um Ihre E-Mail-Adresse zu verifizieren:</p>
        <a href="${verificationLink}">${verificationLink}</a>
      `
    };
    console.log('Versuche E-Mail zu senden...');
    let info = await transporter.sendMail(mailOptions);
    console.log('Verifizierungs-E-Mail gesendet:', info.messageId);
    console.timeEnd('E-Mail-Versand');
    return true;
  } catch (error) {
    console.timeEnd('E-Mail-Versand');
    console.error('Fehler beim E-Mail-Versand:', error);
    throw error;
  }
}
export async function testEmailService() {
  try {
    await transporter.verify();
    console.log('E-Mail-Service ist bereit');
  } catch (error) {
    console.error('E-Mail-Service-Fehler:', error);
  }
}

