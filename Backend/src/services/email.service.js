import nodemailer from 'nodemailer';
import config from '../config/index.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.startupStatus = {
      level: 'warn',
      message: 'SMTP disabled (missing credentials)',
    };
    this.startupPromise = Promise.resolve(this.startupStatus);
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!config.smtp.user || !config.smtp.pass || 
        config.smtp.user === 'your_email@gmail.com' || 
        config.smtp.pass === 'your_app_password') {
      this.isConfigured = false;
      this.startupStatus = {
        level: 'warn',
        message: 'SMTP disabled (missing credentials)',
      };
      this.startupPromise = Promise.resolve(this.startupStatus);
      return;
    }

    try {
      // Port 465 uses implicit SSL (secure:true); port 587 uses STARTTLS (secure:false).
      // Many networks/ISPs block 587 — fall back to 465 automatically.
      const port = config.smtp.port === 587 ? 465 : config.smtp.port;
      const secure = port === 465 ? true : config.smtp.secure;

      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port,
        secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
        connectionTimeout: 10000,  // 10 s to establish TCP connection
        greetingTimeout: 10000,    // 10 s to receive server greeting
        socketTimeout: 30000,      // 30 s idle socket timeout
        tls: {
          rejectUnauthorized: false, // accept self-signed certs (dev-friendly)
        },
      });

      // isConfigured is set only after verify() succeeds to avoid the race condition
      this.isConfigured = false;
      this.startupStatus = {
        level: 'info',
        message: 'SMTP health check in progress',
      };

      this.startupPromise = this.transporter
        .verify()
        .then(() => {
          this.isConfigured = true;
          this.startupStatus = {
            level: 'ok',
            message: 'SMTP ready',
          };
          return this.startupStatus;
        })
        .catch((error) => {
          this.isConfigured = false;
          this.startupStatus = {
            level: 'warn',
            message: `SMTP unavailable; using console mode (${error.message})`,
          };
          return this.startupStatus;
        });
    } catch (error) {
      this.isConfigured = false;
      this.startupStatus = {
        level: 'warn',
        message: `SMTP initialization failed (${error.message})`,
      };
      this.startupPromise = Promise.resolve(this.startupStatus);
    }
  }

  async waitForStartupValidation() {
    await this.startupPromise;
    return this.startupStatus;
  }

  getStartupStatus() {
    return this.startupStatus;
  }

  async sendEmail(to, subject, html, text = null) {
    await this.startupPromise;

    const mailOptions = {
      from: config.smtp.from,
      to,
      subject,
      html,
      text: text || this.stripHtml(html),
    };

    if (!this.isConfigured || !this.transporter) {
      console.log('\n📧 EMAIL (Console Mode - SMTP not configured)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { success: true, messageId: 'console-mode', mode: 'console' };
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}`);
      return { success: true, messageId: info.messageId, mode: 'smtp' };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  stripHtml(html) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
  }

  async sendVerificationEmail(email, fullName, verificationToken) {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your CareConnect Account';
    
    const html = this.getVerificationEmailTemplate(fullName, verificationUrl);
    return await this.sendEmail(email, subject, html);
  }

  async sendPasswordResetEmail(email, fullName, resetToken) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your CareConnect Password';
    
    const html = this.getPasswordResetEmailTemplate(fullName, resetUrl);
    return await this.sendEmail(email, subject, html);
  }

  async sendWelcomeEmail(email, fullName) {
    const subject = 'Welcome to CareConnect! 🎉';
    const html = this.getWelcomeEmailTemplate(fullName);
    return await this.sendEmail(email, subject, html);
  }

  getVerificationEmailTemplate(fullName, verificationUrl) {
    const currentYear = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - CareConnect</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f7fa;">
        <!-- Header with Logo -->
        <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="display: inline-block; background: white; padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
            <span style="font-size: 28px; color: #0d9488; font-weight: bold;">💚 CareConnect</span>
          </div>
          <h1 style="color: white; margin: 15px 0 5px 0; font-size: 28px; font-weight: 600;">Verify Your Email Address</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">One step closer to quality care</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">Hello ${fullName}! 👋</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
            Welcome to <strong>CareConnect</strong> — Nepal's trusted platform connecting caring families with compassionate caregivers.
          </p>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 30px;">
            To complete your registration and unlock all features, please verify your email address by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3); transition: all 0.3s ease;">
              ✅ Verify My Email
            </a>
          </div>
          
          <!-- Security Notice -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 30px 0;">
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
              <strong>🔒 Security Note:</strong> This verification link is valid for <strong>24 hours</strong>. If you didn't create an account with CareConnect, please ignore this email.
            </p>
          </div>
          
          <!-- Alternative Link -->
          <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 25px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #0d9488; word-break: break-all;">${verificationUrl}</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 15px 0;">
            Need help? Contact us at <a href="mailto:support@careconnect.com" style="color: #14b8a6;">support@careconnect.com</a>
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${currentYear} CareConnect Nepal. Connecting Hearts, Providing Care.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetEmailTemplate(fullName, resetUrl) {
    const currentYear = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - CareConnect</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f7fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ef4444, #f97316); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="display: inline-block; background: white; padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
            <span style="font-size: 28px; color: #ef4444; font-weight: bold;">🔐 Password Reset</span>
          </div>
          <h1 style="color: white; margin: 15px 0 5px 0; font-size: 28px; font-weight: 600;">Forgot Your Password?</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">No worries, we've got you covered</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px;">Hello ${fullName}! 👋</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
            We received a request to reset the password for your <strong>CareConnect</strong> account. If you made this request, click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
              🔑 Reset My Password
            </a>
          </div>
          
          <!-- Warning Notice -->
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 30px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
              <strong>⚠️ Important:</strong> This link expires in <strong>1 hour</strong> for your security. If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <!-- Security Tips -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; color: #334155; font-weight: 600; font-size: 14px;">🛡️ Password Security Tips:</p>
            <ul style="margin: 0; padding-left: 20px; color: #64748b; font-size: 13px; line-height: 1.8;">
              <li>Use at least 8 characters with letters, numbers & symbols</li>
              <li>Don't reuse passwords from other websites</li>
              <li>Consider using a password manager</li>
            </ul>
          </div>
          
          <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 25px;">
            If the button doesn't work, copy and paste this link:<br>
            <a href="${resetUrl}" style="color: #ef4444; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 15px 0;">
            Questions? Contact <a href="mailto:support@careconnect.com" style="color: #f97316;">support@careconnect.com</a>
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${currentYear} CareConnect Nepal. Your security is our priority.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeEmailTemplate(fullName) {
    const currentYear = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CareConnect!</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f7fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0d9488, #10b981); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="font-size: 50px; margin-bottom: 15px;">🎉</div>
          <h1 style="color: white; margin: 0 0 5px 0; font-size: 32px; font-weight: 700;">Welcome to CareConnect!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Your journey to quality care starts here</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 25px 0; font-size: 24px;">Congratulations, ${fullName}! 🎊</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
            Your email has been verified successfully! You're now officially a member of <strong>CareConnect</strong> — Nepal's leading platform connecting families with trusted caregivers.
          </p>
          
          <!-- What's Next Section -->
          <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px solid #86efac; border-radius: 16px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #166534; margin: 0 0 20px 0; font-size: 18px;">🚀 What's Next?</h3>
            
            <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
              <span style="background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; margin-right: 15px; flex-shrink: 0;">1</span>
              <div>
                <strong style="color: #1e293b;">Complete Your Profile</strong>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Add your details to help us match you with the right caregivers</p>
              </div>
            </div>
            
            <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
              <span style="background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; margin-right: 15px; flex-shrink: 0;">2</span>
              <div>
                <strong style="color: #1e293b;">Browse Caregivers</strong>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Explore verified caregivers in your area with reviews & ratings</p>
              </div>
            </div>
            
            <div style="display: flex; align-items: flex-start;">
              <span style="background: #10b981; color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; margin-right: 15px; flex-shrink: 0;">3</span>
              <div>
                <strong style="color: #1e293b;">Book Your First Session</strong>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Schedule care with confidence and peace of mind</p>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${config.frontendUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #10b981); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3);">
              🏠 Go to Your Dashboard
            </a>
          </div>
          
          <!-- Support Box -->
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-top: 30px; text-align: center;">
            <p style="margin: 0; color: #475569; font-size: 14px;">
              <strong>Need assistance?</strong> Our support team is here to help!<br>
              <a href="mailto:support@careconnect.com" style="color: #0d9488;">support@careconnect.com</a> | 
              <a href="tel:+977-1-XXXXXXX" style="color: #0d9488;">+977-1-XXXXXXX</a>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
          <div style="margin-bottom: 20px;">
            <a href="${config.frontendUrl}" style="color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 13px;">Home</a>
            <a href="${config.frontendUrl}/about" style="color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 13px;">About Us</a>
            <a href="${config.frontendUrl}/how-it-works" style="color: #94a3b8; text-decoration: none; margin: 0 10px; font-size: 13px;">How It Works</a>
          </div>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${currentYear} CareConnect Nepal. Connecting Hearts, Providing Care.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  async sendPendingApprovalEmail(email, fullName) {
    const subject = 'Email Verified - Awaiting Approval | CareConnect';
    const html = this.getPendingApprovalEmailTemplate(fullName);
    return await this.sendEmail(email, subject, html);
  }

  getPendingApprovalEmailTemplate(fullName) {
    const currentYear = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified - Pending Approval</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f7fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="font-size: 50px; margin-bottom: 15px;">✅</div>
          <h1 style="color: white; margin: 0 0 5px 0; font-size: 28px; font-weight: 700;">Email Verified Successfully!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Just one more step to go</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 25px 0; font-size: 22px;">Hello ${fullName}! 👋</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
            Great news! Your email address has been successfully verified. Thank you for completing this important step.
          </p>
          
          <!-- Status Card -->
          <div style="background: linear-gradient(135deg, #fefce8, #fef9c3); border: 2px solid #facc15; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
            <h3 style="color: #854d0e; margin: 0 0 10px 0; font-size: 20px;">Account Under Review</h3>
            <p style="color: #a16207; margin: 0; font-size: 15px; line-height: 1.6;">
              Our admin team is carefully reviewing your account to ensure the safety and quality of our community. This process typically takes <strong>24-48 hours</strong>.
            </p>
          </div>
          
          <!-- What Happens Next -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">📋 What happens during review?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #64748b; font-size: 14px; line-height: 2;">
              <li>We verify your profile information</li>
              <li>We ensure compliance with our community guidelines</li>
              <li>For caregivers: We review qualifications and documents</li>
              <li>You'll receive an email once your account is approved</li>
            </ul>
          </div>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 25px 0;">
            We appreciate your patience! If you have any questions or need assistance, please don't hesitate to reach out to our support team.
          </p>
          
          <!-- Support Box -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="margin: 0; color: #166534; font-size: 14px;">
              <strong>Questions?</strong> Contact us at <a href="mailto:support@careconnect.com" style="color: #0d9488; text-decoration: none;">support@careconnect.com</a>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 10px 0;">
            Thank you for choosing CareConnect
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${currentYear} CareConnect Nepal. Connecting Hearts, Providing Care.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  async sendApprovalEmail(email, fullName) {
    const subject = 'Account Approved! Welcome to CareConnect 🎉';
    const html = this.getApprovalEmailTemplate(fullName);
    return await this.sendEmail(email, subject, html);
  }

  getApprovalEmailTemplate(fullName) {
    const currentYear = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Approved - CareConnect</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f7fa;">
        <!-- Header with Celebration -->
        <div style="background: linear-gradient(135deg, #10b981, #34d399); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="font-size: 60px; margin-bottom: 15px;">🎉</div>
          <h1 style="color: white; margin: 0 0 5px 0; font-size: 32px; font-weight: 700;">You're Approved!</h1>
          <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 18px;">Welcome to the CareConnect Family</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 25px 0; font-size: 24px;">Congratulations, ${fullName}! 🎊</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
            We're thrilled to inform you that your <strong>CareConnect</strong> account has been reviewed and approved by our admin team. You now have full access to all platform features!
          </p>
          
          <!-- Success Card -->
          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #34d399; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
            <h3 style="color: #047857; margin: 0; font-size: 18px;">Your Account is Now Active!</h3>
          </div>
          
          <!-- Features Unlocked -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 16px;">🔓 Features Now Available:</h3>
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; align-items: center;">
                <span style="color: #10b981; margin-right: 10px;">✓</span>
                <span style="color: #475569; font-size: 14px;">Browse and connect with verified caregivers</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="color: #10b981; margin-right: 10px;">✓</span>
                <span style="color: #475569; font-size: 14px;">Create and manage care bookings</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="color: #10b981; margin-right: 10px;">✓</span>
                <span style="color: #475569; font-size: 14px;">Send and receive messages securely</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="color: #10b981; margin-right: 10px;">✓</span>
                <span style="color: #475569; font-size: 14px;">Access comprehensive care reports</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="color: #10b981; margin-right: 10px;">✓</span>
                <span style="color: #475569; font-size: 14px;">Leave reviews and build your reputation</span>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${config.frontendUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 18px 50px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35);">
              🚀 Login & Get Started
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.7; text-align: center; margin-top: 30px;">
            We're excited to have you on board! If you have any questions, our support team is always here to help.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 15px 0;">
            Welcome to our community! 💚
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${currentYear} CareConnect Nepal. Connecting Hearts, Providing Care.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  async sendAccountSuspendedEmail(email, fullName, reason) {
    const subject = 'Account Suspended | CareConnect';
    const html = this.getAccountSuspendedEmailTemplate(fullName, reason);
    return await this.sendEmail(email, subject, html);
  }

  getAccountSuspendedEmailTemplate(fullName, reason) {
    const currentYear = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Suspended - CareConnect</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f7fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="font-size: 50px; margin-bottom: 15px;">⚠️</div>
          <h1 style="color: white; margin: 0 0 5px 0; font-size: 28px; font-weight: 700;">Account Suspended</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Important notice regarding your account</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 25px 0; font-size: 22px;">Hello ${fullName},</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
            We regret to inform you that your CareConnect account has been temporarily suspended. We understand this may be concerning, and we want to help you resolve this matter.
          </p>
          
          ${reason ? `
          <!-- Reason Card -->
          <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 16px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">📋 Suspension Reason:</h3>
            <p style="color: #b91c1c; margin: 0; font-size: 15px; line-height: 1.6;">${reason}</p>
          </div>
          ` : ''}
          
          <!-- Next Steps -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">📝 What You Can Do:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #64748b; font-size: 14px; line-height: 2;">
              <li>Review our <a href="${config.frontendUrl}/terms" style="color: #0d9488;">Terms of Service</a> and <a href="${config.frontendUrl}/guidelines" style="color: #0d9488;">Community Guidelines</a></li>
              <li>Contact our support team to discuss your case</li>
              <li>Provide any additional information that may help</li>
              <li>Submit an appeal if you believe this is an error</li>
            </ul>
          </div>
          
          <!-- Appeal CTA -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="mailto:support@careconnect.com?subject=Account%20Suspension%20Appeal" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px;">
              📧 Contact Support
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.7; text-align: center;">
            We value every member of our community and want to resolve this situation as quickly as possible.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 15px 0;">
            Support Team: <a href="mailto:support@careconnect.com" style="color: #14b8a6;">support@careconnect.com</a>
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${currentYear} CareConnect Nepal
          </p>
        </div>
      </body>
      </html>
    `;
  }

  async sendAccountDeletedEmail(email, fullName) {
    const subject = 'Account Deleted | CareConnect';
    const html = this.getAccountDeletedEmailTemplate(fullName);
    return await this.sendEmail(email, subject, html);
  }

  getAccountDeletedEmailTemplate(fullName) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Account Deleted</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee;">
          <h2>Hello ${fullName},</h2>
          <p>Your CareConnect account has been deleted. All your data has been removed from our system.</p>
          <p>We're sorry to see you go. If you wish to return, you can always create a new account.</p>
          <p style="color: #888; font-size: 14px; margin-top: 20px;">
            Thank you for being part of CareConnect.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  // ========== BOOKING EMAIL TEMPLATES ==========

  async sendBookingRequestEmail(email, fullName, bookingDetails) {
    const subject = `New Booking Request #${bookingDetails.bookingNumber} | CareConnect`;
    const html = this.getBookingRequestEmailTemplate(fullName, bookingDetails);
    return await this.sendEmail(email, subject, html);
  }

  getBookingRequestEmailTemplate(fullName, booking) {
    const currentYear = new Date().getFullYear();
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking Request - CareConnect</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f7fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="font-size: 50px; margin-bottom: 15px;">📋</div>
          <h1 style="color: white; margin: 0 0 5px 0; font-size: 28px; font-weight: 700;">New Booking Request</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">You have a new care request waiting</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 25px 0; font-size: 22px;">Hello ${fullName}! 👋</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
            Great news! You've received a new booking request. Please review the details below and respond within <strong>24 hours</strong>.
          </p>
          
          <!-- Booking Details Card -->
          <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📄 Booking Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px; width: 40%;">📝 Booking Number</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600;">#${booking.bookingNumber}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">👤 Care Recipient</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${booking.careRecipientName || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">📅 Start Date</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${formatDate(booking.startDate)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">📅 End Date</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${formatDate(booking.endDate)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">⏰ Duration Type</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${booking.durationType}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">🏥 Service Type</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${booking.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">💰 Total Amount</td>
                <td style="padding: 10px 0; color: #10b981; font-size: 18px; font-weight: 700;">NPR ${booking.totalAmount?.toFixed(2) || '0.00'}</td>
              </tr>
            </table>
          </div>
          
          ${booking.specialInstructions ? `
          <!-- Special Instructions -->
          <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 12px; padding: 20px; margin: 25px 0;">
            <h4 style="color: #854d0e; margin: 0 0 10px 0; font-size: 14px;">📌 Special Instructions</h4>
            <p style="color: #a16207; margin: 0; font-size: 14px; line-height: 1.6;">${booking.specialInstructions}</p>
          </div>
          ` : ''}
          
          <!-- Action Buttons -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${config.frontendUrl}/dashboard/bookings/${booking._id}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);">
              📄 View & Respond
            </a>
          </div>
          
          <!-- Urgency Notice -->
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 15px; text-align: center;">
            <p style="margin: 0; color: #991b1b; font-size: 13px;">
              ⏰ Please respond within 24 hours to secure this booking
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 15px 0;">
            Questions? <a href="mailto:support@careconnect.com" style="color: #a78bfa;">support@careconnect.com</a>
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${currentYear} CareConnect Nepal. Connecting Hearts, Providing Care.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  async sendBookingConfirmedEmail(email, fullName, bookingDetails) {
    const subject = `Booking Confirmed #${bookingDetails.bookingNumber} 🎉 | CareConnect`;
    const html = this.getBookingConfirmedEmailTemplate(fullName, bookingDetails);
    return await this.sendEmail(email, subject, html);
  }

  getBookingConfirmedEmailTemplate(fullName, booking) {
    const currentYear = new Date().getFullYear();
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed - CareConnect</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f7fa;">
        <!-- Header with Success Theme -->
        <div style="background: linear-gradient(135deg, #10b981, #34d399); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="font-size: 60px; margin-bottom: 15px;">✅</div>
          <h1 style="color: white; margin: 0 0 5px 0; font-size: 28px; font-weight: 700;">Booking Confirmed!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Your care session is all set</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 25px 0; font-size: 24px;">Great news, ${fullName}! 🎊</h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 25px;">
            Your booking has been confirmed and everything is ready for your care session. Below are all the important details you'll need.
          </p>
          
          <!-- Confirmation Badge -->
          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #34d399; border-radius: 16px; padding: 20px; margin: 25px 0; text-align: center;">
            <p style="margin: 0; color: #047857; font-size: 16px; font-weight: 600;">
              ✓ Booking #${booking.bookingNumber} Confirmed
            </p>
          </div>
          
          <!-- Booking Details Card -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #10b981; padding-bottom: 10px;">📄 Booking Summary</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 14px; width: 40%;">👤 Care Recipient</td>
                <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${booking.careRecipientName || 'Not specified'}</td>
              </tr>
              <tr style="background: #f1f5f9;">
                <td style="padding: 12px; color: #64748b; font-size: 14px; border-radius: 8px 0 0 8px;">📅 Start Date</td>
                <td style="padding: 12px; color: #1e293b; font-size: 14px; font-weight: 600; border-radius: 0 8px 8px 0;">${formatDate(booking.startDate)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">📅 End Date</td>
                <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${formatDate(booking.endDate)}</td>
              </tr>
              <tr style="background: #f1f5f9;">
                <td style="padding: 12px; color: #64748b; font-size: 14px; border-radius: 8px 0 0 8px;">⏰ Duration</td>
                <td style="padding: 12px; color: #1e293b; font-size: 14px; font-weight: 600; border-radius: 0 8px 8px 0;">${booking.durationType}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 14px;">💰 Total Amount</td>
                <td style="padding: 12px 0; color: #10b981; font-size: 20px; font-weight: 700;">NPR ${booking.totalAmount?.toFixed(2) || '0.00'}</td>
              </tr>
            </table>
          </div>
          
          <!-- Important Reminders -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 25px 0;">
            <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 15px;">📌 Important Reminders</h4>
            <ul style="margin: 0; padding-left: 20px; color: #3730a3; font-size: 14px; line-height: 1.8;">
              <li>Check in when the care session begins</li>
              <li>Keep your phone accessible for updates</li>
              <li>Review any special instructions with your caregiver</li>
              <li>Contact support if you need to make changes</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${config.frontendUrl}/dashboard/bookings/${booking._id}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
              📋 View Booking Details
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 15px 0;">
            Need help? <a href="mailto:support@careconnect.com" style="color: #34d399;">support@careconnect.com</a>
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${currentYear} CareConnect Nepal. Connecting Hearts, Providing Care.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  async sendBookingRejectedEmail(email, fullName, bookingDetails, reason) {
    const subject = `Booking Request Declined #${bookingDetails.bookingNumber} | CareConnect`;
    const html = this.getBookingRejectedEmailTemplate(fullName, bookingDetails, reason);
    return await this.sendEmail(email, subject, html);
  }

  getBookingRejectedEmailTemplate(fullName, booking, reason) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f5576c, #f093fb); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">❌ Booking Declined</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee;">
          <h2>Hello ${fullName},</h2>
          <p>Unfortunately, your booking request #${booking.bookingNumber} has been declined by the caregiver.</p>
          
          ${reason ? `
          <div style="background: #F8D7DA; border: 1px solid #F5C2C7; border-radius: 10px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #842029;"><strong>Reason:</strong> ${reason}</p>
          </div>
          ` : ''}
          
          <p>Don't worry! There are many other qualified caregivers available on our platform.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.frontendUrl}/search" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">
              🔍 Find Other Caregivers
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendBookingCancelledEmail(email, fullName, bookingDetails, cancelledBy, reason) {
    const subject = `Booking Cancelled #${bookingDetails.bookingNumber} | CareConnect`;
    const html = this.getBookingCancelledEmailTemplate(fullName, bookingDetails, cancelledBy, reason);
    return await this.sendEmail(email, subject, html);
  }

  getBookingCancelledEmailTemplate(fullName, booking, cancelledBy, reason) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #868e96, #495057); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🚫 Booking Cancelled</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee;">
          <h2>Hello ${fullName},</h2>
          <p>Booking #${booking.bookingNumber} has been cancelled by the ${cancelledBy}.</p>
          
          ${reason ? `
          <div style="background: #F8F9FA; border: 1px solid #DEE2E6; border-radius: 10px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Cancellation Reason:</strong> ${reason}</p>
          </div>
          ` : ''}
          
          <div style="background: #FFF3CD; border: 1px solid #FFE69C; border-radius: 10px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #664D03;">
              <strong>💰 Refund Information:</strong><br>
              Any applicable refunds will be processed according to our cancellation policy within 5-7 business days.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.frontendUrl}/dashboard/bookings" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">
              📋 View All Bookings
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendCheckInReminderEmail(email, fullName, bookingDetails) {
    const subject = `Check-In Reminder for Booking #${bookingDetails.bookingNumber} | CareConnect`;
    const html = this.getCheckInReminderEmailTemplate(fullName, bookingDetails);
    return await this.sendEmail(email, subject, html);
  }

  getCheckInReminderEmailTemplate(fullName, booking) {
    const formatDate = (date) => new Date(date).toLocaleString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FF9A8B, #FF6B6B); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⏰ Check-In Reminder</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee;">
          <h2>Hello ${fullName}! 👋</h2>
          <p>Your care session is starting soon!</p>
          
          <div style="background: #F8F9FA; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📝 Booking #:</strong> ${booking.bookingNumber}</p>
            <p style="margin: 5px 0;"><strong>📅 Scheduled Start:</strong> ${formatDate(booking.startDate)}</p>
          </div>
          
          <p>Please remember to check in when you arrive to start the session.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.frontendUrl}/dashboard/bookings/${booking._id}" style="background: #FF6B6B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">
              ✅ Go to Check-In
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendCareReportEmail(email, fullName, bookingDetails, reportDetails) {
    const subject = `Care Report Submitted - Booking #${bookingDetails.bookingNumber} | CareConnect`;
    const html = this.getCareReportEmailTemplate(fullName, bookingDetails, reportDetails);
    return await this.sendEmail(email, subject, html);
  }

  getCareReportEmailTemplate(fullName, booking, report) {
    const formatDate = (date) => new Date(date).toLocaleString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">📋 Care Report Submitted</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee;">
          <h2>Hello ${fullName}! 👋</h2>
          <p>A new care report has been submitted for booking #${booking.bookingNumber}.</p>
          
          <div style="background: #F8F9FA; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📅 Report Date:</strong> ${formatDate(report.date)}</p>
            <p style="margin: 5px 0;"><strong>📝 Summary:</strong> ${report.summary || 'No summary provided'}</p>
            ${report.activitiesCompleted?.length ? `<p style="margin: 5px 0;"><strong>✅ Activities:</strong> ${report.activitiesCompleted.join(', ')}</p>` : ''}
            ${report.mealsProvided?.length ? `<p style="margin: 5px 0;"><strong>🍽️ Meals:</strong> ${report.mealsProvided.join(', ')}</p>` : ''}
            ${report.medicationsGiven?.length ? `<p style="margin: 5px 0;"><strong>💊 Medications:</strong> ${report.medicationsGiven.join(', ')}</p>` : ''}
          </div>
          
          ${report.notes ? `
          <div style="background: #E8F4FD; border: 1px solid #B8DAFF; border-radius: 10px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📌 Notes:</strong><br>${report.notes}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.frontendUrl}/dashboard/bookings/${booking._id}/reports" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">
              📄 View Full Report
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendDisputeNotificationEmail(email, fullName, bookingDetails, disputeDetails) {
    const subject = `Dispute Raised - Booking #${bookingDetails.bookingNumber} | CareConnect`;
    const html = this.getDisputeNotificationEmailTemplate(fullName, bookingDetails, disputeDetails);
    return await this.sendEmail(email, subject, html);
  }

  getDisputeNotificationEmailTemplate(fullName, booking, dispute) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f5576c, #f093fb); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">⚠️ Dispute Notification</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee;">
          <h2>Hello ${fullName},</h2>
          <p>A dispute has been raised for booking #${booking.bookingNumber}.</p>
          
          <div style="background: #F8D7DA; border: 1px solid #F5C2C7; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Raised By:</strong> ${dispute.raisedBy}</p>
            <p style="margin: 5px 0;"><strong>Reason:</strong> ${dispute.reason}</p>
            ${dispute.description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${dispute.description}</p>` : ''}
          </div>
          
          <p>Our admin team will review this dispute and contact both parties. Please be patient while we investigate.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.frontendUrl}/dashboard/bookings/${booking._id}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold;">
              📋 View Booking Details
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendNotificationEmail(email, fullName, title, message, actionUrl) {
    const subject = `${title} | CareConnect`;
    const html = this.getGenericNotificationEmailTemplate(fullName, title, message, actionUrl);
    return await this.sendEmail(email, subject, html);
  }

  getGenericNotificationEmailTemplate(fullName, title, message, actionUrl) {
    const currentYear = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - CareConnect</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f7fa;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <div style="display: inline-block; background: white; padding: 12px 24px; border-radius: 50px; margin-bottom: 15px;">
            <span style="font-size: 28px; color: #0d9488; font-weight: bold;">💚 CareConnect</span>
          </div>
          <h1 style="color: white; margin: 15px 0 0 0; font-size: 24px; font-weight: 600;">🔔 ${title}</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin: 0 0 25px 0; font-size: 22px;">Hello ${fullName}! 👋</h2>
          
          <div style="background: #f8fafc; border-left: 4px solid #0d9488; border-radius: 0 12px 12px 0; padding: 20px; margin: 25px 0;">
            <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0;">
              ${message}
            </p>
          </div>
          
          ${actionUrl ? `
          <div style="text-align: center; margin: 35px 0;">
            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3);">
              View Details →
            </a>
          </div>
          ` : ''}
          
          <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 30px;">
            This is an automated notification from CareConnect. If you have questions, please contact our support team.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 15px 0;">
            <a href="mailto:support@careconnect.com" style="color: #14b8a6;">support@careconnect.com</a>
          </p>
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${currentYear} CareConnect Nepal. Connecting Hearts, Providing Care.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

export default new EmailService();
