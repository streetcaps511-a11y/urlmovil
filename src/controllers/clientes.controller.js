/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/clientes.controller.js
import { Op } from 'sequelize';
import Cliente from '../models/clientes.model.js';
import Usuario from '../models/usuarios.model.js';
import Venta from '../models/ventas.model.js';
import { validateCliente, sanitizeCliente } from '../utils/validationUtils.js';
import { sequelize } from '../config/db.js';

/**
 * Controlador de Clientes
 * Maneja todas las operaciones CRUD para clientes
 */
const clienteController = {
    /**
     * Obtener todos los clientes con filtros
     * @route GET /api/clientes
     */
    getAllClientes: async (req, res) => {
        try {
            const { page = 1, limit = 7, search = '', ciudad, estado, tipoDocumento } = req.query;
            const offset = (page - 1) * limit;

            const whereClause = {};
            
            if (search) {
                whereClause[Op.or] = [
                    { nombreCompleto: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                    { telefono: { [Op.iLike]: `%${search}%` } },
                    { ciudad: { [Op.iLike]: `%${search}%` } }
                ];
            }
            
            if (ciudad) {
                whereClause.ciudad = { [Op.iLike]: `%${ciudad}%` };
            }
            
            if (tipoDocumento) {
                whereClause.tipoDocumento = tipoDocumento;
            }
            
            if (estado !== undefined) {
                whereClause.isActive = estado === 'true' || estado === 'Activo';
            }

            const { count, rows } = await Cliente.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['nombreCompleto', 'ASC']]
            });

            const clientesFormateados = await Promise.all(rows.map(async (cliente) => {
                const totalCompras = await Venta.sum('total', {
                    where: { idCliente: cliente.id }
                }) || 0;
                
                const cantidadCompras = await Venta.count({
                    where: { idCliente: cliente.id }
                });

                return {
                    id: cliente.id,
                    nombre: cliente.nombreCompleto,
                    nombreCompleto: cliente.nombreCompleto,
                    email: cliente.email,
                    numeroDocumento: cliente.numeroDocumento,
                    telefono: cliente.telefono || 'No registrado',
                    ciudad: cliente.ciudad || 'No registrada',
                    departamento: cliente.departamento || 'No registrado',
                    direccion: cliente.direccion || 'No registrada',
                    isActive: cliente.isActive,
                    estadoTexto: cliente.isActive ? 'Activo' : 'Inactivo',
                    tipoDocumento: cliente.getTipoDocumentoTexto(),
                    documentoCompleto: cliente.formatearDocumento(),
                    estadisticas: {
                        totalCompras,
                        cantidadCompras,
                        promedioCompras: cantidadCompras > 0 ? totalCompras / cantidadCompras : 0
                    }
                };
            }));

            const totalPages = Math.ceil(count / limit);

            res.status(200).json({
                success: true,
                data: clientesFormateados,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    showingFrom: offset + 1,
                    showingTo: Math.min(offset + parseInt(limit), count)
                }
            });

        } catch (error) {
            console.error('❌ Error en getAllClientes:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener un cliente por ID
     * @route GET /api/clientes/:id
     */
    getClienteById: async (req, res) => {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            const compras = await Venta.findAll({
                where: { idCliente: id },
                order: [['fecha', 'DESC']],
                limit: 10,
                include: ['Detalles']
            });

            const totalCompras = await Venta.sum('total', { where: { idCliente: id } }) || 0;
            const cantidadCompras = await Venta.count({ where: { idCliente: id } });

            res.status(200).json({
                success: true,
                data: {
                    ...cliente.toJSON(),
                    TipoDocumentoTexto: cliente.getTipoDocumentoTexto(),
                    DocumentoFormateado: cliente.formatearDocumento(),
                    EstadoTexto: cliente.Estado ? 'Activo' : 'Inactivo',
                    Estadisticas: {
                        totalCompras,
                        cantidadCompras,
                        promedioCompras: cantidadCompras > 0 ? totalCompras / cantidadCompras : 0
                    },
                    UltimasCompras: compras.map(c => ({
                        IdVenta: c.IdVenta,
                        Fecha: c.Fecha,
                        Total: c.Total,
                        Productos: c.Detalles?.length || 0
                    }))
                }
            });

        } catch (error) {
            console.error('❌ Error en getClienteById:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Crear un nuevo cliente
     * @route POST /api/clientes
     */
    createCliente: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const data = req.body;

            const validationErrors = await validateCliente(data);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const sanitizedData = sanitizeCliente(data);
            const nuevoCliente = await Cliente.create({
                ...sanitizedData,
                isActive: true
            }, { transaction });

            await transaction.commit();

            res.status(201).json({
                success: true,
                data: {
                    ...nuevoCliente.toJSON(),
                    tipoDocumentoTexto: nuevoCliente.getTipoDocumentoTexto()
                },
                message: 'Cliente registrado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en createCliente:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'El documento o email ya está registrado' });
            }
            
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar un cliente
     * @route PUT /api/clientes/:id
     */
    updateCliente: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const data = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            const validationErrors = await validateCliente(data, id);
            if (validationErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, errors: validationErrors });
            }

            const sanitizedData = sanitizeCliente(data);
            await cliente.update(sanitizedData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    ...cliente.toJSON(),
                    tipoDocumentoTexto: cliente.getTipoDocumentoTexto()
                },
                message: 'Cliente actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateCliente:', error);
            
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'El documento o email ya está registrado' });
            }
            
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Eliminar un cliente (borrado lógico)
     * @route DELETE /api/clientes/:id
     */
    deleteCliente: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            // 1. Desvincular ventas sin perder el nombre (Historial)
            await Venta.update(
                { 
                    idCliente: null, 
                    clienteNombreHistorico: cliente.nombreCompleto 
                },
                { where: { idCliente: id }, transaction }
            );

            // 2. Eliminar Usuario vinculado si existe
            if (cliente.email) {
                await Usuario.destroy({
                    where: { email: { [Op.iLike]: cliente.email } },
                    transaction
                });
            }

            // 3. Eliminar Cliente permanentemente
            await cliente.destroy({ transaction });

            await transaction.commit();

            res.status(200).json({ 
                success: true, 
                message: 'Cliente y su acceso eliminados permanentemente ✅ El historial de ventas se conservó con su nombre.' 
            });


        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en deleteCliente:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    toggleClienteStatus: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            const nuevoEstado = !cliente.isActive;
            await cliente.update({ isActive: nuevoEstado }, { transaction });

            // Sincronizar con la tabla Usuarios
            if (cliente.email) {
                await Usuario.update(
                    { estado: nuevoEstado ? 'activo' : 'inactivo' },
                    { where: { email: { [Op.iLike]: cliente.email } }, transaction }
                );
            }

            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    id: cliente.id,
                    nombreCompleto: cliente.nombreCompleto,
                    isActive: cliente.isActive,
                    estadoTexto: cliente.isActive ? 'Activo' : 'Inactivo'
                },
                message: `Cliente ${cliente.isActive ? 'activado' : 'desactivado'} exitosamente. Acceso ${cliente.isActive ? 'permitido' : 'bloqueado'}.`
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en toggleClienteStatus:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener clientes activos (para selects)
     * @route GET /api/clientes/activos
     */
    getClientesActivos: async (req, res) => {
        try {
            const clientes = await Cliente.findAll({
                where: { isActive: true },
                attributes: ['id', 'nombreCompleto', 'tipoDocumento', 'numeroDocumento', 'email'],
                order: [['nombreCompleto', 'ASC']]
            });

            const clientesFormateados = clientes.map(c => ({
                id: c.id,
                nombre: c.nombreCompleto,
                identificacion: c.formatearDocumento(),
                email: c.email
            }));

            res.status(200).json({ success: true, data: clientesFormateados });

        } catch (error) {
            console.error('❌ Error en getClientesActivos:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Buscar cliente por documento
     * @route GET /api/clientes/documento/:tipo/:numero
     */
    getClienteByDocumento: async (req, res) => {
        try {
            const { tipo, numero } = req.params;

            const cliente = await Cliente.findOne({
                where: { TipoDocumento: tipo, Documento: numero }
            });

            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            res.status(200).json({
                success: true,
                data: {
                    ...cliente.toJSON(),
                    TipoDocumentoTexto: cliente.getTipoDocumentoTexto()
                }
            });

        } catch (error) {
            console.error('❌ Error en getClienteByDocumento:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener clientes por ciudad
     * @route GET /api/clientes/ciudad/:ciudad
     */
    getClientesByCiudad: async (req, res) => {
        try {
            const { ciudad } = req.params;

            const clientes = await Cliente.findAll({
                where: { 
                    ciudad: { [Op.iLike]: `%${ciudad}%` },
                    isActive: true
                },
                attributes: ['id', 'nombreCompleto', 'telefono', 'email', 'direccion'],
                limit: 20
            });

            res.status(200).json({ success: true, data: clientes });

        } catch (error) {
            console.error('❌ Error en getClientesByCiudad:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener estadísticas de clientes
     * @route GET /api/clientes/estadisticas
     */
    getEstadisticas: async (req, res) => {
        try {
            const totalClientes = await Cliente.count();
            const activos = await Cliente.count({ where: { isActive: true } });
            const inactivos = await Cliente.count({ where: { isActive: false } });
            
            res.status(200).json({
                success: true,
                data: { total: totalClientes, activos, inactivos }
            });

        } catch (error) {
            console.error('❌ Error en getEstadisticas:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar saldo a favor del cliente
     * @route PATCH /api/clientes/:id/saldo
     */
    updateSaldo: async (req, res) => {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { monto, operacion = 'sumar' } = req.body;

            if (isNaN(id)) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'ID de cliente inválido' });
            }

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }

            let saldoActual = parseFloat(cliente.SaldoaFavor) || 0;
            let nuevoSaldo;

            if (operacion === 'sumar') {
                nuevoSaldo = saldoActual + parseFloat(monto);
            } else if (operacion === 'restar') {
                nuevoSaldo = saldoActual - parseFloat(monto);
                if (nuevoSaldo < 0) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Saldo insuficiente' });
                }
            }

            await cliente.update({ SaldoaFavor: nuevoSaldo.toString() }, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    IdCliente: cliente.IdCliente,
                    SaldoAnterior: saldoActual,
                    SaldoActual: nuevoSaldo
                },
                message: 'Saldo actualizado exitosamente'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateSaldo:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Obtener perfil del cliente (para el propio cliente)
     * @route GET /api/clientes/mi/perfil
     */
    getMiPerfil: async (req, res) => {
        try {
            // Buscar al cliente vinculado sincronizando el email del Token JWT con el email del Cliente
            const cliente = await Cliente.findOne({
                where: { email: req.usuario.email }
            });

            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Perfil no encontrado' });
            }

            const compras = await Venta.findAll({
                where: { idCliente: cliente.id },
                order: [['fecha', 'DESC']],
                limit: 10
            });

            res.status(200).json({
                success: true,
                data: {
                    ...cliente.toJSON(),
                    TipoDocumentoTexto: cliente.getTipoDocumentoTexto(),
                    UltimasCompras: compras
                }
            });
        } catch (error) {
            console.error('❌ Error en getMiPerfil:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Actualizar perfil del cliente (para el propio cliente)
     * @route PUT /api/clientes/mi/perfil
     */
    updateMiPerfil: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const cliente = await Cliente.findOne({
                where: { email: req.usuario.email }
            });

            if (!cliente) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Perfil no encontrado' });
            }

            const { 
                Name, name, nombreCompleto,
                phone, Telefono, telefono,
                address, Direccion, direccion,
                city, Ciudad, ciudad,
                department, Departamento, departamento,
                email, Email, Correo,
                documentType, tipoDocumento, TipoDocumento,
                documentNumber, numeroDocumento, Documento, NumeroDocumento,
                avatarUrl, Avatar
            } = req.body;

            // 🟢 TRADUCTOR DE CAMPOS (Soportamos camelCase, PascalCase y modelos)
            const updateData = {
                nombreCompleto: name || Name || nombreCompleto || Nombre || cliente.nombreCompleto,
                telefono: (phone || Telefono || telefono || cliente.telefono || '').toString().replace(/\D/g, '') || null,
                direccion: address || Direccion || direccion || cliente.direccion,
                ciudad: city || Ciudad || ciudad || cliente.ciudad,
                departamento: department || Departamento || departamento || cliente.departamento,
                tipoDocumento: documentType || tipoDocumento || TipoDocumento || cliente.tipoDocumento,
                numeroDocumento: (documentNumber || numeroDocumento || NumeroDocumento || Documento || cliente.numeroDocumento || '').toString().replace(/\D/g, '') || null,
                avatarUrl: avatarUrl || Avatar || cliente.avatarUrl,
                email: (email || Email || Correo || cliente.email).toLowerCase()
            };

            // 1. Actualizar el cliente
            await cliente.update(updateData, { transaction });

            // 2. Sincronizar con la tabla de Usuarios (si existe el usuario con el mismo correo)
            // Usamos req.usuario.email que es el correo actual del token para encontrarlo
            const { Usuario } = await import('../models/index.js');
            const usuarioVinculado = await Usuario.findOne({ 
                where: { email: req.usuario.email } 
            });

            if (usuarioVinculado) {
                await usuarioVinculado.update({
                    nombre: updateData.nombreCompleto,
                    telefono: updateData.telefono,
                    email: updateData.email,
                    tipoDocumento: updateData.tipoDocumento,
                    numeroDocumento: updateData.numeroDocumento
                }, { transaction });
            }

            await transaction.commit();

            res.status(200).json({
                success: true,
                data: cliente,
                message: 'Perfil y cuenta actualizados exitosamente'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error en updateMiPerfil:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default clienteController;