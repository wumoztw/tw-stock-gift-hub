import urllib.request
import ssl
import json
import re
from collections import defaultdict, Counter
from bs4 import BeautifulSoup

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'}

def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers=headers)
    raw = urllib.request.urlopen(req, timeout=20, context=ctx).read()
    try:
        return raw.decode('utf-8')
    except UnicodeDecodeError:
        return raw.decode('big5', errors='ignore')

def normalize_agent(agent_raw: str) -> str:
    mapping = [
        ('中國信託', '中國信託'), ('中信', '中國信託'),
        ('凱基', '凱基證券'), ('大華', '凱基證券'),
        ('元大', '元大證券'),
        ('群益', '群益金鼎'),
        ('台新', '台新證券'),
        ('福邦', '福邦證券'), ('褔邦', '福邦證券'),
        ('永豐', '永豐金證券'),
        ('統一', '統一證券'),
        ('富邦', '富邦證券'),
        ('兆豐', '兆豐證券'),
        ('華南', '華南永昌'),
        ('宏遠', '宏遠證券'),
        ('康和', '康和證券'),
        ('第一金', '第一金證券'),
        ('國票', '國票證券'),
        ('合庫', '合庫證券'),
        ('亞東', '亞東證券'),
        ('元富', '元富證券'),
    ]
    for key, val in mapping:
        if key in agent_raw:
            return val
    return agent_raw[:6].strip() if agent_raw else '自辦/其他'

def estimate_gift_value(gift_name: str):
    gift_clean = gift_name.replace('參考圖', '').strip()
    if not gift_clean or '未定' in gift_clean or '尚未' in gift_clean:
        return ('未定/待公告', 0, gift_clean)
    if '取消' in gift_clean or '不發' in gift_clean or gift_clean == '無':
        return ('取消/不發放', 0, gift_clean)

    coupon_keywords = ['折價', '抵用', '優惠券', '購物金', '折扣', '體驗券', '兌換券']
    if any(k in gift_clean for k in coupon_keywords) and not any(c in gift_clean for c in ['7-11', '全家', '統一超商', '萊爾富', 'OK超商', '超商']):
        m = re.search(r'(\d+)\s*元', gift_clean)
        val = int(m.group(1)) if m else 100
        return ('折價/購物金', min(int(val * 0.1), 50), gift_clean)

    card_keywords = ['7-11', '統一超商', '全家', '萊爾富', 'OK超商', '超商', '商品卡', '禮券', '禮物卡', '數位商品禮券', '即享券', '咖啡卡', '咖啡券']
    is_card = any(k in gift_clean for k in card_keywords)
    gift_for_num = re.sub(r'7\s*-\s*11', '', gift_clean)
    m = re.search(r'(\d+)\s*元', gift_for_num)
    if is_card:
        val = int(m.group(1)) if m else 45
        if val > 1000:
            val = 50
        return ('超商卡/禮券', val, gift_clean)

    daily_keywords = ['皂', '洗', '米', '麵', '油', '鹽', '衛生紙', '濕巾', '牙膏', '刷', '保鮮', '碗', '杯', '盤', '壺', '鍋', '袋', '巾', '襪', '傘', '燈', '精', '露', '膏', '口罩', '禮盒', '餐具', '瓶', '罐']
    if any(k in gift_clean for k in daily_keywords):
        return ('民生/日用品', 80, gift_clean)

    return ('其他紀念品', 60, gift_clean)

# 1. Fetch official TWSE & TPEx daily close prices
prices = {}
market_type = {}
company_names = {}

twse_data = json.loads(fetch_text('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL'))
for item in twse_data:
    code = item.get('Code', '').strip()
    close_str = item.get('ClosingPrice', '').replace(',', '').strip()
    if code and close_str:
        try:
            prices[code] = float(close_str)
            market_type[code] = '上市'
            company_names[code] = item.get('Name', '').strip()
        except ValueError:
            pass

tpex_data = json.loads(fetch_text('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes'))
for item in tpex_data:
    code = item.get('SecuritiesCompanyCode', '').strip()
    close_str = item.get('Close', '').replace(',', '').strip()
    if code and close_str and close_str != '---':
        try:
            prices[code] = float(close_str)
            market_type[code] = '上櫃'
            company_names[code] = item.get('CompanyName', '').strip()
        except ValueError:
            pass

print(f"Loaded official prices for {len(prices)} TWSE/TPEx securities.")

