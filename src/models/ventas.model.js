// models/ventas.model.js
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * Modelo de Ventas
 * Representa las ventas realizadas a clientes
 * @table Ventas
 */
const Venta = sequelize.define('Venta', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: 'IdVenta'
    },
    idCliente: {
        type: DataTypes.INTEGER,
        allowNull: true, // 🔓 Permitir NULL para poder borrar clientes
        field: 'IdCliente',
        references: {
            model: 'Clientes',
            key: 'IdCliente'
        }
    },

    idEstado: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Pendiente',
        field: 'IdEstado',
        comment: 'Estado de la venta (Pendiente, Completada, Rechazada, Anulada)'
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'Fecha'
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'El total no puede ser negativo' } },
        field: 'Total'
    },
    metodoPago: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'MetodoPago'
    },
    direccionEnvio: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'DireccionEnvio'
    },
    tipoEntrega: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'TipoEntrega'
    },
    comprobante: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'Comprobante'
    },
    comprobante2: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'Comprobante2'
    },
    montoPagado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'MontoPagado'
    },
    monto1: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'Monto1'
    },
    monto2: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'Monto2'
    },
    motivoRechazo: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'MotivoRechazo'
    },
    noVenta: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'NoVenta'
    },
    statusenvio: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'Por enviar',
        field: 'StatusEnvio'
    },
    fechaEnvio: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'FechaEnvio'
    },
    fechaEntrega: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'FechaEntrega'
    },
    esManual: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'EsManual'
    }
}, {
    tableName: 'Ventas',
    timestamps: false,
    hooks: {
        beforeCreate: (venta) => {
            if (venta.tipoEntrega === 'recoger') {
                venta.statusenvio = 'Preparando';
            } else if (!venta.statusenvio) {
                venta.statusenvio = 'Por enviar';
            }
        },
        beforeUpdate: (venta) => {
        }
    }
});

Venta.prototype.formatearFecha = function() {
    const d = new Date(this.fecha);
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const año = d.getFullYear();
    return `${dia}/${mes}/${año}`;
};

Venta.prototype.formatearTotal = function() {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(this.total);
};

Venta.prototype.estaCompletada = function() { return this.idEstado === 1; };
Venta.prototype.estaPendiente = function() { return this.idEstado === 2; };
Venta.prototype.estaAnulada = function() { return this.idEstado === 3; };

Venta.buscarConFiltros = async function(filtros) {
    const { search, fechaInicio, fechaFin, cliente, estado, metodo, page, limit } = filtros;
    const whereClause = {};
    
    if (search) {
        whereClause[Op.or] = [
            { '$Cliente.nombreCompleto$': { [Op.iLike]: `%${search}%` } },
            { '$Cliente.numeroDocumento$': { [Op.iLike]: `%${search}%` } },
            { id: isNaN(search) ? null : search }
        ];
    }
    
    if (fechaInicio || fechaFin) {
        whereClause.fecha = {};
        if (fechaInicio) whereClause.fecha[Op.gte] = new Date(fechaInicio);
        if (fechaFin) whereClause.fecha[Op.lte] = new Date(fechaFin);
    }
    
    if (cliente) whereClause.idCliente = cliente;
    if (estado) whereClause.idEstado = estado;
    if (metodo) whereClause.metodoPago = metodo;
    
    return this.findAndCountAll({
        where: whereClause,
        include: ['Cliente', 'Estado', 'Detalles'],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
        order: [['fecha', 'DESC']]
    });
};

export default Venta; 