import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import toml from 'toml';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const configPath = path.join(__dirname, '../../config.toml');
const config = toml.parse(fs.readFileSync(configPath, 'utf-8')).database;

const sslConfig = {
    require: true,
    rejectUnauthorized: false
};

const sequelizeOptions = {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: sslConfig
    },
    pool: {
        max: config.pool_max || 10,
        min: config.pool_min || 2,
        acquire: config.connection_timeout || 60000,
        idle: config.pool_idle || 10000,
        evict: 1000,
    },
    retry: {
        match: [
            /ConnectionError/,
            /SequelizeHostNotFoundError/,
            /ENOTFOUND/,
            /ECONNREFUSED/,
            /ECONNRESET/,
        ],
        max: config.retry_attempts || 3,
    },
};

export const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        ...sequelizeOptions,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    })
    : new Sequelize(
        config.database,
        config.username,
        config.password,
        {
            host: config.host,
            port: config.port,
            ...sequelizeOptions
        }
    );

export async function connectDB() {
    let retries = 5;
    while (retries > 0) {
        try {
            await sequelize.authenticate();
            console.log('✅ Conexión a PostgreSQL establecida correctamente.');
            return true;
        } catch (error) {
            console.error(`❌ Error al conectar (Intentos restantes: ${retries - 1}):`, error.message);
            retries -= 1;
            if (retries === 0) {
                console.log('💡 Verifica tu conexión a Internet o los datos en config.toml.');
                throw error;
            }
            await new Promise(res => setTimeout(res, 3000));
        }
    }
}