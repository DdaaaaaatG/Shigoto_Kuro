# -*- coding: utf-8 -*-
"""배포용 사용설명서.html 생성 — 배포 안내(README) + src/{overlay,settings}/manual.md 를 한 파일로.

사용: python scripts/dev/build-manual-html.py <version> <readme.md> <출력.html>
- 그림은 base64로 내장한다(파일 하나만 보내면 열린다).
- 왼쪽 고정 차례(부·절 2단계, 스크롤 위치 강조), 다크 모드, 모바일·인쇄 스타일.
- 최종 사용자는 개발자가 아니다 — .md를 그대로 주지 않는다(2026-10-17 사용자 지시).
"""
import base64
import io
import os
import re
import sys

import markdown

VERSION, README, OUT = sys.argv[1], sys.argv[2], sys.argv[3]


def embed_images(md, screen):
    def rep(m):
        alt, path = m.group(1), m.group(2)
        with open(f"src/{screen}/manual/img/{os.path.basename(path)}", "rb") as f:
            data = base64.b64encode(f.read()).decode()
        return f"![{alt}](data:image/png;base64,{data})"

    return re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", rep, md)


def demote(md):
    """문서 제목(#) 제거, 모든 제목을 한 단계씩 내린다(## → ###, ### → ####) — 차례에는 부(h2)·절(h3)만 보인다."""
    md = re.sub(r"^# .*\n", "", md, count=1, flags=re.M)
    return re.sub(r"^(#{2,5}) ", lambda m: "#" + m.group(1) + " ", md, flags=re.M)


def part(title, md, slug):
    inner = markdown.markdown(demote(md), extensions=["tables", "fenced_code", "toc"])
    inner = re.sub(r'<h([34]) id="', lambda m: f'<h{m.group(1)} id="{slug}-', inner)  # 부마다 id 충돌 방지
    return f'<section class="part" id="{slug}"><h2 id="{slug}-top">{title}</h2>{inner}</section>'


readme = io.open(README, encoding="utf-8").read()
readme = re.sub(r"^(# .*\n)\s*키보드·마우스 입력에 맞춰[^\n]*\n", r"\1", readme, count=1, flags=re.M)  # 히어로와 중복
sections = [part("시작하기 — 설치·업데이트 안내", readme, "start")]
for screen, title in (("overlay", "오버레이(캐릭터 창) 사용법"), ("settings", "설정 창 사용법")):
    md = io.open(f"src/{screen}/manual.md", encoding="utf-8").read()
    sections.append(part(title, embed_images(md, screen), screen))
body = "".join(sections)

# 그림 → figure+캡션, 표 → 스크롤 래퍼
body = re.sub(
    r'<p><img alt="([^"]*)" src="([^"]+)"\s*/?></p>',
    lambda m: f'<figure><img alt="{m.group(1)}" src="{m.group(2)}" loading="lazy">'
    f"<figcaption>{m.group(1)}</figcaption></figure>",
    body,
)
body = body.replace("<table>", '<div class="tbl"><table>').replace("</table>", "</table></div>")

# 차례
toc = []
for m in re.finditer(r'<h([23]) id="([^"]+)">(.*?)</h\1>', body):
    lvl, hid, text = int(m.group(1)), m.group(2), re.sub("<[^>]+>", "", m.group(3))
    if lvl == 2:
        if toc:
            toc.append("</ul></li>")
        toc.append(f'<li><a class="l2" href="#{hid}">{text}</a><ul>')
    else:
        toc.append(f'<li><a class="l3" href="#{hid}">{text}</a></li>')
toc.append("</ul></li>")
toc_html = '<ul class="toc">' + "".join(toc) + "</ul>"

