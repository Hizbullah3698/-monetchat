USE master;
GO

IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = 'PickPicDB')
BEGIN
    CREATE DATABASE PickPicDB;
END
GO

USE PickPicDB;
GO

-- 1. Locations / Countries
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'countries')
BEGIN
    CREATE TABLE countries (
        code CHAR(2) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        currency_code CHAR(3) NOT NULL,
        currency_symbol NVARCHAR(5)
    );
END
GO

-- 2. Roles (RBAC)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'roles')
BEGIN
    CREATE TABLE roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(50) NOT NULL UNIQUE
    );
    -- Seed default roles
    INSERT INTO roles (name) VALUES ('buyer'), ('seller'), ('admin');
END
GO

-- 3. Users & Authentication
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255),
        full_name NVARCHAR(100), -- Matches route.ts display_name logic
        phone_number NVARCHAR(20),
        is_verified BIT DEFAULT 0,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        last_login DATETIMEOFFSET
    );
END
GO

-- 4. User Roles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_roles')
BEGIN
    CREATE TABLE user_roles (
        user_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
        role_id INT FOREIGN KEY REFERENCES roles(id),
        PRIMARY KEY (user_id, role_id)
    );
END
GO

-- 5. Sellers
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sellers')
BEGIN
    CREATE TABLE sellers (
        user_id UNIQUEIDENTIFIER PRIMARY KEY FOREIGN KEY REFERENCES users(id),
        business_name NVARCHAR(255) NOT NULL,
        tax_id NVARCHAR(50),
        address_line1 NVARCHAR(255),
        city NVARCHAR(100),
        country_code CHAR(2) FOREIGN KEY REFERENCES countries(code),
        rating DECIMAL(3, 2) DEFAULT 0.0,
        is_approved BIT DEFAULT 0,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

-- 6. Categories
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'categories')
BEGIN
    CREATE TABLE categories (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        parent_id INT FOREIGN KEY REFERENCES categories(id),
        slug NVARCHAR(100) UNIQUE NOT NULL
    );
END
GO

-- 7. Products
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'products')
BEGIN
    CREATE TABLE products (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        seller_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES sellers(user_id),
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX),
        base_price DECIMAL(10, 2) NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'USD',
        stock_quantity INT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );
    
    CREATE INDEX idx_products_seller ON products(seller_id);
    CREATE INDEX idx_products_price ON products(base_price, currency);
END
GO

-- Product-Category Join
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'product_categories')
BEGIN
    CREATE TABLE product_categories (
        product_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES products(id),
        category_id INT FOREIGN KEY REFERENCES categories(id),
        PRIMARY KEY (product_id, category_id)
    );
END
GO

-- 8. Product Images & Embeddings
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'product_images')
BEGIN
    CREATE TABLE product_images (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        product_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES products(id) ON DELETE CASCADE,
        url NVARCHAR(512) NOT NULL,
        is_primary BIT DEFAULT 0,
        vector_id NVARCHAR(100),
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

-- 9. Price History
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'price_history')
BEGIN
    CREATE TABLE price_history (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        product_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES products(id),
        old_price DECIMAL(10, 2),
        new_price DECIMAL(10, 2),
        changed_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

-- 10. Search Logs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'search_logs')
BEGIN
    CREATE TABLE search_logs (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        user_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
        search_query NVARCHAR(MAX),
        image_query_url NVARCHAR(MAX),
        filters NVARCHAR(MAX),
        result_count INT,
        latency_ms INT,
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

-- 11. Admin Audit Logs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_audit_logs')
BEGIN
    CREATE TABLE admin_audit_logs (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        admin_user_id UNIQUEIDENTIFIER FOREIGN KEY REFERENCES users(id),
        action NVARCHAR(50) NOT NULL,
        target_resource NVARCHAR(50),
        target_id UNIQUEIDENTIFIER,
        details NVARCHAR(MAX), -- JSON
        ip_address NVARCHAR(45),
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );
END
GO
