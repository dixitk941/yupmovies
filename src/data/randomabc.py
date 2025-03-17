import json
import random as rnd  # Renamed to avoid conflict
from datetime import datetime

def enhance_movie_categories(input_file, output_file):
    """
    Enhance movie categories by adding Featured, Trending Now, Top Rated, and New Release tags
    based on specific criteria.
    """
    print("Loading JSON data...")
    with open(input_file, 'r', encoding='utf-8') as f:
        movies = json.load(f)
    
    total_movies = len(movies)
    print(f"Processing {total_movies} movies")
    
    # Define percentages for each category
    featured_percentage = 0.10  # 10% of movies will be Featured
    trending_percentage = 0.15  # 15% of movies will be Trending Now
    top_rated_percentage = 0.12  # 12% of movies will be Top Rated
    
    # Calculate counts
    featured_count = int(total_movies * featured_percentage)
    trending_count = int(total_movies * trending_percentage)
    top_rated_count = int(total_movies * top_rated_percentage)
    
    print(f"Will mark {featured_count} movies as Featured")
    print(f"Will mark {trending_count} movies as Trending Now")
    print(f"Will mark {top_rated_count} movies as Top Rated")
    
    # Get current year for determining "New Release"
    current_year = 2025  # As specified in requirements
    print(f"Using {current_year} as the current year for New Release category")
    
    # Randomly select indices for each category
    all_indices = list(range(total_movies))
    rnd.shuffle(all_indices)  # Using renamed module
    
    featured_indices = set(all_indices[:featured_count])
    trending_indices = set(all_indices[featured_count:featured_count + trending_count])
    top_rated_indices = set(all_indices[featured_count + trending_count:featured_count + trending_count + top_rated_count])
    
    # Apply categories to movies
    new_release_count = 0
    
    for i, movie in enumerate(movies):
        # Ensure category exists
        if "category" not in movie:
            movie["category"] = []
            
        # Add Featured, Trending Now, Top Rated categories based on random selection
        if i in featured_indices:
            if "Featured" not in movie["category"]:
                movie["category"].append("Featured")
        
        if i in trending_indices:
            if "Trending Now" not in movie["category"]:
                movie["category"].append("Trending Now")
        
        if i in top_rated_indices:
            if "Top Rated" not in movie["category"]:
                movie["category"].append("Top Rated")
        
        # Add New Release based on the movie's year
        year = None
        if "title" in movie:
            # Extract year from title if it's in format "Movie Name (YYYY)"
            title = movie["title"]
            if "(" in title and ")" in title:
                year_str = title.split("(")[-1].split(")")[0]
                try:
                    year = int(year_str)
                except ValueError:
                    pass
        
        # Also look for year in category
        if not year and "category" in movie:
            for cat in movie["category"]:
                try:
                    if cat.isdigit() and len(cat) == 4:
                        year = int(cat)
                        break
                except ValueError:
                    pass
        
        # Mark recent movies (current year or last year) as "New Release"
        if year and (year == current_year or year == current_year - 1):
            if "New Release" not in movie["category"]:
                movie["category"].append("New Release")
                new_release_count += 1
    
    print(f"Marked {new_release_count} movies as New Release ({current_year} or {current_year-1})")
    
    # Save the enhanced data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(movies, f, indent=2)
    
    print(f"Enhanced movie categories saved to {output_file}")
    print("\nCategory summary:")
    print(f"- Featured: {featured_count} movies")
    print(f"- Trending Now: {trending_count} movies")
    print(f"- Top Rated: {top_rated_count} movies")
    print(f"- New Release: {new_release_count} movies")

if __name__ == "__main__":
    input_file = "c:/Users/dixit/OneDrive/Documents/GitHub/yupmovies/src/data/movies_with_firebase_urls.json"
    output_file = "c:/Users/dixit/OneDrive/Documents/GitHub/yupmovies/src/data/enhanced_movies.json"
    
    enhance_movie_categories(input_file, output_file)