// models/roles.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Roles
 * Representa los roles de usuario en el sistema
 */
const Rol = sequelize.define('Rol', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: 'IdRol'
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'Nombre',
    validate: {
      notEmpty: { msg: 'El nombre del rol es requerido' },
      len: { args: [3, 50], msg: 'El nombre debe tener entre 3 y 50 caracteres' }
    }
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'Descripcion'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'Estado'
  },
  permisos: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'Permisos',
    defaultValue: []
  }
}, {
  tableName: 'Roles',
  timestamps: false
});

Rol.prototype.estaActivo = function() {
  return this.isActive;
};

Rol.prototype.tienePermiso = function(idPermiso) {
  return this.permisos && this.permisos.includes(idPermiso);
};

Rol.prototype.agregarPermiso = async function(idPermiso, DetallePermisoModel) {
  if (!this.permisos) this.permisos = [];
  if (!this.permisos.includes(idPermiso)) {
    this.permisos.push(idPermiso);
    if (DetallePermisoModel) {
      await DetallePermisoModel.create({
        idRol: this.id,
        idPermiso: idPermiso
      });
    }
    await this.save();
  }
  return this;
};

Rol.associate = (models) => {
  // Relación con Usuario (Managed in index.js)
  // Rol.hasMany(models.Usuario, { ... });
  
  if (models.DetallePermiso) {
    Rol.hasMany(models.DetallePermiso, {
      foreignKey: 'idRol',
      as: 'detallesPermisos'
    });
  }
};


export default Rol;