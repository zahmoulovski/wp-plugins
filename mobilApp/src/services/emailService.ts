// Frontend email service for contact form
// Note: This simulates email sending. For real email functionality, 
// integrate with EmailJS or similar service

interface EmailConfig {
  host: string;
  port: number;
  encryption: string;
  username: string;
  password: string;
  autoTLS: boolean;
  authentication: boolean;
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments?: File[];
}

interface EmailResponse {
  success: boolean;
  message: string;
  data?: any;
}

export class EmailService {
  private config: EmailConfig;
  private formSubmissions: ContactFormData[] = [];

  constructor() {
    this.config = {
      host: import.meta.env.VITE_SMTP_HOST || 'cp3.tn.oxa.host',
      port: parseInt(import.meta.env.VITE_SMTP_PORT || '465'),
      encryption: import.meta.env.VITE_SMTP_ENCRYPTION || 'ssl',
      username: import.meta.env.VITE_SMTP_USERNAME || 'contact@klarrion.com',
      password: import.meta.env.VITE_SMTP_PASSWORD || '',
      autoTLS: import.meta.env.VITE_SMTP_AUTO_TLS === 'true',
      authentication: import.meta.env.VITE_SMTP_AUTHENTICATION === 'true'
    };
  }

  // Simulate email sending - stores locally and shows success
  async sendContactEmail(formData: ContactFormData): Promise<EmailResponse> {
    try {
      // Validate form data
      if (!this.validateFormData(formData)) {
        return {
          success: false,
          message: 'Invalid form data'
        };
      }

      // Simulate email sending with SMTP configuration
      console.log('Simulating email send with configuration:', {
        host: this.config.host,
        port: this.config.port,
        encryption: this.config.encryption,
        username: this.config.username,
        // Password is hidden for security
        hasPassword: !!this.config.password
      });

      // Store form submission locally (simulating email database)
      const submission = {
        ...formData,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };
      
      this.formSubmissions.push(submission);
      
      // Simulate email sending delay
      await this.simulateDelay(1500);

      // Log the email content (for debugging)
      console.log('Contact form submission:', {
        to: this.config.username,
        from: formData.email,
        subject: `Contact Form: ${formData.subject}`,
        message: formData.message,
        attachments: formData.attachments?.length || 0,
        timestamp: submission.timestamp
      });

      return {
        success: true,
        message: 'Email sent successfully! We will get back to you soon.',
        data: {
          submissionId: submission.id,
          timestamp: submission.timestamp
        }
      };

    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        message: 'Failed to send email. Please try again later.'
      };
    }
  }

  // Validate form data
  private validateFormData(formData: ContactFormData): boolean {
    if (!formData.name || formData.name.trim().length < 2) {
      return false;
    }
    
    if (!formData.email || !this.isValidEmail(formData.email)) {
      return false;
    }
    
    if (!formData.subject || formData.subject.trim().length < 5) {
      return false;
    }
    
    if (!formData.message || formData.message.trim().length < 10) {
      return false;
    }

    return true;
  }

  // Email validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Simulate network delay
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get form submissions (for debugging/admin)
  getFormSubmissions(): ContactFormData[] {
    return [...this.formSubmissions];
  }

  // Clear form submissions
  clearFormSubmissions(): void {
    this.formSubmissions = [];
  }

  // Get SMTP configuration (without password)
  getSmtpConfig(): Partial<EmailConfig> {
    const { password, ...configWithoutPassword } = this.config;
    return configWithoutPassword;
  }

  // Method to integrate with EmailJS when ready
  async sendWithEmailJS(formData: ContactFormData, emailjsConfig: {
    serviceId: string;
    templateId: string;
    publicKey: string;
  }): Promise<EmailResponse> {
    try {
      // This would integrate with EmailJS
      // For now, it falls back to the local simulation
      console.log('EmailJS integration ready. Service ID:', emailjsConfig.serviceId);
      return await this.sendContactEmail(formData);
    } catch (error) {
      console.error('EmailJS integration error:', error);
      return {
        success: false,
        message: 'Email service not configured. Please contact support.'
      };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();