// utils/hash.js
import bcrypt from 'bcryptjs';

/**
 * Hashear una contraseña
 * @param {string} password 
 * @returns {Promise<string>}
 */
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

/**
 * Comparar contraseña plana con hash
 * @param {string} password 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};