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

    @unittest.skipUnless(shutil.which("node"), "node 不存在")
    def test_js_syntax(self):
        subprocess.run(["node", "--check", str(ROOT / "assets/app.js")], check=True)

    def test_ics_feature(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "assets/app.js").read_text(encoding="utf-8")
        self.assertIn("export-ics", html)
        for key in ["export-ics", "VCALENDAR", "VEVENT", "VALARM", "calendar.google.com", "parseMonthDayToDate"]:
            self.assertIn(key, js)

    def test_html_wiring(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("./assets/app.js", html)
        self.assertIn("./assets/styles.css", html)
        self.assertIn("./public/data/gifts.json", (ROOT / "assets/app.js").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
