import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function check() {
  const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`,
    ssl: { rejectUnauthorized: false }
  });

  let output = '';

  try {
    await client.connect();
    
    output += '--- BUSCANDO USUARIO cardonauribecristian20@gmail.com ---\n';
    const user = await client.query('SELECT "IdUsuario", "Nombre", "Correo", "Clave", "Estado", "IdRol" FROM "Usuarios" WHERE "Correo" = \'cardonauribecristian20@gmail.com\'');
    output += JSON.stringify(user.rows, null, 2) + '\n';

    if (user.rows.length === 0) {
        output += '⚠️ Usuario no encontrado en tabla Usuarios. Buscando en Clientes...\n';
        const clientRow = await client.query('SELECT "id", "nombreCompleto", "email", "isActive" FROM "Clientes" WHERE "email" = \'cardonauribecristian20@gmail.com\'');
        output += JSON.stringify(clientRow.rows, null, 2) + '\n';
    }

    output += '\n--- BUSCANDO TODOS LOS USUARIOS (LIMIT 5) ---\n';
    const allUsers = await client.query('SELECT "Correo", "Estado", "IdRol" FROM "Usuarios" LIMIT 5');
    output += JSON.stringify(allUsers.rows, null, 2) + '\n';

  } catch (err) {
    output += 'ERROR: ' + err.message + '\n';
  } finally {
    await client.end();
    fs.writeFileSync('db_check_result.txt', output);
  }
}

check();
