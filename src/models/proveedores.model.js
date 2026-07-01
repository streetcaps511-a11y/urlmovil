// models/proveedores.model.js
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Proveedores
 * Representa los proveedores que suministran productos al negocio
 * @table Proveedores
 */
const Proveedor = sequelize.define('Proveedor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdProveedor',
        comment: 'Identificador único del proveedor'
    },
    supplierType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'TipoProveedor',
        comment: 'Tipo de proveedor (Empresa, Individual, etc.)'
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El nombre de la empresa es requerido'
            },
            len: {
                args: [3, 200],
                msg: 'El nombre debe tener entre 3 y 200 caracteres'
            }
        },
        field: 'Nombre',
        comment: 'Nombre de la empresa o proveedor'
    },
    contactName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'Contacto',
        comment: 'Persona de contacto o nombre completo para persona natural'
    },
    documentType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'TipoDocumento',
        comment: 'Tipo de documento'
    },
    documentNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: { msg: 'El número de documento es requerido' },
            len: { args: [5, 20], msg: 'El número de documento debe tener entre 5 y 20 caracteres' }
        },
        field: 'NumeroDocumento'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
            len: { args: [10, 10], msg: 'El teléfono debe tener exactamente 10 dígitos' },
            isNumeric: { msg: 'El teléfono debe contener solo números' }
        },
        field: 'Telefono'
    },
    address: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'Direccion',
        comment: 'Dirección física del proveedor'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: {
                msg: 'Debe proporcionar un correo electrónico válido'
            },
            len: {
                args: [5, 100],
                msg: 'El correo debe tener entre 5 y 100 caracteres'
            }
        },
        field: 'Email',
        comment: 'Correo electrónico de contacto'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'Ciudad',
        comment: 'Ciudad o municipio de ubicación'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado',
        comment: 'Estado del proveedor (true=activo, false=inactivo)'
    }
}, {
    tableName: 'Proveedores',
    timestamps: false,
    hooks: {
        beforeCreate: (proveedor) => {
            console.log(`📦 Creando nuevo proveedor: ${proveedor.companyName}`);
            if (proveedor.documentType === 'NIT' && proveedor.documentNumber) {
                proveedor.documentNumber = proveedor.documentNumber.toString().replace(/\s/g, '');
            }
            if (proveedor.email) {
                proveedor.email = proveedor.email.toLowerCase().trim();
            }
        },
        beforeUpdate: (proveedor) => {
            console.log(`📦 Actualizando proveedor ID: ${proveedor.id}`);
            if (proveedor.email) {
                proveedor.email = proveedor.email.toLowerCase().trim();
            }
        }
    }
});

// Métodos personalizados
Proveedor.prototype.getTipoProveedorTexto = function() {
    return this.documentType === 'NIT' ? 'Jurídica' : 'Natural';
};

// Método para buscar proveedores con filtros avanzados
Proveedor.buscarConFiltros = async function(filtros) {
    const { search, documentType, isActive, page, limit } = filtros;
    const whereClause = {};
    
    if (search) {
        whereClause[Op.or] = [
            { companyName: { [Op.like]: `%${search}%` } },
            { documentNumber: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } }
        ];
    }
    
    if (documentType) {
        whereClause.documentType = documentType;
    }
    
    if (isActive !== undefined) {
        whereClause.isActive = isActive;
    }
    
    return this.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['companyName', 'ASC']]
    });
};

// Método para verificar si el proveedor tiene compras
Proveedor.prototype.tieneCompras = async function() {
    const Compra = (await import('./compras.model.js')).default;
    const count = await Compra.count({
        where: { idProveedor: this.id }
    });
    return count > 0;
};

export default Proveedor;