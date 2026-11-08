# 台灣股東會紀念品情報站 (tw-stock-gift-hub)

清新卡片風的純靜態網站，整理 884 家公司 2026 股東會紀念品，提供：

- 🔥 買 1 股首年直接回本 ROI 計算（成本含 1 元手續費）
- 👑 連 4 年（2023~2026）必發超商卡標籤
- 🚉 股務代理分組，含「台北車站步行圈（中信＋福邦＋凱基＋永豐金）」一鍵聯集
- 📅 行事曆匯出：勾選標的一鍵匯出 .ics（最後買進日／股東會日期同日合併，含前一晚 20:00 與當日 09:00 提醒），卡片可直接加入 Google 日曆
- 👨‍👩‍👧‍👦 家庭 1~8 戶試算與 CSV 匯出（UTF-8 BOM，Excel 可直接開啟）
- GitHub Actions 每日 08:30 / 18:30（台灣時間）自動更新

## 能靠股東會紀念品過生活嗎？（第一性原理摘要）

資料來自 `public/data/gifts.json`：

- 2026 超商卡共 327 家，單戶全領總面額 15,678 元，但這需要同時持有 327 檔、跑遍各地股代。
- 首年買 1 股即倒賺的超商卡標的 172 檔：總成本約 4,292 元，可領 8,545 元，首年淨賺約 4,253 元。
- 連 4 年必發超商卡的有 200 家，次年起幾乎免成本。
- 每多一個家庭證券戶，收益線性增加，但時間、交通與開戶管理成本也同步增加。

結論：一年幾千元的超商卡可當作「免費零用金」，但以時薪估算，不足以支撐生活。紀念品政策隨時可能取消，且不構成投資建議。

## 本地預覽

```bash
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

需透過 HTTP 伺服器開啟，直接用 `file://` 會因 `fetch` 被瀏覽器擋下。

## 更新資料與測試

```bash
python3 scripts/update_gifts.py
python3 -m unittest discover -s tests -p "test_*.py"
```

`update_gifts.py` 會讀取 TWSE/TPEx 官方收盤價，並以 best-effort 方式讀取 HiStock 與 Stockhouse；外部來源失敗時只略過該來源，不破壞既有資料。這兩個網站的版面可能變動，解析規則需視情況調整。

## 部署到 GitHub Pages

1. 推送此專案到 GitHub。
2. Settings → Pages → Source 選 `Deploy from a branch`，分支 `main`、目錄 `/ (root)`。
3. 等待部署完成後即可使用 `https://<user>.github.io/<repo>/`。
4. Actions 需有寫入權限（workflow 已設定 `contents: write`）。
