// src/utils/validationUtils.js
import { Op } from 'sequelize';
import { 
    Categoria, 
    Producto, 
    Proveedor, 
    Cliente, 
    Usuario, 
    Rol 
} from '../models/index.js';

/**
 * Helpers para validación numérica y de longitud
 */
const isNumeric = (val) => /^\d+$/.test(val.toString());
const isTenDigits = (val) => val.toString().length === 10;

// ============================================
// VALIDACIONES DE CATEGORÍAS
// ============================================
export const validateCategoria = async (data, id = null) => {
    const errors = [];
    if (data.nombre !== undefined) {
        if (!data.nombre || data.nombre.trim() === '') errors.push('El nombre es requerido');
        else if (data.nombre.length < 2) errors.push('El nombre debe tener al menos 2 caracteres');
        else {
            try {
                const whereClause = { nombre: { [Op.iLike]: data.nombre.trim() } };
                if (id) whereClause.id = { [Op.ne]: id };
                const existing = await Categoria.findOne({ where: whereClause });
                if (existing) errors.push('Ya existe una categoría con ese nombre');
            } catch (error) {
                errors.push('Error al verificar nombre duplicado');
            }
        }
    }

    if (data.imagenUrl !== undefined && data.imagenUrl && data.imagenUrl.trim() !== '') {
        try {
            const whereClause = { imagenUrl: data.imagenUrl.trim() };
            if (id) whereClause.id = { [Op.ne]: id };
            const existing = await Categoria.findOne({ where: whereClause });
            if (existing) errors.push('Esta URL de imagen ya está en uso');
        } catch (error) {
            errors.push('Error al verificar imagen duplicada');
        }
    }
    return errors;
};

export const sanitizeCategoria = (data) => {
    const sanitized = {};
    if (data.nombre !== undefined) sanitized.nombre = data.nombre ? data.nombre.trim() : '';
    if (data.descripcion !== undefined) sanitized.descripcion = data.descripcion ? data.descripcion.trim() : null;
    if (data.imagenUrl !== undefined) sanitized.imagenUrl = data.imagenUrl ? data.imagenUrl.trim() : null;
    if (data.estado !== undefined) sanitized.estado = !!data.estado;
    return sanitized;
};

// ============================================
// VALIDACIONES DE PRODUCTOS
// ============================================
export const validateProducto = async (data, id = null) => {
    const errors = [];
    const { nombre, precioVenta, stock, idCategoria } = data;
    const isCreate = !id;

    if (isCreate && !nombre) {
        errors.push('El nombre del producto es obligatorio');
    } else if (nombre !== undefined && nombre.trim().length < 3) {
        errors.push('El nombre debe tener al menos 3 caracteres');
    }

    if (precioVenta !== undefined && (isNaN(precioVenta) || precioVenta < 0)) {
        errors.push('El precio debe ser un número positivo');
    }

    if (idCategoria !== undefined && idCategoria) {
        const cat = await Categoria.findByPk(idCategoria);
        if (!cat) errors.push('La categoría seleccionada no existe');
    }

    return errors;
};

export const sanitizeProducto = (data) => {
    const sanitized = {};
    const fields = [
        'nombre', 'categoria', 'idCategoria', 'descripcion', 'precioCompra', 'precioVenta', 
        'precioOferta', 'precioMayorista6', 'precioMayorista80', 'enOfertaVenta', 
        'porcentajeDescuento', 'enInventario', 'stock', 'tallasStock', 'imagenes', 
        'colores', 'destacado', 'isActive'
    ];

    fields.forEach(field => {
        if (data[field] !== undefined) {
            if (['precioCompra', 'precioVenta', 'precioOferta', 'precioMayorista6', 'precioMayorista80', 'stock', 'porcentajeDescuento'].includes(field)) {
                sanitized[field] = Number(data[field] || 0);
            } else if (['enOfertaVenta', 'enInventario', 'isActive', 'destacado'].includes(field)) {
                sanitized[field] = !!data[field];
            } else if (['tallasStock', 'imagenes'].includes(field)) {
                sanitized[field] = Array.isArray(data[field]) ? data[field] : [];
            } else {
                sanitized[field] = data[field];
            }
        }
    });

    return sanitized;
};

