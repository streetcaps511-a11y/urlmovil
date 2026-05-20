// models/estado.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Estados
 * Representa los posibles estados de ventas
 * @table Estado
 */
const Estado = sequelize.define('Estado', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdEstado'
    },
    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'Nombre',
        comment: 'Nombre del estado (Completada, Pendiente, Anulada)'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'Estado'
    }
}, {
    tableName: 'Estado',
    timestamps: false
});

export default Estado;