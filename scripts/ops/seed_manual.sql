USE PickPicDB;
GO

-- 0. Countries
IF NOT EXISTS (SELECT * FROM countries WHERE code = 'US')
BEGIN
    INSERT INTO countries (code, name, currency_code, currency_symbol)
    VALUES ('US', 'United States', 'USD', '$');
END
GO

-- 1. Users
DECLARE @AdminHash NVARCHAR(255) = '$2b$10$id.i5Z2DCxdlgq1NvWHWb.iKT4Yp3x.G0o/TJiaGvPxoOxkULMl36';
DECLARE @SellerHash NVARCHAR(255) = '$2b$10$lKz0PzPRSi.hNprwoxIvyeLqHYc1gGj/f3ZF87Rpte5G/aqxMbOR6';

IF NOT EXISTS (SELECT * FROM users WHERE email = 'admin@pickpic.com')
BEGIN
    INSERT INTO users (email, password_hash, full_name, is_verified)
    VALUES ('admin@pickpic.com', @AdminHash, 'Super Admin', 1);
END

IF NOT EXISTS (SELECT * FROM users WHERE email = 'seller@example.com')
BEGIN
    INSERT INTO users (email, password_hash, full_name, is_verified)
    VALUES ('seller@example.com', @SellerHash, 'Test Seller', 1);
END
GO

-- 2. Roles Assignment
DECLARE @AdminId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = 'admin@pickpic.com');
DECLARE @SellerId UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = 'seller@example.com');
DECLARE @AdminRoleId INT = (SELECT id FROM roles WHERE name = 'admin');
DECLARE @SellerRoleId INT = (SELECT id FROM roles WHERE name = 'seller');

IF NOT EXISTS (SELECT * FROM user_roles WHERE user_id = @AdminId AND role_id = @AdminRoleId)
BEGIN
    INSERT INTO user_roles (user_id, role_id) VALUES (@AdminId, @AdminRoleId);
END

IF NOT EXISTS (SELECT * FROM user_roles WHERE user_id = @SellerId AND role_id = @SellerRoleId)
BEGIN
    INSERT INTO user_roles (user_id, role_id) VALUES (@SellerId, @SellerRoleId);
END
GO

-- 3. Seller Profile
DECLARE @SellerId2 UNIQUEIDENTIFIER = (SELECT id FROM users WHERE email = 'seller@example.com');

IF NOT EXISTS (SELECT * FROM sellers WHERE user_id = @SellerId2)
BEGIN
    INSERT INTO sellers (user_id, business_name, country_code, is_approved)
    VALUES (@SellerId2, 'Test Store', 'US', 1);
END
GO

-- 4. Categories
IF NOT EXISTS (SELECT * FROM categories WHERE slug = 'home-decor')
BEGIN
    INSERT INTO categories (name, slug) VALUES ('Home Decor', 'home-decor');
END
GO
