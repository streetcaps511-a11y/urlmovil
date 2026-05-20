import { errorResponse } from '../utils/response.js';

/**
 * Middleware para manejo de errores 404
 */
export const notFound = (req, res, next) => {
    const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

/**
 * Middleware para manejo de errores global
 */
export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : '🥞',
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    return errorResponse(
        res,
        err.message || 'Error interno del servidor',
        statusCode,
        process.env.NODE_ENV === 'development' ? err.stack : undefined
    );
};