/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/usuarios.controller.js
import { Op } from 'sequelize';
import { Usuario, Rol, Cliente, sequelize } from '../models/index.js';

const usuarioController = {
  getMiPerfil: async (req, res) => {
    try {
      const data = await Usuario.findByPk(req.usuario.id, { 
        attributes: { exclude: ['clave'] }, 
        include: [{
          model: Rol,
          as: 'rolData',
          include: ['listaPermisos']
        }] 
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateMiPerfil: async (req, res) => {
    try {
      await Usuario.update(req.body, { where: { id: req.usuario.id } });
      res.json({ success: true, message: 'Perfil actualizado' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  cambiarMiClave: async (req, res) => {
    try {
      const { claveActual, claveNueva } = req.body;
      const user = await Usuario.findByPk(req.usuario.id);
      if (await user.validarClave(claveActual)) {
        user.clave = claveNueva;
        user.mustChangePassword = false; // El usuario ya la cambió por sí mismo
        await user.save();
        res.json({ success: true, message: 'Clave cambiada' });
      } else {
        throw new Error('Clave actual incorrecta');
      }
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  getAllUsuarios: async (req, res) => {
    try {
      const data = await Usuario.findAll({ 
        attributes: { exclude: ['clave'] }, 
        include: ['rolData']
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getUsuarioById: async (req, res) => {
    try {
      const data = await Usuario.findByPk(req.params.id, { 
        attributes: { exclude: ['clave'] }, 
        include: [{
          model: Rol,
          as: 'rolData',
          include: ['listaPermisos']
        }] 
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getUsuariosActivos: async (req, res) => {
    try {
      const data = await Usuario.findAll({ 
        where: { 
          estado: 'activo'
        }, 
        attributes: { exclude: ['clave'] } 
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getUsuariosPendientes: async (req, res) => {
    try {
      const data = await Usuario.findAll({ 
        where: { 
          estado: 'pendiente'
        }, 
        attributes: { exclude: ['clave'] } 
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getEstadisticas: async (req, res) => {
    try {
      const total = await Usuario.count();
      const activos = await Usuario.count({ 
        where: { 
          estado: 'activo' 
        } 
      });
      res.json({ success: true, data: { total, activos } });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  buscarUsuarios: async (req, res) => {
    try {
      const { q } = req.query;
      const data = await Usuario.findAll({ 
        where: { 
          nombre: { [Op.iLike]: `%${q}%` }
        }, 
        attributes: { exclude: ['clave'] } 
      });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  createUsuario: async (req, res) => {
    try {
      const createData = { ...req.body };
      
      // 🛡️ TRADUCTOR: Mapear campos del Frontend a nombres de la Base de Datos
      if (createData.rol && !createData.idRol) createData.idRol = createData.rol;
      if (createData.nombreCompleto && !createData.nombre) createData.nombre = createData.nombreCompleto;
      
      const newUser = await Usuario.create(createData);
      
      // 🛡️ SINCRONIZACIÓN: Crear perfil de cliente si el rol es 'Cliente'
      const rol = await Rol.findByPk(newUser.idRol);
      if (rol && rol.nombre.toLowerCase() === 'cliente') {
          console.log(`👤 [SYNC] Creando perfil de cliente para: ${newUser.email}`);
          await Cliente.findOrCreate({
              where: { email: newUser.email },
              defaults: {
                  nombreCompleto: `${newUser.nombre} ${newUser.apellido || ''}`.trim(),
                  email: newUser.email,
                  tipoDocumento: newUser.tipoDocumento || 'Cédula de ciudadanía',
                  numeroDocumento: (newUser.numeroDocumento || '').toString(),
                  telefono: (newUser.telefono || '').toString(),
                  isActive: newUser.estado === 'activo'
              }
          });
      }

      // Recuperar usuario con su info de Rol para que el Front lo vea completo
      const user = await Usuario.findByPk(newUser.id, {
        attributes: { exclude: ['clave'] },
        include: ['rolData', 'clienteData']
      });

      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  updateUsuario: async (req, res) => {
    try {
      const updateData = { ...req.body };
      
      // 🛡️ TRADUCTOR: Mapear campos del Frontend a nombres de la Base de Datos
      if (updateData.rol && !updateData.idRol) updateData.idRol = updateData.rol;
      if (updateData.IdRol && !updateData.idRol) updateData.idRol = updateData.IdRol;
      if (updateData.nombreCompleto && !updateData.nombre) updateData.nombre = updateData.nombreCompleto;
      
      console.log(`📝 [DEBUG USER UPDATE] Traduciendo y guardando ID ${req.params.id}:`, updateData);

      // Guardar el email anterior para la sincronización
      const existingUser = await Usuario.findByPk(req.params.id);
      const oldEmail = existingUser?.email;

      await Usuario.update(updateData, { 
          where: { id: req.params.id },
          individualHooks: true 
      });
      
      const user = await Usuario.findByPk(req.params.id, {
        attributes: { exclude: ['clave'] },
        include: ['rolData', 'clienteData']
      });

      // 🛡️ SINCRONIZACIÓN: Actualizar o crear perfil de cliente si el rol es 'Cliente'
      if (user.rolData && user.rolData.nombre.toLowerCase() === 'cliente') {
          console.log(`👤 [SYNC] Sincronizando perfil de cliente para: ${user.email}`);
          
          // Buscar por email (usando el antiguo si cambió para actualizarlo)
          const targetEmail = oldEmail || user.email;
          const [cliente, created] = await Cliente.findOrCreate({
              where: { email: targetEmail },
              defaults: {
                  nombreCompleto: `${user.nombre} ${user.apellido || ''}`.trim(),
                  email: user.email,
                  tipoDocumento: user.tipoDocumento || 'CC',
                  numeroDocumento: String(user.numeroDocumento || '0'),
                  telefono: String(user.telefono || ''),
                  isActive: user.estado === 'activo'
              }
          });
          
          if (!created) {
              await cliente.update({
                  nombreCompleto: `${user.nombre} ${user.apellido || ''}`.trim(),
                  email: user.email, // Por si cambió el email
                  tipoDocumento: user.tipoDocumento,
                  numeroDocumento: (user.numeroDocumento || '').toString(),
                  telefono: (user.telefono || '').toString(),
                  isActive: user.estado === 'activo'
              });
          }
      }
      
      res.json({ success: true, message: 'Usuario actualizado correctamente', data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  patchUsuario: async (req, res) => {
    try {
      const updateData = { ...req.body };
      
      // 🛡️ TRADUCTOR: Mapear campos del Frontend a nombres de la Base de Datos
      if (updateData.rol && !updateData.idRol) updateData.idRol = updateData.rol;
      if (updateData.IdRol && !updateData.idRol) updateData.idRol = updateData.IdRol;
      if (updateData.nombreCompleto && !updateData.nombre) updateData.nombre = updateData.nombreCompleto;

      console.log(`📝 [DEBUG USER PATCH] Traduciendo y guardando ID ${req.params.id}:`, updateData);

      const existingUser = await Usuario.findByPk(req.params.id);
      const oldEmail = existingUser?.email;

      await Usuario.update(updateData, { where: { id: req.params.id } });
      
      const user = await Usuario.findByPk(req.params.id, {
        attributes: { exclude: ['clave'] },
        include: ['rolData', 'clienteData']
      });

      // 🛡️ SINCRONIZACIÓN: Actualizar o crear perfil de cliente si el rol es 'Cliente'
      if (user.rolData && user.rolData.nombre.toLowerCase() === 'cliente') {
          console.log(`👤 [SYNC] Sincronizando perfil de cliente para (patch): ${user.email}`);
          
          const targetEmail = oldEmail || user.email;
          const [cliente, created] = await Cliente.findOrCreate({
              where: { email: targetEmail },
              defaults: {
                  nombreCompleto: user.nombre,
                  email: user.email,
                  tipoDocumento: user.tipoDocumento || 'Cédula de ciudadanía',
                  numeroDocumento: (user.numeroDocumento || '').toString(),
                  telefono: (user.telefono || '').toString(),
                  isActive: user.estado === 'activo'
              }
          });
          
          if (!created) {
              await cliente.update({
                  nombreCompleto: user.nombre,
                  email: user.email,
                  tipoDocumento: user.tipoDocumento || cliente.tipoDocumento,
                  numeroDocumento: (user.numeroDocumento || cliente.numeroDocumento || '').toString(),
                  telefono: (user.telefono || cliente.telefono || '').toString(),
                  isActive: user.estado === 'activo'
              });
          }
      }
      
      res.json({ success: true, message: 'Usuario actualizado correctamente', data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  aprobarUsuario: async (req, res) => {
    try {
      await Usuario.update({ estado: 'activo' }, { where: { id: req.params.id } });
      res.json({ success: true, message: 'Usuario aprobado' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  rechazarUsuario: async (req, res) => {
    try {
      await Usuario.update({ estado: 'rechazado' }, { where: { id: req.params.id } });
      res.json({ success: true, message: 'Usuario rechazado' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  toggleUsuarioStatus: async (req, res) => {
    try {
      const user = await Usuario.findByPk(req.params.id, {
        include: [{ model: Cliente, as: 'clienteData' }]
      });
      
      if (user) {
        const nuevoEstado = user.estado === 'activo' ? 'inactivo' : 'activo';
        const isActiveBool = nuevoEstado === 'activo';
        
        // 🛡️ Sincronizar Usuario y Cliente
        await user.update({ estado: nuevoEstado });
        
        if (user.clienteData) {
          await Cliente.update(
            { isActive: isActiveBool }, 
            { where: { id: user.clienteData.id } }
          );
        }

        res.json({ 
          success: true, 
          message: `Usuario y perfil de cliente establecidos como: ${nuevoEstado}`,
          estado: nuevoEstado
        });
      } else {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
    } catch (error) {
      console.error('❌ Error en toggleUsuarioStatus:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  cambiarClave: async (req, res) => {
    try {
      const { claveNueva } = req.body;
      const user = await Usuario.findByPk(req.params.id);
      if (user) {
        user.clave = claveNueva;
        await user.save();
        res.json({ success: true, message: 'Clave reseteada' });
      }
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  resetearClave: async (req, res) => {
    try {
      const { claveNueva } = req.body;
      const user = await Usuario.findByPk(req.params.id);
      if (user) {
        user.clave = claveNueva;
        user.mustChangePassword = true; // Forzar cambio al entrar
        await user.save();
        res.json({ success: true, message: 'Clave reseteada' });
      }
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  asignarRol: async (req, res) => {
    try {
      await Usuario.update({ idRol: req.body.idRol }, { where: { id: req.params.id } });
      res.json({ success: true, message: 'Rol asignado' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  quitarRol: async (req, res) => {
    try {
      await Usuario.update({ idRol: null }, { where: { id: req.params.id } });
      res.json({ success: true, message: 'Rol quitado' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  deleteUsuario: async (req, res) => {
    try {
      await Usuario.destroy({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Eliminado' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  desactivarMiCuenta: async (req, res) => {
    try {
      // Usamos el ID del token verificado (req.usuario.id)
      await Usuario.update({ estado: 'inactivo' }, { where: { id: req.usuario.id } });
      res.json({ success: true, message: 'Cuenta desactivada correctamente' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  eliminarMiCuenta: async (req, res) => {
    try {
      // Primero verificamos si tiene ventas asociadas para mayor seguridad
      const cliente = await Cliente.findOne({ where: { IdUsuario: req.usuario.id } });
      if (cliente) {
        const ventasCount = await sequelize.models.Venta.count({ where: { IdCliente: cliente.id } });
        if (ventasCount > 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'No puedes eliminar tu cuenta porque tienes un historial de compras. Contacta a soporte para más información.' 
          });
        }
      }

      await Usuario.destroy({ where: { id: req.usuario.id } });
      res.json({ success: true, message: 'Cuenta eliminada permanentemente' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

export default usuarioController;