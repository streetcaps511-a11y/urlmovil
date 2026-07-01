// models/clientes.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Clientes
 * Representa los clientes que realizan compras
 * @table Clientes
 */
const Cliente = sequelize.define('Cliente', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdCliente',
        comment: 'Identificador único del cliente'
    },
    tipoDocumento: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'TipoDocumento',
        validate: { notEmpty: { msg: 'El tipo de documento es requerido' } }
    },
    numeroDocumento: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'Documento',
        validate: {
            notEmpty: { msg: 'El número de documento es requerido' }
        }
    },
    nombreCompleto: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre es requerido' },
            len: { args: [3, 100], msg: 'El nombre debe tener entre 3 y 100 caracteres' }
        },
        field: 'Nombre'
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
            len: { args: [7, 15], msg: 'El teléfono debe tener entre 7 y 15 dígitos' },
            isNumeric: { msg: 'El teléfono debe contener solo números' }
        },
        field: 'Telefono'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'Email',
        comment: 'Correo electrónico',
        validate: {
            isEmail: {
                msg: 'Debe proporcionar un correo electrónico válido'
            }
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado',
        comment: 'Estado del cliente (true=activo, false=inactivo)'
    },
    ciudad: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'Ciudad',
        comment: 'Ciudad de residencia'
    },
    direccion: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'Direccion',
        comment: 'Dirección de residencia'
    },
    avatarUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'Avatar',
        comment: 'URL o Base64 de la foto de perfil'
    }
}, {
    tableName: 'Clientes',
    timestamps: false,
    hooks: {
        beforeCreate: (cliente) => {
            if (cliente.email) {
                cliente.email = cliente.email.toLowerCase();
            }
        },
        beforeUpdate: (cliente) => {
            if (cliente.email) {
                cliente.email = cliente.email.toLowerCase();
            }
        }
    }
});

// Métodos personalizados
Cliente.prototype.getTipoDocumentoTexto = function() {
    const tipos = {
        'CC': 'Cédula de Ciudadanía',
        'CE': 'Cédula de Extranjería', 
        'NIT': 'NIT',
        'Pasaporte': 'Pasaporte'
    };
    return tipos[this.tipoDocumento] || this.tipoDocumento || 'Desconocido';
};

Cliente.prototype.estaActivo = function() {
    return this.isActive;
};

Cliente.prototype.formatearDocumento = function() {
    return `${this.tipoDocumento} ${this.numeroDocumento}`;
};

// 🟢 NUEVO: Obtener usuario asociado
Cliente.prototype.tieneUsuario = function() {
    return this.idUsuario !== null;
};

export default Cliente;