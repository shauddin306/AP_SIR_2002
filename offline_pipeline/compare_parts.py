import cv2
import os
from pdf2image import convert_from_path, pdfinfo_from_path

def inspect_pdf(pdf_path):
    print(f"\n--- Inspecting {pdf_path} ---")
    info = pdfinfo_from_path(pdf_path)
    print("PDF Info:", info)
    
    # Convert page 3
    pages = convert_from_path(pdf_path, dpi=150, first_page=3, last_page=3)
    if pages:
        img = cv2.cvtColor(np.array(pages[0]), cv2.COLOR_RGB2BGR)
        h, w = img.shape[:2]
        print(f"Page 3 Image Size (150 DPI): {w}x{h}")
        return w, h
    return None

import numpy as np
inspect_pdf('152_67_1780832393004.pdf')
inspect_pdf('152_68_1780683966722.pdf')
inspect_pdf('152_69_1780590053936.pdf')
