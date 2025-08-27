# api/convert.py
from flask import Flask, request, Response
import io, pdfplumber, pandas as pd

app = Flask(__name__)

@app.post('/')  # ← important: handle the function root, not /api/convert
def convert():
    if 'file' not in request.files:
        return Response('No file uploaded under field "file"', status=400)
    file = request.files['file']
    if file.filename == '' or not file.filename.lower().endswith('.pdf'):
        return Response('Please upload a .pdf file', status=400)

    pdf_bytes = file.read()
    if not pdf_bytes:
        return Response('Empty file uploaded', status=400)

    xlsx_bytes = io.BytesIO()
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf, \
         pd.ExcelWriter(xlsx_bytes, engine='openpyxl') as writer:
        idx = 0
        for page in pdf.pages:
            tables = page.extract_tables(table_settings={
                'vertical_strategy': 'lines',
                'horizontal_strategy': 'lines',
                'intersection_x_tolerance': 5,
                'intersection_y_tolerance': 5,
                'snap_tolerance': 3,
                'join_tolerance': 3,
                'edge_min_length': 3,
            }) or []
            for t in tables:
                if not t: 
                    continue
                max_len = max((len(r) for r in t), default=0)
                norm = [r + [None]*(max_len-len(r)) for r in t]
                header = norm[0]
                header_texty = sum(1 for c in header if isinstance(c, str)) >= max(1, len(header)//2)
                df = pd.DataFrame(norm[1:], columns=[str(c).strip() if c else '' for c in header]) if header_texty else pd.DataFrame(norm)
                idx += 1
                df.to_excel(writer, index=False, sheet_name=f"Table_{idx}"[:31])
        if idx == 0:
            pd.DataFrame({"note": ["No tables detected"]}).to_excel(writer, index=False, sheet_name="Summary")

    xlsx_bytes.seek(0)
    return Response(
        xlsx_bytes.getvalue(),
        headers={
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="output.xlsx"',
        },
        status=200,
    )
