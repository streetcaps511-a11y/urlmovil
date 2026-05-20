// models/associations.js
import Usuario from './usuarios.model.js';
import Rol from './roles.model.js';
import Cliente from './clientes.model.js';
import DetallePermiso from './detallePermisos.model.js';
import Permiso from './permisos.model.js';

/**
 * Definir todas las asociaciones entre modelos
 */
export const defineAssociations = () => {
    
    // 🟢 Usuario ↔ Rol (Muchos a Uno)
    Usuario.belongsTo(Rol, {
        foreignKey: 'idRol',
        as: 'rolData',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    
    Rol.hasMany(Usuario, {
        foreignKey: 'idRol',
        as: 'Usuarios'
    });

    // 🟢 Usuario ↔ Cliente (Uno a Uno)
    Usuario.hasOne(Cliente, {
        foreignKey: 'idUsuario',
        as: 'clienteData',
        onDelete: 'CASCADE'
    });
    
    Cliente.belongsTo(Usuario, {
        foreignKey: 'idUsuario',
        as: 'Usuario'
    });

    // 🟢 Rol ↔ DetallePermiso (Uno a Muchos)
    Rol.hasMany(DetallePermiso, {
        foreignKey: 'idRol',
        as: 'DetallePermisos'
    });
    
    DetallePermiso.belongsTo(Rol, {
        foreignKey: 'idRol',
        as: 'Rol'
    });

    // 🟢 DetallePermiso ↔ Permiso (Muchos a Uno)
    DetallePermiso.belongsTo(Permiso, {
        foreignKey: 'idPermiso',
        as: 'Permiso',
        onDelete: 'CASCADE'
    });
    
    Permiso.hasMany(DetallePermiso, {
        foreignKey: 'idPermiso',
        as: 'DetallePermisos'
    });
};