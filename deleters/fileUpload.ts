import { Customer } from '../types';

export class FileUploadService {
  private static instance: FileUploadService;
  
  private constructor() {}
  
  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Convert file to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generate a unique filename
   */
  private generateUniqueFilename(originalFilename: string, customerId: number): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalFilename.split('.').pop() || 'jpg';
    return `profile_${customerId}_${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Store profile picture locally using localStorage
   */
  public async uploadProfilePicture(file: File, customerId: number): Promise<string> {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit for local storage
        throw new Error('Image size must be less than 5MB for local storage');
      }

      // Convert to base64
      const base64Data = await this.fileToBase64(file);
      
      // Generate unique filename
      const filename = this.generateUniqueFilename(file.name, customerId);
      
      // Store in localStorage with metadata
      const profilePictureData = {
        filename,
        data: base64Data,
        uploadedAt: new Date().toISOString(),
        customerId
      };
      
      // Check if localStorage is available
      try {
        localStorage.setItem(`profile_picture_${customerId}`, JSON.stringify(profilePictureData));
      } catch (storageError) {
        // If localStorage is full or unavailable, we'll just use the base64 data directly
        console.warn('localStorage not available, using base64 data directly:', storageError);
      }
      
      // Return the data URL for immediate use
      return base64Data;
    } catch (error) {
      console.error('Local profile picture upload error:', error);
      throw error;
    }
  }

  /**
   * Get stored profile picture for a customer
   */
  public getProfilePicture(customerId: number): string | null {
    try {
      const storedData = localStorage.getItem(`profile_picture_${customerId}`);
      if (!storedData) return null;
      
      const profilePictureData = JSON.parse(storedData);
      return profilePictureData.data;
    } catch (error) {
      console.error('Error retrieving profile picture:', error);
      return null;
    }
  }

  /**
   * Check if a profile picture exists for a customer
   */
  public hasProfilePicture(customerId: number): boolean {
    try {
      return localStorage.getItem(`profile_picture_${customerId}`) !== null;
    } catch (error) {
      console.error('Error checking profile picture:', error);
      return false;
    }
  }

  /**
   * Delete stored profile picture
   */
  public deleteProfilePicture(customerId: number): void {
    try {
      localStorage.removeItem(`profile_picture_${customerId}`);
    } catch (error) {
      console.error('Error deleting profile picture:', error);
    }
  }

  /**
   * Update customer with profile picture (combines local storage with customer data)
   */
  public async updateCustomerWithProfilePicture(customer: Customer, file: File): Promise<Customer> {
    try {
      // Upload picture locally
      const localPictureUrl = await this.uploadProfilePicture(file, customer.id);
      
      // Return updated customer object with local picture URL
      return {
        ...customer,
        avatar_url: localPictureUrl
      };
    } catch (error) {
      console.error('Error updating customer with profile picture:', error);
      throw error;
    }
  }

  /**
   * Sync profile picture with WordPress (store WordPress URL and update local storage)
   */
  public syncWithWordPress(customerId: number, wordpressUrl: string): void {
    try {
      // Store WordPress URL in localStorage for backup
      const profilePictureData = {
        data: wordpressUrl,
        timestamp: Date.now(),
        source: 'wordpress'
      };
      
      localStorage.setItem(`profile_picture_${customerId}`, JSON.stringify(profilePictureData));
      console.log('Profile picture synced with WordPress:', wordpressUrl);
    } catch (error) {
      console.error('Error syncing with WordPress:', error);
      // Continue without throwing - WordPress URL is still available
    }
  }

  /**
   * Get the best available profile picture (WordPress first, then local)
   */
  public getBestProfilePicture(customerId: number, customerAvatarUrl?: string): string | null {
    try {
      // First try local storage (which includes WordPress sync)
      const localData = this.getProfilePicture(customerId);
      if (localData) {
        return localData;
      }
      
      // Fall back to customer's avatar_url
      if (customerAvatarUrl) {
        return customerAvatarUrl;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting best profile picture:', error);
      return customerAvatarUrl || null;
    }
  }


}

export const fileUploadService = FileUploadService.getInstance();