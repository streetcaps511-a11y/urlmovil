import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    console.log('--- BUSCANDO USUARIO ---');
    const user = await client.query('SELECT "IdUsuario", "Nombre", "Correo", "Clave", "Estado", "IdRol" FROM "Usuarios" WHERE "Correo" = \'cardonauribecristian20@gmail.com\'');
    console.table(user.rows);

    if (user.rows.length === 0) {
        console.log('⚠️ Usuario no encontrado en tabla Usuarios. Buscando en Clientes...');
        const clientRow = await client.query('SELECT "id", "nombreCompleto", "email", "isActive" FROM "Clientes" WHERE "email" = \'cardonauribecristian20@gmail.com\'');
        console.table(clientRow.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
