/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/imagenes.controller.js
import { Imagen, Producto, sequelize } from '../models/index.js';

const imagenesController = {
    getAll: async (req, res) => {
        try {
            const data = await Imagen.findAll({ include: ['producto'] });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getByProducto: async (req, res) => {
        try {
            const data = await Imagen.findAll({ where: { idProducto: req.params.productoId } });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getPrincipalByProducto: async (req, res) => {
        try {
            const data = await Imagen.findOne({ where: { idProducto: req.params.productoId, esPrincipal: true } });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getById: async (req, res) => {
        try {
            const data = await Imagen.findByPk(req.params.id);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getEstadisticas: async (req, res) => {
        try {
            const total = await Imagen.count();
            res.json({ success: true, data: { total } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    create: async (req, res) => {
        try {
            const data = await Imagen.create(req.body);
            res.status(201).json({ success: true, data });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    createMultiple: async (req, res) => {
        try {
            const data = await Imagen.bulkCreate(req.body);
            res.status(201).json({ success: true, data });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    update: async (req, res) => {
        try {
            await Imagen.update(req.body, { where: { id: req.params.id } });
            res.json({ success: true, message: 'Actualizado' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    setPrincipal: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const img = await Imagen.findByPk(id);
            if (img) {
                await Imagen.update({ esPrincipal: false }, { where: { idProducto: img.idProducto }, transaction });
                await img.update({ esPrincipal: true }, { transaction });
                await transaction.commit();
                res.json({ success: true, message: 'Principal actualizada' });
            }
        } catch (error) {
            await transaction.rollback();
            res.status(400).json({ success: false, message: error.message });
        }
    },

    deleteMultiple: async (req, res) => {
        try {
            await Imagen.destroy({ where: { id: req.body.ids } });
            res.json({ success: true, message: 'Imágenes eliminadas' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    delete: async (req, res) => {
        try {
            await Imagen.destroy({ where: { id: req.params.id } });
            res.json({ success: true, message: 'Eliminada' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
};

export default imagenesController;