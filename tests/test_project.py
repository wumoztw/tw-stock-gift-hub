import json
import py_compile
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_FILES = [
    "index.html", "assets/styles.css", "assets/app.js", "scripts/update_gifts.py",
    ".github/workflows/daily-update.yml", "README.md",
]
REQUIRED_FIELDS = ["code", "name", "price", "cost_1_share", "history", "roi_pct",
                   "is_4yr_card_king", "is_3yr_card_king", "net_profit_yr1", "gift_2026"]


class ProjectTest(unittest.TestCase):
    def test_data(self):
        data = json.loads((ROOT / "public/data/gifts.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(data), 800)
        for rec in data:
            for field in REQUIRED_FIELDS:
                self.assertIn(field, rec)

    def test_files_exist(self):
        for rel in REQUIRED_FILES:
            self.assertTrue((ROOT / rel).is_file(), rel)

    def test_python_syntax(self):
        py_compile.compile(str(ROOT / "scripts/update_gifts.py"), doraise=True)

    def test_workflow_installs_bs4_and_script_compiles(self):
        wf = (ROOT / ".github/workflows/daily-update.yml").read_text(encoding="utf-8")
        self.assertIn("beautifulsoup4", wf)
        self.assertIn("'0 9 * * 5'", wf)
        self.assertIn("'0 9 * 3-5 1-4'", wf)
        subprocess.run(["python3", "-m", "py_compile", str(ROOT / "scripts/update_gifts.py")], check=True)

    @unittest.skipUnless(shutil.which("node"), "node 不存在")
    def test_js_syntax(self):
        subprocess.run(["node", "--check", str(ROOT / "assets/app.js")], check=True)

    def test_ics_feature(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "assets/app.js").read_text(encoding="utf-8")
        self.assertIn("export-ics", html)
        for key in ["export-ics", "VCALENDAR", "VEVENT", "VALARM", "calendar.google.com", "parseMonthDayToDate"]:
            self.assertIn(key, js)

    def test_north_pickup_and_checklist(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "assets/app.js").read_text(encoding="utf-8")
        for key in ["copy-checklist", "region-filter", "quick-filters"]:
            self.assertIn(key, html)
        for key in ["copy-checklist", "region-filter", "AGENT_LOCATIONS", "north_all", "taipei_station",
                    "isNorthPickup", "isNorthMeetingAndTaipeiAgent", "navigator.clipboard.writeText"]:
            self.assertIn(key, js)

    def test_egift_image_and_portfolio_matcher(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "assets/app.js").read_text(encoding="utf-8")
        for key in ["portfolio-input", "btn-match-portfolio", "btn-select-matched", "btn-clear-portfolio", "portfolio-matcher"]:
            self.assertIn(key, html)
        for key in ["egift", "isEGiftItem", "EGIFT_COMPANIES", "tbm=isch", "getGiftImageSearchUrl",
                    "tw_gift_portfolio_raw", "portfolio-input", "btn-match-portfolio"]:
            self.assertIn(key, js)
        if shutil.which("node"):
            subprocess.run(["node", "--check", str(ROOT / "assets/app.js")], check=True)

    def test_evoting_window_and_tdcc_links(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "assets/app.js").read_text(encoding="utf-8")
        self.assertIn("btn-tdcc-evote", html)
        self.assertIn("stockservices.tdcc.com.tw", html)
        for key in ["getEVotingWindow", "stockservices.tdcc.com.tw", "電投期間", "btn-evote", "電投:"]:
            self.assertIn(key, js)
        if shutil.which("node"):
            subprocess.run(["node", "--check", str(ROOT / "assets/app.js")], check=True)

    def test_collapsible_sticky_bar(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "assets/app.js").read_text(encoding="utf-8")
        css = (ROOT / "assets/styles.css").read_text(encoding="utf-8")
        self.assertIn("toggle-sticky-bar", html)
        for text in (html, js, css):
            self.assertIn("collapsed", text)
        self.assertIn("tw_gift_bar_collapsed", js)
        if shutil.which("node"):
            subprocess.run(["node", "--check", str(ROOT / "assets/app.js")], check=True)

    def test_mobile_rwd_sticky_pill(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        css = (ROOT / "assets/styles.css").read_text(encoding="utf-8")
        for i in ("sticky-pill", "pill-selected-count", "pill-profit", "pill-select-all", "expand-sticky-bar"):
            self.assertIn(i, html)
        self.assertIn("@media(max-width:640px)", css)
        self.assertIn("max-width:calc(100vw - 24px)", css)
        self.assertIn("overflow-x:hidden", css)
        self.assertIn("grid-template-columns:1fr 1fr", css)

    def test_hero_tdcc_alignment(self):
        css = (ROOT / "assets/styles.css").read_text(encoding="utf-8")
        self.assertRegex(css, r"\.hero\{[^}]*max-width:1200px")
        self.assertRegex(css, r"\.tdcc-links\{[^}]*justify-content:center")

    def test_beginner_guide_and_business_models(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        for i in ("beginner-guide", "btn-open-guide", "tab-intro", "tab-steps", "tab-pickup", "tab-rules", "tab-business",
                  "guide-tab", "guide-panel", "零股", "T+2", "家庭人頭矩陣", "代領", "禮券大宗收購", "Affiliate", "零股領紀念品手把手教學", "盤中零股", "補單", "議案表決",
                  "guide-timeline-wrap", "annual-timeline", "countdown-ruler", "D-62", "D-30", "D-3", "D-Day"):
            self.assertIn(i, html)
        if shutil.which("node"):
            subprocess.run(["node", "--check", str(ROOT / "assets/app.js")], check=True)

    def test_html_wiring(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("./assets/app.js", html)
        self.assertIn("./assets/styles.css", html)
        self.assertIn("./public/data/gifts.json", (ROOT / "assets/app.js").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
