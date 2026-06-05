#!/usr/bin/env python3
"""
score-gate hook — 서브에이전트(Task/Agent) 실행 직후 전 랜딩페이지를 채점하고,
THRESHOLD 이하인 페이지를 '재제작 대상'으로 Claude에 주입한다.

.claude/settings.json 의 PostToolUse(matcher: Task|Agent) 에서 호출됨.
실패 시에는 조용히 통과(작업 방해 금지).
"""
import os, sys, json, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCORER = os.path.join(ROOT, "scripts", "score_landing.py")
THRESHOLD = 80
# 품질 만트라 — 점수와 무관하게 모든 에이전트 실행에 주입되는 디자인 기준.
# (정적 채점 100점이어도 시각적으로 구린 페이지가 나온 사례가 있어, 점수 통과 ≠ 완성임을 상기)
MANTRA = ("[design-bar] 최고의 디자인은 미술관급 품질이다. 점수 통과는 최소 조건일 뿐 — "
          "이미지 선정·레이아웃 리듬·타이포·여백까지 미술관에 걸어도 부끄럽지 않은 수준이어야 완성이다.")
# 게이트 제외: v0 레퍼런스 템플릿(의도된 데모 폼, 재제작 대상 아님)
EXEMPT = {"derma-v0-reference-landing"}

# 훅 페이로드는 사용하지 않지만 stdin은 비워준다.
try:
    sys.stdin.read()
except Exception:
    pass

def emit(ctx):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": ctx
        }
    }, ensure_ascii=False))
    sys.exit(0)


try:
    out = subprocess.run([sys.executable, SCORER, "--json"],
                         capture_output=True, text=True, timeout=60)
    results = json.loads(out.stdout or "[]")
except Exception:
    emit(MANTRA)

bad = [r for r in results
       if r["score"] <= THRESHOLD
       and os.path.basename(os.path.dirname(r["path"])) not in EXEMPT]

if not bad:
    emit(MANTRA)

lines = ["- %s — %d점 (%s)" % (r["page"], r["score"], "; ".join(r["notes"]) or "-")
         for r in sorted(bad, key=lambda r: r["score"])]
ctx = (MANTRA + "\n\n"
       "[score-gate] 다음 랜딩페이지가 %d점 이하라 재제작 대상입니다. "
       "깨진 이미지·안티패턴(AP-8 marquee / AP-9 카드 픽토그램 / AP-10 hero / "
       "AP-11 인라인폼 / AP-12 이미지 풀)·명조 폰트 위반을 고쳐 80점 초과로 "
       "끌어올리세요:\n%s\n점수 재확인: `python3 scripts/score_landing.py`"
       % (THRESHOLD, "\n".join(lines)))

emit(ctx)
