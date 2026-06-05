#!/usr/bin/env python3
"""
ClipartKorea authenticated downloader for the 07-startup-saas-it asset pool.

Same mechanism as reference-images/clipart/reference_clipart_downloader.py:
uses the public search/fileInfo endpoints, then asks an already-logged-in
Chrome tab (via CDP on 127.0.0.1:18800) to mint encrypted download payloads.
The CDN download then works without cookies.

Differences from the reference downloader:
  * Writes into assets/clipart/<chapter>/<slug>/ (the real build pool).
  * Reads explicit per-item "queries" lists from assets/asset-download-plan.json.
  * Keeps a dedicated manifest so the main clipart manifest is untouched.

Setup (user): launch a debug Chrome and log into clipartkorea, e.g.
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\
    --remote-debugging-port=18800 \\
    --user-data-dir="$HOME/.chrome-clipart-debug" \\
    "https://www.clipartkorea.co.kr"

Usage:
  python3 scripts/fetch_startup_it_assets.py --target 40
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import mimetypes
import os
import re
import time
import urllib.parse
from pathlib import Path

import requests
import urllib3
import websocket

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE = "https://www.clipartkorea.co.kr"
SEARCH_URL = f"{BASE}/search"
CATE = "photo"                                  # photos only (not handbill/web design templates)
REPO = Path(__file__).resolve().parents[1]
ASSETS = REPO / "assets"
ROOT = ASSETS / "clipart"                       # real build pool
PLAN_PATH = ASSETS / "asset-download-plan.json"
MANIFEST_PATH = ROOT / "07-startup-saas-it-manifest.json"
CDP_HTTP = "http://127.0.0.1:18800"

EXCLUDE_KEYWORDS = {"셀카", "초상", "클로즈업", "얼굴표정", "눈맞춤"}
PEOPLE_KEYWORDS = {"사람", "남자", "여자", "어른", "아이", "어린이", "청년", "중년", "노인", "모델"}
FOREIGN_PERSON_MARKERS = {
    "해외포토", "해외프리미엄콜렉션", "백인", "흑인", "외국인",
    "코카서스인", "유럽", "미국", "라틴", "히스패닉",
}
KOREAN_MARKERS = {"한국", "한국인", "대한민국", "동양인", "국내포토"}


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9가-힣_-]+", "-", s.lower()).strip("-")


class CDP:
    def __init__(self, cdp_http: str = CDP_HTTP):
        tabs = requests.get(f"{cdp_http}/json/list", timeout=5).json()
        tab = next((t for t in tabs if "clipartkorea.co.kr" in t.get("url", "")), None)
        if not tab:
            raise RuntimeError(
                "ClipartKorea tab not found. Launch Chrome with "
                "--remote-debugging-port=18800 and log into clipartkorea first."
            )
        self.ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=20, suppress_origin=True)
        self.i = 0
        self.call("Runtime.enable")

    def call(self, method: str, params: dict | None = None, timeout: int = 60):
        self.i += 1
        msg_id = self.i
        self.ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        deadline = time.time() + timeout
        while time.time() < deadline:
            data = json.loads(self.ws.recv())
            if data.get("id") == msg_id:
                if "error" in data:
                    raise RuntimeError(data["error"])
                return data.get("result", {})
        raise TimeoutError(method)

    def eval(self, js: str, timeout: int = 120):
        res = self.call("Runtime.evaluate", {
            "expression": js, "awaitPromise": True,
            "returnByValue": True, "userGesture": True,
        }, timeout=timeout)
        if "exceptionDetails" in res:
            raise RuntimeError(res["exceptionDetails"])
        return res.get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass


class CKSession:
    def __init__(self):
        self.s = requests.Session()
        self.s.verify = False
        self.csrf = None
        self.refresh_csrf("스타트업")

    def refresh_csrf(self, keyword: str):
        params = {"keyword": keyword, "menu": "m", "sort": "3", "cate": CATE}
        r = self.s.get(SEARCH_URL, params=params, timeout=25)
        r.raise_for_status()
        m = re.search(r'name="csrf-token"[^>]+content="([^"]+)"', r.text)
        if not m:
            raise RuntimeError("Could not find CSRF token")
        self.csrf = m.group(1)

    def headers(self, referer_keyword: str):
        return {
            "X-CSRF-TOKEN": self.csrf,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"{SEARCH_URL}?" + urllib.parse.urlencode(
                {"keyword": referer_keyword, "menu": "m", "sort": "3", "cate": CATE}),
            "User-Agent": "Mozilla/5.0",
        }

    def search(self, keyword: str, page: int = 1, per: int = 100):
        data_param = urllib.parse.urlencode({
            "keyword": keyword, "menu": "m", "sort": "3", "cate": CATE,
            "per": str(per), "ad": "off", "view": "vr", "page": str(page),
        })
        r = self.s.post(f"{BASE}/api/search/membership", headers=self.headers(keyword), data={
            "pageG": 1, "popstate": "", "direction": "init" if page == 1 else "next",
            "search_rp": "", "data": data_param,
        }, timeout=40)
        if r.status_code in (419, 403):
            self.refresh_csrf(keyword)
            return self.search(keyword, page, per)
        r.raise_for_status()
        j = r.json()
        if j.get("result") != "success":
            raise RuntimeError(j)
        return j

    def file_info(self, code: str):
        r = self.s.post(f"{BASE}/api/search/fileInfo", headers=self.headers(code),
                        data={"pContCode": code, "pFreeYn": "N"}, timeout=25)
        if r.status_code in (419, 403):
            self.refresh_csrf(code)
            return self.file_info(code)
        r.raise_for_status()
        j = r.json()
        return j.get("list", []) if j.get("result") == "success" else []


def choose_file(files: list[dict]) -> dict | None:
    jpgs = [f for f in files if (f.get("fileExt") or "").lower() in {"jpg", "jpeg"}]
    if not jpgs:
        return None

    def rank(f):
        name = ((f.get("fileName") or "") + " " + (f.get("sizeName") or "")).upper()
        web = "WEB" in name
        return (0 if web else 1, f.get("fileSeq", 10 ** 12))

    return sorted(jpgs, key=rank)[0]


def item_score(item: dict) -> int:
    kws = set(item.get("standardKeyword") or [])
    s = 0
    has_people = bool(kws & PEOPLE_KEYWORDS)
    if has_people and (kws & FOREIGN_PERSON_MARKERS):
        return -10_000
    if kws & EXCLUDE_KEYWORDS:
        s -= 100
    if has_people:
        s -= 8                          # food/space shots preferred, but people OK
        if kws & KOREAN_MARKERS or item.get("contType") == "krpho":
            s += 25
    w, h = item.get("width") or 0, item.get("height") or 0
    if w >= h:
        s += 4                          # landscape favored for hero/cards
    if w >= 1200 and h >= 800:
        s += 3
    if item.get("isAdult"):
        s -= 500
    return s


def existing_count(folder: Path) -> int:
    return sum(1 for p in folder.glob("*")
               if p.suffix.lower() in {".jpg", ".jpeg"} and p.stat().st_size > 1024)


def mint_payloads(cdp: CDP, jobs: list[dict]) -> list[dict]:
    js_jobs = json.dumps(jobs, ensure_ascii=False)
    js = f"""
