#!/usr/bin/env python3
"""
ClipartKorea authenticated reference-image downloader for landing template folders (sign/web composite-edit category).
Uses public search/fileInfo endpoints, then asks the already-logged-in Chrome tab
(via CDP) to mint encrypted download payloads. The final CDN download works
without cookies once the payload is minted.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import html
import json
import mimetypes
import os
import re
import sys
import time
import urllib.parse
from dataclasses import dataclass
from pathlib import Path

import requests
import urllib3
import websocket

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE = "https://www.clipartkorea.co.kr"
SEARCH_URL = f"{BASE}/search"
ASSETS = (Path(__file__).resolve().parents[1] / "assets")
ROOT = (Path(__file__).resolve().parents[1] / "assets" / "clipart" / "reference")
PLAN_PATH = ASSETS / "asset-download-plan.json"
MANIFEST_PATH = ROOT / "reference-clipart-assets-manifest.json"
CDP_HTTP = "http://127.0.0.1:18800"
EXCLUDE_KEYWORDS = {
    "셀카", "초상", "클로즈업", "얼굴표정", "눈맞춤",
}
PEOPLE_KEYWORDS = {"사람", "남자", "여자", "어른", "아이", "어린이", "청년", "중년", "노인", "모델", "의사", "환자", "직업인"}
PREFER_NO_PEOPLE = PEOPLE_KEYWORDS
FOREIGN_PERSON_MARKERS = {
    "해외포토", "해외프리미엄콜렉션", "백인", "흑인", "아프리카", "남아프리카공화국", "외국인",
    "코카서스인", "유럽", "미국", "일본", "중국", "동남아", "라틴", "히스패닉"
}
KOREAN_MARKERS = {"한국", "한국인", "대한민국", "동양인", "국내포토"}
SUFFIXES = [
    "랜딩페이지", "상세 랜딩페이지", "상세", "상담 페이지", "예약 페이지", "소개 페이지", "이벤트 페이지",
    "신청 페이지", "문의 페이지", "안내 페이지", "모집 페이지", "판매 페이지", "브랜드 페이지",
    "브랜딩 페이지", "수강신청 페이지", "수강생 모집 페이지", "사전예약 페이지", "런칭 페이지",
    "페이지", "랜딩", "상담", "예약", "소개", "신청", "문의", "안내", "모집", "판매",
]


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9가-힣_-]+", "-", s.lower()).strip("-")


def ko_query(label: str) -> str:
    q = label
    for suf in SUFFIXES:
        q = q.replace(suf, "")
    q = q.replace("/", " ").strip()
    return q


def query_variants(label: str, english: str | None = None) -> list[str]:
    """Start broad in Korean; ClipartKorea often returns zero for long natural-language queries."""
    base = ko_query(label)
    out: list[str] = []
    for q in [base, base.replace(" ", ""), *(w for w in base.split() if len(w) >= 2)]:
        if q and q not in out:
            out.append(q)
    # A few intent-preserving Korean helpers; still broad enough for this search engine.
    if any(w in base for w in ["병원", "의원", "센터", "클리닉", "치과", "한의원", "안과", "산부인과"]):
        out.extend([f"{base} 병원", f"{base} 의료", "병원 인테리어"])
    if any(w in base for w in ["카페", "레스토랑", "베이커리", "샵", "스파", "공방", "스튜디오", "헬스장"]):
        out.extend([f"{base} 매장", f"{base} 인테리어"])
    if english:
        out.append(english)
    dedup = []
    for q in out:
        if q and q not in dedup:
            dedup.append(q)
    return dedup


class CDP:
    def __init__(self, cdp_http: str = CDP_HTTP):
        tabs = requests.get(f"{cdp_http}/json/list", timeout=5).json()
        tab = next((t for t in tabs if "clipartkorea.co.kr" in t.get("url", "")), None)
        if not tab:
            raise RuntimeError("ClipartKorea tab not found in OpenClaw Chrome. Open the site and log in first.")
        # Chrome 111+ rejects arbitrary WebSocket Origin headers unless explicitly allowed.
        # websocket-client can omit Origin, matching how DevTools-compatible clients connect.
        self.ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=20, suppress_origin=True)
        self.i = 0
        self.call("Runtime.enable")

    def call(self, method: str, params: dict | None = None, timeout: int = 60):
        self.i += 1
        msg_id = self.i
        self.ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        deadline = time.time() + timeout
        while time.time() < deadline:
            raw = self.ws.recv()
            data = json.loads(raw)
            if data.get("id") == msg_id:
                if "error" in data:
                    raise RuntimeError(data["error"])
                return data.get("result", {})
        raise TimeoutError(method)

    def eval(self, js: str, timeout: int = 120):
        res = self.call("Runtime.evaluate", {
            "expression": js,
            "awaitPromise": True,
            "returnByValue": True,
            "userGesture": True,
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
        self.refresh_csrf("병원")

    def refresh_csrf(self, keyword: str):
        params = {"keyword": keyword, "menu": "m", "sort": "3", "cate": "sign,web"}
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
            "Referer": f"{SEARCH_URL}?" + urllib.parse.urlencode({"keyword": referer_keyword, "menu": "m", "sort": "3", "cate": "sign,web"}),
            "User-Agent": "Mozilla/5.0",
        }

    def search(self, keyword: str, page: int = 1, per: int = 100):
        data_param = urllib.parse.urlencode({
            "keyword": keyword,
            "menu": "m",
            "sort": "3",
            "cate": "sign,web",
            "per": str(per),
            "ad": "off",
            "view": "vr",
            "page": str(page),
        })
        r = self.s.post(f"{BASE}/api/search/membership", headers=self.headers(keyword), data={
            "pageG": 1,
            "popstate": "",
            "direction": "init" if page == 1 else "next",
            "search_rp": "",
            "data": data_param,
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
        r = self.s.post(f"{BASE}/api/search/fileInfo", headers=self.headers(code), data={"pContCode": code, "pFreeYn": "N"}, timeout=25)
        if r.status_code in (419, 403):
            self.refresh_csrf(code)
            return self.file_info(code)
        r.raise_for_status()
        j = r.json()
        return j.get("list", []) if j.get("result") == "success" else []


def choose_file(files: list[dict]) -> dict | None:
    if not files:
        return None
    # Prefer web JPG: usually enough for landing-page templates and avoids huge originals.
    def rank(f):
        name = (f.get("fileName") or "") + " " + (f.get("sizeName") or "")
        ext = (f.get("fileExt") or "").lower()
        web = "WEB" in name.upper() or "web" in name
        if ext not in {"jpg", "jpeg"}:
            return (9, 9, f.get("fileSeq", 10**12))
        return (0 if web else 1, 0, f.get("fileSeq", 10**12))
    jpgs = [f for f in files if (f.get("fileExt") or "").lower() in {"jpg", "jpeg"}]
    return sorted(jpgs, key=rank)[0] if jpgs else None


def item_score(item: dict) -> int:
    kws = set(item.get("standardKeyword") or [])
    s = 0
    has_people = bool(kws & PEOPLE_KEYWORDS)
    # User preference: if faces/people appear, use Korean/domestic-looking assets, not foreign stock.
    if has_people and (kws & FOREIGN_PERSON_MARKERS):
        return -10_000
    if kws & EXCLUDE_KEYWORDS:
        s -= 100
    if has_people:
        s -= 10
        if kws & KOREAN_MARKERS or item.get("contType") == "krpho":
            s += 35
    w, h = item.get("width") or 0, item.get("height") or 0
    if w >= h:
        s += 3
    if w >= 1000 and h >= 700:
        s += 2
    if item.get("isAdult") or item.get("isBeauty"):
        s -= 50
    return s


def existing_count(folder: Path) -> int:
    return sum(1 for p in folder.glob("*") if p.suffix.lower() in {".jpg", ".jpeg"} and p.stat().st_size > 1024)


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
        r = requests.post(row["url"], data={"data": row["payload"]}, headers={"Referer": BASE + "/", "User-Agent": "Mozilla/5.0"}, verify=False, timeout=60)
        if r.status_code != 200 or len(r.content) < 1024 or r.content[:1] == b"<":
            return False, f"bad response {r.status_code} {r.headers.get('content-type')} {r.text[:120]}", len(r.content)
        cd = r.headers.get("content-disposition") or ""
        m = re.search(r"filename\*?=(?:UTF-8''|\")?([^\";]+)", cd)
        if m:
            name = urllib.parse.unquote(m.group(1).strip('"'))
            ext = Path(name).suffix.lower()
        else:
            ext = mimetypes.guess_extension(r.headers.get("content-type", "")) or ".jpg"
        dest = dest.with_suffix(".jpg")
        tmp = dest.with_suffix(dest.suffix + ".part")
        tmp.write_bytes(r.content)
        tmp.replace(dest)
        return True, str(dest), len(r.content)
    except Exception as e:
        return False, str(e), 0


def load_targets():
    plan = json.loads(PLAN_PATH.read_text())
    for chapter, items in plan["chapters"].items():
        for item in items:
            yield chapter, item


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=100)
    ap.add_argument("--max-folders", type=int, default=0, help="0 = all")
    ap.add_argument("--batch", type=int, default=10)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    ROOT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST_PATH.read_text()) if MANIFEST_PATH.exists() else {"root": str(ROOT), "items": {}, "updated_at": None}

    ck = CKSession()
    cdp = CDP()
    try:
        folders_done = 0
        for chapter, item in load_targets():
            if args.max_folders and folders_done >= args.max_folders:
                break
            slug = item["slug"]
            folder = ROOT / chapter / slug
            folder.mkdir(parents=True, exist_ok=True)
            have = existing_count(folder)
            key = f"{chapter}/{slug}"
            manifest["items"].setdefault(key, {"ko": item["ko"], "query": None, "files": []})
            print(f"\n[{key}] have {have}/{args.target}", flush=True)
            if have >= args.target:
                folders_done += 1
                continue

            queries = query_variants(item["ko"], item.get("query"))
            seen_codes = {p.stem.split('_')[0] for p in folder.glob("*")}
            pending = []
            page = 1
            qi = 0
            while have + len(pending) < args.target and qi < len(queries):
                q = queries[qi]
                print(f"  search: {q}", flush=True)
                while have + len(pending) < args.target and page <= 12:
                    res = ck.search(q, page=page, per=100)
                    imgs = res.get("imgList") or []
                    if not imgs:
                        break
                    imgs = sorted(imgs, key=item_score, reverse=True)
                    for img in imgs:
                        code = img.get("contCode")
                        if not code or code in seen_codes:
                            continue
                        if img.get("isAdult"):
                            continue
                        if item_score(img) <= -10_000:
                            continue
                        files = ck.file_info(code)
                        f = choose_file(files)
                        if not f:
                            continue
                        ext = "jpg"
                        dest = folder / f"{code}_{f.get('fileSeq')}.jpg"
                        pending.append({
                            "code": code,
                            "file_seq": f.get("fileSeq"),
                            "cont_seq": f.get("contSeq") or img.get("id"),
                            "file_ext": f.get("fileExt") or ext,
                            "cont_group": f.get("contGroup") or img.get("contGroup") or "photo",
                            "keyword": q,
                            "dest": str(dest),
                            "preview": img.get("previewUrl"),
                            "thumb": img.get("thumbnailUrl"),
                        })
                        seen_codes.add(code)
                        if have + len(pending) >= args.target:
                            break
                    print(f"    page {page}: queued {len(pending)}", flush=True)
                    page += 1
                qi += 1
                page = 1

            while pending and have < args.target:
                batch = pending[:args.batch]
                pending = pending[args.batch:]
                minted = mint_payloads(cdp, batch)
                minted = [m for m in minted if m.get("ok")]
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
                            manifest["items"][key]["files"].append({"file": rel, "code": row["code"], "bytes": size, "source": "clipartkorea"})
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
            folders_done += 1
    finally:
        cdp.close()


if __name__ == "__main__":
    main()
