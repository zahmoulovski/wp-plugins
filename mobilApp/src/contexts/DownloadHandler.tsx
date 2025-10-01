import React from 'react';
import { fileStorageService } from '../services/fileStorage';

interface DownloadHandlerProps {
  fileId: string;
}

export const DownloadHandler: React.FC<DownloadHandlerProps> = ({ fileId }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const downloadFile = async () => {
      try {
        const storedFile = fileStorageService.getFile(fileId);
        
        if (!storedFile) {
          setError('File not found or expired');
          setLoading(false);
          return;
        }

        // Create download link
        const link = document.createElement('a');
        link.href = storedFile.data;
        link.download = storedFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to download file');
        setLoading(false);
      }
    };

    downloadFile();
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Préparation du téléchargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">❌</div>
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Le fichier peut avoir expiré ou être introuvable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <div className="text-green-600 text-xl mb-2">✅</div>
        <p className="text-green-600">Téléchargement démarré!</p>
        <p className="text-sm text-gray-500 mt-2">
          Si le téléchargement ne commence pas automatiquement, vérifiez vos paramètres de navigation.
        </p>
      </div>
    </div>
  );
};