import io
import os
from flask import Flask, request, Response
import pdfplumber
import pandas as pd

app = Flask(__name__)

@app.post('/api/convert')
def convert():
    if 'file' not in request.files:
        return Response('No file uploaded under field "file"', status=400)

    file = request.files['file']
    if file.filename == '' or not file.filename.lower().endswith('.pdf'):
        return Response('Please upload a .pdf file', status=400)

    # Read PDF bytes
    pdf_bytes = file.read()
    if not pdf_bytes:
        return Response('Empty file uploaded', status=400)

    # Extract tables from all pages
    xlsx_bytes = io.BytesIO()
    all_tables = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        table_idx = 0
        with pd.ExcelWriter(xlsx_bytes, engine='openpyxl') as writer:
            for page_number, page in enumerate(pdf.pages, start=1):
                # You can tweak table_settings for your PDFs if needed
                tables = page.extract_tables(
                    table_settings={
                        'vertical_strategy': 'lines',
                        'horizontal_strategy': 'lines',
                        'intersection_x_tolerance': 5,
                        'intersection_y_tolerance': 5,
                        'snap_tolerance': 3,
                        'join_tolerance': 3,
                        'edge_min_length': 3,
                    }
                ) or []

                for t in tables:
                    # Some tables include header row in t[0]
                    if len(t) == 0:
                        continue
                    # Normalize ragged rows
                    max_len = max((len(r) for r in t), default=0)
                    norm = [ (r + [None]*(max_len-len(r))) for r in t ]

                    # Try first row as header if it looks header-ish, else default col names
                    header = norm[0]
                    header_is_texty = sum(1 for c in header if isinstance(c, str)) >= max(1, len(header)//2)
                    if header_is_texty:
                        df = pd.DataFrame(norm[1:], columns=[str(c).strip() if c is not None else '' for c in header])
                    else:
                        df = pd.DataFrame(norm)

                    table_idx += 1
                    sheet_name = f"Table_{table_idx}"
                    # Excel sheet names max 31 chars
                    df.to_excel(writer, index=False, sheet_name=sheet_name[:31])

            # If no tables found, produce an empty workbook with a note
            if table_idx == 0:
                pd.DataFrame({"note": ["No tables detected"]}).to_excel(writer, index=False, sheet_name='Summary')

    xlsx_bytes.seek(0)

    headers = {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="output.xlsx"'
    }
    return Response(xlsx_bytes.getvalue(), headers=headers, status=200)