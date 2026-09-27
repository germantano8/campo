import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BlobServiceClient } from '@azure/storage-blob';
import multer from 'multer';

export interface UploadedFileResult {
  nombreOriginal: string;
  nombreAlmacenado: string;
  mimeType: string;
  storageProvider: 'AZURE_BLOB' | 'LOCAL_STORAGE';
  storagePath: string;
  urlPublica?: string;
}

// Configuración de Multer en memoria para procesar buffers directamente
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // Límite de 25 MB
  },
});

export class StorageService {
  private static localUploadDir = path.resolve(process.cwd(), 'uploads');

  private static getAzureClient() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString || connectionString.trim() === '') {
      return null;
    }
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  /**
   * Sube un archivo a Azure Blob Storage o al sistema de archivos local si no hay credenciales de Azure
   */
  public static async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general'
  ): Promise<UploadedFileResult> {
    const extension = path.extname(file.originalname);
    const nombreAlmacenado = `${uuidv4()}${extension}`;
    const azureClient = this.getAzureClient();

    if (azureClient) {
      // Subida a Azure Blob Storage
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'archivos-campo';
      const containerClient = azureClient.getContainerClient(containerName);

      // Crear contenedor si no existe
      await containerClient.createIfNotExists({ access: 'blob' });

      const blobName = `${folder}/${nombreAlmacenado}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });

      return {
        nombreOriginal: file.originalname,
        nombreAlmacenado,
        mimeType: file.mimetype,
        storageProvider: 'AZURE_BLOB',
        storagePath: blobName,
        urlPublica: blockBlobClient.url,
      };
    } else {
      // Fallback a almacenamiento local en disco
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }

      const localFolder = path.join(this.localUploadDir, folder);
      if (!fs.existsSync(localFolder)) {
        fs.mkdirSync(localFolder, { recursive: true });
      }

      const filePath = path.join(localFolder, nombreAlmacenado);
      await fs.promises.writeFile(filePath, file.buffer);

      const relativePath = path.join('uploads', folder, nombreAlmacenado).replace(/\\/g, '/');

      return {
        nombreOriginal: file.originalname,
        nombreAlmacenado,
        mimeType: file.mimetype,
        storageProvider: 'LOCAL_STORAGE',
        storagePath: relativePath,
        urlPublica: `/${relativePath}`,
      };
    }
  }

  /**
   * Elimina un archivo del storage correspondiente
   */
  public static async deleteFile(
    storagePath: string,
    provider: 'AZURE_BLOB' | 'LOCAL_STORAGE'
  ): Promise<void> {
    try {
      if (provider === 'AZURE_BLOB') {
        const azureClient = this.getAzureClient();
        if (azureClient) {
          const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'archivos-campo';
          const containerClient = azureClient.getContainerClient(containerName);
          const blockBlobClient = containerClient.getBlockBlobClient(storagePath);
          await blockBlobClient.deleteIfExists();
        }
      } else {
        const absolutePath = path.resolve(process.cwd(), storagePath);
        if (fs.existsSync(absolutePath)) {
          await fs.promises.unlink(absolutePath);
        }
      }
    } catch (error) {
      console.error(`Error al eliminar archivo en ${storagePath}:`, error);
    }
  }
}