CSS = """
:root{--accent:#BE72AD;--accent-2:#A85A97;--soft:#F8EBF5;--bg:#ffffff;--fg:#1f1f24;--muted:#6b6b76;--line:#ebe7ee;--card:#faf8fb;--side:290px}
@media (prefers-color-scheme:dark){:root{--bg:#16161a;--fg:#ececf1;--muted:#a3a3ae;--line:#2c2b33;--card:#1e1d24;--soft:#3a2636}}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:20px}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.8 "Malgun Gothic","Apple SD Gothic Neo","Segoe UI",system-ui,sans-serif;word-break:keep-all;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}
.layout{display:grid;grid-template-columns:var(--side) minmax(0,1fr)}
aside{position:sticky;top:0;height:100vh;overflow-y:auto;background:var(--card);border-right:1px solid var(--line);padding:26px 16px 40px}
.brand{display:flex;align-items:center;gap:12px;padding:0 8px 18px;margin-bottom:12px;border-bottom:1px solid var(--line)}
.logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:grid;place-items:center;color:#fff;font-weight:800}
.brand b{display:block;font-size:1.02em}.brand small{color:var(--muted);font-size:.82em}
.toc,.toc ul{list-style:none;margin:0;padding:0}
.toc>li{margin:6px 0 10px}
.toc>li>ul{display:none}.toc>li.open>ul{display:block}
.toc a{display:block;border-radius:8px;transition:background .15s,color .15s}
.toc a.l2{font-weight:700;color:var(--fg);padding:8px 10px;font-size:.98em}
.toc a.l3{color:var(--muted);padding:5px 10px 5px 22px;font-size:.9em;position:relative}
.toc a.l3::before{content:"";position:absolute;left:12px;top:50%;width:4px;height:4px;border-radius:50%;background:var(--line);transform:translateY(-50%)}
.toc a:hover{background:var(--soft);color:var(--fg)}
.toc a.active{background:var(--soft);color:var(--accent)}
.toc a.l3.active::before{background:var(--accent)}
main{padding:44px clamp(20px,5vw,64px) 140px;max-width:940px}
.hero{border-radius:20px;padding:34px 36px;margin-bottom:12px;background:linear-gradient(135deg,var(--soft),transparent 75%);border:1px solid var(--line)}
.hero h1{margin:0 0 8px;font-size:2.1em;line-height:1.3;letter-spacing:-.02em}
.hero p{margin:0;color:var(--muted);max-width:60ch}
.badge{display:inline-block;margin-left:10px;padding:3px 12px;border-radius:999px;background:var(--accent);color:#fff;font-size:.42em;font-weight:700;vertical-align:middle}
.part{margin-top:64px}
h2{font-size:1.7em;line-height:1.35;margin:0 0 6px;padding:0 0 14px;border-bottom:3px solid var(--accent);letter-spacing:-.01em}
h3{font-size:1.25em;margin:44px 0 14px;padding-left:14px;border-left:5px solid var(--accent);line-height:1.4}
h4{font-size:1.05em;margin:28px 0 8px}
p,li{max-width:74ch}
ul,ol{padding-left:1.3em}li{margin:6px 0}li::marker{color:var(--accent)}
strong{font-weight:700;color:var(--fg)}
figure{margin:24px 0 28px}
figure img{display:block;max-width:100%;height:auto;margin:0 auto;border-radius:14px;border:1px solid var(--line);box-shadow:0 10px 30px rgba(30,20,40,.10)}
figcaption{margin-top:10px;text-align:center;color:var(--muted);font-size:.88em}
.tbl{overflow-x:auto;margin:18px 0;border:1px solid var(--line);border-radius:14px;background:var(--bg)}
table{width:100%;border-collapse:collapse;font-size:.94em;line-height:1.65}
th,td{padding:12px 16px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
th{background:var(--soft);font-weight:700;white-space:nowrap}
tr:last-child td{border-bottom:0}
tbody tr:nth-child(even) td{background:var(--card)}
td:first-child{font-weight:600;white-space:nowrap}
code{font-family:Consolas,"D2Coding",monospace;font-size:.88em;background:var(--card);border:1px solid var(--line);padding:1px 6px;border-radius:6px}
pre{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;overflow:auto}pre code{border:0;padding:0;background:none}
blockquote{margin:18px 0;padding:14px 18px;border-radius:12px;background:var(--card);border:1px solid var(--line);border-left:5px solid var(--accent)}
blockquote p{margin:4px 0}
hr{display:none}
.totop{position:fixed;right:22px;bottom:22px;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff;font-size:1.1em;box-shadow:0 6px 18px rgba(0,0,0,.2)}
@media (max-width:960px){.layout{grid-template-columns:1fr}aside{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}.toc a.l3{display:none}}
@media print{aside,.totop{display:none}.layout{display:block}main{max-width:none;padding:0}figure img{box-shadow:none}.part{page-break-before:always}}
"""

JS = """
const links=[...document.querySelectorAll('.toc a')];
const byId=new Map(links.map(a=>[a.getAttribute('href').slice(1),a]));
const heads=[...document.querySelectorAll('main h2[id],main h3[id]')];
function mark(){let cur=heads[0];for(const h of heads){if(h.getBoundingClientRect().top<120)cur=h;else break}
links.forEach(a=>a.classList.remove('active'));document.querySelectorAll('.toc>li').forEach(li=>li.classList.remove('open'));const a=byId.get(cur.id);if(!a)return;a.classList.add('active');
const parent=a.closest('ul')?.parentElement?.querySelector(':scope>a.l2');if(parent)parent.classList.add('active');a.closest('.toc>li')?.classList.add('open');
const box=document.querySelector('aside');const r=a.getBoundingClientRect();if(r.top<80||r.bottom>innerHeight-40)a.scrollIntoView({block:'center'});}
addEventListener('scroll',mark,{passive:true});mark();
"""

page = f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>kuro_keyviewer {VERSION} 사용설명서</title><style>{CSS}</style></head>
<body id="top"><div class="layout">
<aside><div class="brand"><div class="logo">K</div><div><b>kuro_keyviewer</b><small>사용설명서 · {VERSION}</small></div></div>{toc_html}</aside>
<main><header class="hero"><h1>kuro_keyviewer 사용설명서<span class="badge">{VERSION}</span></h1>
<p>키보드·마우스 입력에 맞춰 캐릭터 그림이 움직이는 키뷰어입니다. 왼쪽 차례에서 보고 싶은 항목을 누르면 바로 이동합니다.</p></header>
{body}
</main></div><a class="totop" href="#top" aria-label="맨 위로">▲</a>
<script>{JS}</script></body></html>"""

io.open(OUT, "w", encoding="utf-8", newline="\n").write(page)
n2 = len(re.findall(r'class="l2"', toc_html))
n3 = len(re.findall(r'class="l3"', toc_html))
imgs = page.count("data:image/png")
ext = len(re.findall(r'src="(?!data:)', page))
print(f"{OUT}: {len(page)//1024}KB, 차례 {n2}부 {n3}절, 그림 내장 {imgs}, 외부 그림 {ext}")
