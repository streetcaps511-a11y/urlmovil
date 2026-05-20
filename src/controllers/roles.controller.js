/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/roles.controller.js
import { Op } from 'sequelize';
import { Rol, DetallePermiso, Permiso, Usuario, sequelize } from '../models/index.js';

const rolesController = {
    getAllRoles: async (req, res) => {
        try {
            const data = await Rol.findAll({
                include: [{
                    model: Permiso,
                    as: 'listaPermisos',
                    through: { attributes: [] }
                }],
                order: [['nombre', 'ASC']]
            });
            
            // Mapeamos para que el front reciba los nombres que espera (name/Nombre)
            const processed = data.map(r => {
                const json = r.toJSON();
                return {
                    ...json,
                    // Aseguramos que existan ambos formatos para el front
                    id: json.id || json.IdRol,
                    name: json.nombre || json.Nombre || "",
                    description: json.descripcion || json.Descripcion || "",
                    isActive: json.isActive !== undefined ? json.isActive : (json.Estado !== undefined ? json.Estado : true),
                    permissions: json.listaPermisos ? json.listaPermisos.map(p => p.id) : (json.permisos || []),
                    // También mantenemos los originales por si acaso
                    Nombre: json.nombre || json.Nombre || "",
                    Descripcion: json.descripcion || json.Descripcion || "",
                    Permisos: json.listaPermisos ? json.listaPermisos.map(p => p.id) : (json.permisos || [])
                };
            });
            
            res.json({ success: true, data: processed });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getRolesActivos: async (req, res) => {
        try {
            const data = await Rol.findAll({ where: { isActive: true } });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getRolById: async (req, res) => {
        try {
            const data = await Rol.findByPk(req.params.id, { 
                include: [{
                    model: Permiso,
                    as: 'listaPermisos',
                    through: { attributes: [] }
                }] 
            });
            
            if (!data) return res.status(404).json({ success: false, message: 'Rol no encontrado' });
            
            const json = data.toJSON();
            if (json.listaPermisos) {
                json.Permisos = json.listaPermisos.map(p => p.id);
            }
            
            res.json({ success: true, data: json });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getPermisosByRol: async (req, res) => {
        try {
            const data = await DetallePermiso.findAll({ where: { idRol: req.params.id }, include: ['permisoData'] });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    createRol: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { Permisos, permisos, Nombre, name, Descripcion, description, Estado, isActive, ...rest } = req.body;
            const permissionList = Permisos || permisos || [];
            
            // Normalizamos los campos para el modelo de Sequelize (que usa 'nombre' y 'descripcion')
            const roleData = {
                nombre: Nombre || name || rest.nombre,
                descripcion: Descripcion || description || rest.descripcion,
                isActive: Estado !== undefined ? Estado : (isActive !== undefined ? isActive : true),
                permisos: permissionList,
                ...rest
            };
            
            if (!roleData.nombre) {
                throw new Error("El nombre del rol es requerido");
            }

            const data = await Rol.create(roleData, { transaction });
            
            if (Array.isArray(permissionList)) {
                for (const idP of permissionList) {
                    await DetallePermiso.create({ 
                        idRol: data.id, 
                        idPermiso: idP 
                    }, { transaction });
                }
            }
            
            await transaction.commit();
            
            // Devolver con los permisos cargados
            const created = await Rol.findByPk(data.id, {
                include: [{ model: Permiso, as: 'listaPermisos', through: { attributes: [] } }]
            });
            const json = created.toJSON();
            const result = {
                ...json,
                id: json.id,
                name: json.nombre,
                description: json.descripcion,
                Permisos: json.listaPermisos ? json.listaPermisos.map(p => p.id) : []
            };
            
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            if (transaction) await transaction.rollback();
            res.status(400).json({ success: false, message: error.message });
        }
    },

    updateRol: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { Permisos, permisos, Nombre, name, Descripcion, description, Estado, isActive, ...rest } = req.body;
            const permissionList = Permisos || permisos;

            // Normalizamos los campos para el modelo
            const updateData = { ...rest };
            if (Nombre || name) updateData.nombre = Nombre || name;
            if (Descripcion || description) updateData.descripcion = Descripcion || description;
            if (Estado !== undefined || isActive !== undefined) {
                updateData.isActive = Estado !== undefined ? Estado : isActive;
            }
            if (permissionList !== undefined) {
                updateData.permisos = permissionList;
            }

            await Rol.update(updateData, { 
                where: { id: req.params.id },
                transaction 
            });

            if (Array.isArray(permissionList)) {
                // Limpiar permisos actuales y asignar los nuevos
                await DetallePermiso.destroy({ 
                    where: { idRol: req.params.id }, 
                    transaction 
                });
                
                for (const idP of permissionList) {
                    await DetallePermiso.create({ 
                        idRol: req.params.id, 
                        idPermiso: idP 
                    }, { transaction });
                }
            }

            await transaction.commit();
            
            // Devolver el rol actualizado
            const updated = await Rol.findByPk(req.params.id, {
                include: [{ model: Permiso, as: 'listaPermisos', through: { attributes: [] } }]
            });
            const json = updated.toJSON();
            const result = {
                ...json,
                id: json.id,
                name: json.nombre,
                description: json.descripcion,
                Permisos: json.listaPermisos ? json.listaPermisos.map(p => p.id) : []
            };
            
            res.json({ success: true, data: result, message: 'Actualizado con éxito' });
        } catch (error) {
            if (transaction) await transaction.rollback();
            res.status(400).json({ success: false, message: error.message });
        }
    },

    patchRol: async (req, res) => {
        return rolesController.updateRol(req, res);
    },

    toggleRolStatus: async (req, res) => {
        try {
            const rol = await Rol.findByPk(req.params.id);
            if (rol) {
                await rol.update({ isActive: !rol.isActive });
                res.json({ success: true, message: 'Estado cambiado' });
            }
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    asignarPermisos: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { idPermisos } = req.body;
            await DetallePermiso.destroy({ where: { idRol: req.params.id }, transaction });
            for (const idP of idPermisos) {
                await DetallePermiso.create({ idRol: req.params.id, idPermiso: idP }, { transaction });
            }
            await transaction.commit();
            res.json({ success: true, message: 'Permisos asignados' });
        } catch (error) {
            await transaction.rollback();
            res.status(400).json({ success: false, message: error.message });
        }
    },

    agregarPermiso: async (req, res) => {
        try {
            await DetallePermiso.create({ idRol: req.params.id, idPermiso: req.body.idPermiso });
            res.json({ success: true, message: 'Permiso agregado' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    quitarPermiso: async (req, res) => {
        try {
            await DetallePermiso.destroy({ where: { idRol: req.params.id, idPermiso: req.params.permisoId } });
            res.json({ success: true, message: 'Permiso quitado' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    deleteRol: async (req, res) => {
        const { id } = req.params;
        const transaction = await sequelize.transaction();
        
        try {
            const rol = await Rol.findByPk(id);
            if (!rol) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Rol no encontrado' });
            }

            // 1. Proteger rol de Administrador
            if (rol.nombre.toLowerCase() === 'administrador') {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'El rol "Administrador" es vital para el sistema y no puede ser eliminado.' 
                });
            }

            // 2. Verificar si existen usuarios con este rol
            const usuariosAsociados = await Usuario.count({ where: { idRol: id } });
            if (usuariosAsociados > 0) {
                await transaction.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `No se puede eliminar el rol "${rol.nombre}" porque hay ${usuariosAsociados} usuario(s) asignado(s) a él. Cambie el rol de estos usuarios antes de eliminarlo.` 
                });
            }

            // 3. Limpiar permisos asociados primero (DetallePermiso)
            await DetallePermiso.destroy({ where: { idRol: id }, transaction });

            // 4. Eliminar el rol
            await rol.destroy({ transaction });

            await transaction.commit();
            res.json({ success: true, message: `Rol "${rol.nombre}" eliminado exitosamente.` });
        } catch (error) {
            if (transaction) await transaction.rollback();
            console.error('❌ Error en deleteRol:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }
};

export default rolesController;