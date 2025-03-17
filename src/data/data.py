import json
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK with your credentials file
cred = credentials.Certificate("c:/Users/dixit/OneDrive/Documents/GitHub/yupmovies/src/data/goforcab-941-2bbc38a80938.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Load data from JSON file - update to use your enhanced movies file
with open("C:/Users/dixit/OneDrive/Documents/GitHub/yupmovies/src/data/enhanced_movies.json", "r", encoding="utf-8") as file:
    movies = json.load(file)

print(f"Loaded {len(movies)} movies from enhanced_movies.json")

# Upload data to Firestore with better error handling
uploaded_count = 0
error_count = 0

for i, movie in enumerate(movies):
    try:
        # Use movie title or ID as document ID for easier reference
        title = movie.get('title', '')
        doc_id = None
        
        if title:
            # Create a clean ID from the title
            doc_id = title.lower().replace(' ', '_').replace('(', '').replace(')', '').replace(':', '')[:100]
        
        # Use the document ID if available, otherwise let Firestore generate one
        if doc_id:
            doc_ref = db.collection("movies").document(doc_id)
        else:
            doc_ref = db.collection("movies").document()
            
        # Set the data
        doc_ref.set(movie)
        
        uploaded_count += 1
        print(f"Uploaded {i+1}/{len(movies)}: {movie.get('title', 'Untitled')}")
        
        # Add a small delay every few uploads to avoid rate limiting
        if (i + 1) % 10 == 0:
            print(f"Progress: {i+1}/{len(movies)} movies uploaded")
            
    except Exception as e:
        error_count += 1
        print(f"Error uploading movie {i+1}: {str(e)}")

print(f"\nUpload summary:")
print(f"- Total movies processed: {len(movies)}")
print(f"- Successfully uploaded: {uploaded_count}")
print(f"- Errors: {error_count}")

if uploaded_count == len(movies):
    print("✅ All movies uploaded successfully!")
else:
    print(f"⚠️ {error_count} movies failed to upload.")