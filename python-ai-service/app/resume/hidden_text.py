"""
Hidden Text Detector for PDF and DOCX files.
Detects: white/near-white text, invisible render mode, zero-opacity,
tiny fonts, off-page text, vanish property, hidden XML elements.
"""
from io import BytesIO
from typing import List, Dict, Any, Optional


def _is_light_color(color) -> bool:
    if color is None:
        return False
    if isinstance(color, (int, float)):
        return color >= 0.94
    if isinstance(color, (list, tuple)):
        vals = list(color)
        if len(vals) == 1:
            return vals[0] >= 0.94
        if len(vals) >= 3:
            return all(v >= 0.94 for v in vals[:3])
    return False


def scan_pdf(content: bytes) -> Dict[str, Any]:
    import fitz  # PyMuPDF

    hidden_texts: List[str] = []
    findings: List[Dict[str, Any]] = []
    visible_chars = 0
    hidden_chars = 0

    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception:
        return {'hiddenText': [], 'findings': [], 'hiddenRatio': 0.0, 'error': 'Cannot parse PDF'}

    for pno in range(len(doc)):
        page = doc[pno]
        page_rect = page.rect

        try:
            traces = page.get_texttrace()
        except Exception:
            traces = []

        for tr in traces:
            chars = tr.get('chars', ())
            text = ''.join(chr(c[0]) if isinstance(c, (list, tuple)) else str(c) for c in chars).strip()
            if not text:
                continue

            reasons: List[str] = []

            # Invisible render mode (type 3 = invisible)
            if tr.get('type', 0) == 3:
                reasons.append('invisible_render_mode')

            # Zero or near-zero opacity
            opacity = tr.get('opacity')
            if opacity is not None and opacity < 0.1:
                reasons.append('zero_opacity')

            # White or near-white text color
            color = tr.get('color')
            if _is_light_color(color):
                reasons.append('white_text')

            # Tiny font
            font_size = tr.get('size', 10)
            if font_size is not None and font_size < 4:
                reasons.append('tiny_font')

            # Off-page text
            bbox = tr.get('bbox')
            if bbox:
                try:
                    rect = fitz.Rect(bbox)
                    if not page_rect.intersects(rect) or rect.x1 < 0 or rect.y1 < 0:
                        reasons.append('off_page')
                except Exception:
                    pass

            if reasons:
                hidden_texts.append(text)
                hidden_chars += len(text)
                findings.append({
                    'page': pno + 1,
                    'reasons': reasons,
                    'sample': text[:150],
                    'font_size': font_size,
                })
            else:
                visible_chars += len(text)

    doc.close()
    total = max(1, visible_chars + hidden_chars)
    return {
        'hiddenText': hidden_texts,
        'findings': findings,
        'hiddenRatio': round(hidden_chars / total, 4),
    }


def scan_docx(content: bytes) -> Dict[str, Any]:
    from docx import Document
    from docx.shared import Pt

    hidden_texts: List[str] = []
    findings: List[Dict[str, Any]] = []
    visible_chars = 0
    hidden_chars = 0

    try:
        doc = Document(BytesIO(content))
    except Exception:
        return {'hiddenText': [], 'findings': [], 'hiddenRatio': 0.0, 'error': 'Cannot parse DOCX'}

    # Collect all paragraphs including tables, headers, footers
    all_paragraphs = list(doc.paragraphs)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                all_paragraphs.extend(cell.paragraphs)

    # Headers and footers
    for section in doc.sections:
        try:
            if section.header:
                all_paragraphs.extend(section.header.paragraphs)
        except Exception:
            pass
        try:
            if section.footer:
                all_paragraphs.extend(section.footer.paragraphs)
        except Exception:
            pass

    for para in all_paragraphs:
        for run in para.runs:
            text = run.text.strip()
            if not text:
                continue

            reasons: List[str] = []

            # Vanish (hidden) property
            try:
                if run.font.hidden:
                    reasons.append('vanish_property')
            except Exception:
                pass

            # Tiny font
            try:
                if run.font.size is not None and run.font.size < Pt(4):
                    reasons.append('tiny_font')
            except Exception:
                pass

            # White text color
            try:
                rgb = run.font.color.rgb if run.font.color and run.font.color.type else None
                if rgb is not None:
                    r, g, b = rgb[0], rgb[1], rgb[2]
                    if r >= 240 and g >= 240 and b >= 240:
                        reasons.append('white_text')
            except Exception:
                pass

            if reasons:
                hidden_texts.append(text)
                hidden_chars += len(text)
                findings.append({
                    'page': 0,
                    'reasons': reasons,
                    'sample': text[:150],
                })
            else:
                visible_chars += len(text)

    total = max(1, visible_chars + hidden_chars)
    return {
        'hiddenText': hidden_texts,
        'findings': findings,
        'hiddenRatio': round(hidden_chars / total, 4),
    }


def scan_file(content: bytes, filename: str, content_type: Optional[str] = None) -> Dict[str, Any]:
    name = (filename or '').lower()
    if name.endswith('.pdf') or content_type == 'application/pdf':
        return scan_pdf(content)
    if name.endswith('.docx'):
        return scan_docx(content)
    return {'hiddenText': [], 'findings': [], 'hiddenRatio': 0.0, 'note': 'Unsupported format for hidden text scan'}