import json
import firebase_admin
from firebase_admin import credentials, storage
import os
from datetime import datetime
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
import hashlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random

def refresh_firebase_credentials():
    """
    Refresh Firebase credentials and test with a simple upload
    """
    print("Attempting to refresh Firebase credentials...")
    
    try:
        # Initialize Firebase with your service account key
        cred_path = "src/data/goforcab-941-2bbc38a80938.json"
        
        # Check if credentials file exists
        if not os.path.exists(cred_path):
            print(f"❌ ERROR: Credentials file not found at {cred_path}")
            return False
            
        # Try to initialize Firebase Admin SDK
        if firebase_admin._apps:
            # If already initialized, delete the app
            for app in firebase_admin._apps.copy():
                firebase_admin.delete_app(firebase_admin.get_app(app))
        
        # Load credentials to get project ID
        with open(cred_path, 'r') as file:
            cred_data = json.load(file)
            
        project_id = cred_data.get('project_id', 'goforcab-941')
        print(f"Using project ID: {project_id}")
        
        # Use the correct bucket name
        bucket_name = f"{project_id}.appspot.com"  # Standard format
        
        # Initialize Firebase with the correct bucket
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': bucket_name
        })
        
        # Get a reference to storage
        bucket = storage.bucket()
        
        # Create a test file
        test_file_path = "temp_test_file.txt"
        with open(test_file_path, "w") as f:
            f.write(f"Test file created at {datetime.now().isoformat()}")
        
        # Upload the test file to Firebase Storage
        blob = bucket.blob(f"test/firebase_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
        blob.upload_from_filename(test_file_path)
        
        # Make the test file public
        blob.make_public()
        
        # Delete the local test file
        os.remove(test_file_path)
        
        print(f"✅ SUCCESS: Firebase connection working! Test file uploaded to {blob.public_url}")
        print(f"✅ Connected to bucket: {bucket_name}")
        return bucket
        
    except Exception as e:
        print(f"❌ ERROR: Failed to refresh Firebase credentials: {str(e)}")
        
        if "The specified bucket does not exist" in str(e):
            print("\n❌ ERROR: Bucket does not exist. Trying alternative bucket name...")
            
            # Try with firebasestorage.app domain
            try:
                if firebase_admin._apps:
                    for app in firebase_admin._apps.copy():
                        firebase_admin.delete_app(firebase_admin.get_app(app))
                
                alt_bucket_name = f"{project_id}.firebasestorage.app"
                firebase_admin.initialize_app(cred, {
                    'storageBucket': alt_bucket_name
                })
                
                bucket = storage.bucket()
                blob = bucket.blob(f"test/firebase_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
                blob.upload_from_filename(test_file_path)
                blob.make_public()
                os.remove(test_file_path)
                
                print(f"✅ SUCCESS: Firebase connection working with alternative bucket!")
                print(f"✅ Connected to bucket: {alt_bucket_name}")
                return bucket
                
            except Exception as alt_error:
                print(f"❌ ERROR with alternative bucket: {str(alt_error)}")
        
        if "invalid_grant" in str(e):
            print("\n🔑 SOLUTION: Your service account key has expired. Follow these steps:")
            print("1. Go to the Firebase Console (https://console.firebase.google.com/)")
            print("2. Select your project")
            print("3. Go to Project Settings > Service accounts")
            print("4. Click 'Generate new private key'")
            print("5. Download the new key and replace the existing one at:", cred_path)
        
        return None

def is_valid_image_url(url):
    """Check if URL is a valid image URL"""
    if not url or not isinstance(url, str):
        return False
    
    if url.startswith('data:image/svg+xml;base64,'):
        return False
    
    return url.startswith('http') and any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp'])

def download_image(url, movie_title, image_type, index=0):
    """Download image from URL with multiple fallback options"""
    try:
        if not is_valid_image_url(url):
            return None
        
        # Create a filename based on movie title and image type
        title_slug = ''.join(c for c in movie_title if c.isalnum() or c.isspace()).strip().replace(' ', '_').lower()[:50]
        url_hash = hashlib.md5(url.encode()).hexdigest()[:10]
        extension = os.path.splitext(urlparse(url).path)[1].lower() or '.jpg'
        if not extension.startswith('.'):
            extension = '.jpg'
        
        filename = f"{title_slug}_{image_type}_{index}_{url_hash}{extension}"
        filepath = os.path.join('temp_images', filename)
        
        # Create temp directory if it doesn't exist
        if not os.path.exists('temp_images'):
            os.makedirs('temp_images')
        
        # Check if file already exists and is valid
        if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
            try:
                with Image.open(filepath) as img:
                    # Just verify the image
                    img.verify()
                print(f"Using cached image for {movie_title} ({image_type})")
                return filepath
            except Exception:
                # If verification fails, remove the file and try again
                os.remove(filepath)
        
        # Setup session with headers
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
        })
        
        # Prepare list of URLs to try
        urls_to_try = [url]
        
        # Original domain/path info
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        path = parsed_url.path
        filename_only = os.path.basename(path)
        
        # Add alternative URLs based on common patterns
        if domain == 'vegamovies.st' or domain == 'vegamovies.ps':
            # Try different domain variations
            if domain == 'vegamovies.st':
                urls_to_try.append(f"https://vegamovies.ps{path}")
            else:
                urls_to_try.append(f"https://images.weserv.nl/?url=https://{domain}{path}")
                
                urls_to_try.append(f"https://vegamovies.st{path}")

            urls_to_try.append(f"https://images.weserv.nl/?url=https://{domain}{path}")
    
            
            # Try with web.archive.org
            urls_to_try.append(f"https://web.archive.org/web/0/https://{domain}{path}")
            
            # Try image proxy services
            urls_to_try.append(f"https://wsrv.nl/?url=https://{domain}{path}")
            
            # Try Google's cache (doesn't always work but worth trying)
            urls_to_try.append(f"https://webcache.googleusercontent.com/search?q=cache:https://{domain}{path}")
            
            # Search for filename in alternative domains
            title_keywords = movie_title.split()
            if title_keywords:
                main_keyword = title_keywords[0].lower()
                year = ""
                # Extract year if present
                for word in title_keywords:
                    if word.startswith("(") and word.endswith(")") and len(word) == 6:
                        year = word[1:5]  # Extract year from (YYYY)
                
                # If we have a keyword and year, try Google Images Search via proxies
                if main_keyword and year:
                    search_query = f"{main_keyword} {year} movie poster"
                    urls_to_try.append(f"https://www.google.com/search?q={search_query}&tbm=isch")
                
        elif domain == 'imgbb.top':
            # Try image proxy services for imgbb
            urls_to_try.append(f"https://img.freepik.com/free-photo/{filename_only}")
            urls_to_try.append(f"https://images.weserv.nl/?url=https://{domain}{path}")
            urls_to_try.append(f"https://wsrv.nl/?url=https://{domain}{path}")
            
        elif domain == 'i.imgur.com':
            # Try alternative imgur domains
            img_id = filename_only.split('.')[0]
            urls_to_try.append(f"https://imgur.com/{img_id}.jpg")
            urls_to_try.append(f"https://imgur.com/{img_id}.png")
            
        # For image type 'featured', also try searching for movie posters
        if image_type == 'featured':
            # Clean movie title and search for poster
            clean_title = movie_title.replace('(', '').replace(')', '').strip()
            urls_to_try.append(f"https://www.themoviedb.org/search?query={clean_title}")
        
        # Try each URL until one works
        for attempt_url in urls_to_try:
            try:
                print(f"Trying URL: {attempt_url}")
                
                response = session.get(attempt_url, timeout=10, stream=True)
                response.raise_for_status()
                
                # Check if we got an actual image
                content_type = response.headers.get('Content-Type', '')
                content_length = int(response.headers.get('Content-Length', 0))
                
                if 'image/' not in content_type and 'text/html' in content_type:
                    # If it's an HTML page, this might be a search result
                    # We would need to parse HTML to extract image URLs, which is complex
                    # For now, skip this URL
                    print(f"Skipping HTML content from {attempt_url}")
                    continue
                
                if content_length < 1000:
                    print(f"Skipping small file ({content_length} bytes) from {attempt_url}")
                    continue
                
                # Save the image
                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                # Verify it's a valid image
                try:
                    with Image.open(filepath) as img:
                        img.verify()
                    print(f"✅ Successfully downloaded image from {attempt_url}")
                    return filepath
                except Exception as img_error:
                    print(f"Downloaded file is not a valid image: {img_error}")
                    os.remove(filepath)
                    continue
            
            except Exception as e:
                print(f"Error with URL {attempt_url}: {str(e)}")
                continue
            
            time.sleep(0.5)  # Be nice to servers
        
        print(f"⚠️ All download attempts failed for {movie_title} ({image_type})")
        return generate_placeholder_image(movie_title, image_type, filepath)
    
    except Exception as e:
        print(f"Error in download process: {str(e)}")
        return None

