#!/usr/bin/env python3
"""Diagnostic: inspect the structure of the G-BA AIS XML file.

Usage:
    python3 scripts/inspect_xml.py <path-to-xml-file>

Prints the element hierarchy and sample data to help debug the parser.
"""

import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path


def inspect_xml(xml_path):
    raw = Path(xml_path).read_bytes()

    # Handle ZIP
    if raw[:4] == b"PK\x03\x04":
        import io, zipfile
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            for name in zf.namelist():
                if name.lower().endswith(".xml"):
                    raw = zf.read(name)
                    print("Extracted %s from ZIP" % name)
                    break

    # Handle GZIP
    if raw[:2] == b"\x1f\x8b":
        import gzip
        raw = gzip.decompress(raw)

    root = ET.fromstring(raw)

    print("=" * 70)
    print("ROOT element: <%s>" % root.tag)
    print("ROOT attributes: %s" % dict(root.attrib))
    print("Direct children: %d" % len(list(root)))
    print()

    # Show unique child tag names at each level
    child_tags = Counter(c.tag for c in root)
    print("Level 1 tags (direct children of root):")
    for tag, count in child_tags.most_common():
        print("  <%s> x %d" % (tag, count))
    print()

    # Pick the most common child (likely "Beschluss" equivalent)
    main_tag = child_tags.most_common(1)[0][0]
    print("Inspecting first 3 <%s> elements..." % main_tag)
    print()

    for i, elem in enumerate(root):
        if i >= 3:
            break
        print("-" * 70)
        print("Element %d: <%s>" % (i, elem.tag))
        print("Attributes: %s" % dict(elem.attrib))
        print()

        # Show all direct children with their text
        print("  Direct children:")
        for child in elem:
            text = ""
            if child.text and child.text.strip():
                text = child.text.strip()[:120]
            attrs = dict(child.attrib)
            sub_count = len(list(child))
            info = "text=%r" % text if text else ""
            if attrs:
                info += " attrs=%s" % attrs
            if sub_count:
                info += " sub_elements=%d" % sub_count
            print("    <%s> %s" % (child.tag, info))

            # Show grandchildren too (2 levels deep)
            for grandchild in child:
                gc_text = ""
                if grandchild.text and grandchild.text.strip():
                    gc_text = grandchild.text.strip()[:100]
                gc_attrs = dict(grandchild.attrib)
                gc_sub = len(list(grandchild))
                gc_info = "text=%r" % gc_text if gc_text else ""
                if gc_attrs:
                    gc_info += " attrs=%s" % gc_attrs
                if gc_sub:
                    gc_info += " sub_elements=%d" % gc_sub
                print("      <%s> %s" % (grandchild.tag, gc_info))

                # One more level for deeply nested structures
                for ggc in grandchild:
                    ggc_text = ""
                    if ggc.text and ggc.text.strip():
                        ggc_text = ggc.text.strip()[:80]
                    ggc_info = "text=%r" % ggc_text if ggc_text else ""
                    if ggc.attrib:
                        ggc_info += " attrs=%s" % dict(ggc.attrib)
                    print("        <%s> %s" % (ggc.tag, ggc_info))

        print()

    # Summary: collect all unique tag names in the entire document
    all_tags = Counter()
    for elem in root.iter():
        all_tags[elem.tag] += 1

    print("=" * 70)
    print("ALL UNIQUE TAGS in document:")
    for tag, count in all_tags.most_common():
        print("  <%s> x %d" % (tag, count))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/inspect_xml.py <path-to-xml>")
        sys.exit(1)
    inspect_xml(sys.argv[1])
