import json
import firebase_admin
from firebase_admin import credentials, firestore
import time

# Initialize Firebase Admin SDK with your credentials file
cred = credentials.Certificate("c:/Users/dixit/OneDrive/Documents/GitHub/yupmovies/src/data/goforcab-941-2bbc38a80938.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Load data from JSON file
with open("C:/Users/dixit/OneDrive/Documents/GitHub/yupmovies/src/data/series.json", "r", encoding="utf-8") as file:
    series_data = json.load(file)

print(f"Loaded data from series.json")

# The series.json file appears to be a dictionary, not a list
if not isinstance(series_data, dict):
    print(f"Error: Expected a dictionary but got {type(series_data)}")
    exit(1)

print(f"Found {len(series_data)} series in the file")

# Upload data to Firestore with better error handling
uploaded_count = 0
error_count = 0

# Process each series in the dictionary
for i, (title, season_data) in enumerate(series_data.items()):
    try:
        # Create series document structure
        series_doc = {
            'title': title,
            'isSeries': True,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        # Add season data
        if isinstance(season_data, dict):
            for season_key, season_content in season_data.items():
                series_doc[season_key] = season_content
                
        # Create a clean ID from the title
        doc_id = title.lower().replace(' ', '_').replace('(', '').replace(')', '').replace(':', '').replace('/', '').replace('\\', '')[:100]
        
        # Set the data
        doc_ref = db.collection("series").document(doc_id)
        doc_ref.set(series_doc)
        
        uploaded_count += 1
        print(f"Uploaded {i+1}/{len(series_data)}: {title}")
        
        # Add a small delay every few uploads to avoid rate limiting
        if (i + 1) % 10 == 0:
            print(f"Progress: {i+1}/{len(series_data)} series uploaded")
            time.sleep(1)
            
    except Exception as e:
        error_count += 1
        print(f"Error uploading series {i+1} ({title}): {str(e)}")

print(f"\nUpload summary:")
print(f"- Total series processed: {len(series_data)}")
print(f"- Successfully uploaded: {uploaded_count}")
print(f"- Errors: {error_count}")

if uploaded_count == len(series_data):
    print("✅ All series uploaded successfully!")
else:
    print(f"⚠️ {error_count} series failed to upload.")