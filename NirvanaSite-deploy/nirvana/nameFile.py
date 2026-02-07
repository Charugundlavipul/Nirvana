import os

folder = r"C:\Users\ASUS\OneDrive\Desktop\College\Paisaa\Hopefully Final\NirvanaSite\nirvana\public\data\Nirvana"
image_exts = ('.webp', '.avif', '.jpg', '.jpeg', '.png')

# Sort for consistent order
image_files = sorted(f for f in os.listdir(folder) if f.lower().endswith(image_exts))

for name in image_files:
    print(f'"/data/Nirvana/{name}",')