# 2. Fetch 2026 HiStock (with >&#< fix to get all 771 rows)
histock_html = fetch_text('https://histock.tw/stock/gift.aspx').replace('>&#<', '>高雄<')
soup_hi = BeautifulSoup(histock_html, 'html.parser')
records_2026 = {}

for r in soup_hi.find_all('tr', class_=lambda c: c and 'searchrow' in c):
    cols = [c.get_text(strip=True) for c in r.find_all('td')]
    if len(cols) >= 11:
        code, name, price_str, last_buy, meet_date, meet_type, loc, gift_raw, odd_lot_mail, broker, phone = cols[:11]
        try:
            hi_price = float(price_str.replace(',', ''))
        except ValueError:
            hi_price = 0.0
        final_price = prices.get(code, hi_price)
        cat, est_val, gift_clean = estimate_gift_value(gift_raw)
        records_2026[code] = {
            'code': code,
            'name': name,
            'market': market_type.get(code, '上市櫃/興櫃'),
            'price': final_price,
            'last_buy_date': last_buy,
            'meeting_date': meet_date,
            'meeting_type': meet_type,
            'location': loc,
            'gift_2026': gift_clean,
            'category_2026': cat,
            'est_value_2026': est_val,
            'odd_lot_mail': odd_lot_mail,
            'agent': normalize_agent(broker),
            'agent_raw': broker,
            'agent_phone': phone,
            'history': {}
        }

print(f"HiStock 2026 parsed: {len(records_2026)} unique companies.")

# 3. Fetch Stockhouse 2026 list to fill any missing companies or upcoming meetings
sh2026_html = fetch_text('https://www.stockhouse.com.tw/show2026list.html')
soup_sh26 = BeautifulSoup(sh2026_html, 'html.parser')
for tr in soup_sh26.find_all('tr')[1:]:
    cols = [c.get_text(strip=True) for c in tr.find_all('td')]
    if len(cols) >= 6:
        code, name, meet_date, last_buy, gift_raw, agent_raw = cols[:6]
        is_temp = '(臨)' in name
        clean_name = name.replace('(臨)', '').strip()
        cat, est_val, gift_clean = estimate_gift_value(gift_raw)
        if code not in records_2026:
            records_2026[code] = {
                'code': code,
                'name': company_names.get(code, clean_name),
                'market': market_type.get(code, '上市櫃/興櫃'),
                'price': prices.get(code, 0.0),
                'last_buy_date': last_buy,
                'meeting_date': meet_date,
                'meeting_type': '臨時' if is_temp else '常會',
                'location': '',
                'gift_2026': gift_clean,
                'category_2026': cat,
                'est_value_2026': est_val,
                'odd_lot_mail': '未知',
                'agent': normalize_agent(agent_raw),
                'agent_raw': agent_raw,
                'agent_phone': '',
                'history': {}
            }

print(f"Merged 2026 total companies: {len(records_2026)}")

# 4. Fetch 2012-2025 Historical Gifts (8,523 records)
sh_hist_html = fetch_text('https://www.stockhouse.com.tw/showallhadso.html')
soup_hist = BeautifulSoup(sh_hist_html, 'html.parser')
history_by_code = defaultdict(dict)
names_by_code = {}

for tr in soup_hist.find_all('tr')[1:]:
    cols = [c.get_text(strip=True) for c in tr.find_all('td')]
    if len(cols) >= 4:
        code, name, yr, gift_raw = cols[:4]
        clean_name = name.replace('(臨)', '').strip()
        names_by_code[code] = clean_name
        if yr.isdigit():
            history_by_code[code][int(yr)] = gift_raw

print(f"Historical database loaded for {len(history_by_code)} unique companies across 2012-2025.")

# Merge history into records_2026 and also include companies that gave gifts in 2023-2025
all_codes = set(records_2026.keys()) | {c for c, h in history_by_code.items() if any(y >= 2023 for y in h)}

