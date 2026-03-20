#!/usr/bin/env python3
import re

path = r'D:\OpenClaw_Home\.openclaw\workspace\projects\hs-design-landing\index.html'

with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# Find the nav-right section - inject after WhatsApp咨询 anchor
btn = '''
      <a href="HS_Design_Quotation.html" target="_blank" style="display:inline-flex;align-items:center;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:600;color:#5a9e8f;border:2px solid #e0ebe8;text-decoration:none;margin-right:12px;" onmouseover="this.style.background='#e6f4f1';this.style.borderColor='#5a9e8f'" onmouseout="this.style.background='transparent';this.style.borderColor='#e0ebe8'">报价工具</a>'''

# Find WhatsApp anchor end tag
anchor = 'WhatsApp咨询</a>'
idx = html.find(anchor)
if idx == -1:
    # Try English version
    anchor = 'WhatsApp Us</a>'
    idx = html.find(anchor)

if idx == -1:
    print('Anchor not found!')
    exit(1)

inject_at = idx + len(anchor)
new_html = html[:inject_at] + btn + html[inject_at:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_html)

print('Done! Button added at position', inject_at)
