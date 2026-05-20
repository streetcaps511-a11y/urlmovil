// utils/response.js
/**
 * Utilidades para respuestas HTTP estandarizadas
 */

/**
 * Respuesta exitosa
 * @param {Object} res - Objeto response de Express
 * @param {Object} data - Datos a enviar
 * @param {string} message - Mensaje descriptivo
 * @param {number} statusCode - Código HTTP (default: 200)
 */
export const successResponse = (res, data = null, message = 'Operación exitosa', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Respuesta de error
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código HTTP (default: 400)
 * @param {Array|string} errors - Errores adicionales
 */
export const errorResponse = (res, message = 'Error en la operación', statusCode = 400, errors = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    if (errors) {
        response.errors = Array.isArray(errors) ? errors : [errors];
    }

    return res.status(statusCode).json(response);
};

/**
 * Respuesta de paginación
 * @param {Object} res - Objeto response de Express
 * @param {Array} data - Datos de la página actual
 * @param {number} total - Total de registros
 * @param {number} page - Página actual
 * @param {number} limit - Registros por página
 * @param {string} message - Mensaje descriptivo
 */
export const paginationResponse = (res, data, total, page, limit, message = 'Datos obtenidos exitosamente') => {
    const totalPages = Math.ceil(total / limit);
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages,
            from,
            to
        },
        timestamp: new Date().toISOString()
    });
};