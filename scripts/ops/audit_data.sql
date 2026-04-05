-- Data Integrity Audit Script
-- Run this monthly using SQL Job

-- 1. Check for Orphaned Products (Seller no longer exists or logic error)
SELECT 'Orphaned Products' AS IssueType, id, title 
FROM products p
LEFT JOIN sellers s ON p.seller_id = s.user_id
WHERE s.user_id IS NULL;

-- 2. Check for "Soft Deleted" Products that are still active (Logic Error)
-- Assuming 'is_active' should be false if 'deleted_at' is SET (if you have deleted_at)
-- Or checking if Banned Sellers have Active Products
SELECT 'Banned Seller Active Products' AS IssueType, p.id, p.title
FROM products p
JOIN sellers s ON p.seller_id = s.user_id
WHERE s.is_approved = 0 AND p.is_active = 1;

-- 3. Check for Duplicate Reviews (if Reviews table exists)
-- SELECT 'Duplicate Reviews', user_id, product_id, COUNT(*)
-- FROM reviews
-- GROUP BY user_id, product_id
-- HAVING COUNT(*) > 1;

-- 4. Check for Negative Stock (Data Corruption)
SELECT 'Negative Stock' AS IssueType, id, title, stock_quantity
FROM products
WHERE stock_quantity < 0;

-- 5. Foreign Key Integrity (Manual Check if constraints are disabled)
-- Listings pointing to non-existent Categories
SELECT 'Invalid Category Map' AS IssueType, product_id
FROM product_categories pc
LEFT JOIN categories c ON pc.category_id = c.id
WHERE c.id IS NULL;

GO
