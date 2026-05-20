// models/usuarios.model.js
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    field: 'IdUsuario'
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'Nombre',
    validate: {
      notEmpty: { msg: 'El nombre es requerido' },
      len: { args: [3, 100], msg: 'El nombre debe tener entre 3 y 100 caracteres' }
    }
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'Apellido'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'Correo',
    validate: {
      isEmail: { msg: 'Debe proporcionar un correo electrónico válido' }
    }
  },
  clave: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'Clave',
    validate: {
      notEmpty: { msg: 'La contraseña es requerida' },
      len: { args: [6, 100], msg: 'La contraseña debe tener al menos 6 caracteres' }
    }
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'pendiente',
    field: 'Estado',
    comment: 'Estado del usuario: pendiente (requiere aprobación), activo, inactivo',
    validate: {
      isIn: {
        args: [['pendiente', 'activo', 'inactivo']],
        msg: 'Estado no válido. Valores permitidos: pendiente, activo, inactivo'
      }
    }
  },
  idRol: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'IdRol',
    references: { model: 'Roles', key: 'IdRol' }
  },
  tipoDocumento: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'TipoDocumento'
  },
  numeroDocumento: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'NumeroDocumento'
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'Telefono'
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'MustChangePassword'
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ResetPasswordToken'
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ResetPasswordExpires'
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'SessionId'
  },
  lastActivity: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'LastActivity'
  },
  sessionIdApp: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'SessionIdApp'
  },
  lastActivityApp: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'LastActivityApp'
  }
}, {
  tableName: 'Usuarios',
  timestamps: false,
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.clave) {
        const salt = await bcrypt.genSalt(10);
        usuario.clave = await bcrypt.hash(usuario.clave, salt);
      }
      if (usuario.email) {
        usuario.email = usuario.email.toLowerCase();
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('clave') && usuario.clave) {
        const salt = await bcrypt.genSalt(10);
        usuario.clave = await bcrypt.hash(usuario.clave, salt);
      }
      if (usuario.changed('email') && usuario.email) {
        usuario.email = usuario.email.toLowerCase();
      }
    }
  }
});

// ──────────────────────────────────────────────────────────
// ✅ MÉTODOS PERSONALIZADOS
// ──────────────────────────────────────────────────────────
Usuario.prototype.validarClave = async function(claveInput) {
  return await bcrypt.compare(claveInput, this.clave);
};

Usuario.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.clave;
  return values;
};

Usuario.prototype.estaActivo = function() {
  return this.estado === 'activo';
};

Usuario.prototype.estaPendiente = function() {
  return this.estado === 'pendiente';
};

// ──────────────────────────────────────────────────────────
// ✅ MÉTODOS ESTÁTICOS
// ──────────────────────────────────────────────────────────
Usuario.buscarConFiltros = async function(filtros) {
  const { search, rol, estado, page = 1, limit = 10 } = filtros;
  const whereClause = {};
  
  if (search) {
    whereClause[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
  }
  if (rol) whereClause.idRol = rol;
  if (estado) whereClause.estado = estado;
  
  return await this.findAndCountAll({
    where: whereClause,
    include: [{ association: 'rolData' }],
    limit: parseInt(limit),
    offset: (page - 1) * limit,
    order: [['nombre', 'ASC']]
  });
};

Usuario.buscarPendientes = async function() {
  return await this.findAll({
    where: { estado: 'pendiente' },
    include: [{ association: 'rolData' }]
  });
};

// ──────────────────────────────────────────────────────────
// ✅ ASOCIACIONES
// ──────────────────────────────────────────────────────────
Usuario.associate = (models) => {
  // Relación con Rol (Managed in index.js)
  // Usuario.belongsTo(models.Rol, { ... });
  
  // Relación con Cliente (si existe el modelo)
  if (models.Cliente) {
    Usuario.hasOne(models.Cliente, {
      foreignKey: 'IdUsuario',
      as: 'clienteData'
    });
  }
};



export default Usuario;