enriched_list = []
for code in sorted(all_codes):
    rec = records_2026.get(code, {
        'code': code,
        'name': company_names.get(code, names_by_code.get(code, '')),
        'market': market_type.get(code, '上市櫃/興櫃'),
        'price': prices.get(code, 0.0),
        'last_buy_date': '待公告',
        'meeting_date': '待公告',
        'meeting_type': '常會',
        'location': '',
        'gift_2026': '待公告',
        'category_2026': '未定/待公告',
        'est_value_2026': 0,
        'odd_lot_mail': '未知',
        'agent': '待確認',
        'agent_raw': '',
        'agent_phone': '',
    })
    hist = history_by_code.get(code, {})
    rec['history'] = {str(y): hist[y] for y in sorted(hist.keys(), reverse=True) if y >= 2021}
    
    # Calculate 3-year (2023, 2024, 2025) & 4-year (+2026) card streak
    recent_years = [2026, 2025, 2024, 2023]
    card_years = 0
    card_vals = []
    for y in recent_years:
        g = rec['gift_2026'] if y == 2026 else hist.get(y, '')
        c_cat, c_val, _ = estimate_gift_value(g)
        if c_cat == '超商卡/禮券':
            card_years += 1
            card_vals.append(c_val)
    
    rec['recent_4yr_card_count'] = card_years
    rec['avg_card_value'] = round(sum(card_vals) / len(card_vals), 0) if card_vals else 0
    
    # Use 2026 value if available, otherwise fallback to historical average card value for pre-positioning
    effective_val = rec['est_value_2026'] if rec['est_value_2026'] > 0 else rec['avg_card_value']
    price = rec['price']
    cost_1_share = round(price + 1.0, 2) if price > 0 else 999999
    rec['cost_1_share'] = cost_1_share
    rec['roi_pct'] = round((effective_val / cost_1_share) * 100, 1) if (price > 0 and effective_val > 0) else 0.0
    rec['net_profit_yr1'] = round(effective_val - cost_1_share, 1) if (price > 0 and effective_val > 0) else -999999
    rec['is_4yr_card_king'] = (card_years == 4)
    rec['is_3yr_card_king'] = (card_years >= 3)
    enriched_list.append(rec)

# Output statistics
total_2026_valid = [r for r in enriched_list if r['category_2026'] not in ('未定/待公告', '取消/不發放')]
cards_2026 = [r for r in enriched_list if r['category_2026'] == '超商卡/禮券']
breakeven_2026 = sorted([r for r in cards_2026 if 0 < r['cost_1_share'] <= r['est_value_2026']], key=lambda x: x['roi_pct'], reverse=True)
kings_4yr = sorted([r for r in enriched_list if r['is_4yr_card_king'] and r['price'] > 0], key=lambda x: x['roi_pct'], reverse=True)
kings_4yr_breakeven = [r for r in kings_4yr if r['cost_1_share'] <= r['est_value_2026']]

print(f"\n=== 擴充後完整資料庫統計 ===")
print(f"1. 總收錄上市櫃/興櫃公司數: {len(enriched_list)} 家")
print(f"2. 2026 已公告紀念品公司數: {len(total_2026_valid)} 家")
print(f"3. 2026 發放【超商卡/禮券】公司數: {len(cards_2026)} 家 (單一帳號全領總面額: {sum(r['est_value_2026'] for r in cards_2026):,} 元)")
print(f"4. 2026【買 1 股首年直接回本倒賺】超商卡公司數: {len(breakeven_2026)} 家")
print(f"   - 買齊這 {len(breakeven_2026)} 檔各 1 股總成本 (含 1 元手續費): {sum(r['cost_1_share'] for r in breakeven_2026):,.0f} 元")
print(f"   - 首年可領超商卡總面額: {sum(r['est_value_2026'] for r in breakeven_2026):,} 元")
print(f"   - 首年直接倒賺淨利: +{sum(r['net_profit_yr1'] for r in breakeven_2026):,.0f} 元")
print(f"5. 👑【連續 4 年 (2023~2026) 100% 穩定發超商卡】鐵飯碗定存零股: 共 {len(kings_4yr)} 家 (其中首年直接回本有 {len(kings_4yr_breakeven)} 家!)")

print(f"\n--- 👑 連續 4 年 (2023~2026) 每年必發超商卡 & 首年直接回本 Top 20 神級名單 ---")
for r in kings_4yr_breakeven[:20]:
    h_str = f"25:{r['history'].get('2025','-')[:8]} | 24:{r['history'].get('2024','-')[:8]} | 23:{r['history'].get('2023','-')[:8]}"
    print(f"{r['code']} {r['name']} ({r['market']}) | 今價:{r['price']}元 (成本:{r['cost_1_share']}) | 2026:{r['gift_2026']} ({r['est_value_2026']}元) | 歷年:[{h_str}] | 首年ROI:{r['roi_pct']}% | 股代:{r['agent']}")

with open('public/data/gifts.json', 'w', encoding='utf-8') as f:
    json.dump(enriched_list, f, ensure_ascii=False, indent=2)
