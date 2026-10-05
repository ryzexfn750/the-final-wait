#!/usr/bin/env python3
from __future__ import annotations
import json, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
TODAY = ROOT / 'content' / 'today.json'
SCENES = ROOT / 'assets' / 'scenes.json'
OUT = ROOT / 'assets' / 'today-card.png'
W,H = 1200,630


def font(size, bold=False):
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ]
    for p in candidates:
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()


def cover(im, size):
    tw,th=size; r=max(tw/im.width, th/im.height); nw,nh=round(im.width*r),round(im.height*r)
    im=im.resize((nw,nh), Image.Resampling.LANCZOS)
    return im.crop(((nw-tw)//2,(nh-th)//2,(nw+tw)//2,(nh+th)//2))


def wrap(draw, text, fnt, max_width):
    words=text.split(); lines=[]; line=''
    for word in words:
        test=(line+' '+word).strip()
        if draw.textlength(test,font=fnt)<=max_width: line=test
        else:
            if line: lines.append(line)
            line=word
    if line: lines.append(line)
    return lines


def main():
    today=json.loads(TODAY.read_text(encoding='utf-8'))
    scenes=json.loads(SCENES.read_text(encoding='utf-8'))
    sid=today.get('cardSceneId') or today.get('heroSceneId')
    scene=next((s for s in scenes if s.get('id')==sid), scenes[0])
    src=ROOT / scene['desktop'].lstrip('./')
    bg=cover(Image.open(src).convert('RGB'), (W,H)).convert('RGBA')
    # subtle blur on far left for text legibility while retaining the source image
    blurred=bg.filter(ImageFilter.GaussianBlur(10))
    mask=Image.new('L',(W,H)); md=ImageDraw.Draw(mask)
    for x in range(W):
        v=max(0,min(255,int(255*(1-x/(W*.72)))))
        md.line((x,0,x,H), fill=v)
    bg=Image.composite(blurred,bg,mask)
    overlay=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(overlay)
    # layered editorial gradients
    for x in range(W):
        t=x/W
        a=int(225*(1-t)**2.2)
        d.line((x,0,x,H), fill=(8,5,13,a))
    d.rectangle((0,H-150,W,H), fill=(7,5,10,80))
    # accent hairlines
    d.rectangle((54,48,61,116), fill=(240,43,174,255))
    d.rectangle((61,48,175,54), fill=(255,159,55,255))
    bg=Image.alpha_composite(bg,overlay)
    draw=ImageDraw.Draw(bg)

    micro=font(18,True); small=font(22,True); title=font(55,True); brand=font(25,True)
    pink=(255,79,190,255); white=(255,255,255,255); muted=(222,216,229,220)
    draw.text((82,48),'TODAY IN LEONIDA',font=brand,fill=white)
    draw.text((82,86),f"{today.get('issue','')}  ·  {today.get('date','')}",font=micro,fill=pink)
    draw.text((82,145),today.get('category','').upper(),font=small,fill=(255,178,77,255))
    lines=wrap(draw,today.get('headline',''),title,650)[:4]
    y=184
    for line in lines:
        draw.text((78,y),line,font=title,fill=white,stroke_width=1,stroke_fill=(0,0,0,60)); y+=62
    dek=font(22,False); dlines=wrap(draw,today.get('dek',''),dek,620)[:3]
    y=max(y+20,445)
    for line in dlines:
        draw.text((82,y),line,font=dek,fill=muted); y+=30
    draw.text((82,584),'THE FINAL WAIT · ROAD TO LEONIDA',font=micro,fill=(255,255,255,205))
    draw.text((930,584),'UNOFFICIAL FAN PROJECT',font=font(13,True),fill=(255,255,255,150))
    bg.convert('RGB').save(OUT, quality=95)
    print(OUT)

if __name__=='__main__': main()
