// Frontend email service for contact form
// Simplified version without file upload functionality

import emailjs from '@emailjs/browser';

interface ContactFormData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

interface EmailResponse {
  success: boolean;
  message: string;
  data?: any;
}

export class EmailService {
  private formSubmissions: ContactFormData[] = [];

  constructor() {}

  // Send email via EmailJS without attachments
  async sendContactEmail(formData: ContactFormData): Promise<EmailResponse> {
    try {
      // Validate form data
      if (!this.validateFormData(formData)) {
        return {
          success: false,
          message: 'Invalid form data'
        };
      }

      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      const toEmail = import.meta.env.VITE_EMAILJS_TO_EMAIL;

      if (!serviceId || !templateId || !publicKey || !toEmail) {
        throw new Error('EmailJS service ID, template ID, public key, or recipient email not configured');
      }

      const templateParams: Record<string, any> = {
        from_name: formData.name,
        from_email: formData.email,
        to_name: 'Klarrion Support',
        to_email: toEmail,
        subject: formData.subject,
        message: formData.message,
        company: formData.company || 'N/A',
        phone: formData.phone || 'N/A',
      };

      // Send email without attachments
      const emailConfig: any = {
        publicKey: publicKey,
      };

      await emailjs.send(serviceId, templateId, templateParams, emailConfig);

      return {
        success: true,
        message: 'L\'e-mail a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.',
      };

    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        message: 'L\'e-mail n\'a pas pu être envoyé. Veuillez réessayer.'
      };
    }
  }

  // Validate form data
  private validateFormData(formData: ContactFormData): boolean {
    if (!formData.name || formData.name.trim().length < 1) {
      return false;
    }
    
    if (!formData.email || !this.isValidEmail(formData.email)) {
      return false;
    }
    
    if (!formData.subject || formData.subject.trim().length < 1) {
      return false;
    }
    
    if (!formData.message || formData.message.trim().length < 1) {
      return false;
    }

    return true;
  }

  // Email validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const emailService = new EmailService();