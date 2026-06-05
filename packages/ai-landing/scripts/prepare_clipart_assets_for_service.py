#!/usr/bin/env python3
"""
Prepare ClipartKorea assets for landing-page-sales service ingestion.

This script DOES NOT change the existing ClipartKorea download scripts.
It uses the manifest files already produced by scripts/fetch_*_assets.py and creates
service-ready asset records for S3/RDS.

Recommended flow:
  1) User logs into ClipartKorea in debug Chrome.
  2) Existing semi-automatic downloader fetches images into assets/clipart/...
  3) This script scans clipart manifests and local files.
  4) Optional: upload files to S3.
  5) Output JSONL/CSV/SQL records for RDS image_assets table.

Examples:
  # Dry-run: create JSONL/CSV/SQL only
  python3 scripts/prepare_clipart_assets_for_service.py \
    --out dist/service-assets

  # Upload to S3 and create records with s3:// keys
  CLIPART_S3_BUCKET=landing-page-assets \
  python3 scripts/prepare_clipart_assets_for_service.py \
    --upload-s3 \
    --s3-prefix clipartkorea \
    --out dist/service-assets

Required for S3 upload:
  pip install boto3
  AWS credentials available through env/profile/role.

Notes:
  - RDS should store metadata only, not image binary.
  - S3 should store the actual image files.
  - Keep license/use-range notes in RDS for future audit.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import mimetypes
import os
import re
import sys
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[1]
CLIPART_ROOT = REPO / "assets" / "clipart"
DEFAULT_OUT = REPO / "dist" / "service-assets"

CHAPTER_TO_CATEGORY = {
    "04-food-cafe": "food_cafe",
    "05-real-estate": "realestate_space",
    "05-realestate-space": "realestate_space",
    "06-legal-professional": "professional_service",
    "06-professional-service": "professional_service",
    "07-startup-saas-it": "startup_saas_it",
    "08-shopping-brand": "shopping_brand",
    "09-wedding-event-studio": "wedding_event_studio",
    "10-living-local-services": "living_local_services",
    "11-fitness-hobby": "fitness_hobby",
}


@dataclass
class AssetRecord:
    id: str
    source: str
    provider_asset_code: str | None
    chapter: str
    category: str
    template_slug: str
    template_label: str | None
    tags: list[str]
    tone: str | None
    local_path: str
    s3_bucket: str | None
    s3_key: str | None
    public_url: str | None
    content_type: str | None
    bytes: int
    sha256: str
    license_note: str
    original_query: list[str]
    created_at: str


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9가-힣_-]+", "-", value)
    return value.strip("-") or "asset"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def find_manifests() -> list[Path]:
    if not CLIPART_ROOT.exists():
        return []
    return sorted(CLIPART_ROOT.glob("*-manifest.json"))


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_manifest_items(manifest: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    items = manifest.get("items") or {}
    if isinstance(items, dict):
        return list(items.items())
    raise ValueError("Unsupported manifest format: items must be an object")


def infer_chapter_and_slug(key: str, item: dict[str, Any], file_rel: str | None = None) -> tuple[str, str]:
    # Existing manifests usually use key like "04-food-cafe/dessert-shop-order".
    parts = key.split("/")
    if len(parts) >= 2:
        return parts[0], parts[1]
    if file_rel:
        fparts = file_rel.split(os.sep)
        if len(fparts) >= 2:
            return fparts[0], fparts[1]
    return "unknown", slugify(item.get("ko") or key)


def guess_tags(chapter: str, slug: str, label: str | None, query: list[str]) -> list[str]:
    raw = [chapter, slug, label or "", *query]
    tags: list[str] = []
    for text in raw:
        for token in re.split(r"[\s,/_-]+", text):
            token = token.strip().lower()
            if len(token) >= 2 and token not in tags:
                tags.append(token)
    return tags[:30]


def guess_tone(chapter: str, slug: str, query: list[str]) -> str | None:
    hay = " ".join([chapter, slug, *query])
    if any(k in hay for k in ["프리미엄", "파인다이닝", "와인", "럭셔리", "고급"]):
        return "premium"
    if any(k in hay for k in ["감성", "카페", "디저트", "브런치", "플라워"]):
        return "warm"
    if any(k in hay for k in ["병원", "전문", "세무", "법률", "부동산"]):
        return "trust"
    if any(k in hay for k in ["피트니스", "헬스", "댄스", "스포츠"]):
        return "energetic"
    if any(k in hay for k in ["saas", "ai", "it", "앱", "솔루션"]):
        return "clean_tech"
    return None


def s3_key_for(prefix: str, record_id: str, chapter: str, slug: str, file_path: Path) -> str:
    ext = file_path.suffix.lower() or ".jpg"
    return "/".join([
        prefix.strip("/"),
        slugify(chapter),
        slugify(slug),
        f"{record_id}{ext}",
    ])


def upload_to_s3(path: Path, bucket: str, key: str, public_read: bool = False) -> None:
    try:
        import boto3  # type: ignore
    except ImportError:
        raise RuntimeError("boto3 is required for --upload-s3. Install with: pip install boto3")

    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    extra = {"ContentType": content_type}
    if public_read:
        extra["ACL"] = "public-read"
    boto3.client("s3").upload_file(str(path), bucket, key, ExtraArgs=extra)


def collect_records(args: argparse.Namespace) -> list[AssetRecord]:
    manifests = find_manifests()
    if not manifests:
        raise RuntimeError(f"No manifest files found under {CLIPART_ROOT}")

    records: list[AssetRecord] = []
    seen_hashes: set[str] = set()
    now = time.strftime("%Y-%m-%dT%H:%M:%S%z")

    for manifest_path in manifests:
        manifest = load_json(manifest_path)
        for key, item in normalize_manifest_items(manifest):
            files = item.get("files") or []
            query = item.get("query") or []
            if isinstance(query, str):
                query = [query]
            label = item.get("ko")

            for file_item in files:
                file_rel = file_item.get("file") if isinstance(file_item, dict) else str(file_item)
                if not file_rel:
                    continue
                local_path = CLIPART_ROOT / file_rel
                if not local_path.exists() or local_path.stat().st_size < 1024:
                    print(f"skip missing/small file: {file_rel}", file=sys.stderr)
                    continue

                digest = sha256_file(local_path)
                if args.dedupe and digest in seen_hashes:
                    continue
                seen_hashes.add(digest)

                chapter, template_slug = infer_chapter_and_slug(key, item, file_rel)
                category = CHAPTER_TO_CATEGORY.get(chapter, slugify(chapter))
                record_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"clipartkorea:{digest}"))
                content_type = mimetypes.guess_type(local_path.name)[0] or "image/jpeg"
                s3_bucket = args.s3_bucket or None
                s3_key = s3_key_for(args.s3_prefix, record_id, chapter, template_slug, local_path) if s3_bucket else None
                public_url = None
                if s3_bucket and args.public_base_url:
                    public_url = f"{args.public_base_url.rstrip('/')}/{s3_key}"

                record = AssetRecord(
                    id=record_id,
                    source="clipartkorea",
                    provider_asset_code=(file_item.get("code") if isinstance(file_item, dict) else None),
                    chapter=chapter,
                    category=category,
                    template_slug=template_slug,
                    template_label=label,
                    tags=guess_tags(chapter, template_slug, label, query),
                    tone=guess_tone(chapter, template_slug, query),
                    local_path=str(local_path.relative_to(REPO)),
                    s3_bucket=s3_bucket,
                    s3_key=s3_key,
                    public_url=public_url,
                    content_type=content_type,
                    bytes=local_path.stat().st_size,
                    sha256=digest,
                    license_note=args.license_note,
                    original_query=query,
                    created_at=now,
                )

                if args.upload_s3:
                    if not s3_bucket or not s3_key:
                        raise RuntimeError("--upload-s3 requires --s3-bucket or CLIPART_S3_BUCKET")
                    upload_to_s3(local_path, s3_bucket, s3_key, public_read=args.public_read)

                records.append(record)

    return records


def write_outputs(records: list[AssetRecord], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    jsonl_path = out_dir / "image-assets.jsonl"
    with jsonl_path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(asdict(r), ensure_ascii=False) + "\n")

    csv_path = out_dir / "image-assets.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(asdict(records[0]).keys()) if records else [])
        if records:
            writer.writeheader()
            for r in records:
                row = asdict(r)
                row["tags"] = json.dumps(row["tags"], ensure_ascii=False)
                row["original_query"] = json.dumps(row["original_query"], ensure_ascii=False)
                writer.writerow(row)

    sql_path = out_dir / "image-assets.upsert.sql"
    with sql_path.open("w", encoding="utf-8") as f:
        f.write("-- Example PostgreSQL table for landing-page-sales RDS\n")
        f.write("""
