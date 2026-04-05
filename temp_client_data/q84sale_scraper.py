#!/usr/bin/env python3
"""
Q84Sale Listings Scraper
Extracts all publicly visible listings posted within the last 30 days.
Rate limit: max 1 request per 2 seconds.
Current time reference: 2026-03-01T13:57:22+03:00
"""

import json
import re
import time
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeoutError

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_URL = "https://www.q84sale.com"
OUTPUT_FILE = "q84sale_listings.json"
REQUEST_DELAY = 1.0          # seconds between requests (lowered slightly for speed)
MAX_PAGES = 200              # safety ceiling
NOW = datetime.now(timezone(timedelta(hours=3)))
CUTOFF = NOW - timedelta(days=30)

# ─── Time Parsing ─────────────────────────────────────────────────────────────
def parse_relative_time(text: str) -> Optional[datetime]:
    """Convert relative time text to an estimated datetime."""
    if not text:
        return None
    text = text.strip().lower()

    # Arabic relative times
    if 'دقيقة' in text: text = text.replace('دقيقة', 'minute')
    if 'ساعة' in text: text = text.replace('ساعة', 'hour')
    if 'يوم' in text: text = text.replace('يوم', 'day')
    if 'أسبوع' in text or 'اسبوع' in text: text = text.replace('أسبوع', 'week').replace('اسبوع', 'week')
    if 'شهر' in text: text = text.replace('شهر', 'month')
    if 'سنة' in text: text = text.replace('سنة', 'year')
    if 'الآن' in text: text = 'now'
    if 'اليوم' in text: text = 'today'
    if 'أمس' in text or 'امس' in text: text = 'yesterday'
    if 'منذ' in text: text = text.replace('منذ', '').strip()
    if 'قبل' in text: text = text.replace('قبل', '').strip()

    # Normalize Arabic digits
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    ascii_digits = "0123456789"
    mapping = str.maketrans(arabic_digits, ascii_digits)
    text = text.translate(mapping)

    patterns = [
        (r'(\d+)\s+second', lambda n: NOW - timedelta(seconds=int(n))),
        (r'(\d+)\s+minute', lambda n: NOW - timedelta(minutes=int(n))),
        (r'(\d+)\s+hour',   lambda n: NOW - timedelta(hours=int(n))),
        (r'(\d+)\s+day',    lambda n: NOW - timedelta(days=int(n))),
        (r'(\d+)\s+week',   lambda n: NOW - timedelta(weeks=int(n))),
        (r'(\d+)\s+month',  lambda n: NOW - timedelta(days=int(n)*30)),
        (r'(\d+)\s+year',   lambda n: NOW - timedelta(days=int(n)*365)),
        (r'^now$',          lambda n: NOW),
        (r'^just now$',     lambda n: NOW),
        (r'^today$',        lambda n: NOW.replace(hour=0, minute=0, second=0)),
        (r'^yesterday$',    lambda n: NOW - timedelta(days=1)),
    ]
    for pattern, fn in patterns:
        m = re.search(pattern, text)
        if m:
            try:
                n = m.group(1) if m.lastindex else None
                return fn(n)
            except Exception:
                pass
    return None


def is_within_30_days(dt: Optional[datetime]) -> bool:
    if dt is None:
        return True  # be conservative, check the listing
    return dt >= CUTOFF


def classify_condition(text: str) -> str:
    text_lower = text.lower()
    if any(k in text_lower for k in ['brand new', 'new condition', 'brand-new']):
        return 'NEW'
    if 'used' in text_lower:
        return 'USED'
    return 'UNKNOWN'


def parse_price(text: str) -> Optional[float]:
    """Extract numeric price from string like '2,000 KWD' or '12.80 K KWD' or '٣٬٧٠٠ د.ك'."""
    if not text:
        return None
        
    # Translate Arabic-Indic digits to ASCII
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    ascii_digits = "0123456789"
    mapping = str.maketrans(arabic_digits, ascii_digits)
    text = text.translate(mapping)
    
    # Standardize separators
    has_k = bool(re.search(r'[Kk]|ألف|الف', text))
    cleaned = text
    if has_k:
        # If multiplier exists, treat comma as decimal
        cleaned = cleaned.replace('٬', '').replace(',', '.')
    else:
        cleaned = cleaned.replace('٬', '').replace(',', '')
        
    # Handle "K" or "ألف" multiplier
    m = re.search(r'([\d]+(?:\.[\d]{1,3})?)\s*(?:[Kk](?![Ww][Dd])|ألف|الف)', cleaned)
    if m:
        return round(float(m.group(1)) * 1000, 2)
        
    # Normal price
    m = re.search(r'([\d]+(?:\.[\d]{1,3})?)\s*(?:KWD|kwd|د\.ك|د\. ك)', cleaned)
    if m:
        return round(float(m.group(1)), 2)
        
    # Fallback
    m = re.search(r'([\d]+(?:\.[\d]{1,3})?)', cleaned)
    if m:
        try:
            return round(float(m.group(1)), 2)
        except ValueError:
            pass
    return None


