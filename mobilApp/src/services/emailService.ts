// Frontend email service for contact form
// Enhanced with better attachment handling

import emailjs from '@emailjs/browser';
import { fileStorageService } from './fileStorage';
import { ftpStorageService } from './ftpStorage';

interface ContactFormData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
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

  // Enhanced file processing with FTP storage for better persistence
  private async processAttachments(files: File[]): Promise<{
    smallAttachments: Array<{name: string, data: string, type: string}>;
    largeFiles: Array<{name: string, downloadUrl: string, size: number, type: string}>;
    totalSize: number;
  }> {
    const smallAttachments: Array<{name: string, data: string, type: string}> = [];
    const largeFiles: Array<{name: string, downloadUrl: string, size: number, type: string}> = [];
    let totalSize = 0;

    // Check if FTP storage is properly configured and connected
    const ftpConfig = ftpStorageService.getConfigStatus();
    const isFtpConnected = ftpStorageService.isFtpConnected();
    const useFTP = ftpConfig.configured && isFtpConnected;

    console.log(`FTP Configuration Check:`);
    console.log(`- Configured: ${ftpConfig.configured}`);
    console.log(`- Connected: ${isFtpConnected}`);
    console.log(`- Use FTP: ${useFTP}`);

    if (useFTP) {
      console.log('Using FTP storage for file attachments');
    } else {
      console.log('FTP not configured or not connected, using temporary browser storage');
    }

    for (const file of files) {
      totalSize += file.size;
      
      // Files under 10MB can be attached directly (EmailJS limit)
      if (file.size < 10 * 1024 * 1024) {
        try {
          const base64 = await this.toBase64(file);
          smallAttachments.push({
            name: file.name,
            data: base64.split(',')[1], // Extract base64 content
            type: file.type
          });
        } catch (error) {
          console.warn(`Failed to process small file ${file.name}:`, error);
          // Store file in cloud storage (FTP if available, otherwise browser storage)
          try {
            const downloadUrl = useFTP 
              ? await ftpStorageService.storeFile(file)
              : await fileStorageService.storeFile(file);
            largeFiles.push({
              name: file.name,
              downloadUrl,
              size: file.size,
              type: file.type
            });
          } catch (storageError) {
            console.warn(`Failed to store file ${file.name} in cloud storage:`, storageError);
          }
        }
      } else {
        // Store large file in cloud storage (FTP if available, otherwise browser storage)
        try {
          const downloadUrl = useFTP 
            ? await ftpStorageService.storeFile(file)
            : await fileStorageService.storeFile(file);
          largeFiles.push({
            name: file.name,
            downloadUrl,
            size: file.size,
            type: file.type
          });
        } catch (storageError) {
          console.warn(`Failed to store file ${file.name} in cloud storage:`, storageError);
        }
      }
    }

    return { smallAttachments, largeFiles, totalSize };
  }

  // Send email via EmailJS with enhanced attachment handling
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

      // Process attachments
      const { smallAttachments, largeFiles, totalSize } = await this.processAttachments(formData.attachments || []);

      // Check total size (EmailJS has overall limits)
      if (totalSize > 5 * 1024 * 1024) { // 5MB total limit
        return {
          success: false,
          message: 'Total file size exceeds 5MB limit. Please use fewer or smaller files, or contact us directly.'
        };
      }

      // Create attachment list for email
      let attachmentList = '';
      let attachmentInfo = '';

      if (smallAttachments.length > 0) {
        attachmentList += '<h4>📎 Pièces jointes (attachées):</h4><ul>';
        smallAttachments.forEach(att => {
          attachmentList += `<li>${att.name} (${this.formatFileSize(this.getBase64Size(att.data))})</li>`;
        });
        attachmentList += '</ul>';
      }

      if (largeFiles.length > 0) {
        attachmentList += '<h4>📁 Fichiers volumineux (téléchargeables):</h4><ul>';
        largeFiles.forEach(file => {
          attachmentList += `<li><strong>${file.name}</strong> (${this.formatFileSize(file.size)}) - <a href="${file.downloadUrl}" target="_blank" style="color: #0066cc;">📥 Télécharger</a></li>`;
        });
        attachmentList += '</ul>';
        
        // Determine storage duration based on storage type
        const storageDuration = ftpStorageService.getConfigStatus().configured ? '7 jours' : '24 heures';
        
        attachmentInfo = `
          <div style="background-color: #e8f4fd; border: 1px solid #b8daff; padding: 10px; margin: 10px 0; border-radius: 5px;">
            <strong>ℹ️ Note:</strong> Les fichiers volumineux (${largeFiles.length}) sont disponibles via téléchargement sécurisé.
            Les liens sont valides pendant ${storageDuration}.
          </div>
        `;
      }

      // Prepare EmailJS attachments (only small files)
      const emailjsAttachments = smallAttachments.map(att => ({
        name: att.name,
        data: att.data,
      }));

      const templateParams: Record<string, any> = {
        from_name: formData.name,
        from_email: formData.email,
        to_name: 'Klarrion Support',
        to_email: toEmail,
        subject: formData.subject,
        message: formData.message,
        company: formData.company || 'N/A',
        phone: formData.phone || 'N/A',
        attachment_list: attachmentList,
        attachment_info: attachmentInfo,
      };

      console.log(`Envoi d'un e-mail avec ${smallAttachments.length} fichiers attachés et ${largeFiles.length} fichiers volumineux`);

      // Send email with attachments
      const emailConfig: any = {
        publicKey: publicKey,
      };

      // Add attachments if any
      if (emailjsAttachments.length > 0) {
        emailConfig.attachments = emailjsAttachments;
      }

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

  // Helper method to format file size
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper method to get base64 size
  private getBase64Size(base64String: string): number {
    // Base64 string length * 0.75 gives approximate byte size
    return Math.floor(base64String.length * 0.75);
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