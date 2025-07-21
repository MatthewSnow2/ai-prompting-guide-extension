#!/usr/bin/env python
"""
AI Prompting Guide - Icon Generator
This script generates placeholder icons for the Chrome extension in various sizes.
"""

from PIL import Image, ImageDraw, ImageFilter
import os

# Ensure the images directory exists
IMAGES_DIR = "images"
os.makedirs(IMAGES_DIR, exist_ok=True)

# Icon sizes required for Chrome extensions
ICON_SIZES = [16, 32, 48, 128]

def generate_icon(size):
    """Generate a circular gradient icon with brain-like circuit patterns."""
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw the circular background with gradient
    # Since PIL doesn't support gradients directly, we'll simulate it
    for i in range(size):
        # Calculate color based on position (blue to purple gradient)
        ratio = i / size
        r = int(66 + ratio * 74)  # 66 (blue) to 140 (purple)
        g = int(133 - ratio * 80)  # 133 (blue) to 53 (purple)
        b = int(244 - ratio * 100 + ratio * 111)  # 244 (blue) to 255 (purple)
        
        # Draw a line with this color
        draw.ellipse([i/2, i/2, size-i/2, size-i/2], 
                     outline=(r, g, b, 255))
    
    # Fill the center
    center_size = int(size * 0.8)
    offset = (size - center_size) // 2
    draw.ellipse([offset, offset, size-offset, size-offset], 
                 fill=(140, 82, 255, 255))  # Purple fill
    
    # Add brain-like circuit pattern (simplified for small icons)
    if size >= 32:
        # Draw main "brain" shape
        brain_size = int(size * 0.6)
        brain_offset = (size - brain_size) // 2
        
        # Draw a simplified brain shape in white
        draw.ellipse([brain_offset, brain_offset, 
                     size-brain_offset, size-brain_offset],
                     fill=(255, 255, 255, 220))
        
        # Add circuit lines
        line_width = max(1, size // 32)
        
        # Horizontal line
        draw.line([(int(size*0.3), int(size*0.5)), 
                   (int(size*0.7), int(size*0.5))], 
                  fill=(66, 133, 244, 255), width=line_width)
        
        # Vertical line
        draw.line([(int(size*0.5), int(size*0.3)), 
                   (int(size*0.5), int(size*0.7))], 
                  fill=(66, 133, 244, 255), width=line_width)
        
        # Add nodes at intersections
        node_size = max(1, size // 16)
        
        # Center node
        draw.ellipse([int(size*0.5)-node_size, int(size*0.5)-node_size, 
                      int(size*0.5)+node_size, int(size*0.5)+node_size], 
                     fill=(140, 82, 255, 255))
        
        # Edge nodes
        for x, y in [(0.3, 0.5), (0.7, 0.5), (0.5, 0.3), (0.5, 0.7)]:
            draw.ellipse([int(size*x)-node_size, int(size*y)-node_size, 
                          int(size*x)+node_size, int(size*y)+node_size], 
                         fill=(66, 133, 244, 255))
    
    # Apply a slight blur for a glow effect on larger icons
    if size >= 48:
        img = img.filter(ImageFilter.GaussianBlur(radius=1))
    
    return img

def main():
    """Generate all icon sizes and save them to the images directory."""
    print("Generating icons for AI Prompting Guide extension...")
    
    for size in ICON_SIZES:
        icon = generate_icon(size)
        filename = os.path.join(IMAGES_DIR, f"icon{size}.png")
        icon.save(filename)
        print(f"Created {filename}")
    
    print("Icon generation complete!")

if __name__ == "__main__":
    main()
