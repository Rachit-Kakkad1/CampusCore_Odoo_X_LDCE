const env = require('../../config/env');

/**
 * Base Abstract Email Provider
 */
class BaseEmailProvider {
  /**
   * @param {object} mailOptions - { to, from, subject, html, text, attachments }
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
   */
  async sendMail(mailOptions) {
    throw new Error('sendMail must be implemented by subclass');
  }
}

/**
 * Development & Testing Email Provider
 * Logs emails safely to stdout and stores sent payloads in memory
 * for testing and audit purposes without requiring real external SMTP credentials.
 */
class DevelopmentEmailProvider extends BaseEmailProvider {
  constructor() {
    super();
    this.inMemoryMailbox = [];
  }

  async sendMail(mailOptions) {
    const messageId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const record = {
      messageId,
      timestamp: new Date().toISOString(),
      to: mailOptions.to,
      from: mailOptions.from || env.EMAIL_FROM,
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text,
      metadata: mailOptions.metadata || {},
    };

    this.inMemoryMailbox.push(record);

    if (env.NODE_ENV !== 'test') {
      console.log(`[EMAIL DEV MODE] Sent to: ${record.to} | Subject: "${record.subject}" | Message ID: ${messageId}`);
    }

    return {
      success: true,
      messageId,
      provider: 'development',
    };
  }

  getSentEmails() {
    return [...this.inMemoryMailbox];
  }

  getLastEmail() {
    return this.inMemoryMailbox[this.inMemoryMailbox.length - 1] || null;
  }

  clearMailbox() {
    this.inMemoryMailbox = [];
  }
}

/**
 * Mock Failing Email Provider
 * Explicitly used to test resilient payment processing when email providers go down.
 */
class MockFailingEmailProvider extends BaseEmailProvider {
  async sendMail(mailOptions) {
    const error = new Error('SMTP connection timed out or unreachable');
    error.code = 'ETIMEDOUT';
    throw error;
  }
}

/**
 * Production SMTP Email Provider
 * Connects to real SMTP server configured via environment variables.
 */
class SmtpEmailProvider extends BaseEmailProvider {
  constructor(config = {}) {
    super();
    this.host = config.host || env.SMTP_HOST;
    this.port = config.port || env.SMTP_PORT;
    this.user = config.user || env.SMTP_USER;
    this.password = config.password || env.SMTP_PASSWORD;
  }

  async sendMail(mailOptions) {
    // If credentials are empty or host is default dummy, fall back safely
    if (!this.user || !this.password || this.host === 'smtp.example.com') {
      console.warn('[EMAIL WARNING] SMTP credentials not configured; logging email in development mode.');
      return await defaultDevProvider.sendMail(mailOptions);
    }

    try {
      // Lazy load nodemailer if installed
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: {
          user: this.user,
          pass: this.password,
        },
      });

      const info = await transporter.sendMail({
        from: mailOptions.from || env.EMAIL_FROM,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
      });

      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp',
      };
    } catch (err) {
      console.error('[EMAIL ERROR] Failed to deliver via SMTP:', err.message);
      throw err;
    }
  }
}

// Singleton instances
const defaultDevProvider = new DevelopmentEmailProvider();
let activeProvider = defaultDevProvider;

/**
 * Factory returning active email provider based on configuration.
 */
function getEmailProvider() {
  if (activeProvider !== defaultDevProvider) {
    return activeProvider;
  }

  if (env.EMAIL_PROVIDER === 'smtp') {
    return new SmtpEmailProvider();
  }

  return defaultDevProvider;
}

/**
 * Sets the email provider (useful for testing mock failures).
 */
function setEmailProvider(provider) {
  activeProvider = provider;
}

/**
 * Resets active email provider back to default.
 */
function resetEmailProvider() {
  activeProvider = defaultDevProvider;
}

module.exports = {
  BaseEmailProvider,
  DevelopmentEmailProvider,
  MockFailingEmailProvider,
  SmtpEmailProvider,
  getEmailProvider,
  setEmailProvider,
  resetEmailProvider,
};
