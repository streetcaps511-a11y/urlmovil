/* === CONTROLADOR DE BACKEND === 
   Recibe las solicitudes (Requests) desde las Rutas, procesa las variables enviadas por el cliente, 
   ejecuta las consultas a la base de datos protegiendo contra inyección SQL, 
   y devuelve las respuestas en formato JSON. */

// controllers/detalleCompras.controller.js
import DetalleCompra from '../models/detalleCompras.model.js';
import Producto from '../models/productos.model.js';
import Compra from '../models/compras.model.js';
import Talla from '../models/tallas.model.js';
import { successResponse, errorResponse } from '../utils/response.js';

const detalleCompraController = {

  /**
   * Obtener TODOS los detalles
   * @route GET /api/detallecompras
   */
  getAll: async (req, res) => {
    try {
      const detalles = await DetalleCompra.findAll({
        include: [
          {
            model: Producto,
            as: 'Producto',
            attributes: ['IdProducto', 'Nombre', 'PrecioVenta', 'url']
          },
          {
            model: Talla,
            as: 'tallaData',
            attributes: ['IdTalla', 'Nombre']
          },
          {
            model: Compra,
            as: 'Compra',
            attributes: ['IdCompra', 'Fecha', 'Total']
          }
        ],
        order: [['IdDetalle', 'DESC']]
      });

      return successResponse(res, detalles, 'Detalles obtenidos exitosamente');

    } catch (error) {
      console.error('❌ Error en getAll:', error);
      return errorResponse(res, 'Error al obtener detalles', 500, error.message);
    }
  },

  /**
   * Obtener detalles por compra
   * @route GET /api/detallecompras/compra/:compraId
   */
  getByCompra: async (req, res) => {
    try {
      const { compraId } = req.params;

      if (isNaN(compraId)) {
        return errorResponse(res, 'ID de compra inválido', 400);
      }

      const detalles = await DetalleCompra.findAll({
        where: { IdCompra: compraId },
        include: [
          {
            model: Producto,
            as: 'Producto',
            attributes: ['IdProducto', 'Nombre', 'Descripcion', 'url', 'PrecioVenta']
          },
          {
            model: Talla,
            as: 'tallaData',
            attributes: ['IdTalla', 'Nombre']
          }
        ],
        order: [['IdDetalle', 'ASC']]
      });

      if (!detalles || detalles.length === 0) {
        return successResponse(res, [], 'No hay detalles para esta compra');
      }

      const detallesFormateados = detalles.map(detalle => ({
        IdDetalle: detalle.IdDetalle,
        IdCompra: detalle.IdCompra,
        IdProducto: detalle.IdProducto,
        Producto: {
          Nombre: detalle.Producto?.Nombre || 'Producto no disponible',
          Descripcion: detalle.Producto?.Descripcion,
          Imagen: detalle.Producto?.url,
          PrecioVenta: detalle.Producto?.PrecioVenta
        },
        Talla: {
          IdTalla: detalle.tallaData?.IdTalla,
          Nombre: detalle.tallaData?.Nombre || 'Sin talla'
        },
        Cantidad: detalle.Cantidad,
        PrecioCompra: detalle.PrecioCompra,
        PrecioVenta: detalle.PrecioVenta,
        Subtotal: detalle.Subtotal,
        SubtotalFormateado: new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0
        }).format(detalle.Subtotal)
      }));

      return successResponse(res, detallesFormateados, 'Detalles obtenidos exitosamente');

    } catch (error) {
      console.error('❌ Error en getByCompra:', error);
      return errorResponse(res, 'Error al obtener detalles', 500, error.message);
    }
  },

  /**
   * Obtener un detalle específico por ID
   * @route GET /api/detallecompras/:id
   */
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      if (isNaN(id)) {
        return errorResponse(res, 'ID de detalle inválido', 400);
      }

      const detalle = await DetalleCompra.findByPk(id, {
        include: [
          {
            model: Producto,
            as: 'Producto',
            attributes: ['IdProducto', 'Nombre', 'Descripcion', 'url', 'PrecioVenta']
          },
          {
            model: Talla,
            as: 'tallaData',
            attributes: ['IdTalla', 'Nombre']
          },
          {
            model: Compra,
            as: 'Compra',
            include: [{ model: Talla, as: 'Tallas' }]
          }
        ]
      });

      if (!detalle) {
        return errorResponse(res, 'Detalle no encontrado', 404);
      }

      return successResponse(res, detalle, 'Detalle obtenido exitosamente');

    } catch (error) {
      console.error('❌ Error en getById:', error);
      return errorResponse(res, 'Error al obtener detalle', 500, error.message);
    }
  },

  /**
   * Obtener resumen de una compra
   * @route GET /api/detallecompras/compra/:compraId/resumen
   */
  getResumenByCompra: async (req, res) => {
    try {
      const { compraId } = req.params;

      const detalles = await DetalleCompra.findAll({
        where: { IdCompra: compraId }
      });

      const totalProductos = detalles.reduce((sum, d) => sum + d.Cantidad, 0);
      const subtotal = detalles.reduce((sum, d) => sum + d.Subtotal, 0);

      return successResponse(res, {
        totalProductos,
        subtotal,
        cantidadItems: detalles.length
      }, 'Resumen obtenido exitosamente');

    } catch (error) {
      console.error('❌ Error en getResumenByCompra:', error);
      return errorResponse(res, 'Error al obtener resumen', 500, error.message);
    }
  }
};

export default detalleCompraController;