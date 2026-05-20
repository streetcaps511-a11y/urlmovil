// src/models/colores.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Color = sequelize.define('Color', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'IdColor'
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'Nombre'
  },
  hex: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'Hex'
  }
}, {
  tableName: 'Colores',
  timestamps: false
});

export default Color;
