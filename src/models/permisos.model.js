// models/permisos.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Permisos
 * Representa los permisos disponibles en el sistema
 * @table Permisos
 */
const Permiso = sequelize.define('Permiso', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false,
        field: 'IdPermiso'
    },
    nombre: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'Nombre',
        validate: { notEmpty: { msg: 'El nombre del permiso es requerido' } }
    },
    modulo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'Modulo',
        validate: {
            isIn: {
                args: [['Dashboard', 'Categorías', 'Productos', 'Proveedores', 'Compras', 'Clientes', 'Ventas', 'Devoluciones', 'Usuarios', 'Roles', 'Permisos']],
                msg: 'Módulo no válido'
            }
        }
    },
    accion: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'Accion',
        validate: {
            isIn: {
                args: [['ver', 'crear', 'editar', 'eliminar', 'anular', 'activar', 'todos']],
                msg: 'Acción no válida'
            }
        }
    }
}, {
    tableName: 'Permisos',
    timestamps: false
});

export default Permiso;