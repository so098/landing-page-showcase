#!/usr/bin/env python3
"""
Landing-page quality scorer (static analysis).

프로젝트 룰(깨진 이미지 / AP-8 marquee / AP-9 픽토그램 카드 / AP-10 hero /
AP-11 인라인폼 / AP-12 이미지 풀 활용 / 폰트 화이트리스트=명조 금지)을
정적으로 점검해 0~100 점을 매긴다. 추가로 AP-16(과시성 통계 밴드)·AP-17(hero 본문
우측 정렬)·AP-21(배경 없는 hero) 위반은 각 -20 감점(정적 휴리스틱). 렌더 없이 빠르게 돌도록 설계(훅용).

사용법:
  python3 scripts/score_landing.py                 # templates/, templates2/ 전체
  python3 scripts/score_landing.py <index.html...> # 특정 파일
  python3 scripts/score_landing.py --json          # JSON 출력
  python3 scripts/score_landing.py --below 80      # 80점 이하 페이지 경로만 출력
  python3 scripts/score_landing.py --threshold 80  # 통과 기준(기본 80)
"""
import os, re, sys, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 삭제된 옛 자산 폴더(루트 assets 직속) — 여기로 가는 참조는 깨진 것
DEAD_DIRS = ("dental", "dermatology", "korean-medicine", "manual-therapy",
             "psychotherapy", "fitness", "diet")
SERIF_FONTS = ("MaruBuri", "Nanum Myeongjo", "Myeongjo", "Batang",
               "Gowun Batang", "Song Myung", "Noto Serif", "RIDIBatang")
# AP-11 폼 예외(백엔드 연결 폼 보존)
FORM_EXEMPT = ("dental-implant-landing",)

IMG_REF = re.compile(r"""(?:src|href)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp|gif))["']""", re.I)
URL_REF = re.compile(r"""url\(\s*['"]?([^'")]+\.(?:jpg|jpeg|png|webp|gif))""", re.I)

# --- AP-16 과시성 숫자 통계/카운터 밴드 (정적 휴리스틱) ---
# (1) stat/counter/metric/num-card 류 class 토큰
STATBAND_CLASS = re.compile(
    r'class\s*=\s*["\'][^"\']*'
    r'(?<![a-z])(?:num-?card|count-?up|counters?|metrics?|stats?)(?![a-z])'
    r'[^"\']*["\']', re.I)
# (2) "큰 숫자 + 라벨" 단위: <strong>NUM[metric단위]</strong><span...>
#     가격(원)·날짜(일)·시간(:,h,분) 등 정상 정보는 제외하도록 단위를 metric류로 한정
STAT_UNIT = re.compile(
    r'<strong[^>]*>\s*\d[\d,. ]*\s*(?:%|\+|개|개점|호점|년|만|억|종|곳|위|명|건)?\s*</strong>\s*<span',
    re.I)
# --- AP-17 hero 본문 우측 정렬 (정적 휴리스틱) ---
# hero '본문' 컨테이너(.hero / .hero-inner / .hero-content / .hero-copy / .hero-text/ body/main)에만
# text-align:right 이 걸린 경우만 위반으로 본다. (.hero-corner, .hero-foot .right 등 소품 우측정렬은 정상)
RIGHT_HERO = re.compile(
    r'\.hero(?:[_-]{1,2}(?:inner|content|copy|text|body|main|wrap|wrapper|grid))?'
    r'\s*\{[^}]*text-align\s*:\s*right', re.I)

# --- AP-21 배경 없는 첫 화면(hero) (정적 휴리스틱) ---
# hero 요소가 존재하는데 hero 스코프(.hero*, #hero*) 어디에도 사진 배경(url(...) 또는 <img>)이
# 없으면 위반. hero 명명이 없는 페이지는 정적으로 판정 불가 → 보류(비주얼 QA 영역).
HERO_NAMED = re.compile(r'<\w+[^>]*(?:class|id)\s*=\s*["\'][^"\']*\bhero\b', re.I)
HERO_CSS_BG = re.compile(
    r'[.#]hero[\w-]*[^{}]*\{[^}]*background[^}]*url\(\s*["\']?[^"\')]+'
    r'\.(?:jpg|jpeg|png|webp|gif)', re.I)
