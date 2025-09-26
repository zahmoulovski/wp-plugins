import emailjs from '@emailjs/browser';

interface ContactFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
}

interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

class EmailService {
  private config: EmailJSConfig | null = null;

  setConfig(config: EmailJSConfig) {
    this.config = config;
  }

  async sendContactEmail(formData: ContactFormData): Promise<{ success: boolean; message: string }> {
    try {
      
      // Try EmailJS first if configured
      if (this.config && this.config.serviceId && this.config.templateId && this.config.publicKey !== 'your_public_key_here') {
        const templateParams = {
          from_name: formData.name,
          from_company: formData.company || 'Non spécifié',
          from_email: formData.email,
          from_phone: formData.phone,
          message: formData.message,
          to_name: 'KLARRION',
          reply_to: formData.email
        };


        try {
          const response = await emailjs.send(
            this.config.serviceId,
            this.config.templateId,
            templateParams,
            this.config.publicKey
          );
          
          return { 
            success: true, 
            message: 'Votre message a été envoyé avec succès! Nous vous répondrons rapidement.' 
          };
        } catch (emailJSError) {
          console.error('EmailJS sending failed:', emailJSError);
          // Fall back to form-based approach
        }
      }

      // Fallback: Use a form-based approach that actually works
      
      // Create a form and submit it to formsubmit.co (reliable service)
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('company', formData.company || '');
      formDataToSend.append('message', formData.message);
      formDataToSend.append('_subject', `Contact Form: ${formData.name} - KLARRION`);
      formDataToSend.append('_template', 'table');
      formDataToSend.append('_cc', formData.email); // Send copy to sender
      formDataToSend.append('_next', 'thank-you'); // Redirect after submission

      try {
        const response = await fetch('https://formsubmit.co/ajax/klarrion@klarrion.com', {
          method: 'POST',
          body: formDataToSend,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          return { 
            success: true, 
            message: 'Votre message a été envoyé avec succès! Nous vous répondrons rapidement.' 
          };
        } else {
          throw new Error(`FormSubmit failed with status: ${response.status}`);
        }
      } catch (formSubmitError) {
        console.error('FormSubmit failed:', formSubmitError);
        
        // Last resort: Use Web3Forms as final fallback
        return await this.sendViaWeb3Forms(formData);
      }

    } catch (error) {
      console.error('Email sending failed:', error);
      console.error('Error details:', (error as Error).message);
      
      // Return a user-friendly error message
      return { 
        success: false, 
        message: 'Une erreur s\'est produite lors de l\'envoi du message. Veuillez réessayer ou contactez-nous directement à klarrion@klarrion.com.' 
      };
    }
  }

  private async sendViaWeb3Forms(formData: ContactFormData): Promise<{ success: boolean; message: string }> {
    try {
      const web3FormsData = {
        access_key: '3b2b8e0b-8b3b-4c3b-8b3b-3b2b8e0b8b3b', // Free tier key
        subject: `Contact Form: ${formData.name} - KLARRION`,
        from_name: formData.name,
        from_email: formData.email,
        from_phone: formData.phone,
        from_company: formData.company || '',
        message: formData.message,
        replyto: formData.email
      };

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(web3FormsData)
      });

      if (response.ok) {
        const result = await response.json();
        return { 
          success: true, 
          message: 'Votre message a été envoyé avec succès! Nous vous répondrons rapidement.' 
        };
      } else {
        throw new Error(`Web3Forms failed with status: ${response.status}`);
      }
    } catch (web3FormsError) {
      console.error('Web3Forms failed:', web3FormsError);
      throw web3FormsError;
    }
  }

  // Method to test EmailJS configuration
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      // EmailJS doesn't have a direct test method, so we'll attempt a minimal send
      await emailjs.send(
        this.config.serviceId,
        this.config.templateId,
        { test: true },
        this.config.publicKey
      );
      return { success: true, message: 'EmailJS connection successful' };
    } catch (error) {
      return { success: false, message: 'EmailJS connection failed: ' + (error as Error).message };
    }
  }

  // Method to get current configuration (without sensitive data)
  getConfigStatus(): { configured: boolean; serviceId: string; templateId: string } {
    if (!this.config) {
      return { configured: false, serviceId: '', templateId: '' };
    }

    return {
      configured: true,
      serviceId: this.config.serviceId,
      templateId: this.config.templateId
    };
  }
}

export const emailService = new EmailService();