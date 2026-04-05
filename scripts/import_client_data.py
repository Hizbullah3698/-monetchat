import json
import uuid
import os
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timedelta
import re
from dotenv import load_dotenv

load_dotenv()

DB_URI = os.getenv("DATABASE_URL")
if not DB_URI:
    raise ValueError("DATABASE_URL not set. Please create a .env file with DATABASE_URL=postgresql://...")
JSON_FILE = "temp_scraper/q84sale_listings.json"

def has_arabic(text):
    if not text:
        return False
    return bool(re.search(r'[\u0600-\u06FF]', text))

def map_condition(cond_str):
    if not cond_str:
        return 'good'
    cond_str = cond_str.upper()
    if cond_str == 'NEW':
        return 'new'
    if cond_str == 'USED':
        return 'good'
    return 'good'

def parse_date(date_str):
    if not date_str:
        return datetime.now()
    try:
        return datetime.fromisoformat(date_str)
    except:
        return datetime.now()

def main():
    print(f"Loading data from {JSON_FILE}...")
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading {JSON_FILE}: {e}")
        return

    print(f"Loaded {len(data)} items. Connecting to DB...")
    try:
        conn = psycopg2.connect(DB_URI)
        cursor = conn.cursor()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return

    # Metrics
    sellers_upserted = 0
    products_upserted = 0
    images_upserted = 0
    errors = []

    # Simple text to id converter for sellers
    def get_seller_id(name):
        safe_name = re.sub(r'[^a-zA-Z0-9]', '', str(name).lower())
        if not safe_name:
            safe_name = "unknownseller"
        return str(uuid.uuid5(uuid.NAMESPACE_OID, f"seller_{safe_name}"))

    for listing in data:
        ad_id = str(listing.get("ad_id", ""))
        if not ad_id:
            continue
            
        seller_name = listing.get("seller_name", "Unknown Seller")
        seller_uuid = get_seller_id(seller_name)
        
        safe_email = f"{seller_uuid[:8]}@q84sale.local"
        dummy_phone = f"+9650000{seller_uuid[:4]}"
        
        # 1. Upsert User 
        try:
            cursor.execute("""
                INSERT INTO users (id, email, password_hash, name, phone, country_code, is_verified, is_active, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (email) DO UPDATE 
                SET updated_at = NOW()
            """, (seller_uuid, safe_email, "scraper_dump", seller_name, dummy_phone, "KW", True, True))
        except Exception as e:
            errors.append(f"Error user {seller_name}: {e}")
            conn.rollback()
            continue

        # 2. Upsert Seller
        try:
            cursor.execute("""
                INSERT INTO sellers (user_id, business_name, phone_public, is_verified, is_profile_complete, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (user_id) DO UPDATE 
                SET updated_at = NOW()
            """, (seller_uuid, seller_name, dummy_phone, True, True))
            if cursor.rowcount > 0:
                sellers_upserted += 1
        except Exception as e:
            errors.append(f"Error seller {seller_name}: {e}")
            conn.rollback()
            continue
            
        # 3. Upsert Product
        product_uuid = str(uuid.uuid5(uuid.NAMESPACE_OID, f"ad_{ad_id}"))
        
        raw_title = listing.get("title", "")
        raw_desc = listing.get("description", "")
        
        is_ar = has_arabic(raw_title) or has_arabic(raw_desc)
        title_ar = raw_title if is_ar else None
        title_en = raw_title if not is_ar else raw_title # fallback
        desc_ar = raw_desc if is_ar else None
        desc_en = raw_desc if not is_ar else raw_desc # fallback
        
        price = listing.get("price") or 0
        currency = listing.get("currency") or "KWD"
        condition = map_condition(listing.get("condition"))
        
        post_date_estimated = listing.get("posted_date_estimated")
        created_at = parse_date(post_date_estimated)
        
        try:
            cursor.execute("""
                INSERT INTO products (id, seller_id, title, title_ar, description, description_ar, price, currency, condition, country_code, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, NOW())
                ON CONFLICT (id) DO UPDATE 
                SET price = EXCLUDED.price,
                    status = EXCLUDED.status,
                    updated_at = NOW()
            """, (product_uuid, seller_uuid, title_en, title_ar, desc_en, desc_ar, price, currency, condition, "KW", created_at))
            
            if cursor.rowcount > 0:
                products_upserted += 1
        except Exception as e:
            errors.append(f"Error product {ad_id}: {e}")
            conn.rollback()
            continue
            
        # 4. Upsert Images
        images = listing.get("images", [])
        for i, img_url in enumerate(images):
            # Using MD5 of URL to ensure unique IDs per image
            img_uuid = str(uuid.uuid5(uuid.NAMESPACE_OID, f"{product_uuid}_{img_url}"))
            try:
                cursor.execute("""
                    INSERT INTO product_images (id, product_id, url, s3_key, is_primary, sort_order)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                """, (img_uuid, product_uuid, img_url, "PENDING", i == 0, i))
                
                if cursor.rowcount > 0:
                    images_upserted += 1
            except Exception as e:
                errors.append(f"Error image for {ad_id}: {e}")
                conn.rollback()

        conn.commit()

    conn.close()

    print("="*40)
    print("IMPORT SUMMARY")
    print("="*40)
    print(f"Sellers upserted:  {sellers_upserted}")
    print(f"Products upserted: {products_upserted}")
    print(f"Images upserted:   {images_upserted}")
    if errors:
        print(f"Errors:            {len(errors)}")
        for err in errors[:5]:
            print(f"  - {err}")
    print("="*40)

if __name__ == "__main__":
    main()
