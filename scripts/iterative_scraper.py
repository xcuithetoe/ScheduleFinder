#!/usr/bin/env python3
"""
Iterative Course Scraper for College of Letters and Science Courses
===================================================================

Iterates through courses listed in college_letters_and_science_courses.txt,
checks against course_info.json to prevent duplicates, fetches real-time 
course schedule, lecture, discussion, requisite, and restriction data from 
UCLA SOC, and saves each newly scraped course immediately into course_info.json.
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import time
import re
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup

from scripts.scrape_courses import (
    fetch_summary_with_model,
    fetch_full_class_detail,
    fetch_tooltip_by_params,
    parse_section_row,
    DEFAULT_TERM
)

COURSES_FILE = 'college_letters_and_science_courses.txt'
OUTPUT_FILE = 'course_info.json'
MODELS_FILE = 'all_soc_models_26F.json'

def load_courses(file_path=COURSES_FILE):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        sys.exit(1)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    courses = [c.strip() for c in content.split(',') if c.strip()]
    return courses

def load_existing_data(file_path=OUTPUT_FILE):
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data
        except Exception as e:
            print(f"Warning: Could not load existing {file_path}: {e}")
    return {}

def save_data(data, file_path=OUTPUT_FILE):
    # Save atomically to avoid corruption
    temp_file = file_path + '.tmp'
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(temp_file, file_path)

def load_soc_models():
    if os.path.exists(MODELS_FILE):
        with open(MODELS_FILE, 'r', encoding='utf-8') as f:
            all_subj_models = json.load(f)
    else:
        all_subj_models = {}

    model_by_key = {}
    for subj, models in all_subj_models.items():
        for k, m in models.items():
            if m.get('IsRoot', True):
                model_by_key[k] = m
                if k.endswith('001'):
                    base_k = k[:-3]
                    if base_k not in model_by_key:
                        model_by_key[base_k] = m
    return model_by_key

def scrape_course_with_model(model, course_code, term=DEFAULT_TERM):
    try:
        lec_html = fetch_summary_with_model(model)
        if not lec_html:
            return None, None
    except Exception as e:
        print(f"  [X] Error fetching summary for {course_code}: {e}")
        return None, None

    soup = BeautifulSoup(lec_html, "html.parser")
    data_rows = soup.find_all("div", class_=lambda c: c and "data_row" in c and "primary-row" in c)
    if not data_rows:
        return None, None

    found_title = course_code
    for lbl in soup.find_all("label", class_="screenReaderOnly"):
        m = re.search(r"Select\s+(?:.*?\s+)?([A-Za-z]*\d+[A-Za-z]*\s*-\s*.*?)(?:\s+Lec|\s+Dis|$)", lbl.get_text(strip=True), re.I)
        if m:
            found_title = m.group(1).strip()
            break

    lectures = []
    for row in data_rows:
        lec_data = parse_section_row(row)
        cid = lec_data.pop("_class_id")
        cno = lec_data.pop("_class_no")
        lec_data["class_id"] = cid
        lec_data["class_no"] = cno
        lec_data["discussions"] = []

        if cid and cno:
            extra = fetch_full_class_detail(term, model["SubjectAreaCode"], model["CatalogNumber"], cid, cno)
            lec_data.update(extra)

            disc_model = {
                "Term": term,
                "SubjectAreaCode": model["SubjectAreaCode"],
                "CatalogNumber": model["CatalogNumber"],
                "IsRoot": False,
                "SessionGroup": None,
                "ClassNumber": f" {cno.strip()}  ",
                "SequenceNumber": "1",
                "Path": f"{cid}_{model['Path']}",
                "MultiListedClassFlag": "n",
                "Token": base64.b64encode(f"{model['CatalogNumber']}{cid}_{model['Path']}".encode()).decode()
            }
            try:
                disc_html = fetch_summary_with_model(disc_model)
                if disc_html:
                    disc_soup = BeautifulSoup(disc_html, "html.parser")
                    disc_rows = disc_soup.find_all("div", class_=lambda c: c and "data_row" in c and "primary-row" not in c)
                    discs_parsed = [parse_section_row(dr) for dr in disc_rows]

                    discussions = []
                    # Strategy 2: Only query tooltip if section has an indicator badge
                    discs_to_query = [d for d in discs_parsed if d.get("indicator")]
                    discs_no_query = [d for d in discs_parsed if not d.get("indicator")]

                    for d in discs_no_query:
                        d["class_id"] = d.pop("_class_id", None)
                        d["class_no"] = d.pop("_class_no", None)
                        d["restrictions"] = {"section": None, "class": None, "raw": []}
                        d["class_notes"] = []
                        d["requisites"] = []
                        d["grade_type"] = None
                        discussions.append(d)

                    if discs_to_query:
                        with ThreadPoolExecutor(max_workers=3) as disc_exec:
                            future_to_d = {
                                disc_exec.submit(fetch_tooltip_by_params, term, model["SubjectAreaCode"], model["CatalogNumber"], d.get("_class_id"), d.get("_class_no")): d
                                for d in discs_to_query
                            }
                            for f in as_completed(future_to_d):
                                d = future_to_d[f]
                                tip = f.result() or {}
                                d["class_id"] = d.pop("_class_id", None)
                                d["class_no"] = d.pop("_class_no", None)
                                d["restrictions"] = tip.get("restrictions", {"section": None, "class": None, "raw": []})
                                d["class_notes"] = tip.get("class_notes", [])
                                d["requisites"] = tip.get("requisites", [])
                                d["grade_type"] = tip.get("grade_type", None)
                                discussions.append(d)

                    discussions.sort(key=lambda x: x["section_id"])
                    lec_data["discussions"] = discussions

                    sec_restrs = [d["restrictions"]["section"] for d in discussions if d.get("restrictions") and d["restrictions"].get("section")]
                    distinct_sec_restrs = sorted(list(set(sec_restrs)))

                    open_discs = [d for d in discussions if (d.get("enrollment") or {}).get("spots_left", 0) > 0]
                    open_sec_restrs = [d["restrictions"]["section"] for d in open_discs if d.get("restrictions") and d["restrictions"].get("section")]
                    distinct_open_restrs = sorted(list(set(open_sec_restrs)))

                    lec_data["effective_discussion_restrictions"] = {
                        "distinct_restrictions": distinct_sec_restrs,
                        "has_restricted_discussions": len(distinct_sec_restrs) > 0,
                        "all_discussions_restricted": len(sec_restrs) == len(discussions) and len(discussions) > 0,
                        "all_open_discussions_restricted": len(open_sec_restrs) == len(open_discs) and len(open_discs) > 0,
                        "open_discussions_restrictions": distinct_open_restrs
                    }

            except Exception as e:
                print(f"  Error fetching discussions for {course_code}: {e}")

        lectures.append(lec_data)

    return course_code, {
        "course": {
            "title": found_title,
            "course_code": course_code
        },
        "lectures": lectures
    }

def run_iterative_scraping(input_file=COURSES_FILE, output_file=OUTPUT_FILE, start_index=0, max_scrape=None):
    courses = load_courses(input_file)
    existing_data = load_existing_data(output_file)
    soc_models = load_soc_models()

    total_courses = len(courses)
    print(f"[*] Loaded {total_courses} courses from {input_file}")
    print(f"[*] Loaded {len(existing_data)} existing courses from {output_file}")
    print(f"[*] Loaded {len(soc_models)} pre-indexed SOC models for Term {DEFAULT_TERM}")

    newly_scraped = 0
    already_present = 0
    not_offered = 0

    end_index = total_courses if max_scrape is None else min(total_courses, start_index + max_scrape)

    for i in range(start_index, end_index):
        course_name = courses[i]
        
        # 1. Check if course already exists in course_info.json (avoid duplicates!)
        if course_name in existing_data:
            already_present += 1
            continue

        # 2. Check if course has a model in SOC offerings for this term
        model = soc_models.get(course_name)
        if not model:
            not_offered += 1
            continue

        # 3. Use scraper to get data
        print(f"\n[{i+1}/{total_courses}] Scraping course: {course_name} ...")
        c_code, c_data = scrape_course_with_model(model, course_name)
        time.sleep(0.4)

        if c_code and c_data and c_data.get('lectures'):
            # 4. Save data in file immediately
            existing_data[c_code] = c_data
            save_data(existing_data, output_file)
            newly_scraped += 1

            lecs = len(c_data['lectures'])
            discs = sum(len(l.get('discussions', [])) for l in c_data['lectures'])
            print(f"  [+] Saved {c_code} ({c_data['course']['title']}) -> {lecs} lecs, {discs} discs. Total saved: {len(existing_data)}")
        else:
            not_offered += 1
            print(f"  [-] No active lectures found for {course_name}")

    print("\n" + "="*60)
    print(f"Iteration completed:")
    print(f"  Newly scraped & saved: {newly_scraped}")
    print(f"  Already in file:       {already_present}")
    print(f"  Not offered in {DEFAULT_TERM}:   {not_offered}")
    print(f"  Total courses in {output_file}: {len(existing_data)}")
    print("="*60)

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Iterative UCLA SOC Course Scraper")
    parser.add_argument('-i', '--input', default=COURSES_FILE, help=f'Input text file of courses (default: {COURSES_FILE})')
    parser.add_argument('-o', '--output', default=OUTPUT_FILE, help=f'Output JSON file (default: {OUTPUT_FILE})')
    parser.add_argument('--start', type=int, default=0, help='Start index in course list')
    parser.add_argument('--limit', type=int, default=None, help='Max courses to process')
    args = parser.parse_args()

    run_iterative_scraping(input_file=args.input, output_file=args.output, start_index=args.start, max_scrape=args.limit)
