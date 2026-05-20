// middlewares/validate.middleware.js
import { errorResponse } from '../utils/response.js';

/**
 * Middleware para validar datos de entrada
 * @param {Function} validator - Función de validación
 */
export const validate = (validator) => {
    return async (req, res, next) => {
        try {
            const errors = await validator(req.body, req.params.id);
            
            if (errors && errors.length > 0) {
                return errorResponse(res, 'Error de validación', 400, errors);
            }
            
            next();
        } catch (error) {
            console.error('❌ Error en validate middleware:', error);
            return errorResponse(res, 'Error en validación', 500);
        }
    };
};

/**
 * Middleware para validar query params
 * @param {Function} validator - Función de validación
 */
export const validateQuery = (validator) => {
    return (req, res, next) => {
        try {
            const errors = validator(req.query);
            
            if (errors && errors.length > 0) {
                return errorResponse(res, 'Error en parámetros de consulta', 400, errors);
            }
            
            next();
        } catch (error) {
            console.error('❌ Error en validateQuery middleware:', error);
            return errorResponse(res, 'Error en validación', 500);
        }
    };
};