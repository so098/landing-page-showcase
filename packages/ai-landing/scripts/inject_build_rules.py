#!/usr/bin/env python3
"""
build-rules inject hook — 랜딩 빌드 서브에이전트가 *작업을 시작하기 전에*
프로젝트 필수 규칙(짧은 리마인더) + 현재 80점 이하 재제작 대상 목록을 받게 한다.

규칙 전문은 프로젝트 CLAUDE.md(서브에이전트 자동 상속)에 있고, 여기서는
'반드시 준수' 포인터 + 동적 목록만 주입한다(중복 최소).

.claude/settings.json 에서 SubagentStart(우선) 또는 PreToolUse(Task|Agent, 폴백)로 호출.
실패 시에는 조용히 통과(작업 방해 금지) — score_gate.py 와 동일 원칙.
"""
import os, sys, json, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCORER = os.path.join(ROOT, "scripts", "score_landing.py")
THRESHOLD = 80
EXEMPT = {"derma-v0-reference-landing"}

# 페이로드 읽기(이벤트명 확인용으로만 사용; 내용은 선택적).
raw = ""
try:
    raw = sys.stdin.read()
except Exception:
    pass

payload = {}
try:
    payload = json.loads(raw) if raw.strip() else {}
except Exception:
    payload = {}

# --- 디버그(검증 후 제거): 어떤 이벤트로 발화되는지 기록 ---
try:
    with open(os.path.join(os.path.dirname(__file__), "_inject_debug.log"), "a", encoding="utf-8") as f:
        f.write((payload.get("hook_event_name") or payload.get("hookEventName") or "?") + "\n")
except Exception:
    pass

# 발화한 이벤트명을 그대로 되돌려준다(없으면 SubagentStart 가정).
event = payload.get("hook_event_name") or payload.get("hookEventName") or "SubagentStart"

# 현재 80점 이하 페이지 수집(기존 스코어러 재사용).
bad_lines = []
try:
    out = subprocess.run([sys.executable, SCORER, "--json"],
                         capture_output=True, text=True, timeout=60)
    results = json.loads(out.stdout or "[]")
    bad = [r for r in results
           if r["score"] <= THRESHOLD
           and os.path.basename(os.path.dirname(r["path"])) not in EXEMPT]
    bad_lines = ["%s(%d점)" % (r["page"], r["score"])
                 for r in sorted(bad, key=lambda r: r["score"])]
except Exception:
    bad_lines = []

targets = (" 현재 80점 이하 재제작 대상: " + ", ".join(bad_lines) + ".") if bad_lines else ""

ctx = ("[build-rules] 이 프로젝트의 랜딩 빌드/수정은 CLAUDE.md 필수 규칙을 반드시 준수: "
       "인라인폼(<form>/input)·마퀴(AP-8)·픽토그램 카드(AP-9)·명조/serif 폰트 금지, "
       "hero는 viewport 꽉 채움(AP-10, object-fit:cover+100vh), asset 풀에서 페이지당 20~40장 사용(AP-12), "
       "성형/미용은 얼굴 크게·일반 의료는 얼굴 회피(AP-13), 본문 Noto Sans KR. "
       "결과는 발견/수정/판단근거 3-part 보고. 점수는 80점 초과 유지"
       "(`python3 scripts/score_landing.py`)." + targets)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": event,
        "additionalContext": ctx
    }
}, ensure_ascii=False))
sys.exit(0)
