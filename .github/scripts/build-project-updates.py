#!/usr/bin/env python3
"""Create a free, verifiable project progress snapshot for the public dashboard."""
import json
import os
import pathlib
import urllib.request
import datetime

OUT = pathlib.Path("website/project-updates.json")
REPOS = [
    ("alfaauliau-katarinaAI/Katarina-AI", "Riset KATARINA"),
    ("alfaauliau-katarinaAI/Katarina-web", "Website KATARINA"),
]

def headline(message, category):
    s = message.splitlines()[0].lower()
    if any(x in s for x in ("55-pair", "55-market", "55 mt5", "55 broker", "55-instrument")):
        return "Strategi diuji pada 55 instrumen pasar"
    if any(x in s for x in ("decision brain", "market decision", "advisor")):
        return "KATARINA mengembangkan cara membaca kondisi pasar"
    if any(x in s for x in ("chart", "h4", "candle", "forecast")):
        return "Peta harga dan grafik H4 diperbarui"
    if any(x in s for x in ("news", "berita", "headline", "language", "translate")):
        return "Berita dan pilihan bahasa disempurnakan"
    if "journal" in s or "jurnal" in s:
        return "Jurnal dan catatan pengujian diperbarui"
    if any(x in s for x in ("risk", "drawdown", "strategy")):
        return "Pengelolaan risiko dan pengujian strategi ditinjau"
    if any(x in s for x in ("research", "analisa", "analysis", "scenario")):
        return "Fitur riset dan analisa pasar dikembangkan"
    return "Perbaikan website KATARINA" if category == "Website KATARINA" else "Pengembangan riset KATARINA"

def fetch(repo, category):
    url = "https://api.github.com/repos/" + repo + "/commits?per_page=10"
    token = os.getenv("GH_PUBLIC_TOKEN", "")
    h = {"Accept": "application/vnd.github+json", "User-Agent": "Katarina-Public-Website"}
    if token:
        h["Authorization"] = "Bearer " + token
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=15) as response:
        commits = json.load(response)
    rows = []
    for entry in commits:
        data = entry.get("commit", {})
        date = data.get("committer", {}).get("date", "")
        link = entry.get("html_url", "")
        if not date or not link.startswith("https://github.com/"):
            continue
        rows.append({"category": category, "title": headline(data.get("message", ""), category), "date": date, "link": link})
    return rows

rows = []
for repository, category in REPOS:
    try:
        rows.extend(fetch(repository, category))
    except Exception as e:
        print("Public GitHub activity temporarily unavailable:", category, type(e).__name__)
rows.sort(key=lambda x: x["date"], reverse=True)
seen = set()
unique = []
for row in rows:
    key = (row["category"], row["title"])
    if key not in seen:
        seen.add(key)
        unique.append(row)
    if len(unique) == 6:
        break
if unique:
    OUT.write_text(json.dumps({"schema": 1, "status": "ready", "items": unique, "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "source": "Public GitHub commits"}, ensure_ascii=False), encoding="utf-8")
    print("Project update cards published:", len(unique))
else:
    print("Keeping existing checked-in public project activity snapshot.")
