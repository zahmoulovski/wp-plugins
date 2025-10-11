import React, { useState, useEffect } from 'react';
import { GeoAlt, Telephone, Envelope, Facebook, Twitter, Instagram, Tiktok, Pinterest, Youtube, Whatsapp, Send } from 'react-bootstrap-icons';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { emailService } from '../../services/emailService';

interface ContactFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  subject: string;
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

  // Scroll to top when page loads
  useScrollToTop();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const emailData = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
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
      } else {
        setErrorMessage(result.message);
      }

    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
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
                      <a href="tel:+21631401103" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        +216 31 401 103
                      </a>
                    </div>
                    <div className="flex items-center">
                      <Telephone className="w-4 h-4 text-blue-600 mr-2" />
                      <a href="tel:+21698128782" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        +216 98 128 782
                      </a>
                    </div>
                    <div className="flex items-center">
                      <Telephone className="w-4 h-4 text-blue-600 mr-2" />
                      <a href="tel:+21698128778" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        +216 98 128 778
                      </a>
                    </div>
                    <div className="flex items-center">
                      <Telephone className="w-4 h-4 text-blue-600 mr-2" />
                      <a href="tel:+21698134873" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        +216 98 134 873
                      </a>
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
                    <div className="space-y-2">
                      {[
                        { day: 'Lundi', hours: '8h00 – 17h00' },
                        { day: 'Mardi', hours: '8h00 – 17h00' },
                        { day: 'Mercredi', hours: '8h00 – 17h00' },
                        { day: 'Jeudi', hours: '8h00 – 17h00' },
                        { day: 'Vendredi', hours: '8h00 – 17h00' },
                        { day: 'Samedi', hours: '8h00 – 12h00' },
                        { day: 'Dimanche', hours: 'Fermé' }
                      ].map((item, index) => {
                        const today = new Date().getDay();
                        const dayIndex = index === 6 ? 0 : index + 1; // Sunday is 0 in JS
                        const isToday = today === dayIndex;
                        
                        return (
                          <div key={item.day} className={`flex justify-between items-center ${
                            isToday ? 'bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg border-l-4 border-primary-500' : ''
                          }`}>
                            <span className={`font-medium ${
                              isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {item.day}{isToday && ' (Aujourd\'hui)'}
                            </span>
                            <span className={`${
                              item.hours === 'Fermé' 
                                ? 'text-red-600 dark:text-red-400 font-medium' 
                                : 'text-gray-600 dark:text-gray-300'
                            }`}>
                              {item.hours}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
