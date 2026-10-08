import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Configuración de Multer en memoria para procesar archivos directamente (hasta 25 MB)
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB máximo
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/xml',
      'text/xml',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Tipo de archivo no permitido (${file.mimetype}). Solo se admiten PDFs, imágenes o XML.`
        )
      );
    }
  },
});

/**
 * Middleware flexible para recibir un único archivo con cualquier nombre de campo
 * (ej. 'archivo', 'file', 'adjunto', 'comprobante')
 */
export const uploadSingleFile = (req: Request, res: Response, next: NextFunction): void => {
  uploadMiddleware.any()(req, res, (err) => {
    if (err) {
      return next(err);
    }
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};
