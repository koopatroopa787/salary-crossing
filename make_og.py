"""
Generate the social card once, at 1200x630.

Every share of this site currently renders as a bare link. This is a static
card rather than one per page: 447 generated PNGs would slow the build for a
marginal gain, and the sharing that matters early is people posting the site,
not a specific salary. Per-page cards are worth revisiting if that changes.

Serif faces are not installed on the box, so this uses DejaVu — it is not the
site's Newsreader, but the palette and composition carry the identity and the
alternative is no card at all.
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PAPER = "#EFF2F3"
INK = "#0E1619"
MUTED = "#5B6C74"
KEEP = "#0C5A4A"
RULE = "#D6DDE0"

B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
M = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

img = Image.new("RGB", (W, H), PAPER)
d = ImageDraw.Draw(img)

d.text((72, 62), "SALARY CROSSING", font=ImageFont.truetype(B, 26), fill=MUTED)
d.line([(72, 112), (W - 72, 112)], fill=RULE, width=2)

head = ImageFont.truetype(B, 62)
d.text((72, 156), "What your salary is", font=head, fill=INK)
d.text((72, 232), "worth somewhere else", font=head, fill=KEEP)

sub = ImageFont.truetype(R, 27)
d.text((72, 330), "After tax, after social contributions, from each", font=sub, fill=MUTED)
d.text((72, 368), "country's own published rates.", font=sub, fill=MUTED)

# One real comparison, because a concrete number is the whole proposition.
mono, small = ImageFont.truetype(M, 34), ImageFont.truetype(R, 21)
y = 452
d.line([(72, y - 26), (W - 72, y - 26)], fill=RULE, width=2)
for x, top, bottom in [
    (72,  "£75,000", "London"),
    (392, "AED 268,605", "Dubai"),
    (760, "$104,285", "New York City"),
]:
    d.text((x, y), top, font=mono, fill=INK if x == 72 else KEEP)
    d.text((x, y + 48), bottom, font=small, fill=MUTED)

d.text((72, 566), "salarycrossing.com", font=ImageFont.truetype(B, 24), fill=MUTED)

img.save("public/og.png", "PNG", optimize=True)
print("wrote public/og.png")
