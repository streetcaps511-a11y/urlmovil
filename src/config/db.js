import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import toml from 'toml';
import { fileURLToPath } from 'url';

// Necesario para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargar la configuración desde config.toml
const configPath = path.join(__dirname, '../../config.toml');
const config = toml.parse(fs.readFileSync(configPath, 'utf-8')).database;

// 2. Configurar SSL si está activado
let sslConfig = false;
if (config.ssl) {
    const caPath = path.join(__dirname, '../../', config.ssl_ca_path);
    if (fs.existsSync(caPath)) {
        sslConfig = {
            rejectUnauthorized: true,
            ca: fs.readFileSync(caPath).toString(),
        };
    } else {
        console.warn('⚠️ Advertencia: Archivo CA no encontrado en:', caPath);
    }
}

// 3. Crear la instancia de Sequelize
export const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        port: config.port,
        dialect: 'postgres',
        logging: false,

        dialectOptions: {
            ssl: sslConfig
        },

        pool: {
            max: config.pool_max || 10,
            min: config.pool_min || 2,
            acquire: config.connection_timeout || 30000,
            idle: config.pool_idle || 10000,
        },

        retry: {
            match: [
                /ConnectionError/,
                /SequelizeHostNotFoundError/,
                /ENOTFOUND/,
                /ECONNREFUSED/,
            ],
            max: config.retry_attempts || 3,
        },
    }
);

// 4. Función connectDB para compatibilidad con server.js
export async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida correctamente.');
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error.message);
        console.log('💡 Verifica que el servicio Aiven esté activo y el archivo ca.pem exista.');
        throw error;
    }
}