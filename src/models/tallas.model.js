// models/tallas.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Talla = sequelize.define('Talla', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'IdTalla'
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'Nombre',
        validate: {
            notEmpty: { msg: 'El nombre de la talla es requerido' }
        }
    },
    cantidad: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'Cantidad',
        validate: {
            min: { args: [0], msg: 'La cantidad no puede ser negativa' }
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'Estado'
    }
}, {
    tableName: 'Tallas',
    timestamps: false,
    freezeTableName: true
});

// SIN ASSOCIACIONES - Son independientes

export default Talla;