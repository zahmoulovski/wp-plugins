// Simple file storage service for temporary file hosting
export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string;
  uploadedAt: number;
  expiresAt: number;
}

export class FileStorageService {
  private static instance: FileStorageService;
  private files: Map<string, StoredFile> = new Map();
  private readonly STORAGE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_FILES = 100; // Maximum files to store

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  // Convert file to base64
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // Store file and return download URL
  async storeFile(file: File): Promise<string> {
    try {
      const base64Data = await this.fileToBase64(file);
      const fileId = this.generateFileId();
      const now = Date.now();
      
      const storedFile: StoredFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64Data,
        uploadedAt: now,
        expiresAt: now + this.STORAGE_DURATION
      };

      // Cleanup old files if we're at capacity
      if (this.files.size >= this.MAX_FILES) {
        this.cleanupExpiredFiles();
      }

      this.files.set(fileId, storedFile);
      
      // Return download URL (will be relative to current domain)
      return `${window.location.origin}/download/${fileId}`;
    } catch (error) {
      console.error('Error storing file:', error);
      throw new Error('Failed to store file');
    }
  }

  // Get stored file
  getFile(fileId: string): StoredFile | undefined {
    return this.files.get(fileId);
  }

  // Generate unique file ID
  private generateFileId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Clean up expired files
  private cleanupExpiredFiles(): void {
    const now = Date.now();
    for (const [fileId, file] of this.files.entries()) {
      if (file.expiresAt <= now) {
        this.files.delete(fileId);
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
  getStats(): { totalFiles: number; totalSize: number } {
    let totalSize = 0;
    for (const file of this.files.values()) {
      totalSize += file.size;
    }
    return {
      totalFiles: this.files.size,
      totalSize
    };
  }
}

export const fileStorageService = FileStorageService.getInstance();