HERO_OPEN = re.compile(r'<(?:section|header|div|main)[^>]*\bhero\b[^>]*>', re.I)
# hero 스코프 CSS 룰(셀렉터에 hero 포함) — AP-21b 레이어 순서 검사용
HERO_RULE = re.compile(r'[.#]hero[\w-]*[^{}]*\{([^}]*)\}', re.I)


def _split_bg_layers(val):
    """background 값을 top-level 콤마로 레이어 분리(괄호 안 콤마는 무시)."""
    layers, depth, cur = [], 0, ""
    for ch in val:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            layers.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        layers.append(cur)
    return layers


def hero_photo_hidden(text):
    """AP-21b: hero 다중 배경에서 '불투명' gradient가 url(사진)보다 앞(위) 레이어면
    사진이 그라데이션에 완전히 가려져 안 보인다. (반투명 rgba/hsla/transparent
    그라데이션은 가독성용 오버레이라 정상. blend-mode가 normal이 아니면 보류.)"""
    for m in HERO_RULE.finditer(text):
        body = m.group(1)
        bm = re.search(r'background-blend-mode\s*:\s*([\w-]+)', body, re.I)
        if bm and bm.group(1).lower() != "normal":
            continue                          # 블렌드되면 사진이 비칠 수 있음 → 판정 보류
        for bg in re.finditer(r'background(?:-image)?\s*:\s*([^;]+)', body, re.I):
            layers = _split_bg_layers(bg.group(1))
            url_idx = next((i for i, l in enumerate(layers)
                            if re.search(r'url\(', l, re.I)), None)
            if url_idx is None:
                continue
            for lyr in layers[:url_idx]:      # url보다 위에 그려지는 레이어들
                if "gradient(" not in lyr.lower():
                    continue
                if re.search(r'rgba\(|hsla\(|transparent', lyr, re.I):
                    continue                  # 반투명 오버레이 → 허용
                return True                   # 불투명 gradient가 사진을 덮음
    return False


def has_bare_hero(text, html):
    """AP-21: hero가 있는데 사진 배경/이미지가 전혀 없으면 True(위반)."""
    if not HERO_NAMED.search(html):
        return False                      # hero 명명 없음 → 판정 보류
    if HERO_CSS_BG.search(text):
        return False                      # hero 스코프 CSS에 사진 배경
    # hero 요소(여는 태그 포함, inline style 커버) ~ 다음 형제 <section> 사이에
    # <img> 또는 url(사진)이 있으면 통과
    m = HERO_OPEN.search(html)
    if m:
        rest = html[m.start():]
        nxt = re.search(r'<section\b', rest[1:], re.I)
        chunk = rest[:nxt.start() + 1] if nxt else rest
        if re.search(r'<img\b|url\(\s*["\']?[^"\')]+\.(?:jpg|jpeg|png|webp)', chunk, re.I):
            return False
    return True


def has_statband(text):
    """과시성 통계 밴드: stat류 class 또는 '숫자+라벨' 단위 3개 이상이 한 띠에 모인 경우."""
    if STATBAND_CLASS.search(text):
        return True
    pos = [m.start() for m in STAT_UNIT.finditer(text)]
    for i in range(len(pos)):                       # 800자 창 안에 3개 이상 = 밴드
        if sum(1 for p in pos if pos[i] <= p < pos[i] + 800) >= 3:
            return True
    return False


def has_right_hero(text):
    """hero 스코프 규칙에 text-align:right (본문 우측 정렬) = AP-17 위반."""
    return bool(RIGHT_HERO.search(text))


