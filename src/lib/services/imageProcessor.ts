import { createWorker } from 'tesseract.js';
import { logError, logInfo, logDebug } from '@/lib/utils/logging';

interface ImageProcessingResult {
  text: string;
  confidence: number;
  metadata: {
    width: number;
    height: number;
    format: string;
    processingTimeMs: number;
  };
}

interface TesseractProgress {
  workerId: string;
  jobId: string;
  status: string;
  progress: number;
}

export class ImageProcessor {
  private worker: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      logInfo('Initializing Tesseract worker');
      this.worker = await createWorker('eng', 1, {
        logger: (progress: TesseractProgress) => {
          logDebug('Tesseract progress', progress);
        }
      });
      this.isInitialized = true;
      logInfo('Tesseract worker initialized successfully');
    } catch (error) {
      logError('Failed to initialize Tesseract worker', error);
      throw new Error('Failed to initialize image processing');
    }
  }

  async processImage(file: File): Promise<ImageProcessingResult> {
    if (!this.isInitialized || !this.worker) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      logInfo('Starting image processing', { 
        fileName: file.name, 
        fileSize: file.size,
        fileType: file.type 
      });

      // Convert file to base64 for Tesseract
      const base64Data = await this.fileToBase64(file);
      
      logDebug('Image data prepared', { 
        base64Length: base64Data.length 
      });

      // Get image dimensions first
      const dimensions = await this.getImageDimensions(file);
      
      logDebug('Image dimensions obtained', dimensions);

      // Perform OCR
      const result = await this.worker!.recognize(base64Data);
      
      const processingTime = Date.now() - startTime;
      
      logInfo('Image processing completed', {
        fileName: file.name,
        confidence: result.data.confidence,
        processingTimeMs: processingTime,
        textLength: result.data.text.length
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        metadata: {
          width: dimensions.width,
          height: dimensions.height,
          format: file.type,
          processingTimeMs: processingTime
        }
      };
    } catch (error) {
      logError('Image processing failed', error, { fileName: file.name });
      if (error instanceof Error) {
        throw new Error(`Failed to process image ${file.name}: ${error.message}`);
      }
      throw new Error(`Failed to process image ${file.name}: Unknown error`);
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        resolve(base64); // Keep the data URL format as Tesseract can handle it
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject(new Error('Failed to load image for dimension calculation'));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  async terminate() {
    if (this.worker) {
      logInfo('Terminating Tesseract worker');
      try {
        await this.worker.terminate();
        this.worker = null;
        this.isInitialized = false;
        logInfo('Tesseract worker terminated successfully');
      } catch (error) {
        logError('Error terminating Tesseract worker', error);
        // Don't throw here as this is cleanup code
      }
    }
  }
} 