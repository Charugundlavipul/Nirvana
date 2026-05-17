
import sys
from PIL import Image

def process_logo(input_path, output_cropped, output_transparent):
    img = Image.open(input_path).convert('RGBA')
    
    # Get bounding box of non-white pixels
    bg = Image.new(img.mode, img.size, (255, 255, 255, 255))
    diff = Image.composite(img, bg, img)
    # Convert diff to grayscale
    gray = diff.convert('L')
    # Anything not 255 (white) is foreground
    bbox = gray.point(lambda p: 255 if p < 250 else 0).getbbox()
    
    if bbox:
        img = img.crop(bbox)
        print(f'Cropped to {bbox}')
    
    # Save cropped with background
    img.save(output_cropped)
    print(f'Saved {output_cropped}')
    
    # Create transparent version
    data = img.getdata()
    new_data = []
    for item in data:
        # If white or very close to white, make transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    img.save(output_transparent)
    print(f'Saved {output_transparent}')

process_logo(r'C:\Users\charu\.gemini\antigravity\brain\fbe9e2aa-c902-4ba7-970b-ad6f9e1c549b\media__1778976864794.png', 'public/assets/nirvana_logo.png', 'public/assets/nirvana_logo_transparent.png')
