# 클립아트 이미지 파이프라인 (랜딩 제작용 소재)

ClipartKorea(대행제작 상업 라이선스 보유)에서 랜딩 제작에 쓸 이미지를 **반자동 수집 → 비공개 S3 + RDS 메타데이터**로 서비스화한다.

> 라이선스: 대행제작용 상업 라이선스로 구매(손님 의뢰 랜딩 사용 정당). 카탈로그 통째 스크래핑은 하지 않고 **plan 기반 타겟 수집**만 한다.

## 방식 — CDP 세션 재사용 (자격증명 스크립트화 X)

스크립트가 직접 로그인하지 않는다. **사용자가 디버그 Chrome에 수동 로그인**하면, 스크립트가 그 탭에 CDP(포트 18800)로 붙어 다운로드 페이로드를 mint → CDN에서 받는다.

```bash
# 1) 디버그 Chrome 띄우고 clipartkorea 로그인
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=18800 \
  --user-data-dir="$HOME/.chrome-clipart-debug" \
  "https://www.clipartkorea.co.kr"

# 2) 의존성 설치 (최초 1회)
python3 -m pip install -r requirements-clipart.txt
```

## 파일

| 파일 | 역할 |
|---|---|
| `clipart_downloader.py` | 메인 다운로더 (plan 기반) |
| `fetch_<카테고리>_assets.py` | 카테고리별 다운로더 (food_cafe, fitness_hobby, shopping_brand, startup_it, living_local, wedding_event) |
| `reference_clipart_downloader.py` | 참고용(sign/web 합성편집 카테고리) |
| `prepare_clipart_assets_for_service.py` | 다운로드 결과 → sha256 dedupe·태그·**S3 업로드**·RDS `image_assets` 레코드(JSONL/CSV/SQL) |
| `assets/asset-download-plan.json` | 카테고리·키워드 수집 계획 |

경로: 모든 스크립트는 `packages/ai-landing/assets/clipart/` 아래에 쓴다(레포 기준 상대경로로 적응됨).

## 흐름

```
디버그 Chrome 로그인
   └─ fetch_*_assets.py / clipart_downloader.py  → assets/clipart/<chapter>/<slug>/ + manifest
        └─ prepare_clipart_assets_for_service.py → (S3 업로드) + image_assets 레코드
             └─ [TODO] S3 버킷(Terraform) + Prisma image_assets 모델/마이그레이션 연결
```

## 남은 연결 작업 (이 레포 라이브 인프라에)
- [ ] `infra/`에 **S3 버킷(비공개)** Terraform 추가 — 저장은 S3 결정(R2는 S3호환이라 추후 이전 가능)
- [ ] Prisma `image_assets` 모델 + 마이그레이션 (스크립트의 standalone SQL 대신)
- [ ] (서빙 필요 시) CloudFront — `--public-read` ACL 대신 비공개 버킷 + CDN
- [ ] 다운로드 횟수/약관 재확인(타겟 수집 유지)
