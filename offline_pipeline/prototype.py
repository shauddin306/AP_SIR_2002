import os
import cv2
import numpy as np
from pdf2image import convert_from_path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load Supabase credentials
load_dotenv('../.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing Supabase credentials in .env.local")
    exit(1)

supabase: Client = create_client(url, key)

def download_pdf(bucket_name, file_path, download_dest):
    print(f"Downloading {file_path} from {bucket_name}...")
    res = supabase.storage.from_(bucket_name).download(file_path)
    with open(download_dest, 'wb') as f:
        f.write(res)
    print(f"Saved to {download_dest}")

def crop_voter_boxes(image_path, output_dir):
    print(f"Processing image {image_path}...")
    
    # Load image, grayscale, blur
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Thresholding
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 4
    )

    # Detect horizontal lines
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    cnts_h = cv2.findContours(detect_horizontal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts_h = cnts_h[0] if len(cnts_h) == 2 else cnts_h[1]

    # Detect vertical lines
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    detect_vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    cnts_v = cv2.findContours(detect_vertical, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts_v = cnts_v[0] if len(cnts_v) == 2 else cnts_v[1]

    # Combine
    table_mask = cv2.addWeighted(detect_horizontal, 0.5, detect_vertical, 0.5, 0.0)
    
    # Find contours (the boxes)
    contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    box_count = 0
    # Sort from top-left to bottom-right heuristically
    bounding_boxes = [cv2.boundingRect(c) for c in contours]
    # Filter out tiny boxes
    valid_boxes = [b for b in bounding_boxes if b[2] > 200 and b[3] > 100]
    
    # Sort boxes (Y-axis first, then X-axis)
    valid_boxes.sort(key=lambda b: (b[1] // 100, b[0]))
    
    for x, y, w, h in valid_boxes:
        # Crop the image
        cropped = img[y:y+h, x:x+w]
        cv2.imwrite(f"{output_dir}/box_{box_count}.jpg", cropped)
        box_count += 1

    print(f"Extracted {box_count} voter boxes!")
    return box_count

if __name__ == "__main__":
    # Example: Test with Assembly 152 Part 10
    pdf_filename = "152_10_1780856221182.pdf"
    
    # Step 1: Download
    if not os.path.exists(pdf_filename):
        try:
            download_pdf("voter-pdfs", pdf_filename, pdf_filename)
        except Exception as e:
            print(f"Download failed: {e}")
            # Try getting it from the db directly or a local sample
            pass

    if os.path.exists(pdf_filename):
        # Step 2: Convert to Image
        print("Converting PDF to Images...")
        # Just convert the 3rd page for prototyping (where voter names usually start)
        pages = convert_from_path(pdf_filename, dpi=300, first_page=3, last_page=3)
        if len(pages) > 0:
            page_img_path = "page_3.jpg"
            pages[0].save(page_img_path, "JPEG")
            
            # Step 3: Crop boxes
            crop_voter_boxes(page_img_path, "cropped_boxes")
            print("Done extracting boxes! Now running Surya Deep Learning OCR on the first box...")
            
            # Step 4: Run Surya OCR on the first box
            first_box_path = "cropped_boxes/box_0.jpg"
            if os.path.exists(first_box_path):
                print("-" * 50)
                os.system(f"surya_ocr {first_box_path}")
                print("-" * 50)
                print("Look at the terminal above! The Telugu and English text was extracted 100% offline.")
        else:
            print("No pages extracted.")
    else:
        print("PDF not found locally to process.")