def rendered_text(html_path):
    """index.html + (링크된 경우에만) 같은 폴더 css. orphan css는 제외."""
    d = os.path.dirname(html_path)
    try:
        html = open(html_path, encoding="utf-8", errors="ignore").read()
    except OSError:
        return "", []
    texts = [html]
    css_files = []
    for css in glob.glob(os.path.join(d, "*.css")):
        name = os.path.basename(css)
        # index.html이 실제로 <link> 하는 css만 포함(렌더되는 스타일)
        if re.search(r'href=["\'][^"\']*%s' % re.escape(name), html):
            texts.append(open(css, encoding="utf-8", errors="ignore").read())
            css_files.append(css)
    return "\n".join(texts), css_files


def collect_image_refs(html_path):
    html = open(html_path, encoding="utf-8", errors="ignore").read()
    refs = set(IMG_REF.findall(html)) | set(URL_REF.findall(html))
    return refs


def score_page(html_path):
    text, _ = rendered_text(html_path)
    slug = os.path.basename(os.path.dirname(html_path))
    breakdown, notes = {}, []

    # ---- 1) 깨진 이미지 (30) ----
    refs = collect_image_refs(html_path)
    local = [r for r in refs if not r.startswith(("http://", "https://", "data:", "//"))]
    broken = 0
    base = os.path.dirname(html_path)
    for r in local:
        p = os.path.normpath(os.path.join(base, r))
        dead = any(("/assets/%s/" % dd) in ("/" + r) for dd in DEAD_DIRS)
        if dead or not os.path.isfile(p):
            broken += 1
    img_pts = max(0, 30 - 10 * broken)
    breakdown["images_resolve(30)"] = img_pts
    if broken:
        notes.append("깨진 이미지 %d개" % broken)

    # ---- 2) 폰트: 명조 금지 (15) ----
    font_pts = 15
    maru = [f for f in SERIF_FONTS if f.lower() in text.lower()]
    # generic serif fallback (sans-serif 제외, var(--serif) 변수명 제외)
    generic_serif = [m for m in re.findall(r"font-family:\s*[^;}{]*", text)
                     if re.search(r"(?<!sans-)(?<!--)serif\b", m)]
    if maru:
        font_pts -= 12; notes.append("명조 폰트(%s)" % ",".join(maru))
    if generic_serif:
        font_pts -= 5; notes.append("generic serif fallback %d곳" % len(generic_serif))
    font_pts = max(0, font_pts)
    breakdown["font_whitelist(15)"] = font_pts

    # ---- 3) AP-8 marquee (10) ----
    marquee = re.search(r"@keyframes\s+(?:marquee|ticker)\b|animation:[^;]*\bmarquee\b", text, re.I)
    breakdown["AP8_no_marquee(10)"] = 0 if marquee else 10
    if marquee:
        notes.append("AP-8 마퀴")

    # ---- 4) AP-11 인라인 폼 (12) ----
    form = re.search(r"<form|<input|<select|<textarea", text, re.I)
    if form and slug not in FORM_EXEMPT:
        breakdown["AP11_no_form(12)"] = 0; notes.append("AP-11 인라인 폼")
    else:
        breakdown["AP11_no_form(12)"] = 12

    # ---- 5) AP-10 hero (13) ----
    hero_pts = 13
    bad_fit = re.search(r"object-fit:\s*(?:contain|fill|none)|background-size:\s*contain", text, re.I)
    has_fill = ("100svh" in text) or ("100vh" in text)
    if bad_fit:
        hero_pts -= 8; notes.append("hero object-fit 위반")
    if not has_fill:
        hero_pts -= 5; notes.append("hero 100vh/svh 없음")
    hero_pts = max(0, hero_pts)
    breakdown["AP10_hero(13)"] = hero_pts

    # ---- 6) AP-9 분류 카드 픽토그램 (8) ----
    card_svg = re.search(
        r"<(?:article|div)[^>]*class=[\"'][^\"']*"
        r"(?:service|menu|category|treatment|package|concern|svc)[^\"']*card[^\"']*[\"'][^>]*>"
        r"(?:(?!</(?:article|div)>).)*?<svg", text, re.I | re.S)
    breakdown["AP9_no_pictogram_card(8)"] = 0 if card_svg else 8
    if card_svg:
        notes.append("AP-9 카드 픽토그램")

    # ---- 7) 이미지 풀 활용 (12) ----
    distinct = len([r for r in local])
    if distinct >= 12:
        rich = 12
    elif distinct >= 6:
        rich = 8
    elif distinct >= 1:
        rich = 4
    else:
        rich = 0
    breakdown["image_richness(12)"] = rich
    if distinct < 6:
        notes.append("이미지 %d장(빈약)" % distinct)

    # ---- 8) AP-16 과시성 통계 밴드 (위반 시 -20) ----
    if has_statband(text):
        breakdown["AP16_no_statband(-20)"] = -20
        notes.append("AP-16 통계 밴드")
    else:
        breakdown["AP16_no_statband(-20)"] = 0

    # ---- 9) AP-17 hero 본문 우측 정렬 (위반 시 -20) ----
    if has_right_hero(text):
        breakdown["AP17_no_right_hero(-20)"] = -20
        notes.append("AP-17 hero 우측정렬")
    else:
        breakdown["AP17_no_right_hero(-20)"] = 0

    # ---- 10) AP-21 배경 없는 첫 화면 (위반 시 -20) ----
    html_only = open(html_path, encoding="utf-8", errors="ignore").read()
    if has_bare_hero(text, html_only):
        breakdown["AP21_hero_bg_required(-20)"] = -20
        notes.append("AP-21 배경 없는 hero")
    elif hero_photo_hidden(text):
        breakdown["AP21_hero_bg_required(-20)"] = -20
        notes.append("AP-21 hero 사진이 불투명 그라데이션에 가려짐")
    else:
        breakdown["AP21_hero_bg_required(-20)"] = 0

    total = sum(breakdown.values())
    return {"page": "%s/%s" % (os.path.basename(os.path.dirname(os.path.dirname(html_path))), slug),
            "path": html_path, "score": total, "breakdown": breakdown, "notes": notes}


