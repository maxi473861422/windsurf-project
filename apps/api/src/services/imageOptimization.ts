import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { redisClient } from '../index';

/**
 * Servicio de optimización de imágenes para CDN
 * Prepara imágenes para entrega optimizada vía CDN
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
}

export interface CDNHeaders {
  'Cache-Control': string;
  'X-Content-Type-Options': string;
  'Content-Security-Policy': string;
}

class ImageOptimizationService {
  private s3Client: S3Client;
  private bucketName: string;
  private cdnBaseUrl: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucketName = process.env.AWS_S3_BUCKET || 'gsd-atlas-images';
    this.cdnBaseUrl = process.env.CDN_BASE_URL || `https://${this.bucketName}.s3.amazonaws.com`;
  }

  /**
   * Generar URL optimizada para CDN
   */
  generateOptimizedUrl(
    originalUrl: string,
    options: ImageOptimizationOptions = {}
  ): string {
    const { width, height, quality = 85, format = 'webp' } = options;
    
    // Generar clave de caché para esta variante
    const cacheKey = this.generateCacheKey(originalUrl, options);
    
    // Verificar si la URL optimizada ya existe en caché
    return `${this.cdnBaseUrl}/optimized/${cacheKey}`;
  }

  /**
   * Generar clave de caché para variante de imagen
   */
  private generateCacheKey(originalUrl: string, options: ImageOptimizationOptions): string {
    const hash = this.simpleHash(JSON.stringify({ originalUrl, options }));
    const ext = options.format || 'webp';
    return `${hash}.${ext}`;
  }

  /**
   * Hash simple para generar claves únicas
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Headers de CDN para imágenes
   */
  getCdnHeaders(): CDNHeaders {
    return {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:",
    };
  }

  /**
   * Generar srcset para responsive images
   */
  generateSrcSet(originalUrl: string, widths: number[] = [320, 640, 1024, 1920]): string {
    return widths
      .map(width => {
        const optimizedUrl = this.generateOptimizedUrl(originalUrl, { width });
        return `${optimizedUrl} ${width}w`;
      })
      .join(', ');
  }

  /**
   * Generar placeholder (blur) para lazy loading
   */
  async generatePlaceholder(originalUrl: string): Promise<string> {
    const cacheKey = `placeholder:${this.simpleHash(originalUrl)}`;
    
    // Verificar caché
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Generar placeholder de baja calidad
    const placeholder = this.generateLowQualityPlaceholder(originalUrl);
    
    // Cachear por 24 horas
    await redisClient.setEx(cacheKey, 86400, placeholder);
    
    return placeholder;
  }

  /**
   * Generar placeholder de baja calidad (base64)
   */
  private generateLowQualityPlaceholder(originalUrl: string): string {
    // En producción, esto usaría sharp para generar un thumbnail real
    // Por ahora, retornamos un placeholder simple
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ccc" width="100" height="100"/%3E%3C/svg%3E';
  }

  /**
   * Subir imagen optimizada a S3
   */
  async uploadOptimizedImage(
    originalUrl: string,
    imageBuffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(originalUrl, options);
    const contentType = `image/${options.format || 'webp'}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: `optimized/${cacheKey}`,
      Body: imageBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        originalUrl,
        width: options.width?.toString() || 'auto',
        height: options.height?.toString() || 'auto',
        quality: options.quality?.toString() || '85',
      },
    });

    await this.s3Client.send(command);

    return `${this.cdnBaseUrl}/optimized/${cacheKey}`;
  }

  /**
   * Obtener imagen de S3
   */
  async getImageFromS3(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const chunks: Uint8Array[] = [];

    // @ts-ignore - Body is a stream
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Invalidar caché de imagen
   */
  async invalidateImageCache(originalUrl: string): Promise<void> {
    const pattern = this.simpleHash(originalUrl);
    await redisClient.del(`placeholder:${pattern}`);
  }

  /**
   * Calcular ancho óptimo basado en viewport
   */
  calculateOptimalWidth(viewportWidth: number, devicePixelRatio: number = 1): number {
    const maxWidth = 1920; // Máximo ancho soportado
    const optimalWidth = Math.min(viewportWidth * devicePixelRatio, maxWidth);
    
    // Redondear al múltiplo de 100 más cercano para mejor caché
    return Math.ceil(optimalWidth / 100) * 100;
  }

  /**
   * Generar meta tags para SEO de imágenes
   */
  generateImageMetaTags(
    imageUrl: string,
    alt: string,
    title?: string,
    width?: number,
    height?: number
  ): Record<string, string> {
    return {
      'og:image': imageUrl,
      'og:image:alt': alt,
      'og:image:width': width?.toString() || '1200',
      'og:image:height': height?.toString() || '630',
      'twitter:image': imageUrl,
      'twitter:image:alt': alt,
    };
  }

  /**
   * Optimizar imagen para avatar (cuadrado, pequeño)
   */
  getAvatarUrl(originalUrl: string): string {
    return this.generateOptimizedUrl(originalUrl, {
      width: 150,
      height: 150,
      quality: 80,
      format: 'webp',
      fit: 'cover',
    });
  }

  /**
   * Optimizar imagen para thumbnail
   */
  getThumbnailUrl(originalUrl: string): string {
    return this.generateOptimizedUrl(originalUrl, {
      width: 300,
      height: 200,
      quality: 75,
      format: 'webp',
      fit: 'cover',
    });
  }

  /**
   * Optimizar imagen para galería
   */
  getGalleryUrl(originalUrl: string): string {
    return this.generateOptimizedUrl(originalUrl, {
      width: 800,
      height: 600,
      quality: 85,
      format: 'webp',
      fit: 'contain',
    });
  }

  /**
   * Optimizar imagen para vista completa
   */
  getFullSizeUrl(originalUrl: string): string {
    return this.generateOptimizedUrl(originalUrl, {
      width: 1920,
      quality: 90,
      format: 'webp',
    });
  }

  /**
   * Obtener todas las variantes de una imagen
   */
  getAllVariants(originalUrl: string): Record<string, string> {
    return {
      original: originalUrl,
      avatar: this.getAvatarUrl(originalUrl),
      thumbnail: this.getThumbnailUrl(originalUrl),
      gallery: this.getGalleryUrl(originalUrl),
      fullSize: this.getFullSizeUrl(originalUrl),
      srcset: this.generateSrcSet(originalUrl),
    };
  }
}

export const imageOptimizationService = new ImageOptimizationService();
export default imageOptimizationService;
