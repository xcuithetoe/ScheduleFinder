#!/usr/bin/env python3
"""
UCLA Fast Course Enrollment Data Refresher
==========================================
Re-scrapes ONLY real-time enrollment data (enrolled, capacity, spots_left, 
waitlist status, and open discussion restriction recalculation) for courses 
already in course_info.json.

Skips heavy static metadata (ClassDetail, ClassDetailTooltip, GE foundations,
descriptions, requisites, exams) to achieve maximum speed while strictly 
respecting the global 3.5 req/s rate limit.
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import time
import re
import base64
import argparse
import signal
import atexit
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup

from scripts.scrape_courses import (
    fetch_summary_with_model,
    parse_section_row,
    get_models_for_subject,
    DEFAULT_TERM
)

COURSE_INFO_FILE = 'course_info.json'
MODELS_CACHE_FILE = 'cached_soc_models_26F.json'

def load_course_info(file_path=COURSE_INFO_FILE):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        sys.exit(1)
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_course_info(data, file_path=COURSE_INFO_FILE):
    # Sort keys alphabetically to maintain strict alphabetical sequencing
    sorted_data = dict(sorted(data.items(), key=lambda item: item[0]))
    temp_file = file_path + '.tmp'
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(sorted_data, f, indent=2, ensure_ascii=False)
    os.replace(temp_file, file_path)

def load_or_fetch_models(course_codes, term=DEFAULT_TERM, cache_file=MODELS_CACHE_FILE):
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cached = json.load(f)
                if len(cached) > 500:
                    print(f"[*] Loaded {len(cached)} models from cache ({cache_file})")
                    return cached
        except Exception as e:
            print(f"[*] Cache load failed ({e}), re-fetching models...")

    subjects = set()
    for c in course_codes:
        m = re.match(r'^([A-Za-z&]+)', c)
        if m:
            subjects.add(m.group(1))

    print(f"[*] Fetching SOC models for {len(subjects)} subjects...")
    all_models = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_subj = {executor.submit(get_models_for_subject, term, s): s for s in sorted(subjects)}
        for f in as_completed(future_to_subj):
            s = future_to_subj[f]
            try:
                m_dict = f.result()
                for k, m in m_dict.items():
                    if m.get('IsRoot', True):
                        all_models[k] = m
                        if k.endswith('001'):
                            base_k = k[:-3]
                            if base_k not in all_models:
                                all_models[base_k] = m
            except Exception as e:
                print(f"  [X] Error fetching models for {s}: {e}")

    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(all_models, f)
        print(f"[*] Cached {len(all_models)} models to {cache_file}")
    except Exception as e:
        print(f"[*] Warning: Could not write cache file: {e}")

    return all_models

def refresh_course_enrollment(course_code, course_record, model, term=DEFAULT_TERM):
    """
    Refreshes enrollment for lectures and discussions of a course.
    Returns (updated_course_record, num_changes_detected).
    """
    changes = 0
    try:
        lec_html = fetch_summary_with_model(model)
        if not lec_html:
            return course_record, 0
    except Exception as e:
        print(f"  [X] Error fetching summary for {course_code}: {e}")
        return course_record, 0

    soup = BeautifulSoup(lec_html, "html.parser")
    data_rows = soup.find_all("div", class_=lambda c: c and "data_row" in c and "primary-row" in c)
    if not data_rows:
        return course_record, 0

    parsed_lecs = {}
    for r in data_rows:
        p = parse_section_row(r)
        if p.get("section_id"):
            parsed_lecs[p["section_id"]] = p
        if p.get("_class_id"):
            parsed_lecs[p["_class_id"]] = p

    for lec in course_record.get("lectures", []):
        sec_id = lec.get("section_id")
        cid = lec.get("class_id")
        match = parsed_lecs.get(sec_id) or (parsed_lecs.get(cid) if cid else None)

        if match:
            # Check for changes in lecture enrollment
            old_enr = lec.get("enrollment") or {}
            new_enr = match.get("enrollment") or {}
            old_stat = lec.get("status")
            new_stat = match.get("status")

            if old_enr.get("enrolled") != new_enr.get("enrolled") or old_stat != new_stat:
                changes += 1

            lec["status"] = new_stat
            lec["enrollment"] = new_enr
            if match.get("waitlist"):
                lec["waitlist"] = match["waitlist"]

        # If lecture has discussions, refresh discussion enrollment
        discussions = lec.get("discussions", [])
        if discussions and cid:
            cno = lec.get("class_no", "001")
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
                    parsed_discs = {}
                    for dr in disc_rows:
                        dp = parse_section_row(dr)
                        if dp.get("section_id"):
                            parsed_discs[dp["section_id"]] = dp
                        if dp.get("_class_id"):
                            parsed_discs[dp["_class_id"]] = dp

                    for d in discussions:
                        d_sec = d.get("section_id")
                        d_cid = d.get("class_id")
                        d_match = parsed_discs.get(d_sec) or (parsed_discs.get(d_cid) if d_cid else None)
                        if d_match:
                            old_d_enr = d.get("enrollment") or {}
                            new_d_enr = d_match.get("enrollment") or {}
                            if old_d_enr.get("enrolled") != new_d_enr.get("enrolled") or d.get("status") != d_match.get("status"):
                                changes += 1

                            d["status"] = d_match.get("status")
                            d["enrollment"] = new_d_enr
                            if d_match.get("waitlist"):
                                d["waitlist"] = d_match["waitlist"]

                    # Recompute effective discussion restrictions
                    if "effective_discussion_restrictions" in lec:
                        open_discs = [d for d in discussions if (d.get("enrollment") or {}).get("spots_left", 0) > 0]
                        sec_restrs = [d["restrictions"]["section"] for d in discussions if d.get("restrictions") and d["restrictions"].get("section")]
                        open_sec_restrs = [d["restrictions"]["section"] for d in open_discs if d.get("restrictions") and d["restrictions"].get("section")]
                        distinct_open_restrs = sorted(list(set(open_sec_restrs)))

                        lec["effective_discussion_restrictions"]["all_open_discussions_restricted"] = len(open_sec_restrs) == len(open_discs) and len(open_discs) > 0
                        lec["effective_discussion_restrictions"]["open_discussions_restrictions"] = distinct_open_restrs

            except Exception as e:
                print(f"  [X] Error refreshing discussions for {course_code} {sec_id}: {e}")

    return course_record, changes

def run_enrollment_refresh(input_file=COURSE_INFO_FILE, output_file=COURSE_INFO_FILE, start_index=0, limit=None, checkpoint_interval=50, save_interval_sec=120):
    course_data = load_course_info(input_file)
    course_keys = sorted(list(course_data.keys()))
    total_courses = len(course_keys)

    end_index = total_courses if limit is None else min(total_courses, start_index + limit)
    slice_keys = course_keys[start_index:end_index]

    print(f"[*] Starting enrollment refresh for courses {start_index + 1} to {end_index} (of {total_courses})")
    print(f"[*] Checkpoint policy: every {checkpoint_interval} courses or {save_interval_sec}s")

    models = load_or_fetch_models(course_keys)

    updated_count = 0
    changed_count = 0
    skipped_count = 0
    unsaved_changes = False
    last_save_time = time.time()

    def do_save(reason="checkpoint"):
        nonlocal unsaved_changes, last_save_time
        if unsaved_changes:
            print(f"  [SAVE] Saving progress to {output_file} ({reason})...", flush=True)
            save_course_info(course_data, output_file)
            unsaved_changes = False
            last_save_time = time.time()

    def signal_handler(signum, frame):
        print("\n[!] Received interrupt signal. Saving pending changes...", flush=True)
        do_save("signal interrupt")
        print("[+] State safely saved. Exiting.", flush=True)
        sys.exit(0)

    try:
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    except Exception:
        pass

    try:
        for i, c_code in enumerate(slice_keys, start=start_index + 1):
            c_record = course_data[c_code]
            model = models.get(c_code)

            if not model:
                skipped_count += 1
                continue

            c_updated, changes = refresh_course_enrollment(c_code, c_record, model)
            course_data[c_code] = c_updated
            updated_count += 1
            if changes > 0:
                changed_count += 1
                unsaved_changes = True

            # Checkpoint save on interval or elapsed time
            now = time.time()
            if unsaved_changes and (i % checkpoint_interval == 0 or (now - last_save_time) >= save_interval_sec):
                do_save(f"course {i}/{total_courses}")

            print(f"[{i}/{total_courses}] {c_code}: {'Updated (' + str(changes) + ' changes)' if changes > 0 else 'Refreshed (no change)'}", flush=True)

    finally:
        # Final save for the batch
        do_save("final batch completion")

    print("\n" + "="*60)
    print(f"Enrollment Refresh Batch Completed (Courses {start_index + 1} to {end_index}):")
    print(f"  Refreshed: {updated_count}")
    print(f"  Sections with changes detected: {changed_count}")
    print(f"  Skipped (model missing): {skipped_count}")
    print("="*60, flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Fast UCLA SOC Enrollment Refresher")
    parser.add_argument('-i', '--input', default=COURSE_INFO_FILE, help="Input course_info.json")
    parser.add_argument('-o', '--output', default=COURSE_INFO_FILE, help="Output course_info.json")
    parser.add_argument('--start', type=int, default=0, help="Start index")
    parser.add_argument('--limit', type=int, default=None, help="Max courses to process")
    parser.add_argument('--checkpoint-interval', type=int, default=50, help="Courses between disk saves")
    parser.add_argument('--save-interval-sec', type=int, default=120, help="Max seconds between disk saves")
    args = parser.parse_args()

    run_enrollment_refresh(args.input, args.output, args.start, args.limit, args.checkpoint_interval, args.save_interval_sec)
