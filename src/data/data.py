import json
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK
cred = credentials.Certificate("C:/Users/dixit/OneDrive/Documents/GitHub/yupmovies/src/data/goforcab-941-2bbc38a80938.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Load data from JSON file
with open("C:/Users/dixit/OneDrive/Documents/GitHub/yupmovies/src/data/movies_ready_for_db.json", "r", encoding="utf-8") as file:
    movies = json.load(file)

# Upload data to Firestore
for movie in movies:
    doc_ref = db.collection("movies").document()
    doc_ref.set(movie)
    print(f"Uploaded: {movie['title']}")

print("All movies uploaded successfully!")
