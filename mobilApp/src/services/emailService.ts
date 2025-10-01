// Frontend email service for contact form
// Now integrated with Formspree

import emailjs from '@emailjs/browser';

interface ContactFormData {
  name: string;
  company?: string; // Added for 'Entreprise / Organisation'
  email: string;
  phone?: string; // Added for 'Téléphone'
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
  private formSubmissions: ContactFormData[] = [];

  constructor() {}

  private async toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // Send email via EmailJS
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

      const attachmentPromises = (formData.attachments || []).map(async (file) => {
        const base64 = await this.toBase64(file);
        return {
          name: file.name,
          data: base64.split(',')[1], // Extract base64 content
          type: file.type,
          size: file.size
        };
      });

      const processedAttachments = await Promise.all(attachmentPromises);

      const totalAttachmentsSize = processedAttachments.reduce((sum, attachment) => sum + attachment.size, 0);
      if (totalAttachmentsSize > 40 * 1024) { // 40KB limit for attachments
        return {
          success: false,
          message: 'Total attachment size exceeds the 40KB limit. Please send smaller files or use a file sharing service.'
        };
      }

      const emailjsAttachments = processedAttachments.map(att => ({
        name: att.name,
        data: att.data,
      }));

      const attachmentList = processedAttachments.length > 0
        ? processedAttachments.map(att => `<li>${att.name} (${(att.size / 1024).toFixed(2)} KB)</li>`).join('')
        : 'Aucune pièce jointe';

      const templateParams: Record<string, any> = {
        from_name: formData.name,
        from_email: formData.email,
        to_name: 'Klarrion Support',
        to_email: toEmail,
        subject: formData.subject,
        message: formData.message,
        company: formData.company || 'N/A',
        phone: formData.phone || 'N/A',
        attachment_list: `<ul>${attachmentList}</ul>`,
      };

      console.log('EmailJS Attachments:', emailjsAttachments);

      await emailjs.send(serviceId, templateId, templateParams, {
        publicKey: publicKey,
        attachments: emailjsAttachments,
      });

      return {
        success: true,
        message: 'Email sent successfully! We will get back to you soon.',
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

    // Optional: Add validation for company and phone if they become mandatory
    // if (formData.company && formData.company.trim().length < 2) {
    //   return false;
    // }
    // if (formData.phone && formData.phone.trim().length < 7) { // Basic phone length check
    //   return false;
    // }

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