const sql = require('mssql');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.production') });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
        // trustedConnection removed to use SQL Auth
    }
};

async function seed() {
    try {
        const pool = await sql.connect(config);

        const sellerPass = await bcrypt.hash('SellerPass123!', 10);
        const adminPass = await bcrypt.hash('AdminSecret1!', 10);

        // Admin
        const adminEmail = 'admin@pickpic.com';
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM users WHERE email = '${adminEmail}')
            BEGIN
                INSERT INTO users (email, password_hash, full_name, is_verified)
                VALUES ('${adminEmail}', '${adminPass}', 'Super Admin', 1);
            END
        `);

        // Seller
        const sellerEmail = 'seller@example.com';
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM users WHERE email = '${sellerEmail}')
            BEGIN
                INSERT INTO users (email, password_hash, full_name, is_verified)
                VALUES ('${sellerEmail}', '${sellerPass}', 'Test Seller', 1);
            END
        `);

        // Assign Roles
        // Ensure roles exist (schema.sql inserts defaults, but just in case)
        // Get User IDs
        const adminUser = await pool.request().query(`SELECT id FROM users WHERE email = '${adminEmail}'`);
        const sellerUser = await pool.request().query(`SELECT id FROM users WHERE email = '${sellerEmail}'`);

        const adminId = adminUser.recordset[0].id;
        const sellerId = sellerUser.recordset[0].id;

        // Admin Role
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM user_roles WHERE user_id = '${adminId}')
            BEGIN
                 DECLARE @rid INT = (SELECT id FROM roles WHERE name = 'admin');
                 INSERT INTO user_roles (user_id, role_id) VALUES ('${adminId}', @rid);
            END
        `);

        // Seller Role
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM user_roles WHERE user_id = '${sellerId}')
            BEGIN
                 DECLARE @rid INT = (SELECT id FROM roles WHERE name = 'seller');
                 INSERT INTO user_roles (user_id, role_id) VALUES ('${sellerId}', @rid);
            END
        `);

        // Seller Profile
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sellers WHERE user_id = '${sellerId}')
            BEGIN
                INSERT INTO sellers (user_id, business_name, country_code, is_approved)
                VALUES ('${sellerId}', 'Test Store', 'US', 1);
            END
        `);

        // Categories
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM categories WHERE slug = 'home-decor')
            BEGIN
                INSERT INTO categories (name, slug) VALUES ('Home Decor', 'home-decor');
            END
        `);

        console.log('Seeding Complete.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding Failed:', err);
        process.exit(1);
    }
}

seed();
