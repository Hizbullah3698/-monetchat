// Import client data using Neon HTTP driver (port 443 - never blocked)
// Has retry logic + 400ms throttle to avoid Neon rate limiting

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import { v5 as uuidv5 } from 'uuid';

const NAMESPACE = '6ba7b812-9dad-11d1-80b4-00c04fd430c8';
const JSON_FILE = 'temp_scraper/q84sale_listings.json';

const sql = neon(process.env.DATABASE_URL!);

function hasArabic(text?: string | null) {
  return text ? /[\u0600-\u06FF]/.test(text) : false;
}
function mapCondition(cond?: string | null) {
  if (!cond) return 'good';
  if (cond.toUpperCase() === 'NEW') return 'new';
  return 'good';
}
function parseDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
function getSellerUuid(name: string) {
  const safe = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'unknownseller';
  return uuidv5(`seller_${safe}`, NAMESPACE);
}
function getProductUuid(adId: string) { return uuidv5(`ad_${adId}`, NAMESPACE); }
function getImageUuid(productUuid: string, imgUrl: string) {
  return uuidv5(`${productUuid}_${imgUrl.slice(-80)}`, NAMESPACE);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function upsertListing(listing: any) {
  const adId = listing.ad_id?.toString();
  if (!adId) return 'skip';

  const sellerName = listing.seller_name || 'Unknown Seller';
  const sellerUuid = getSellerUuid(sellerName);
  const email = `${sellerUuid.slice(0, 8)}@q84sale.local`;
  const phone = `+96500${sellerUuid.slice(0, 6)}`;
  const productUuid = getProductUuid(adId);
  const rawTitle = listing.title || '';
  const rawDesc = listing.description || '';
  const isAr = hasArabic(rawTitle);
  const price = listing.price ?? 0;
  const currency = listing.currency || 'KWD';
  const condition = mapCondition(listing.condition);
  const createdAt = parseDate(listing.posted_date_estimated);

  await sql`
    INSERT INTO users (id, email, password_hash, name, phone, country_code, is_verified, is_active, updated_at)
    VALUES (${sellerUuid}, ${email}, 'scraper_dump', ${sellerName}, ${phone}, 'KW', true, true, NOW())
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
  `;
  await sql`
    INSERT INTO sellers (user_id, business_name, phone_public, is_verified, is_profile_complete, updated_at)
    VALUES (${sellerUuid}, ${sellerName}, ${phone}, true, true, NOW())
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
  `;
  await sql`
    INSERT INTO products (id, seller_id, title, title_ar, description, description_ar, price, currency, condition, country_code, status, created_at, updated_at)
    VALUES (
      ${productUuid}, ${sellerUuid},
      ${rawTitle}, ${isAr ? rawTitle : null},
      ${rawDesc || null}, ${isAr ? rawDesc || null : null},
      ${price}, ${currency}, ${condition}, 'KW', 'active',
      ${createdAt}::timestamptz, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()
  `;
  const images: string[] = listing.images || [];
  for (let j = 0; j < images.length; j++) {
    const imgUuid = getImageUuid(productUuid, images[j]);
    await sql`
      INSERT INTO product_images (id, product_id, url, s3_key, is_primary, sort_order)
      VALUES (${imgUuid}, ${productUuid}, ${images[j]}, 'PENDING', ${j === 0}, ${j})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  return 'ok';
}

async function main() {
  console.log(`\nLoading ${JSON_FILE}...`);
  const items: any[] = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  console.log(`Loaded ${items.length} listings.\n`);

  console.log('Testing DB connection...');
  const test = await sql`SELECT COUNT(*) as count FROM products`;
  console.log(`✅ Connected! Current products in DB: ${test[0].count}\n`);

  let ok = 0, skipped = 0, errors = 0;

  for (let i = 0; i < items.length; i++) {
    const adId = items[i].ad_id?.toString();
    if (!adId) { skipped++; continue; }

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await upsertListing(items[i]);
        if (result === 'skip') { skipped++; } else { ok++; }
        success = true;
        break;
      } catch (err: any) {
        if (attempt < 3) {
          await sleep(2000 * attempt); // 2s then 4s backoff
        } else {
          errors++;
          console.error(`  [${i + 1}] ❌ ad ${adId}: ${err.message?.slice(0, 80)}`);
        }
      }
    }

    if ((i + 1) % 50 === 0 || i === items.length - 1) {
      console.log(`  [${i + 1}/${items.length}] ✅ Imported: ${ok} | Errors: ${errors}`);
    }

    await sleep(400); // 400ms throttle between items
  }

  console.log('\n========================================');
  console.log('IMPORT COMPLETE');
  console.log('========================================');
  console.log(`✅ Successfully imported: ${ok}`);
  console.log(`⏭️  Skipped:              ${skipped}`);
  console.log(`❌ Errors:               ${errors}`);
  const final = await sql`SELECT COUNT(*) as count FROM products`;
  console.log(`📦 Total products in DB: ${final[0].count}`);
  console.log('========================================\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