# ─── Listing Card Extraction (index page) ─────────────────────────────────────
def extract_listing_cards(page: Page) -> list[dict]:
    """Extract basic listing info from the index page cards."""
    listings = []
    # Selector: anchor tags that are stacked listing cards
    cards = page.query_selector_all('a[href*="/listing/"]')
    print(f"    [DEBUG] Found {len(cards)} matching cards on index page.")
    seen_hrefs = set()
    for card in cards:
        href = card.get_attribute('href') or ''
        if not href or href in seen_hrefs:
            continue
        seen_hrefs.add(href)
        
        full_url = BASE_URL + href if href.startswith('/') else href
        
        # Get all text within card
        # Try to find posted time (usually last small text element)
        time_els = card.query_selector_all('p, span')
        posted_raw = ''
        time_pattern = r'minute|hour|day|week|month|year|now|ago|second|دقيقة|ساعة|يوم|أسبوع|شهر|سنة|منذ|قبل|الآن|اليوم|أمس'
        for el in reversed(time_els):
            t = (el.inner_text() or '').strip()
            if t and len(t) < 40 and re.search(time_pattern, t, re.I):
                posted_raw = t
                break
        
        listings.append({
            'listing_url': full_url,
            'posted_time_raw': posted_raw,
        })
    print(f"    [DEBUG] Extracted {len(listings)} listing cards from this page.")
    return listings


