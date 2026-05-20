/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/estado.controller.js
import Estado from '../models/estado.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';

const estadoController = {
    getAll: async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', isActive } = req.query;
            const offset = (page - 1) * limit;
            const whereClause = {};
            if (search) whereClause.nombre = { [Op.iLike]: `%${search}%` };
            if (isActive !== undefined) whereClause.isActive = isActive === 'true';

            const { count, rows } = await Estado.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['IdEstado', 'ASC']]
            });

            return res.json({
                success: true,
                data: rows,
                pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) }
            });
        } catch (error) {
            return errorResponse(res, 'Error al obtener estados', 500, error.message);
        }
    },

    getById: async (req, res) => {
        try {
            const estado = await Estado.findByPk(req.params.id);
            if (!estado) return errorResponse(res, 'Estado no encontrado', 404);
            return successResponse(res, estado, 'Estado obtenido');
        } catch (error) {
            return errorResponse(res, 'Error al obtener estado', 500, error.message);
        }
    },

    getByTipo: async (req, res) => {
        try {
            const { tipo } = req.params;
            
            // Especial para Métodos de Pago que no están en la tabla
            if (tipo === 'metodo_pago') {
                return res.json({ 
                    success: true, 
                    data: [
                        { id: 1, nombre: 'Efectivo', Nombre: 'Efectivo' },
                        { id: 2, nombre: 'Transferencia', Nombre: 'Transferencia' },
                        { id: 3, nombre: 'Tarjeta', Nombre: 'Tarjeta' }
                    ] 
                });
            }

            // Para otros tipos, como la columna Tipo no existe, 
            // devolvemos todo si es una petición general o vacío si busca algo específico
            const data = await Estado.findAll();
            res.json({ success: true, data });
        } catch (error) {
            console.error('❌ Error en getByTipo:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    create: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { nombre, isActive = true } = req.body;
            if (!nombre) throw new Error('Nombre es requerido');

            const nuevo = await Estado.create({ nombre, isActive }, { transaction });
            await transaction.commit();
            return successResponse(res, nuevo, 'Estado creado', 201);
        } catch (error) {
            await transaction.rollback();
            return errorResponse(res, 'Error al crear estado', 400, error.message);
        }
    },

    update: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const estado = await Estado.findByPk(req.params.id);
            if (!estado) throw new Error('Estado no encontrado');

            await estado.update(req.body, { transaction });
            await transaction.commit();
            return successResponse(res, estado, 'Estado actualizado');
        } catch (error) {
            await transaction.rollback();
            return errorResponse(res, 'Error al actualizar estado', 400, error.message);
        }
    },

    patch: async (req, res) => {
        return estadoController.update(req, res);
    },

    toggleStatus: async (req, res) => {
        try {
            const estado = await Estado.findByPk(req.params.id);
            if (!estado) throw new Error('Estado no encontrado');
            await estado.update({ isActive: !estado.isActive });
            return successResponse(res, estado, `Estado ${estado.isActive ? 'activado' : 'desactivada'}`);
        } catch (error) {
            return errorResponse(res, 'Error al cambiar estado', 400, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            await Estado.destroy({ where: { id: req.params.id } });
            res.json({ success: true, message: 'Eliminado' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
};

export default estadoController;