def discover():
    pages = []
    for grp in ("templates", "templates2", "template4", "template5", "template6", "template7",
                "template8", "template9", "template10"):
        pages += sorted(glob.glob(os.path.join(ROOT, grp, "*", "index.html")))
    # template-creative: 그룹이 아니라 단일 사이트(최상위 index.html)
    single = os.path.join(ROOT, "template-creative", "index.html")
    if os.path.isfile(single):
        pages.append(single)
    return [p for p in pages if "_backup" not in p]


def main():
    args = sys.argv[1:]
    as_json = "--json" in args
    below = None
    threshold = 80
    files = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--json":
            pass
        elif a == "--below":
            i += 1; below = int(args[i])
        elif a == "--threshold":
            i += 1; threshold = int(args[i])
        elif not a.startswith("--"):
            files.append(a if os.path.isabs(a) else os.path.join(os.getcwd(), a))
        i += 1
    if not files:
        files = discover()

    results = [score_page(f) for f in files]
    results.sort(key=lambda r: r["score"])

    if below is not None:
        for r in results:
            if r["score"] <= below:
                print(r["path"])
        return

    if as_json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return

    print("%-44s %5s   %s" % ("page", "score", "감점 사유"))
    print("-" * 92)
    for r in results:
        flag = "  ✗" if r["score"] <= threshold else "  ✓"
        print("%-44s %5d%s %s" % (r["page"], r["score"], flag, "; ".join(r["notes"]) or "-"))
    bad = [r for r in results if r["score"] <= threshold]
    print("-" * 92)
    print("%d개 페이지 중 %d개가 %d점 이하 (재제작 대상)" % (len(results), len(bad), threshold))


if __name__ == "__main__":
    main()
