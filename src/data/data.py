import json
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK
cred = credentials.Certificate("src/data/goforcab-941-6b32cb292fcf.json")  # Replace with your key path
firebase_admin.initialize_app(cred)

# Connect to Firestore
db = firestore.client()

# Load the movie data JSON file
with open("src/data/enhanced_movies.json", "r") as file:  # Ensure the JSON file is in the same directory
    movies = json.load(file)

# Upload each movie to Firestore
collection_name = "movies"  # Firestore collection where data will be stored

for movie in movies:
    doc_ref = db.collection(collection_name).document()  # Auto-generate document ID
    doc_ref.set(movie)

print("Movies data successfully uploaded to Firestore!")
