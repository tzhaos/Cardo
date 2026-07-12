"""Remove retired [data-cardo-theme='windows'|'github'] blocks from settings.css."""
from pathlib import Path
import re

path = Path(__file__).resolve().parents[1] / "src/web-next/styles/settings.css"
text = path.read_text(encoding="utf-8")
original_lines = len(text.splitlines())

# Start of retired sections: Windows 11 comment or first windows selector.
start_match = re.search(
    r"\n/\*[^*]*Windows 11 Settings|\n/\*[^*]*WinUI|\n\[data-cardo-theme='windows'\]",
    text,
    re.IGNORECASE,
)
if not start_match:
    start_match = re.search(r"\[data-cardo-theme='windows'\]", text)
if not start_match:
    raise SystemExit("Could not find retired windows theme block")

start = start_match.start()
if text[start] == "\n":
    start += 1

head = text[:start].rstrip() + "\n"
tail = text[start:]

# Preserve trailing generic @media blocks that do not reference retired themes.
media_iter = list(re.finditer(r"@media[^{]+\{", tail))
keep_from = None
for match in reversed(media_iter):
    sub = tail[match.start() :]
    depth = 0
    end = None
    for i, ch in enumerate(sub):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    block = sub[:end] if end is not None else sub
    if "data-cardo-theme" not in block:
        keep_from = match.start()
        break

kept = tail[keep_from:] if keep_from is not None else "\n"
kept_lines = [
    line
    for line in kept.splitlines(keepends=True)
    if "data-cardo-theme='windows'" not in line and "data-cardo-theme='github'" not in line
]
new_text = head + "\n" + "".join(kept_lines)
if not new_text.endswith("\n"):
    new_text += "\n"

if "data-cardo-theme='windows'" in new_text or "data-cardo-theme='github'" in new_text:
    raise SystemExit("Retired theme selectors still present after strip")

path.write_text(new_text, encoding="utf-8")
print(
    f"settings.css: {original_lines} -> {len(new_text.splitlines())} lines "
    f"(-{original_lines - len(new_text.splitlines())})"
)