// ============================================
// VALIDACIONES DE PROVEEDORES
// ============================================
export const validateProveedor = async (data, id = null) => {
    const errors = [];
    const { companyName, documentNumber, email, phone } = data;

    if (companyName !== undefined && (!companyName || companyName.trim().length < 3)) {
        errors.push('El nombre de empresa debe tener al menos 3 caracteres');
    }

    const validationPromises = [];

    // Validar Documento
    if (documentNumber !== undefined) {
        if (documentNumber && !isNumeric(documentNumber)) {
            errors.push('El número de documento debe contener solo números');
        } else {
            validationPromises.push(
                Proveedor.findOne({ where: { 
                    documentNumber: documentNumber.toString().trim(),
                    ...(id && { id: { [Op.ne]: id } })
                }}).then(existing => {
                    if (existing) errors.push('Ya existe un proveedor con ese documento');
                })
            );
        }
    }

    // Validar Email
    if (email !== undefined) {
        validationPromises.push(
            Proveedor.findOne({ where: { 
                email: email.toLowerCase().trim(),
                ...(id && { id: { [Op.ne]: id } })
            }}).then(existing => {
                if (existing) errors.push('Ya existe un proveedor con ese email');
            })
        );
    }

    if (validationPromises.length > 0) {
        await Promise.all(validationPromises);
    }

    if (phone !== undefined && phone) {
        const cleanPhone = phone.toString().replace(/\D/g, '');
        if (!isNumeric(cleanPhone)) errors.push('El teléfono debe contener solo números');
        else if (cleanPhone.length !== 10) errors.push('El teléfono debe tener exactamente 10 dígitos');
    }

    return errors;
};

export const sanitizeProveedor = (data) => {
    const sanitized = {};
    const fields = [
        'companyName', 'documentType', 'documentNumber', 'contactName', 
        'phone', 'address', 'email', 'supplierType', 'department', 'city', 'isActive'
    ];
    fields.forEach(f => {
        if (data[f] !== undefined) {
            if (f === 'email') sanitized[f] = data[f].toLowerCase().trim();
            else if (f === 'isActive') sanitized[f] = !!data[f];
            else if (['documentNumber', 'phone'].includes(f)) {
                sanitized[f] = data[f] ? data[f].toString().replace(/\D/g, '') : null;
            }
            else sanitized[f] = data[f] ? data[f].toString().trim() : null;
        }
    });
    return sanitized;
};

// ============================================
// VALIDACIONES DE CLIENTES
// ============================================
export const validateCliente = async (data, id = null) => {
    const errors = [];
    const { nombreCompleto, email, numeroDocumento, telefono } = data;

    if (nombreCompleto !== undefined && (!nombreCompleto || nombreCompleto.trim().length < 3)) {
        errors.push('El nombre debe tener al menos 3 caracteres');
    }

    if (email !== undefined) {
        const existing = await Cliente.findOne({ where: { 
            email: email.toLowerCase().trim(),
            ...(id && { id: { [Op.ne]: id } })
        }});
        if (existing) errors.push('Ya existe un cliente con ese email');
    }

    if (numeroDocumento !== undefined && numeroDocumento) {
        const cleanDoc = numeroDocumento.toString().replace(/\D/g, '');
        if (cleanDoc && !isNumeric(cleanDoc)) {
            errors.push('El documento debe contener solo números');
        } else if (cleanDoc) {
            const existing = await Cliente.findOne({ where: { 
                numeroDocumento: cleanDoc.trim(),
                ...(id && { id: { [Op.ne]: id } })
            }});
            if (existing) errors.push('Ya existe un cliente con ese documento');
        }
    }

    if (telefono !== undefined && telefono) {
        const cleanPhone = telefono.toString().replace(/\D/g, '');
        // Solo validar si tiene contenido y no es una cadena informativa como "No registrado"
        if (cleanPhone) {
            if (!isNumeric(cleanPhone)) errors.push('El teléfono debe contener solo números');
            else if (cleanPhone.length !== 10) errors.push('El teléfono debe tener exactamente 10 dígitos');
        }
    }

    return errors;
};