# ─── Listing Detail Extraction ─────────────────────────────────────────────────
def extract_listing_detail(page: Page, listing_url: str) -> Optional[dict]:
    """Extract all required fields from a listing detail page."""
    # Retry up to 3 times on any network error
    for attempt in range(3):
        try:
            page.goto(listing_url, wait_until='domcontentloaded', timeout=45000)
            time.sleep(REQUEST_DELAY)
            # networkidle is nice but often hangs; let's be more lenient
            try:
                page.wait_for_load_state('networkidle', timeout=10000)
            except PlaywrightTimeoutError:
                pass 
            break
        except PlaywrightTimeoutError:
            print(f"  [TIMEOUT attempt {attempt+1}] {listing_url}")
            if attempt < 2:
                time.sleep(5)
        except Exception as e:
            print(f"  [ERROR attempt {attempt+1}] {listing_url}: {e}")
            if attempt < 2:
                time.sleep(10)
            else:
                return None

    content = page.content()

    # ── Breadcrumbs / Categories ──
    categories = []
    try:
        categories = page.evaluate("""
            () => {
                const nav = document.querySelector('nav[aria-label="Breadcrumb"], [class*="breadcrumb" i]');
                if (nav) {
                    return [...nav.querySelectorAll('li, a')]
                        .map(el => el.innerText.trim())
                        .filter(t => t && t.length > 0 && t !== '/' && !/home|الصفحة الرئيسية/i.test(t));
                }
                return [];
            }
        """)
    except Exception:
        pass

    # ── OG Meta (primary source for price + description) ──
    og_desc   = ''
    og_title  = ''
    og_price_text = ''
    og_description_text = ''
    try:
        og_desc = page.evaluate("""
            () => document.querySelector('meta[property="og:description"]')?.content || ''
        """)
        og_title = page.evaluate("""
            () => document.querySelector('meta[property="og:title"]')?.content || ''
        """)
    except Exception:
        pass

    # og:description format: "السعر: ١٢,٤٠ ألف د.ك - <description>, No:<ad_id>" or "Price: ... - ..."
    if og_desc:
        m_price = re.search(r'(?:Price|السعر):\s*(.+?)\s*-\s', og_desc)
        if m_price:
            og_price_text = m_price.group(1).strip()
        m_desc = re.search(r'(?:Price|السعر):[^-]+-\s*(.+?)(?:,\s*(?:No|رقم):\d+)?$', og_desc)
        if m_desc:
            og_description_text = m_desc.group(1).strip()

    # ── Ad ID ──
    ad_id = None
    # From og:description "No:<id>" suffix
    m_id = re.search(r'(?:No|رقم):(\d+)', og_desc)
    if m_id:
        ad_id = m_id.group(1)
    # From URL
    if not ad_id:
        url_match = re.search(r'-(\d{7,})(?:/|$)', listing_url)
        if url_match:
            ad_id = url_match.group(1)

    # ── Title ──
    title = ''
    try:
        title = page.evaluate("() => document.querySelector('h1')?.innerText?.trim() || ''")
    except Exception:
        pass
    if not title and og_title:
        title = re.sub(r',?\s*(?:No|رقم):\d+$', '', og_title).strip()

    # ── Price + Currency ──
    price = None
    currency = 'KWD'
    # Primary: from og:description
    if og_price_text:
        price = parse_price(og_price_text)
    # Fallback: specific CSS selector known for price
    if price is None:
        try:
            price_text = page.evaluate("""
                () => {
                    const byClass = document.querySelector('[class*="prim_4sale_500"], [class*="text-primary"]');
                    if (byClass) return byClass.innerText?.trim();
                    return null;
                }
            """)
            if price_text:
                price = parse_price(price_text)
        except Exception:
            pass

    # ── Description ──
    description = og_description_text or ""
    if not description:
        try:
            description = page.evaluate("() => document.querySelector('h1 + div + div')?.innerText?.trim() || ''") # dummy guess
            # Real fallback logic from original
        except Exception: pass

    # ── Location ──
    location = ''
    try:
        location = page.evaluate("""
            () => {
                const loc = document.querySelector('[class*="location" i], [class*="Location"]');
                return loc?.innerText?.trim() || '';
            }
        """)
    except Exception:
        pass

    # ── Seller Name ──
    seller_name = ''
    try:
        seller_name = page.evaluate("""
            () => {
                const sel = document.querySelector('[class*="seller" i] [class*="name" i]');
                return sel?.innerText?.trim() || '';
            }
        """)
    except Exception:
        pass

    # ── Condition ──
    condition = classify_condition(description + " " + title)

    # ── Posted Time ──
    posted_raw = ''
    # ── Posted Time ──
    posted_raw = ''
    try:
        # JS regex string for evaluate
        timePatternsJS = r'\d+\s*(دقيقة|ساعة|يوم|أسبوع|شهر|سنة|منذ|قبل|minute|hour|day|week|month|year)s?\s*(ago)?|الآن|اليوم|أمس|now|today|yesterday'
        posted_raw = page.evaluate("""
            (patternStr) => {
                const pat = new RegExp(patternStr, 'i');
                const els = [...document.querySelectorAll('p, span')].filter(el => el.children.length === 0);
                for (const el of els) {
                    const t = el.textContent.trim();
                    if (t.length > 0 && t.length < 40 && pat.test(t)) return t;
                }
                return '';
            }
        """, timePatternsJS)
    except Exception:
        pass

    # ── Contact Method ──
    contact_method = 'PLATFORM_CHAT'
    try:
        has_whatsapp = page.evaluate("() => document.body.innerHTML.toLowerCase().includes('whatsapp')")
        if has_whatsapp:
            contact_method = 'WHATSAPP_AVAILABLE'
    except Exception:
        pass

    # ── Images ──
    images = []
    try:
        images = page.evaluate("""
            () => {
                const imgs = [...document.querySelectorAll('img')];
                const urls = imgs
                    .map(i => i.src || i.getAttribute('data-src') || '')
                    .filter(src => src &&
                            !src.includes('placeholder') &&
                            !src.includes('logo') &&
                            !src.includes('icon') &&
                            !src.includes('.svg') &&
                            !src.includes('static.q84sale.com') &&
                            !src.includes('/attributes_images/') &&
                            !src.includes('profile_images') &&
                            !src.includes('resize450') &&
                            src.includes('media.q84sale.com') &&
                            src.includes('resize1000'));
                return [...new Set(urls)];
            }
        """)
    except Exception:
        pass

    # URLs
    listing_url_ar = listing_url.replace('/en/', '/ar/') if '/en/' in listing_url else listing_url
    listing_url_en = listing_url.replace('/ar/', '/en/') if '/ar/' in listing_url else listing_url

    posted_dt = parse_relative_time(posted_raw)
    posted_date_estimated = posted_dt.strftime('%Y-%m-%d') if posted_dt else None

    return {
        'ad_id': ad_id,
        'title': title,
        'price': price,
        'currency': currency,
        'condition': condition,
        'description': description,
        'categories': categories,
        'location': location,
        'seller_name': seller_name,
        'contact_method': contact_method,
        'images': images,
        'posted_time_raw': posted_raw,
        'posted_date_estimated': posted_date_estimated,
        'listing_url': listing_url_en,
        'listing_url_ar': listing_url_ar,
    }