(async () => {{
  const jobs = {js_jobs};
  const out = [];
  for (const j of jobs) {{
    const init = JSON.stringify({{
      file_seq: String(j.file_seq), cont_seq: String(j.cont_seq), file_ext: j.file_ext,
      cont_group: j.cont_group, free_yn: 'N', down_keyword: j.keyword || ''
    }});
    try {{
      const r = await fetch('/download/fileDownload', {{method:'POST', headers:{{'Content-Type':'application/x-www-form-urlencoded'}}, body:new URLSearchParams({{data:init}})}});
      const text = await r.text();
      const m = text.match(/jsFncCreateCutDownIframe\\('(.+)', '([^']+)'\\)/);
      out.push(Object.assign({{}}, j, {{ok: !!m, payload: m && m[1], url: m && m[2], status: r.status, err: !m ? text.slice(0,300) : ''}}));
    }} catch(e) {{ out.push(Object.assign({{}}, j, {{ok:false, err:String(e)}})); }}
    await new Promise(r => setTimeout(r, 120));
  }}
  return out;
}})()
"""
    return cdp.eval(js, timeout=max(120, len(jobs) * 8))


def download_payload(row: dict) -> tuple[bool, str, int]:
    dest = Path(row["dest"])
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        r = requests.post(row["url"], data={"data": row["payload"]},
                          headers={"Referer": BASE + "/", "User-Agent": "Mozilla/5.0"},
                          verify=False, timeout=60)
        if r.status_code != 200 or len(r.content) < 1024 or r.content[:1] == b"<":
            return False, f"bad response {r.status_code} {r.text[:120]}", len(r.content)
        dest = dest.with_suffix(".jpg")
        tmp = dest.with_suffix(".part")
        tmp.write_bytes(r.content)
        tmp.replace(dest)
        return True, str(dest), len(r.content)
    except Exception as e:
        return False, str(e), 0


def queries_for(item: dict) -> list[str]:
    qs = list(item.get("queries") or [])
    if not qs and item.get("ko"):
        qs = [item["ko"]]
    out = []
    for q in qs:
        if q and q not in out:
            out.append(q)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=40, help="images per niche")
    ap.add_argument("--only", default="", help="comma-separated slugs to limit to")
    ap.add_argument("--batch", type=int, default=10)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    only = {s.strip() for s in args.only.split(",") if s.strip()}
    plan = json.loads(PLAN_PATH.read_text())
    manifest = json.loads(MANIFEST_PATH.read_text()) if MANIFEST_PATH.exists() else {
        "root": str(ROOT), "items": {}, "updated_at": None}

    ck = CKSession()
    cdp = CDP()
    try:
        for chapter, items in plan["chapters"].items():
            if chapter != "07-startup-saas-it":
                continue
            for item in items:
                slug = item["slug"]
                if only and slug not in only:
                    continue
                folder = ROOT / chapter / slug
                folder.mkdir(parents=True, exist_ok=True)
                have = existing_count(folder)
                key = f"{chapter}/{slug}"
                manifest["items"].setdefault(key, {"ko": item.get("ko"), "query": None, "files": []})
                print(f"\n[{key}] have {have}/{args.target}", flush=True)
                if have >= args.target:
                    continue

                queries = queries_for(item)
                seen_codes = {p.stem.split('_')[0] for p in folder.glob("*")}
                pending = []
                # over-collect candidates across ALL queries so mint failures (some clipartkorea
                # results won't mint) fall back to other queries instead of starving the niche.
                cap = args.target * 3
                for q in queries:
                    if have + len(pending) >= cap:
                        break
                    print(f"  search: {q}", flush=True)
                    page = 1
                    while have + len(pending) < cap and page <= 8:
                        res = ck.search(q, page=page, per=100)
                        imgs = res.get("imgList") or []
                        if not imgs:
                            break
                        for img in sorted(imgs, key=item_score, reverse=True):
                            code = img.get("contCode")
                            if not code or code in seen_codes or img.get("isAdult"):
                                continue
                            if item_score(img) <= -10_000:
                                continue
                            f = choose_file(ck.file_info(code))
                            if not f:
                                continue
                            pending.append({
                                "code": code,
                                "file_seq": f.get("fileSeq"),
                                "cont_seq": f.get("contSeq") or img.get("id"),
                                "file_ext": f.get("fileExt") or "jpg",
                                "cont_group": f.get("contGroup") or img.get("contGroup") or "photo",
                                "keyword": q,
                                "dest": str(folder / f"{code}_{f.get('fileSeq')}.jpg"),
                            })
                            seen_codes.add(code)
                            if have + len(pending) >= cap:
                                break
                        print(f"    page {page}: queued {len(pending)}", flush=True)
                        page += 1

                while pending and have < args.target:
                    batch, pending = pending[:args.batch], pending[args.batch:]
                    minted = [m for m in mint_payloads(cdp, batch) if m.get("ok")]
                    if not minted:
                        print("  no minted downloads in batch", flush=True)
                        continue
                    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
                        futs = [ex.submit(download_payload, m) for m in minted]
                        for row, fut in zip(minted, futs):
                            ok, msg, size = fut.result()
                            if ok:
                                have += 1
                                rel = os.path.relpath(msg, ROOT)
                                manifest["items"][key]["files"].append(
                                    {"file": rel, "code": row["code"], "bytes": size, "source": "clipartkorea"})
                                print(f"    saved {have}/{args.target}: {Path(msg).name} ({size//1024}KB)", flush=True)
                            else:
                                print(f"    fail {row.get('code')}: {msg}", flush=True)
                            if have >= args.target:
                                break
                    manifest["items"][key]["count"] = have
                    manifest["items"][key]["query"] = queries
                    manifest["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
                    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
                    time.sleep(0.8)
    finally:
        cdp.close()


if __name__ == "__main__":
    main()
