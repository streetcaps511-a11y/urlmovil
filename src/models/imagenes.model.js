// models/imagenes.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Imágenes
 * Representa las imágenes de los productos
 * @table Imagenes
 */
const Imagen = sequelize.define('Imagen', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdImagen'
    },
    idProducto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'IdProducto'
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'Url',
        validate: {
            notEmpty: { msg: 'La URL de la imagen es requerida' },
            isUrl: { msg: 'Debe proporcionar una URL válida' }
        }
    }
}, {
    tableName: 'Imagenes',
    timestamps: false
});

export default Imagen; // 👈 CAMBIO CRUCIAL