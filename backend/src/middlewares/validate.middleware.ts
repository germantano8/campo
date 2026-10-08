import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para validar que los campos requeridos estén presentes en el body de la petición
 */
export const validateBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields = requiredFields.filter((field) => {
      const val = req.body[field];
      return val === undefined || val === null || val === '';
    });

    if (missingFields.length > 0) {
      res.status(400).json({
        status: 'error',
        message: `Faltan campos requeridos: ${missingFields.join(', ')}`,
        missingFields,
      });
      return;
    }

    next();
  };
};
