// scripts/seed_admin.js
import { sequelize } from '../src/config/db.js';
import Usuario from '../src/models/usuarios.model.js';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
    try {
        console.log('🔄 Creando usuario administrador base...');
        await sequelize.authenticate();
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const [usuario, created] = await Usuario.findOrCreate({
            where: { correo: 'admin@gmail.com' },
            defaults: {
                nombre: 'Administrador Inicial',
                contraseña: hashedPassword,
                idRol: 1, // ADMIN
                isActive: true
            }
        });

        if (created) {
            console.log('✅ Usuario Administrador creado con éxito.');
        } else {
            console.log('ℹ️ El usuario ya existía.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error al crear admin:', error);
        process.exit(1);
    }
}

seedAdmin();