export const sanitizeCliente = (data) => {
    const sanitized = {};
    const fields = [
        'nombreCompleto', 'email', 'numeroDocumento', 'telefono', 
        'direccion', 'ciudad', 'departamento', 'tipoDocumento', 'idUsuario', 'isActive'
    ];
    fields.forEach(f => {
        if (data[f] !== undefined) {
            if (f === 'email') sanitized[f] = data[f].toLowerCase().trim();
            else if (f === 'isActive') sanitized[f] = !!data[f];
            else if (['numeroDocumento', 'telefono'].includes(f)) {
                sanitized[f] = data[f] ? data[f].toString().replace(/\D/g, '') : null;
            }
            else sanitized[f] = data[f] ? data[f].toString().trim() : null;
        }
    });
    return sanitized;
};

// ============================================
// VALIDACIONES DE USUARIOS
// ============================================
export const validateUsuario = async (data, id = null) => {
    const errors = [];
    const { nombre, email, idRol } = data;

    if (nombre !== undefined && (!nombre || nombre.trim() === '')) errors.push('El nombre es requerido');

    if (email !== undefined) {
        const existing = await Usuario.findOne({ where: { 
            email: email.toLowerCase().trim(),
            ...(id && { id: { [Op.ne]: id } })
        }});
        if (existing) errors.push('El email ya está en uso');
    }

    if (idRol !== undefined && idRol) {
        const rol = await Rol.findByPk(idRol);
        if (!rol) errors.push('El rol no existe');
    }

    return errors;
};

export const sanitizeUsuario = (data) => {
    const sanitized = {};
    const fields = ['nombre', 'apellido', 'email', 'clave', 'idRol', 'estado'];
    fields.forEach(f => {
        if (data[f] !== undefined) {
            if (f === 'email') sanitized[f] = data[f].toLowerCase().trim();
            else sanitized[f] = data[f];
        }
    });
    return sanitized;
};

export const validateLogin = (data) => {
    const errors = [];
    if (!data.email) errors.push('Email requerido');
    if (!data.clave) errors.push('Contraseña requerida');
    return errors;
};

export const validateRegistro = (data) => {
    const errors = [];
    if (!data.nombre || data.nombre.length < 3) errors.push('Nombre demasiado corto');
    if (!data.email) errors.push('Email requerido');
    if (!data.clave || data.clave.length < 6) errors.push('Contraseña mínima 6 caracteres');
    return errors;
};

export const validateCambioClave = (data) => {
    const errors = [];
    if (!data.claveActual) errors.push('Contraseña actual requerida');
    if (!data.claveNueva || data.claveNueva.length < 6) errors.push('Nueva contraseña mínima 6 caracteres');
    return errors;
};

// ============================================
// VALIDACIONES DE ROLES
// ============================================
export const validateRol = async (data, id = null) => {
    const errors = [];
    if (data.nombre !== undefined) {
        if (!data.nombre || data.nombre.trim() === '') errors.push('El nombre del rol es requerido');
        else {
            const existing = await Rol.findOne({ where: { 
                nombre: data.nombre.trim(),
                ...(id && { id: { [Op.ne]: id } })
            }});
            if (existing) errors.push('Ya existe un rol con ese nombre');
        }
    }
    return errors;
};

export const sanitizeRol = (data) => {
    const sanitized = {};
    if (data.nombre) sanitized.nombre = data.nombre.trim();
    if (data.descripcion) sanitized.descripcion = data.descripcion.trim();
    if (data.permisos) sanitized.permisos = Array.isArray(data.permisos) ? data.permisos : [];
    if (data.isActive !== undefined) sanitized.isActive = !!data.isActive;
    return sanitized;
};