import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Necesario para Aiven
      },
    },
    pool: {
      max: 5, // Reducido para evitar agotar conexiones en Aiven Free
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

console.log('⚡ Inicializando Sequelize para Aiven...');

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL (Aiven) establecida correctamente.');
  } catch (error) {
    console.error('❌ Error fatal al conectar con la base de datos:', error.message);
    // No salimos del proceso aquí para permitir que server.js maneje el reintento o cierre
    throw error;
  }
};

export default { sequelize, connectDB };
