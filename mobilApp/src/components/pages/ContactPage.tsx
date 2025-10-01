import React, { useState, useEffect } from 'react';
import { GeoAlt, Telephone, Envelope, Facebook, Twitter, Instagram, Tiktok, Pinterest, Youtube, Whatsapp, Send, Paperclip } from 'react-bootstrap-icons';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { emailService } from '../../services/emailService';
import { ftpStorageService } from '../../services/ftpStorage';

interface ContactFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  subject: string;
  attachments?: File[];
}

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
    subject: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [fileInputKey, setFileInputKey] = useState('');
  const [ftpConnectionStatus, setFtpConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Scroll to top when page loads
  useScrollToTop();

  // Cleanup FTP connection on unmount
  useEffect(() => {
    return () => {
      disconnectFTP();
    };
  }, []);

  // FTP Connection Management
  const connectFTP = async () => {
    if (ftpConnectionStatus !== 'disconnected') return;
    
    console.log('Starting FTP connection...');
    setFtpConnectionStatus('connecting');
    try {
      const connected = await ftpStorageService.connect();
      if (connected) {
        setFtpConnectionStatus('connected');
        console.log('FTP connection established successfully');
      } else {
        setFtpConnectionStatus('disconnected');
        console.log('FTP connection failed');
      }
    } catch (error) {
      console.error('FTP connection failed:', error);
      setFtpConnectionStatus('disconnected');
    }
  };

  const disconnectFTP = async () => {
    if (ftpConnectionStatus === 'connected') {
      await ftpStorageService.disconnect();
      setFtpConnectionStatus('disconnected');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Connect to FTP when user starts filling the form
    if (value.trim() && ftpConnectionStatus === 'disconnected') {
      connectFTP();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      // Check individual file size (10MB limit per file)
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`Le fichier "${file.name}" est trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} MB). La limite par fichier est de 10MB.`);
        return;
      }

      // Check total size (EmailJS has overall limits)
      const totalSize = [...selectedFiles, ...newFiles, file].reduce((sum, f) => sum + f.size, 0);
      if (totalSize > 2 * 1024 * 1024) { // 2MB total limit
        errors.push(`La taille totale des fichiers dépasse la limite de 2MB. Veuillez réduire le nombre ou la taille des fichiers.`);
        return;
      }

      newFiles.push(file);
    });

    if (errors.length > 0) {
      setFileError(errors.join(' '));
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }

    // Reset file input
    e.target.value = '';
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(file => file !== fileToRemove));
    setFileError('');
  };

  const removeAllFiles = () => {
    setSelectedFiles([]);
    setFileError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.log('Form submission started...');
      console.log(`Selected files: ${selectedFiles.length}`);
      console.log(`FTP connection status: ${ftpConnectionStatus}`);

      // Ensure FTP is connected if configured and we have large files
      if (selectedFiles.length > 0 && ftpConnectionStatus === 'disconnected') {
        console.log('Attempting to connect to FTP for file upload...');
        // Try to connect to FTP if we have files to upload
        await connectFTP();
        
        // Wait a bit for connection to establish
        if (ftpConnectionStatus === 'connecting') {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Prepare email data
      const emailData = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        attachments: selectedFiles,
      };

      // Send email via EmailJS
      const result = await emailService.sendContactEmail(emailData);

      if (result.success) {
        setSuccessMessage(result.message);
        setFormData({
          name: '',
          company: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        });
        setSelectedFiles([]);
        setFileInputKey(Date.now().toString());
      } else {
        setErrorMessage(result.message);
      }

    } catch (error) {
      console.error('Form submission error:', error);
      setErrorMessage('An unexpected error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
      // Disconnect FTP after form submission
      disconnectFTP();
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
                      <span className="text-gray-600 dark:text-gray-300">+216 98 134 873</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Email</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Envelope className="w-4 h-4 text-blue-600 mr-2" />
                      <a href="mailto:klarrion@klarrion.com" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        klarrion@klarrion.com
                      </a>
                    </div>
                    <div className="flex items-center">
                      <Envelope className="w-4 h-4 text-blue-600 mr-2" />
                      <a href="mailto:etskc@yahoo.fr" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        etskc@yahoo.fr
                      </a>
                    </div>
                  </div><br />

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Horaires</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Lundi – Vendredi: 8h00 – 17h00<br />
                      Samedi: 8h00 – 12h00
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">SUIVEZ-NOUS</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {socialLinks.map((link) => {
                    const IconComponent = link.icon;
                    return (
                      <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center p-3 rounded-lg text-white hover:opacity-90 transition-opacity ${link.color}`}
                        title={link.name}
                      >
                        <IconComponent className="w-6 h-6" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">ENVOYEZ-NOUS UN MESSAGE</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name and Company */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Société
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sujet *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* Email and Phone */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* File Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pièces jointes
                    </label>
                    {/* FTP Connection Status */}
                    <div className="flex items-center text-xs">
                      {ftpConnectionStatus === 'connecting' && (
                        <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                          Connexion FTP...
                        </div>
                      )}
                      {ftpConnectionStatus === 'connected' && (
                        <div className="flex items-center text-green-600 dark:text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          FTP Connecté
                        </div>
                      )}
                      {ftpConnectionStatus === 'disconnected' && (
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
                          FTP Déconnecté
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-center">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        key={fileInputKey}
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Paperclip className="w-5 h-5 mr-2" />
                        <span>Joindre des fichiers</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      Les fichiers de moins de 10MB seront attachés à l'email. Les fichiers plus volumineux seront stockés temporairement.
                      {ftpConnectionStatus === 'connected' ? ' Stockage FTP activé (7 jours).' : ' Stockage temporaire (24h).'}
                      Limite totale: 2MB
                    </p>
                  </div>

                  {/* File List */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Fichiers sélectionnés ({selectedFiles.length})
                        </h4>
                        <button
                          type="button"
                          onClick={removeAllFiles}
                          className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          Tout supprimer
                        </button>
                      </div>
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex items-center">
                              <Paperclip className="w-4 h-4 text-gray-500 mr-2" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                              {file.size > 10 * 1024 * 1024 && (
                                <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                                  (Trop volumineux pour être attaché)
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(file)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Error */}
                  {fileError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {fileError}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer le message
                    </>
                  )}
                </button>

                {/* Success/Error Messages - Now at bottom */}
                {successMessage && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded dark:bg-green-900 dark:border-green-600 dark:text-green-300">
                    {successMessage}
                  </div>
                )}

                {errorMessage && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900 dark:border-red-600 dark:text-red-300">
                    {errorMessage}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
