import React, { useState } from 'react';
import { emailService } from '../../services/emailService';

const TestEmailPage: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const testEmailConfig = async () => {
    setIsTesting(true);
    setTestResult('');

    try {
      // Configure EmailJS with environment variables
      emailService.setConfig({
        serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
        templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      });

      // Test the connection
      const result = await emailService.testConnection();
      
      if (result.success) {
        setTestResult(`✅ ${result.message}`);
      } else {
        setTestResult(`❌ ${result.message}`);
      }

      // Get config status
      const configStatus = emailService.getConfigStatus();
      setTestResult(prev => prev + `\n\nConfiguration Status:\nHost: ${configStatus.host}\nFrom: ${configStatus.from}\nTo: ${configStatus.to}`);

    } catch (error) {
      setTestResult(`❌ Error: ${(error as Error).message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const sendTestEmail = async () => {
    setTestResult('');
    setIsTesting(true);

    try {
      const testData: ContactFormData = {
        name: 'Test User',
        email: 'yassine.klarrion@gmail.com', // Your email for testing
        phone: '+216 50 123 456',
        company: 'KLARRION Test',
        message: 'This is a test email from the KLARRION contact form testing system. If you receive this, the email configuration is working correctly!'
      };

      console.log('Sending test email with data:', testData);
      const result = await emailService.sendContactEmail(testData);
      
      if (result.success) {
        setTestResult(`✅ SUCCESS: ${result.message}\n\nCheck your email at klarrion@klarrion.com and the test email should also be CC'd to yassine.klarrion@gmail.com`);
        console.log('Email sent successfully:', result);
      } else {
        setTestResult(`❌ ERROR: ${result.message}`);
        console.error('Email sending failed:', result);
      }
    } catch (error) {
      console.error('Test email error:', error);
      setTestResult(`❌ EXCEPTION: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Email Configuration Test</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">EmailJS Configuration</h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p><strong>Service ID:</strong> {import.meta.env.VITE_EMAILJS_SERVICE_ID}</p>
            <p><strong>Template ID:</strong> {import.meta.env.VITE_EMAILJS_TEMPLATE_ID}</p>
            <p><strong>Public Key:</strong> {import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.substring(0, 10)}...</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Test Actions</h2>
          <div className="space-y-4">
            <button
              onClick={testEmailConfig}
              disabled={isTesting}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? 'Testing...' : 'Test SMTP Connection'}
            </button>
            
            <button
              onClick={sendTestEmail}
              disabled={isTesting}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Test Result</h2>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {testResult}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestEmailPage;