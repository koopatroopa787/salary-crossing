import sys
import zipfile
import xml.etree.ElementTree as ET

NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

with zipfile.ZipFile(sys.argv[1]) as archive:
    data = archive.read("word/document.xml")

root = ET.fromstring(data)
paragraphs = []
for paragraph in root.iter(NS + "p"):
    text = "".join(node.text or "" for node in paragraph.iter(NS + "t"))
    if text.strip():
        paragraphs.append(text.strip())

sys.stdout.write("\n".join(paragraphs))
