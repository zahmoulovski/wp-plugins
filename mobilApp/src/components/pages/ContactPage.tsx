import React, { useState, useEffect } from 'react';
import { GeoAlt, Telephone, Envelope, Facebook, Twitter, Instagram, Tiktok,Pinterest, Youtube, Whatsapp, Send, Paperclip } from 'react-bootstrap-icons';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { emailService } from '../../services/emailService';

interface ContactFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  attachments?: File[];
}

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Scroll to top when page loads
  useScrollToTop();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileError('');
    
    if (files.length > 0) {
      // Check total files limit
      if (selectedFiles.length + files.length > 10) {
        setFileError('Maximum 10 files allowed');
        e.target.value = '';
        return;
      }
      
      // Simple file validation
      const validFiles: File[] = [];
      let hasErrors = false;
      
      files.forEach(file => {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          hasErrors = true;
          setFileError(`File ${file.name} is too large (max 10MB)`);
        } else if (!file.type.match(/^(image\/(jpeg|png|gif|webp)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|text\/plain)$/)) {
          hasErrors = true;
          setFileError(`Invalid file type for ${file.name}`);
        } else {
          validFiles.push(file);
        }
      });
      
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...validFiles]
        }));
      }
      
      if (hasErrors) {
        e.target.value = '';
      }
    }
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
    setFileError('');
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(file => file !== fileToRemove)
    }));
  };

  const removeAllFiles = () => {
    setSelectedFiles([]);
    setFileError('');
    setFormData(prev => {
      const { attachments, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage('');

    try {
      // Prepare email data
      const emailData = {
        name: formData.name,
        email: formData.email,
        subject: `Contact Form: ${formData.company || 'General Inquiry'}`,
        message: `Phone: ${formData.phone}\n\n${formData.message}`,
        attachments: formData.attachments
      };

      // Send email using the email service
      const response = await emailService.sendContactEmail(emailData);
      
      if (response.success) {
        setFormMessage('Message envoyé avec succès !');
        setFormData({
          name: '',
          company: '',
          email: '',
          phone: '',
          message: '',
          attachments: undefined
        });
        setSelectedFiles([]);
        console.log('Email sent successfully:', response.data);
      } else {
        setFormMessage('Erreur lors de l\'envoi du message. Veuillez réessayer.');
        console.error('Email sending failed:', response.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormMessage('Une erreur s\'est produite. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };



  const socialLinks = [
    { name: 'Facebook', url: 'https://www.facebook.com/klarrionsarl', icon: Facebook, color: 'bg-blue-600' },
    { name: 'Twitter', url: 'https://twitter.com/KLARRION_', icon: Twitter, color: 'bg-sky-500' },
    { name: 'Instagram', url: 'https://instagram.com/klarrion_', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@klarrion_', icon: Tiktok, color: 'bg-[#000000]' },
    { name: 'Youtube', url: 'https://www.youtube.com/@KLARRIONSARL', icon: Youtube, color: 'bg-red-600' },
    { name: 'Pinterest', url: 'https://www.pinterest.com/klarrion_/', icon: Pinterest, color: 'bg-red-700' },
    { name: 'Whatsapp', url: 'https://api.whatsapp.com/send?phone=21698134873', icon: Whatsapp, color: 'bg-green-500' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Contactez-nous</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Nous sommes là pour vous aider</p>
        </div>

        {/* Google Maps Section */}
        <div className="mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="aspect-w-16 aspect-h-9">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3195.9011570626362!2d10.219472900000001!3d36.772938599999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12fd35d5c76ca863%3A0xdb720c34e9ebf33f!2sKLARRION!5e0!3m2!1sen!2stn!4v1758186657342!5m2!1sen!2stn"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-96"
              />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            {/* Address */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">NOTRE ADRESSE</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <GeoAlt className="w-6 h-6 text-blue-600 mt-1 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Showroom</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      134 rue Oum El Araies ZI Saint Gobain – Mégrine 2014
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Téléphones</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Telephone className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">+216 31 401 103</span>
                    </div>
                    <div className="flex items-center">
                      <Telephone className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">+216 98 128 782</span>
                    </div>
                    <div className="flex items-center">
                      <Telephone className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">+216 98 128 778</span>
                    </div>
                    <div className="flex items-center">
                      <Telephone className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">+216 98 128 781</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Email</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Envelope className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">klarrion@klarrion.com</span>
                    </div>
                    <div className="flex items-center">
                      <Envelope className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">etskc@yahoo.fr</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Email service configured</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">SUIVEZ-NOUS</h2>
              <div className="flex flex-wrap gap-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${social.color} text-white p-2 rounded-full hover:opacity-90 transition-opacity`}
                      title={social.name}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">CONTACTEZ-NOUS</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Entreprise / Organisation
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pièces jointes (optionnel) - Maximum 10 fichiers
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  {selectedFiles.length === 0 ? (
                    <div className="text-center">
                      <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500 font-medium">
                          Cliquez pour joindre des fichiers
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.jpg,.png"
                          multiple
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        PDF, DOC, DOCX, PPT, PPTX, XLSX, XLS, JPG, PNG (max. 10 Mo chacun, max. 10 fichiers)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex items-center flex-1">
                            <Paperclip className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(file)}
                            className="text-red-600 hover:text-red-500 text-sm font-medium ml-2"
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                      {selectedFiles.length < 10 && (
                        <label className="cursor-pointer block text-center mt-2">
                          <span className="text-blue-600 hover:text-blue-500 text-sm font-medium">
                            + Ajouter plus de fichiers ({selectedFiles.length}/10)
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.jpg,.png"
                            multiple
                          />
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={removeAllFiles}
                        className="text-red-600 hover:text-red-500 text-sm font-medium block text-center mt-2"
                      >
                        Retirer tous les fichiers
                      </button>
                    </div>
                  )}
                </div>
                
                {fileError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{fileError}</p>
                )}
              </div>

              {formMessage && (
                <div className={`p-4 rounded-md ${
                  formMessage.includes('succès') 
                    ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {formMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <span>Envoi en cours...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Envoyer
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};