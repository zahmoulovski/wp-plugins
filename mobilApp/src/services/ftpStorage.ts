// FTP-based file storage service for persistent file hosting
export interface FTPStorageConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  uploadPath: string;
  publicUrl: string;
}

export interface StoredFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  ftpPath: string;
  publicUrl: string;
  uploadedAt: number;
  expiresAt: number;
}

export class FTPStorageService {
  private static instance: FTPStorageService;
  private config: FTPStorageConfig;
  private storedFiles: Map<string, StoredFileInfo> = new Map();
  private readonly STORAGE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_FILES = 1000; // Maximum files to track
  private isConnected: boolean = false;
  private connectionStartTime: number = 0;
  private readonly CONNECTION_TIMEOUT = 30 * 60 * 1000; // 30 minutes timeout

  private constructor() {
    // Default configuration - load from localStorage or use defaults
    const savedConfig = localStorage.getItem('ftpStorageConfig');
    const defaultConfig = {
      host: 'ftp.klarrion.com',
      port: 21,
      username: 'webapp@vite.klarrion.com',
      password: 'Vite-klarrion2025',
      secure: true,
      uploadPath: '/vite.klarrion.com/uploads/',
      publicUrl: 'https://vite.klarrion.com/uploads/'
    };
    
    this.config = savedConfig ? { ...defaultConfig, ...JSON.parse(savedConfig) } : defaultConfig;
    this.startCleanupInterval();
  }

  static getInstance(): FTPStorageService {
    if (!FTPStorageService.instance) {
      FTPStorageService.instance = new FTPStorageService();
    }
    return FTPStorageService.instance;
  }

  // Update FTP configuration
  updateConfig(config: Partial<FTPStorageConfig>): void {
    this.config = { ...this.config, ...config };
    // Save to localStorage for persistence
    localStorage.setItem('ftpStorageConfig', JSON.stringify(this.config));
  }

  // Convert file to base64 for FTP upload
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // Simulate FTP upload (in real implementation, this would use an FTP library)
  private async uploadToFTP(fileName: string, fileData: string): Promise<string> {
    try {
      // In a real implementation, you would use a library like 'ftp' or 'basic-ftp'
      // For now, we'll simulate the upload and return the public URL
      
      // Extract file extension and create unique filename
      const fileExt = fileName.split('.').pop() || '';
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const ftpPath = `${this.config.uploadPath}${uniqueFileName}`;
      const publicUrl = `${this.config.publicUrl}${uniqueFileName}`;

      // Simulate FTP upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In production, you would:
      // 1. Connect to FTP server
      // 2. Upload the file
      // 3. Verify upload success
      // 4. Return the public URL

      console.log(`Simulated FTP upload: ${fileName} -> ${ftpPath}`);
      console.log(`Public URL: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      console.error('FTP upload failed:', error);
      throw new Error('Failed to upload file to FTP server');
    }
  }

  // Store file on FTP server and return download URL
  async storeFile(file: File): Promise<string> {
    try {
      console.log(`Attempting to store file: ${file.name} (${file.size} bytes)`);
      
      if (!this.isConnected) {
        console.error('FTP storeFile failed: Not connected');
        throw new Error('FTP not connected. Please connect first.');
      }

      console.log('FTP is connected, proceeding with file storage...');
      const base64Data = await this.fileToBase64(file);
      console.log(`File converted to base64, size: ${base64Data.length} characters`);
      
      const publicUrl = await this.uploadToFTP(file.name, base64Data);
      console.log(`File uploaded to FTP, public URL: ${publicUrl}`);
      
      const fileId = this.generateFileId();
      const now = Date.now();
      
      const storedFileInfo: StoredFileInfo = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        ftpPath: publicUrl.replace(this.config.publicUrl, ''),
        publicUrl: publicUrl,
        uploadedAt: now,
        expiresAt: now + this.STORAGE_DURATION
      };

      // Cleanup old files if we're at capacity
      if (this.storedFiles.size >= this.MAX_FILES) {
        this.cleanupExpiredFiles();
      }

      this.storedFiles.set(fileId, storedFileInfo);
      console.log(`File stored successfully with ID: ${fileId}`);
      
      return publicUrl;
    } catch (error) {
      console.error('Error storing file on FTP:', error);
      throw new Error('Failed to store file on FTP server');
    }
  }



  // Generate unique file ID
  private generateFileId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Clean up expired files (mark as expired, actual deletion would require FTP access)
  private cleanupExpiredFiles(): void {
    const now = Date.now();
    for (const [fileId, fileInfo] of this.storedFiles.entries()) {
      if (fileInfo.expiresAt <= now) {
        // In production, you would also delete from FTP server
        console.log(`File expired: ${fileInfo.name} (${fileInfo.publicUrl})`);
        this.storedFiles.delete(fileId);
      }
    }
  }

  // Start cleanup interval
  private startCleanupInterval(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpiredFiles();
    }, 60 * 60 * 1000);
  }

  // Get storage statistics
  getStats(): { totalFiles: number; totalSize: number; ftpConfig: Partial<FTPStorageConfig> } {
    let totalSize = 0;
    for (const fileInfo of this.storedFiles.values()) {
      totalSize += fileInfo.size;
    }
    return {
      totalFiles: this.storedFiles.size,
      totalSize,
      ftpConfig: {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        uploadPath: this.config.uploadPath,
        publicUrl: this.config.publicUrl
      }
    };
  }

  // Check if FTP is properly configured
  isConfigured(): boolean {
    return !!(this.config.host && this.config.username && this.config.password && this.config.publicUrl);
  }

  // Get configuration status
  getConfigStatus(): { configured: boolean; host: string; publicUrl: string } {
    return {
      configured: this.isConfigured(),
      host: this.config.host,
      publicUrl: this.config.publicUrl
    };
  }

  // Connect to FTP server (start session)
  async connect(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        throw new Error('FTP not properly configured');
      }

      // Simulate FTP connection
      console.log(`Connecting to FTP: ${this.config.host}:${this.config.port}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate connection delay
      
      this.isConnected = true;
      this.connectionStartTime = Date.now();
      console.log('FTP connection established');
      
      // Start connection timeout
      this.startConnectionTimeout();
      
      return true;
    } catch (error) {
      console.error('FTP connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Disconnect from FTP server (end session)
  disconnect(): void {
    if (this.isConnected) {
      console.log('Disconnecting from FTP server');
      this.isConnected = false;
      this.connectionStartTime = 0;
      console.log('FTP connection closed');
    }
  }

  // Check if connected to FTP
  isFtpConnected(): boolean {
    return this.isConnected;
  }

  // Start connection timeout
  private startConnectionTimeout(): void {
    setTimeout(() => {
      if (this.isConnected && Date.now() - this.connectionStartTime > this.CONNECTION_TIMEOUT) {
        console.log('FTP connection timeout - auto disconnecting');
        this.disconnect();
      }
    }, this.CONNECTION_TIMEOUT);
  }

  // Get connection status
  getConnectionStatus(): { connected: boolean; startTime: number; duration: number } {
    return {
      connected: this.isConnected,
      startTime: this.connectionStartTime,
      duration: this.isConnected ? Date.now() - this.connectionStartTime : 0
    };
  }
}

export const ftpStorageService = FTPStorageService.getInstance();