def generate_placeholder_image(movie_title, image_type, output_path):
    """Generate a placeholder image when download fails"""
    try:
        # For featured images, create a portrait (poster-like) image
        width = 600
        height = 900
        
        # Create a gradient background
        image = Image.new('RGB', (width, height), color=(16, 16, 24))
        draw = ImageDraw.Draw(image)
        
        # Add some visual interest with gradient
        for y in range(height):
            for x in range(width):
                # Add some noise and gradient
                noise = random.randint(-10, 10)
                gradient = int(y / height * 40)
                r = min(255, 16 + gradient + noise)
                g = min(255, 16 + gradient + noise)
                b = min(255, 24 + int(gradient * 1.5) + noise)
                draw.point((x, y), fill=(r, g, b))
        
        # Add movie title
        try:
            font_size = 40
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()

        title = movie_title
        if len(title) > 20:
            title = title[:20] + "..."
        
        # Draw title with shadow
        text_width = draw.textlength(title, font=font)
        position = ((width - text_width) // 2, height // 2 - 25)
        draw.text((position[0]+2, position[1]+2), title, font=font, fill=(0, 0, 0, 128))
        draw.text(position, title, font=font, fill=(255, 255, 255))
        
        # Save the image
        image.save(output_path)
        print(f"Generated placeholder for {movie_title}")
        return output_path
    
    except Exception as e:
        print(f"Error generating placeholder: {str(e)}")
        return None

def upload_to_firebase(bucket, local_path, movie_title, image_type):
    """Upload image to Firebase Storage and return public URL"""
    try:
        if not bucket or not local_path or not os.path.exists(local_path):
            return None
        
        # Create a storage path for the image
        title_slug = ''.join(c for c in movie_title if c.isalnum() or c.isspace()).strip().replace(' ', '_').lower()[:50]
        extension = os.path.splitext(local_path)[1]
        storage_path = f"movie_images/{title_slug}/{image_type}{extension}"
        
        # Upload the file
        blob = bucket.blob(storage_path)
        blob.upload_from_filename(local_path)
        
        # Make the file publicly accessible
        blob.make_public()
        
        print(f"Uploaded {image_type} image for {movie_title}")
        return blob.public_url
    except Exception as e:
        print(f"Error uploading {local_path} to Firebase Storage: {str(e)}")
        return None

def process_movies_json():
    """Process the movies JSON file, download images and upload to Firebase"""
    # First get a valid bucket connection
    bucket = refresh_firebase_credentials()
    if not bucket:
        print("❌ ERROR: Failed to connect to Firebase Storage")
        return
    
    # Load the JSON file
    input_file = "src/data/firebase_ready_series.json"
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            movies = json.load(f)
        print(f"Loaded {len(movies)} movies from JSON file")
    except Exception as e:
        print(f"Error loading JSON file: {str(e)}")
        return
    
    # Process each movie
    updated_movies = []
    for i, movie in enumerate(movies):
        try:
            title = movie.get('title', f"Movie {i+1}")
            print(f"Processing {i+1}/{len(movies)}: {title}")
            
            updated_movie = movie.copy()
            
            # Process featured image if available
            featured_image = movie.get('featured_image')
            if featured_image:
                local_path = download_image(featured_image, title, 'featured')
                if local_path:
                    firebase_url = upload_to_firebase(bucket, local_path, title, 'featured')
                    if firebase_url:
                        updated_movie['featured_image'] = firebase_url
                        print(f"✓ Updated featured image URL")
            
            # Process main image if available
            main_image = movie.get('image')
            if main_image:
                local_path = download_image(main_image, title, 'main')
                if local_path:
                    firebase_url = upload_to_firebase(bucket, local_path, title, 'main')
                    if firebase_url:
                        updated_movie['image'] = firebase_url
                        print(f"✓ Updated main image URL")
            
            updated_movies.append(updated_movie)
            
            # Save progress periodically
            if (i+1) % 10 == 0 or i+1 == len(movies):
                output_file = "src/data/series.json"
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(updated_movies, f, indent=2)
                print(f"✅ Progress saved: {i+1}/{len(movies)} movies processed")
        
        except Exception as e:
            print(f"Error processing movie {i+1}: {str(e)}")
            # Still add the original movie to avoid data loss
            updated_movies.append(movie)
    
    print("✅ All movies processed and saved to movies_with_firebase_urls.json")

def process_series_json():
    """Process the series JSON file, download images and upload to Firebase"""
    # First get a valid bucket connection
    bucket = refresh_firebase_credentials()
    if not bucket:
        print("❌ ERROR: Failed to connect to Firebase Storage")
        return
    
    # Load the JSON file
    input_file = "src/data/series_ready_for_db.json"
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            series = json.load(f)
        print(f"Loaded {len(series)} series from JSON file")
    except Exception as e:
        print(f"Error loading JSON file: {str(e)}")
        return
    
    # Process each series
    updated_series = []
    for i, show in enumerate(series):
        try:
            title = show.get('title', f"Series {i+1}")
            print(f"Processing {i+1}/{len(series)}: {title}")
            
            updated_show = show.copy()
            
            # Process featured image if available
            featured_image = show.get('featured_image')
            if featured_image:
                local_path = download_image(featured_image, title, 'featured')
                if local_path:
                    firebase_url = upload_to_firebase(bucket, local_path, title, 'featured')
                    if firebase_url:
                        updated_show['featured_image'] = firebase_url
                        print(f"✓ Updated featured image URL")
            
            # Process screenshots (extract individual URLs and process separately)
            screenshots = show.get('movie_screenshots')
            if screenshots and isinstance(screenshots, str):
                # Extract image URLs from the HTML
                import re
                img_urls = re.findall(r'src="([^"]+)"', screenshots)
                valid_img_urls = [url for url in img_urls if is_valid_image_url(url)]
                
                processed_screenshots = []
                for idx, img_url in enumerate(valid_img_urls):
                    local_path = download_image(img_url, title, f'screenshot_{idx}', idx)
                    if local_path:
                        firebase_url = upload_to_firebase(bucket, local_path, title, f'screenshot_{idx}')
                        if firebase_url:
                            processed_screenshots.append(f'<img src="{firebase_url}">')
                
                if processed_screenshots:
                    updated_show['movie_screenshots'] = ' '.join(processed_screenshots)
                    print(f"✓ Updated {len(processed_screenshots)} screenshots")
            
            updated_series.append(updated_show)
            
            # Save progress periodically
            if (i+1) % 5 == 0 or i+1 == len(series):
                output_file = "src/data/series.json"
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(updated_series, f, indent=2)
                print(f"✅ Progress saved: {i+1}/{len(series)} series processed")
        
        except Exception as e:
            print(f"Error processing series {i+1}: {str(e)}")
            # Still add the original series to avoid data loss
            updated_series.append(show)
    
    print("✅ All series processed and saved to series.json")

if __name__ == "__main__":
    process_series_json()