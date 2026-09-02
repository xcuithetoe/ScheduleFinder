import os
import sys
import json

def update_bruinwalk_reviews(course_professor_key, reviews_list, target_file="Bruinwalk_Reviews.json"):
    """
    Appends or updates reviews for a given course-professor in Bruinwalk_Reviews.json.
    Deduplicates reviews based on review_id.
    """
    data = {}
    if os.path.exists(target_file):
        try:
            with open(target_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Warning: Could not read existing {target_file}: {e}")
            data = {}

    existing_reviews = data.get(course_professor_key, [])
    seen_ids = set(r.get("review_id") for r in existing_reviews if r.get("review_id"))

    for r in reviews_list:
        rid = r.get("review_id")
        if rid:
            if rid not in seen_ids:
                seen_ids.add(rid)
                existing_reviews.append(r)
        else:
            existing_reviews.append(r)

    data[course_professor_key] = existing_reviews

    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Successfully saved {len(existing_reviews)} total reviews for '{course_professor_key}' to {target_file}.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python save_reviews.py <CourseName-Professor> <path_to_reviews_json> [target_file]")
        sys.exit(1)

    key = sys.argv[1]
    input_json = sys.argv[2]
    out_file = sys.argv[3] if len(sys.argv) > 3 else "Bruinwalk_Reviews.json"

    with open(input_json, "r", encoding="utf-8") as infile:
        revs = json.load(infile)

    update_bruinwalk_reviews(key, revs, out_file)
