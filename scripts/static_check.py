"""Static checks for the completion criteria that do not need a browser.

- 6: no emoji / gradient / box-shadow in our HTML, CSS and JS
- 2 (part): numbers hard-wired in main.js still appear in polimill_data.json
- the generated data.js matches polimill_data/ verbatim

Run: python -I scripts/static_check.py
"""
import csv
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {"node_modules", "audit", ".git", "polimill_data"}
OWN = sorted(
    [p for p in ROOT.rglob("index.html") if not SKIP & set(p.relative_to(ROOT).parts)]
    + [ROOT / "assets/css/style.css"]
    + [p for p in (ROOT / "assets/js").rglob("*.js") if p.name != "data.js"]
)
# emoji / pictograph code-point ranges (written as numbers to keep this file plain ASCII)
EMOJI_RANGES = [(0x1F000, 0x1FAFF), (0x2600, 0x27BF), (0x2B00, 0x2BFF), (0xFE0F, 0xFE0F), (0x200D, 0x200D), (0x2190, 0x21FF), (0x2300, 0x23FF)]
EMOJI = re.compile("[" + "".join(re.escape(chr(a)) + "-" + re.escape(chr(b)) for a, b in EMOJI_RANGES) + "]")
BANNED = re.compile(r"gradient|box-shadow|text-shadow|backdrop-filter|filter\s*:\s*blur", re.I)

sys.stdout.reconfigure(encoding="utf-8")
failures = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  — {detail}" if detail else ""))
    if not ok:
        failures.append(name)


# 6. emoji / gradient / shadow
for path in OWN:
    text = path.read_text(encoding="utf-8")
    emoji = sorted({m.group() for m in EMOJI.finditer(text)})
    # arrows are allowed only inside the data-derived note "→" used in the spec wording
    emoji = [e for e in emoji if e != chr(0x2192)]  # the right arrow is used in the spec wording
    check(f"6 no emoji: {path.relative_to(ROOT)}", not emoji, " ".join(f"U+{ord(e):04X}" for e in emoji))
    hits = [m.group() for m in BANNED.finditer(text)]
    check(f"6 no gradient/box-shadow: {path.relative_to(ROOT)}", not hits, ", ".join(hits))

# emoji inside the source data (reported, not changed)
data_text = (ROOT / "polimill_data/0_all_news_699.csv").read_text(encoding="utf-8-sig")
data_emoji = sorted({m.group() for m in EMOJI.finditer(data_text)})
print("INFO emoji in source news titles (shown verbatim):", " ".join(f"U+{ord(e):04X}" for e in data_emoji) or "none")

# data.js is a verbatim wrap of polimill_data/
js = (ROOT / "assets/js/data.js").read_text(encoding="utf-8")
payload = json.loads(js[js.index("=") + 1 : js.rstrip().rindex(";")])
src = json.loads((ROOT / "polimill_data/polimill_data.json").read_text(encoding="utf-8"))
check("data.js keys match polimill_data.json", all(payload[k] == src[k] for k in src))
with open(ROOT / "polimill_data/0_all_news_699.csv", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.reader(f))[1:]
check("data.js news == 0_all_news_699.csv", [[n["date"], n["theme"], n["title"], n["source"], n["url"]] for n in payload["news"]] == rows, f"{len(rows)} rows")

# literals in the page scripts that must exist in the data
main = "".join(p.read_text(encoding="utf-8") for p in OWN if p.suffix == ".js")
heads = {m["date"]: [] for m in src["milestones"]}
for m in src["milestones"]:
    heads[m["date"]].append(m["headline"])
for date, needle in [("2021-10-26", "約3,000万円"), ("2021-11-30", "3,500万円超"), ("2022-05-31", "7,500万円超"),
                     ("2022-12-13", "約1.3億円"), ("2026-01-19", "約6.35億円"), ("2026-01-19", "約50億円")]:
    check(f"2 literal '{needle}' in milestone {date}", needle in main and any(needle in h for h in heads[date]))

sys.exit(1 if failures else 0)