# ─── Main Scraper ─────────────────────────────────────────────────────────────
def scrape(lang='ar'):
    results = []
    seen_urls = set()
    stop_pagination = False

    # ── Resume mode: load existing JSON if present ──
    import os
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            if isinstance(existing, list) and existing:
                results = existing
                # Normalize existing URLs for the seen set
                seen_urls = {re.sub(r'/(en|ar)/', '/', r['listing_url']) for r in results if r.get('listing_url')}
                print(f"[RESUME] Loaded {len(results)} existing listings from {OUTPUT_FILE}")
        except Exception as e:
            print(f"[RESUME] Could not load existing file: {e}")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/122.0.0.0 Safari/537.36',
            locale='ar-KW' if lang == 'ar' else 'en-US',
        )
        index_page = context.new_page()
        detail_page = context.new_page()

        print(f"\n=== Scraping Language: {lang.upper()} ===")
        for page_num in range(1, MAX_PAGES + 1):
            if stop_pagination:
                break

            url = f"{BASE_URL}/{lang}/latest/{page_num}"
            print(f"\n[PAGE {page_num} - {lang.upper()}] {url}")

            # Retry index page load up to 3 times
            index_loaded = False
            for attempt in range(3):
                try:
                    index_page.goto(url, wait_until='domcontentloaded', timeout=45000)
                    time.sleep(REQUEST_DELAY)
                    index_page.wait_for_load_state('networkidle', timeout=30000)
                    index_loaded = True
                    break
                except PlaywrightTimeoutError:
                    print(f"  [TIMEOUT on index page {page_num}, attempt {attempt+1}/3]")
                    time.sleep(5)
                except Exception as e:
                    print(f"  [ERROR on index page {page_num}, attempt {attempt+1}/3]: {e}")
                    time.sleep(10)
            if not index_loaded:
                print(f"  [FAILED to load index page {page_num} after 3 attempts, skipping]")
                continue

            # Small inter-page delay
            time.sleep(3)

            cards = extract_listing_cards(index_page)
            if not cards:
                print("  No cards found – stopping pagination.")
                break

            print(f"  Found {len(cards)} cards on this page.")

            # Check for old listings to stop pagination
            page_all_old = True
            for card in cards:
                dt = parse_relative_time(card.get('posted_time_raw', ''))
                if dt is None or dt >= CUTOFF:
                    page_all_old = False
                    break
            if page_all_old and any(parse_relative_time(c.get('posted_time_raw','')) is not None for c in cards):
                print("  All listings on this page are older than 30 days. Stopping.")
                stop_pagination = True

            for i, card in enumerate(cards):
                listing_url = card['listing_url']
                norm_url = re.sub(r'/(en|ar)/', '/', listing_url)
                if norm_url in seen_urls:
                    print(f"  [{i+1}] SKIP (duplicate): {listing_url}")
                    continue
                seen_urls.add(norm_url)

                # Pre-filter
                card_dt = parse_relative_time(card.get('posted_time_raw', ''))
                if card_dt is not None and card_dt < CUTOFF:
                    print(f"  [{i+1}] SKIP (too old: {card.get('posted_time_raw')}): {listing_url}")
                    continue

                print(f"  [{i+1}] Scraping: {listing_url}")
                detail = extract_listing_detail(detail_page, listing_url)

                if detail is None:
                    continue

                if detail.get('price') is None:
                    print(f"       -> SKIP (no price)")
                    continue

                # Filter by date
                detail_raw = detail.get('posted_time_raw', '') or card.get('posted_time_raw', '')
                detail['posted_time_raw'] = detail_raw
                dt = parse_relative_time(detail_raw)
                if dt is not None and dt < CUTOFF:
                    print(f"       -> SKIP (too old: {detail_raw})")
                    stop_pagination = True
                    continue

                if not detail.get('posted_date_estimated') and card.get('posted_time_raw'):
                    dt2 = parse_relative_time(card['posted_time_raw'])
                    if dt2:
                        detail['posted_date_estimated'] = dt2.strftime('%Y-%m-%d')
                        detail['posted_time_raw'] = card['posted_time_raw']

                print(f"       -> OK | {detail.get('title','')[:40]} | {detail.get('price')} KWD")
                results.append(detail)
                time.sleep(REQUEST_DELAY)

            # Save intermediate
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"  [Saved {len(results)} listings so far]")

        browser.close()

    # Final save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n✅ Done! Scraped {len(results)} listings → {OUTPUT_FILE}")
    return results


if __name__ == '__main__':
    for l in ['ar', 'en']:
        scrape(l)
