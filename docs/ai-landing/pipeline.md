# AI Landing Generation Pipeline

`landing-templates`의 에이전트 규칙, 훅 아이디어, 품질 스크립트를 `landing-page-sales` 서비스용 파이프라인으로 이식한 초안입니다.

목표는 사용자가 서비스에서 “랜딩페이지 만들기”를 눌렀을 때 아래 흐름으로 HTML 랜딩페이지를 생성하는 것입니다.

```text
사용자 요청
→ API `/api/ai-landing/generate`
→ 템플릿/업종/이미지 메타데이터 전달
→ Claude API로 HTML/CSS/JS 생성
→ score_landing.py 정적 검수
→ 선택적으로 check_fold.mjs fold 검수
→ 실패 시 Claude repair loop
→ 생성 파일 저장
→ preview/배포 단계로 연결
```

---

## 들어간 것

### 패키지

```text
packages/ai-landing/
  src/
    anthropic.ts      # Claude API 호출
    pipeline.ts       # 생성 → 검수 → repair loop
    prompts.ts        # CLAUDE.md/agent 규칙을 프롬프트로 변환
    quality.ts        # score/check_fold 실행
    stub.ts           # API 키 없이 dry-run 생성
    cli.ts            # 로컬 테스트 CLI
  rules/
    landing-quality-rules.md
  agents/
    visual-qa.md
  scripts/
    score_landing.py
    check_fold.mjs
    shoot_one.mjs
    prepare_clipart_assets_for_service.py
    inject_build_rules.py
    score_gate.py
```

### API 라우트

```text
POST /api/ai-landing/generate
POST /api/ai-landing/dry-run
```

`dry-run`은 Claude API 키 없이도 생성/검수 흐름을 확인할 수 있습니다.

---

## 환경변수

API 서버에서 선택적으로 사용합니다.

```bash
ANTHROPIC_API_KEY=...
# 또는
CLAUDE_API_KEY=...

CLAUDE_MODEL=claude-sonnet-4-6
AI_LANDING_OUTPUT_DIR=/absolute/path/to/generated/ai-landings
```

`AI_LANDING_OUTPUT_DIR`를 지정하지 않으면 실행 위치 기준 `generated/ai-landings`에 저장됩니다.

---

## 로컬 테스트

### 1. dry-run

```bash
npm run generate:dry -w @melstudio/ai-landing
```

Claude API를 호출하지 않고 stub 랜딩을 생성한 뒤 `score_landing.py`를 실행합니다.

### 2. API dry-run

API 서버 실행 후:

```bash
curl -X POST http://localhost:4000/api/ai-landing/dry-run \
  -H 'Content-Type: application/json' \
  -d '{
    "industry": "디저트샵",
    "goal": "디저트 주문 문의 전환",
    "brandName": "멜로우 디저트",
    "tone": "warm",
    "cta": "카카오톡 주문 문의"
  }'
```

### 3. Claude API 생성

```bash
curl -X POST http://localhost:4000/api/ai-landing/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "industry": "공유오피스",
    "goal": "투어 예약 전환",
    "brandName": "스페이스 라운지",
    "tone": "trust",
    "targetAudience": "강남권 스타트업 대표와 1인 사업자",
    "cta": "투어 예약하기",
    "imageAssets": [
      {
        "url": "https://cdn.example.com/clipartkorea/office/hero.jpg",
        "tags": ["office", "interior"],
        "tone": "trust"
      }
    ],
    "runFoldCheck": false,
    "repairAttempts": 1
  }'
```

---

## 이미지/S3/RDS 연결 위치

이미지 파일은 S3에, 메타데이터는 RDS에 둡니다.

`prepare_clipart_assets_for_service.py`는 기존 `landing-templates`의 클립아트코리아 manifest를 읽어서 RDS용 `image_assets` 레코드와 S3 key를 만듭니다.

서비스에서는 DB에서 이미지 후보를 조회한 뒤 `imageAssets`로 pipeline에 전달하면 됩니다.

예상 DB 필드:

```text
image_assets
- id
- source
- provider_asset_code
- category
- template_slug
- tags
- tone
- s3_bucket
- s3_key
- public_url
- content_type
- bytes
- sha256
- license_note
- original_query
```

---

## 아직 남은 일

이 커밋은 “생성 파이프라인 초안”입니다. 실제 서비스화하려면 다음을 이어서 붙이면 됩니다.

1. RDS `image_assets`, `generation_jobs`, `generated_pages` 모델 추가
2. S3 업로드/서빙 모듈 추가
3. 생성 결과 preview URL 제공
4. 관리자 화면에서 이미지 인입/라이선스 관리
5. Web UI의 “랜딩페이지 만들기” 버튼과 API 연결
6. visual QA는 스크린샷 + vision 모델 또는 관리자 검수로 연결

---

## 설계 원칙

`.claude/agents`와 hooks는 Claude Code 전용 런타임 문법이라 서비스에서 그대로 실행되는 것이 아닙니다.

그래서 이 프로젝트에서는:

```text
CLAUDE.md → system prompt / quality rules
visual-qa.md → QA checklist / future QA prompt
score_gate.py → API quality gate 개념
score_landing.py, check_fold.mjs → 실제 검수 스크립트
```

이렇게 서비스용 파이프라인으로 변환했습니다.