CREATE TABLE IF NOT EXISTS image_assets (
  id uuid PRIMARY KEY,
  source text NOT NULL,
  provider_asset_code text,
  chapter text NOT NULL,
  category text NOT NULL,
  template_slug text NOT NULL,
  template_label text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  tone text,
  s3_bucket text,
  s3_key text,
  public_url text,
  content_type text,
  bytes integer NOT NULL,
  sha256 text NOT NULL UNIQUE,
  license_note text NOT NULL,
  original_query jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

""")
        for r in records:
            data = asdict(r)
            values = {
                "id": data["id"],
                "source": data["source"],
                "provider_asset_code": data["provider_asset_code"],
                "chapter": data["chapter"],
                "category": data["category"],
                "template_slug": data["template_slug"],
                "template_label": data["template_label"],
                "tags": json.dumps(data["tags"], ensure_ascii=False),
                "tone": data["tone"],
                "s3_bucket": data["s3_bucket"],
                "s3_key": data["s3_key"],
                "public_url": data["public_url"],
                "content_type": data["content_type"],
                "bytes": data["bytes"],
                "sha256": data["sha256"],
                "license_note": data["license_note"],
                "original_query": json.dumps(data["original_query"], ensure_ascii=False),
            }
            cols = ", ".join(values.keys())
            vals = ", ".join(sql_literal(v) for v in values.values())
            f.write(f"INSERT INTO image_assets ({cols}) VALUES ({vals}) ON CONFLICT (sha256) DO NOTHING;\n")

    summary_path = out_dir / "summary.md"
    by_category: dict[str, int] = {}
    by_template: dict[str, int] = {}
    for r in records:
        by_category[r.category] = by_category.get(r.category, 0) + 1
        by_template[f"{r.chapter}/{r.template_slug}"] = by_template.get(f"{r.chapter}/{r.template_slug}", 0) + 1

    with summary_path.open("w", encoding="utf-8") as f:
        f.write("# ClipartKorea Service Asset Export\n\n")
        f.write(f"- Total assets: {len(records)}\n")
        f.write(f"- Generated at: {time.strftime('%Y-%m-%d %H:%M:%S %z')}\n")
        f.write("\n## By category\n\n")
        for k, v in sorted(by_category.items()):
            f.write(f"- {k}: {v}\n")
        f.write("\n## By template\n\n")
        for k, v in sorted(by_template.items()):
            f.write(f"- {k}: {v}\n")


def sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--dedupe", action="store_true", default=True, help="dedupe by sha256")
    ap.add_argument("--no-dedupe", dest="dedupe", action="store_false")
    ap.add_argument("--upload-s3", action="store_true", help="upload image files to S3")
    ap.add_argument("--s3-bucket", default=os.environ.get("CLIPART_S3_BUCKET", ""))
    ap.add_argument("--s3-prefix", default="clipartkorea")
    ap.add_argument("--public-base-url", default=os.environ.get("CLIPART_PUBLIC_BASE_URL", ""))
    ap.add_argument("--public-read", action="store_true", help="set ACL public-read on upload")
    ap.add_argument(
        "--license-note",
        default="ClipartKorea paid account asset. Confirm allowed commercial/customer-delivery usage before production.",
    )
    args = ap.parse_args()

    records = collect_records(args)
    write_outputs(records, args.out)
    print(f"prepared {len(records)} asset records -> {args.out}")
    if args.upload_s3:
        print(f"uploaded to s3://{args.s3_bucket}/{args.s3_prefix.strip('/')}/")


if __name__ == "__main__":
    main()
