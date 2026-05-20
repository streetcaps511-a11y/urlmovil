// utils/validators/usuarios.validator.js
const { Op } = require('sequelize');
const Usuario = require('../../models/Usuarios');
const Rol = require('../../models/Roles');

/**
 * Validador específico para usuarios
 */

const validateUsuarioData = async (data, id = null) => {
    const errors = [];

    // Validar Nombre
    if (data.Nombre !== undefined && (!data.Nombre || data.Nombre.length < 3)) {
        errors.push('El nombre debe tener al menos 3 caracteres');
    }

    // Validar Correo
    if (data.Correo !== undefined) {
        if (!data.Correo) {
            errors.push('El correo es requerido');
        } else {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(data.Correo)) {
                errors.push('Correo electrónico inválido');
            } else {
                const whereClause = { Correo: data.Correo.toLowerCase().trim() };
                if (id) whereClause.IdUsuario = { [Op.ne]: id };
                
                const existe = await Usuario.findOne({ where: whereClause });
                if (existe) errors.push('El correo ya está registrado');
            }
        }
    }

    // Validar Contraseña
    if (data.Clave !== undefined && (!data.Clave || data.Clave.length < 6)) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    // Validar Rol
    if (data.IdRol) {
        const rol = await Rol.findByPk(data.IdRol);
        if (!rol) {
            errors.push('El rol seleccionado no existe');
        }
    }

    return errors;
};

const sanitizeUsuarioData = (data) => {
    const sanitized = {};
    
    if (data.Nombre) sanitized.Nombre = data.Nombre.trim().replace(/\s+/g, ' ');
    if (data.Correo) sanitized.Correo = data.Correo.toLowerCase().trim();
    if (data.IdRol) sanitized.IdRol = Number(data.IdRol);
    if (data.Estado !== undefined) sanitized.Estado = data.Estado;
    
    return sanitized;
};

const validateLogin = (data) => {
    const errors = [];

    if (!data.correo || data.correo.trim() === '') {
        errors.push('El correo es requerido');
    }

    if (!data.clave || data.clave.trim() === '') {
        errors.push('La contraseña es requerida');
    }

    return errors;
};

module.exports = {
    validateUsuarioData,
    sanitizeUsuarioData,
    validateLogin
};