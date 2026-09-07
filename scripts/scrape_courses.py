#!/usr/bin/env python3
"""
UCLA Schedule of Classes (SOC) End-to-End Course Scraper
========================================================

Accepts course titles/codes (via arguments, file, or interactive prompt), queries the UCLA Registrar
SOC AJAX API, extracts comprehensive lecture and discussion details (including final exams, 
warning/info badges, enrollment restrictions, and class notes), and outputs structured JSON.

Usage:
  python scripts/scrape_courses.py "Physics 1A" "Arch&UD 30"
  python scripts/scrape_courses.py --input courses.txt --output course_info.json --term 26F
"""

import sys
import os
import json
import time
import re
import base64
import argparse
import threading
import http.cookiejar
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

DEFAULT_TERM = '26F'
DEFAULT_OUTPUT = 'course_info.json'

# --- Strategy 1: Token-Bucket / Leaky-Bucket Rate Pacing ---
class RateLimiter:
    """
    Thread-safe Rate Limiter enforcing a maximum number of requests per second.
    Paces outgoing HTTP requests to stay safely beneath the WAF's burst threshold.
    """
    def __init__(self, max_per_second=3.5):
        self.interval = 1.0 / max_per_second
        self.last_request_time = 0.0
        self.lock = threading.Lock()

    def wait(self):
        with self.lock:
            now = time.time()
            elapsed = now - self.last_request_time
            if elapsed < self.interval:
                time.sleep(self.interval - elapsed)
            self.last_request_time = time.time()

rate_limiter = RateLimiter(max_per_second=3.5)

# --- Strategy 4: Maintain Persistent Session & Cookie Jar ---
_cookie_jar = http.cookiejar.CookieJar()
_session_opener = None
_session_initialized = False
_session_lock = threading.Lock()

def get_session_opener():
    global _session_opener
    if _session_opener is None:
        _session_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_cookie_jar))
    return _session_opener

def init_session(term=DEFAULT_TERM, force=False):
    """
    Initializes session cookies (ASP.NET_SessionId, BIGipServer) by requesting the SOC index page.
    """
    global _session_initialized
    with _session_lock:
        if _session_initialized and not force:
            return
        opener = get_session_opener()
        init_url = f"https://sa.ucla.edu/ro/Public/SOC/Results?t={term}&s_g_cd=%25&sBy=subject"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        try:
            req = urllib.request.Request(init_url, headers=headers)
            with opener.open(req, timeout=15) as resp:
                resp.read()
            _session_initialized = True
        except Exception as e:
            print(f"Warning: Could not initialize SOC session cookies: {e}")

# --- Strategy 5: Proactive Self-Throttling with Exponential Backoff ---
def http_request_with_retry(req, max_retries=5, timeout=15):
    """
    Executes an HTTP request with rate pacing (Strategy 1), persistent session cookies (Strategy 4),
    and proactive self-throttling with exponential backoff on HTTP 529/429/503 (Strategy 5).
    """
    if not _session_initialized:
        init_session()

    opener = get_session_opener()
    for attempt in range(max_retries):
        rate_limiter.wait()
        try:
            with opener.open(req, timeout=timeout) as resp:
                if "/Error/TooManyRequests" in resp.geturl():
                    raise urllib.error.HTTPError(resp.geturl(), 529, "Too Many Requests", resp.headers, None)
                return resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code in [529, 429, 503] or "/Error/TooManyRequests" in getattr(e, "url", ""):
                wait_time = min(300, 30 * (2 ** attempt))
                print(f"  [⚠️ Rate limit detected (HTTP {e.code})] Self-throttling: pausing {wait_time}s before retry ({attempt+1}/{max_retries})...")
                time.sleep(wait_time)
                init_session(force=True)
            else:
                if attempt == max_retries - 1:
                    raise e
                time.sleep(1.5)
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(1.5)
    return None

SUBJECT_MAP = {
    'Art': 'ART',
    'Asian': 'ASIAN',
    'Iranian': 'IRANIAN',
    'Italian': 'ITALIAN',
    'French': 'FRNCH',
    'German': 'GERMAN',
    'Spanish': 'SPAN',
    'Russian': 'RUSSIAN',
    'Physics': 'PHYSICS',
    'Math': 'MATH',
    'Mathematics': 'MATH',
    'Chemistry': 'CHEM',
    'Computer Science': 'COM SCI',
    'Economics': 'ECON'
}

_subject_models_cache = {}

def normalize_catalog_number(raw_num: str) -> str:
    raw_num = raw_num.strip().upper()
    match = re.match(r'^([A-Z]*)(\d+)([A-Z]*)$', raw_num)
    if match:
        prefix, digits, suffix = match.groups()
        return f"{prefix}{digits.zfill(4)}{suffix}"
    return raw_num

def parse_course_input(input_str: str):
    """
    Parses various course input formats into (subject, catalog_number, title).
    Examples:
      - 'Architecture and Urban Design (ARCH&UD) 30 - Introduction to Architectural Studies'
      - 'Physics 1A'
      - 'PHYSICS 0001A'
      - 'COM LIT 2CW - Survey of Literature'
      - 'CLASSIC M75'
    """
    clean = input_str.strip()
    
    # 1. Check parenthesized subject: 'Name (SUBJ) CAT - Title'
    m = re.search(r'\(([^)]+)\)\s*([0-9A-Za-z]+)(?:\s*-\s*(.*))?', clean)
    if m:
        subj = m.group(1).strip()
        cat = m.group(2).strip()
        title = m.group(3).strip() if m.group(3) else f"{cat} - {subj}"
        return subj, cat, title

    # 2. Check 'SUBJ CAT - Title' or 'SUBJ CAT'
    m2 = re.match(r'^([A-Za-z&\s]+?)\s+([M]?[0-9]+[A-Za-z]*)(?:\s*-\s*(.*))?$', clean)
    if m2:
        subj = m2.group(1).strip()
        cat = m2.group(2).strip()
        title = m2.group(3).strip() if m2.group(3) else f"{cat} - {subj}"
        return subj, cat, title

    # Fallback split
    parts = clean.split()
    if len(parts) >= 2:
        subj = parts[0].strip()
        cat = parts[1].strip()
        title = " ".join(parts[2:]).lstrip("- ") if len(parts) > 2 else f"{cat} - {subj}"
        return subj, cat, title

    return clean, "", clean

def get_models_for_subject(term, subj_code):
    subj_code = SUBJECT_MAP.get(subj_code, subj_code)
    if subj_code in _subject_models_cache:
        return _subject_models_cache[subj_code]

    params = urllib.parse.urlencode({
        't': term,
        's_g_cd': '%',
        'sBy': 'subject',
        'subj': subj_code,
        'catlg': '',
        'cls_no': '',
        'undefined': 'Go',
        'btnIsInIndex': 'btn_inIndex'
    })
    url = f"https://sa.ucla.edu/ro/Public/SOC/Results?{params}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        req = urllib.request.Request(url, headers=headers)
        html = http_request_with_retry(req, max_retries=3, timeout=15)
        if not html:
            _subject_models_cache[subj_code] = {}
            return {}
    except Exception as e:
        _subject_models_cache[subj_code] = {}
        return {}

    matches = re.findall(r'AddToCourseData\("([^"]+)",\s*({.*?})\);', html)
    models = {}
    for cid, m_json in matches:
        try:
            models[cid] = json.loads(m_json)
        except Exception:
            pass
    _subject_models_cache[subj_code] = models
    return models

def fetch_summary_with_model(model):
    params = urllib.parse.urlencode({
        "model": json.dumps(model),
        "FilterFlags": json.dumps({"enrollment_status": "O,W,C,X,T,S", "advanced": "y"}),
        "_": int(time.time() * 1000)
    })
    url = f"https://sa.ucla.edu/ro/Public/SOC/Results/GetCourseSummary?{params}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://sa.ucla.edu/ro/Public/SOC/Results"
    }
    req = urllib.request.Request(url, headers=headers)
    return http_request_with_retry(req, max_retries=5, timeout=15)

def fetch_full_class_detail(term, subject, catalog_no, class_id, class_no):
    params = urllib.parse.urlencode({
        'term_cd': term,
        'subj_area_cd': subject,
        'crs_catlg_no': catalog_no.ljust(8),
        'class_id': class_id,
        'class_no': f" {class_no.strip()}  "
    })
    url = f"https://sa.ucla.edu/ro/Public/SOC/Results/ClassDetail?{params}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        html = http_request_with_retry(req, max_retries=3, timeout=15)
        if not html:
            return {}
    except Exception:
        return {}

    soup = BeautifulSoup(html, "html.parser")
    template = soup.find("template", id="ucla-sa-soc-app")
    inner_soup = BeautifulSoup(template.decode_contents(), "html.parser") if template else soup

    detail = {
        "final_exam": None,
        "restrictions": [],
        "class_notes": [],
        "requisites": [],
        "grading": None,
        "impacted": None,
        "level": None,
        "course_description": None,
        "ge_categories": [],
        "ge_lab_demo": False,
        "writing_ii": False,
        "diversity": False,
        "department": None,
        "department_url": None,
        "textbooks_url": None,
        "library_reserve_url": None,
        "materials_fee": None
    }

    # 1. Final Exam
    exam_table = inner_soup.find(id="final_exam_info")
    if exam_table:
        row = exam_table.find("tbody").find("tr") if exam_table.find("tbody") else None
        if row:
            tds = row.find_all("td")
            if len(tds) >= 4:
                detail["final_exam"] = {
                    "date": tds[0].get_text(strip=True),
                    "day": tds[1].get_text(strip=True),
                    "time": tds[2].get_text(strip=True),
                    "location": tds[3].get_text(strip=True)
                }

    # 2. Enrollment Info Table (Grade Type, Restrictions, Impacted, Level)
    enr_table = inner_soup.find(id="enrollment_info")
    if enr_table and enr_table.find("tbody"):
        row = enr_table.find("tbody").find("tr")
        if row:
            tds = row.find_all("td")
            if len(tds) >= 5:
                detail["grading"] = tds[0].get_text(strip=True)
                restr_raw = tds[1].get_text(" ", strip=True)
                if restr_raw and restr_raw.lower() != "none":
                    detail["restrictions"].append(restr_raw)
                detail["impacted"] = tds[2].get_text(strip=True)
                detail["level"] = tds[4].get_text(strip=True)

    # 3. Course Requisites
    req_table = inner_soup.find(id="course_requisites")
    if req_table and req_table.find("tbody"):
        for tr in req_table.find("tbody").find_all("tr"):
            tds = tr.find_all("td")
            if len(tds) >= 5:
                c_name = re.sub(r"\s+(and|or)$", "", tds[0].get_text(strip=True), flags=re.I)
                req_type = "Warning" if tr.find(class_="icon-warning-sign") else ("Enforced" if tr.find(class_="icon-lock") else "Info")
                detail["requisites"].append({
                    "course": c_name,
                    "min_grade": tds[1].get_text(strip=True),
                    "is_prereq": tds[2].get_text(strip=True) == "Yes",
                    "is_coreq": tds[3].get_text(strip=True) == "Yes",
                    "type": req_type
                })

    # 4. Textbooks URL
    tb_a = inner_soup.find("div", id="textbooks")
    if tb_a and tb_a.find("a"):
        detail["textbooks_url"] = tb_a.find("a").get("href")

    # 5. Section Metadata & Attributes
    sec_div = inner_soup.find(id="section")
    if sec_div:
        titles = sec_div.find_all("p", class_="class_detail_title")
        for t in titles:
            title_text = t.get_text(strip=True)
            data_p = t.find_next_sibling("p")
            val_text = data_p.get_text(" ", strip=True) if data_p else ""

            if "Course Description" in title_text:
                detail["course_description"] = val_text
            elif "Writing II" in title_text:
                detail["writing_ii"] = "satisfy" in val_text.lower() and "not satisfy" not in val_text.lower()
            elif "Diversity" in title_text:
                detail["diversity"] = "satisfy" in val_text.lower() and "not satisfy" not in val_text.lower()
            elif "GE Foundation" in title_text:
                if val_text:
                    detail["ge_categories"].append(val_text)
            elif "GE Lab/Demo" in title_text:
                detail["ge_lab_demo"] = "carries" in val_text.lower()
            elif "Class Notes" in title_text:
                for li in data_p.find_all("li") if data_p else []:
                    detail["class_notes"].append(li.get_text(" ", strip=True))
                if not detail["class_notes"] and val_text and val_text.lower() != "none":
                    detail["class_notes"].append(val_text)
            elif "Department" in title_text:
                detail["department"] = val_text
                if data_p and data_p.find("a"):
                    detail["department_url"] = data_p.find("a").get("href")
            elif "Library Reserve" in title_text and data_p and data_p.find("a"):
                detail["library_reserve_url"] = data_p.find("a").get("href")
            elif "Materials Use Fee" in title_text:
                detail["materials_fee"] = val_text

    return detail

def fetch_tooltip_by_params(term_cd, subj_area_cd, crs_catlg_no, class_id, class_no):
    if not class_id or not class_no:
        return {}
    params = urllib.parse.urlencode({
        "term_cd": term_cd,
        "subj_area_cd": subj_area_cd,
        "crs_catlg_no": crs_catlg_no.ljust(8),
        "class_id": class_id,
        "class_no": f" {class_no.strip()}  "
    })
    url = f"https://sa.ucla.edu/ro/Public/SOC/Results/ClassDetailTooltip?{params}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "X-Requested-With": "XMLHttpRequest"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        html = http_request_with_retry(req, max_retries=3, timeout=10)
        if not html:
            return {}
    except Exception:
        return {}

    soup = BeautifulSoup(html, "html.parser")
    res = {
        "restrictions": {"section": None, "class": None, "raw": []},
        "class_notes": [],
        "requisites": [],
        "grade_type": None
    }

    # 1. Restrictions
    restr_div = soup.find("div", class_="info_restrictions")
    if restr_div:
        content_div = restr_div.find("div", class_="enrollment_restrictions_content")
        if content_div:
            lines = [s.strip() for s in content_div.stripped_strings if s.strip()]
            sec_restr = None
            cls_restr = None
            for i, line in enumerate(lines):
                if line.startswith("Section:"):
                    val = line.replace("Section:", "").strip()
                    if not val and i + 1 < len(lines) and not lines[i+1].startswith("Class:"):
                        val = lines[i+1].strip()
                    sec_restr = val
                elif line.startswith("Class:"):
                    val = line.replace("Class:", "").strip()
                    if not val and i + 1 < len(lines):
                        val = lines[i+1].strip()
                    cls_restr = val
            
            res["restrictions"]["section"] = sec_restr if sec_restr and sec_restr.lower() != "none" else None
            res["restrictions"]["class"] = cls_restr if cls_restr and cls_restr.lower() != "none" else None
            raw_text = " ".join(lines)
            if raw_text and raw_text.lower() != "section: none class: none" and raw_text.lower() != "none":
                res["restrictions"]["raw"] = lines

    # 2. Class Notes
    notes_div = soup.find("div", class_="class_notes")
    if notes_div:
        content_div = notes_div.find("div", class_="class_notes_content")
        if content_div:
            for li in content_div.find_all("li"):
                t = li.get_text(" ", strip=True)
                if t:
                    res["class_notes"].append(t)
            if not res["class_notes"]:
                t = content_div.get_text(" ", strip=True)
                if t and t.lower() != "none":
                    res["class_notes"].append(t)

    # 3. Grade Type
    gt_div = soup.find("div", class_="grade_type_content")
    if gt_div:
        gt_span = gt_div.find(lambda el: el.name == "span" and "Grade Type:" in el.text)
        if gt_span:
            val_span = gt_span.find_next_sibling(class_="grade_type_content_text")
            if val_span:
                res["grade_type"] = val_span.get_text(strip=True)

    # 4. Requisites
    req_div = soup.find("div", class_="info_requisites")
    if req_div:
        tbody = req_div.find("tbody")
        if tbody:
            for tr in tbody.find_all("tr"):
                tds = tr.find_all("td")
                if len(tds) >= 4:
                    c_name = re.sub(r"\s+(and|or)$", "", tds[0].get_text(strip=True), flags=re.I)
                    min_gr = tds[1].get_text(strip=True)
                    is_pre = tds[2].get_text(strip=True) == "Yes"
                    is_co = tds[3].get_text(strip=True) == "Yes"
                    req_type = "Warning" if tr.find(class_=lambda c: c and "icon-warning" in c) else "Enforced"
                    res["requisites"].append({
                        "course": c_name,
                        "min_grade": min_gr,
                        "is_prereq": is_pre,
                        "is_coreq": is_co,
                        "type": req_type
                    })

    return res

def parse_section_row(row):
    sec_col = row.find(class_="sectionColumn")
    link = sec_col.find("a") if sec_col else None
    if link:
        sec_id = link.get_text(strip=True)
    elif sec_col and sec_col.find(class_="hide-small"):
        sec_id = sec_col.find(class_="hide-small").get_text(strip=True)
    elif sec_col:
        sec_id = sec_col.get_text(strip=True)
    else:
        sec_id = ""
    
    class_id = None
    class_no = None
    if link and "href" in link.attrs:
        href = link["href"]
        cid_m = re.search(r"class_id=(\d+)", href)
        cno_m = re.search(r"class_no=([%0-9A-Za-z\s]+)", href)
        if cid_m:
            class_id = cid_m.group(1)
        if cno_m:
            class_no = urllib.parse.unquote(cno_m.group(1)).strip()

    status_col = row.find(class_="statusColumn")
    status_raw = status_col.get_text("\n", strip=True) if status_col else ""
    status_lines = [line.strip() for line in status_raw.splitlines() if line.strip()]
    status_text = status_lines[0] if status_lines else "Unknown"

    enrolled = None
    capacity = None
    spots_left = None
    m_enr = re.search(r"(\d+)\s+of\s+(\d+)\s+Enrolled", status_raw, re.IGNORECASE)
    if m_enr:
        enrolled = int(m_enr.group(1))
        capacity = int(m_enr.group(2))
        spots_left = capacity - enrolled

    waitlist_col = row.find(class_="waitlistColumn")
    wl_raw = waitlist_col.get_text(strip=True) if waitlist_col else ""
    wl_taken = None
    wl_cap = None
    m_wl = re.search(r"(\d+)\s+of\s+(\d+)\s+(Taken|Waitlisted)", wl_raw, re.IGNORECASE)
    if m_wl:
        wl_taken = int(m_wl.group(1))
        wl_cap = int(m_wl.group(2))

    # Parse meetings (handling multiple lines / <br> tags in Day, Time, and Location columns)
    day_col = row.find(class_="dayColumn")
    time_col = row.find(class_="timeColumn")
    loc_col = row.find(class_="locationColumn")

    day_lines = []
    if day_col:
        btn = day_col.find("button")
        target_el = btn if btn else day_col
        for br in target_el.find_all("br"):
            br.replace_with("\n")
        day_lines = [l.strip() for l in target_el.get_text("\n", strip=True).splitlines() if l.strip() and len(l.strip()) <= 5 and l.strip().lower() not in ("day(s)",)]

    time_lines = []
    if time_col:
        for p in time_col.find_all("p"):
            if "hide-above-small" in p.get("class", []):
                continue
            raw_p = str(p)
            clean_p_html = re.sub(r'</?wbr/?>', '', raw_p, flags=re.I)
            clean_p_html = re.sub(r'<br\s*/?>', '\n', clean_p_html, flags=re.I)
            for line in BeautifulSoup(clean_p_html, "html.parser").get_text().splitlines():
                clean_l = re.sub(r'[\u200b\s]+', '', line)
                if re.search(r'\d+[ap]m', clean_l, re.I):
                    time_lines.append(clean_l)

    loc_lines = []
    if loc_col:
        loc_p = loc_col.find("p")
        target_loc = loc_p if loc_p else loc_col
        for br in target_loc.find_all("br"):
            br.replace_with("\n")
        loc_lines = [re.sub(r'\s+', ' ', l).strip() for l in target_loc.get_text("\n", strip=True).splitlines() if l.strip() and l.strip().lower() != "location"]

    meetings = []
    max_len = max(len(day_lines), len(time_lines), len(loc_lines), 1)
    if max_len > 1 and len(time_lines) > 0:
        for i in range(max_len):
            d_val = day_lines[i] if i < len(day_lines) else (day_lines[0] if day_lines else "Not scheduled")
            t_val = time_lines[i] if i < len(time_lines) else (time_lines[0] if time_lines else "To be arranged")
            l_val = loc_lines[i] if i < len(loc_lines) else (loc_lines[0] if loc_lines else "No Location")
            meetings.append({
                "days": d_val,
                "time": t_val,
                "location": l_val
            })
    else:
        meetings = [
            {
                "days": day_lines[0] if day_lines else (day_col.get_text(strip=True) if day_col else "Not scheduled"),
                "time": time_lines[0] if time_lines else "To be arranged",
                "location": loc_lines[0] if loc_lines else (loc_col.get_text(" ", strip=True) if loc_col else "No Location")
            }
        ]

    units_col = row.find(class_="unitsColumn")
    units = units_col.get_text(strip=True) if units_col else ""

    instr_col = row.find(class_="instructorColumn")
    instructor = instr_col.get_text("\n", strip=True) if instr_col else "No instructors"

    waitlist = None
    if wl_cap is not None:
        waitlist = {"taken": wl_taken, "capacity": wl_cap}

    enrollment = None
    if capacity is not None:
        enrollment = {
            "enrolled": enrolled,
            "capacity": capacity,
            "spots_left": spots_left
        }

    # Extract button / indicator in infoColumn
    info_col = row.find(class_="infoColumn")
    icon_type = None
    sr_text = ""
    
    if info_col:
        btn = info_col.find(["button", "a"])
        if btn:
            if btn.find(class_=lambda c: c and "icon-warning" in c):
                icon_type = "warning"
            elif btn.find(class_=lambda c: c and "icon-info" in c):
                icon_type = "info"
            elif btn.find(class_=lambda c: c and "icon-lock" in c):
                icon_type = "enforced"
            
            sr = btn.find(class_="screenReaderOnly")
            sr_text = sr.get_text(strip=True) if sr else ""

    if not icon_type:
        if row.find(class_=lambda c: c and "icon-warning" in c):
            icon_type = "warning"
        elif row.find(class_=lambda c: c and "icon-info" in c):
            icon_type = "info"

    return {
        "section_id": sec_id,
        "_class_id": class_id,
        "_class_no": class_no,
        "indicator": icon_type,
        "indicator_label": sr_text or None,
        "instructor": instructor,
        "status": status_text,
        "units": units,
        "enrollment": enrollment,
        "waitlist": waitlist,
        "meetings": meetings
    }

def scrape_single_course(term, subj, cat, title=""):
    subj_code = SUBJECT_MAP.get(subj, subj)
    models = get_models_for_subject(term, subj_code)
    
    norm_cat = normalize_catalog_number(cat)
    clean_subj = subj.replace(" ", "").replace("&", "").upper()
    
    matched_key = None
    model = None

    clean_cat_digits = re.sub(r'^[M]?', '', cat).strip()
    for k, m in models.items():
        if norm_cat in k or (clean_cat_digits and clean_cat_digits in k):
            matched_key = k
            model = m
            break

    if not model:
        cat_pad = cat.ljust(8)
        path = f"{clean_subj}{norm_cat}"
        token = base64.b64encode(f"{cat_pad}{path}".encode()).decode()
        model = {
            "Term": term,
            "SubjectAreaCode": subj_code,
            "CatalogNumber": cat_pad,
            "IsRoot": True,
            "SessionGroup": "%",
            "ClassNumber": "%",
            "SequenceNumber": None,
            "Path": path,
            "MultiListedClassFlag": "n",
            "Token": token
        }
        matched_key = path

    course_key = matched_key

    try:
        lec_html = fetch_summary_with_model(model)
    except Exception as e:
        print(f"[X] Error fetching summary for {subj} {cat}: {e}")
        return None, None

    soup = BeautifulSoup(lec_html, "html.parser")
    
    found_title = f"{cat} - {title}" if title else f"{cat} - {subj}"
    for lbl in soup.find_all("label", class_="screenReaderOnly"):
        m = re.search(r"Select\s+(?:.*?\s+)?(\d+[A-Z]*\s*-\s*.*?)(?:\s+Lec|\s+Dis|$)", lbl.get_text(strip=True), re.I)
        if m:
            found_title = m.group(1).strip()
            break

    data_rows = soup.find_all("div", class_=lambda c: c and "data_row" in c and "primary-row" in c)
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
                print(f"  Error fetching discussions for {course_key}: {e}")

        lectures.append(lec_data)

    return course_key, {
        "course": {
            "title": found_title,
            "course_code": course_key
        },
        "lectures": lectures
    }

def scrape_courses_pipeline(course_inputs, term=DEFAULT_TERM, output_file=DEFAULT_OUTPUT, max_workers=6):
    print(f"[*] Starting Course Data Scraper for {len(course_inputs)} courses (Term: {term})...")
    
    parsed_courses = []
    for raw in course_inputs:
        subj, cat, title = parse_course_input(raw)
        if subj and cat:
            parsed_courses.append((subj, cat, title, raw))
        else:
            print(f"[!] Warning: Unable to parse course input: '{raw}'")

    existing_data = {}
    if os.path.exists(output_file):
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            print(f"[*] Loaded {len(existing_data)} existing courses from {output_file}")
        except Exception:
            pass

    completed = 0
    total = len(parsed_courses)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_course = {
            executor.submit(scrape_single_course, term, subj, cat, title): (subj, cat, title, raw)
            for subj, cat, title, raw in parsed_courses
        }

        for future in as_completed(future_to_course):
            subj, cat, title, raw = future_to_course[future]
            try:
                c_key, c_data = future.result()
                if c_key and c_data:
                    existing_data[c_key] = c_data
                    completed += 1
                    lecs = len(c_data['lectures'])
                    discs = sum(len(l.get('discussions', [])) for l in c_data['lectures'])
                    restrs = sum(len(l.get('effective_discussion_restrictions', {}).get('distinct_restrictions', [])) for l in c_data['lectures'])
                    r_tag = f" (⚠️ {restrs} discussion restrictions)" if restrs > 0 else ""
                    print(f"[{completed}/{total}] {c_key} ({c_data['course']['title'][:35]}...): {lecs} lecs, {discs} discs{r_tag}")
                else:
                    print(f"[!] Warning: No data returned for '{raw}'")
            except Exception as e:
                print(f"[X] Exception scraping '{raw}': {e}")

    # Save to output file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)

    print(f"\n[+] SUCCESS! Finished scraping. Total courses saved to {output_file}: {len(existing_data)}")
    return existing_data

def main():
    parser = argparse.ArgumentParser(description="End-to-End UCLA Schedule of Classes (SOC) Course Scraper")
    parser.add_argument('courses', nargs='*', help='Course titles or codes (e.g. "Physics 1A", "Arch&UD 30")')
    parser.add_argument('-i', '--input', help='Text file with course titles (one per line)')
    parser.add_argument('-o', '--output', default=DEFAULT_OUTPUT, help=f'Output JSON file (default: {DEFAULT_OUTPUT})')
    parser.add_argument('-t', '--term', default=DEFAULT_TERM, help=f'Term code (e.g. 26F, 26W; default: {DEFAULT_TERM})')
    parser.add_argument('-w', '--workers', type=int, default=6, help='Number of concurrent worker threads (default: 6)')
    args = parser.parse_args()

    course_list = []
    if args.input:
        if os.path.exists(args.input):
            with open(args.input, 'r', encoding='utf-8') as f:
                for line in f:
                    l = line.strip()
                    if l and not l.startswith('#'):
                        course_list.append(l)
        else:
            print(f"Error: Input file {args.input} not found.")
            sys.exit(1)

    if args.courses:
        course_list.extend(args.courses)

    if not course_list:
        print("No courses specified. Please provide course titles via arguments or an input file.")
        print("Example: python scripts/scrape_courses.py \"Physics 1A\" \"ARCH&UD 30\"")
        sys.exit(1)

    scrape_courses_pipeline(course_list, term=args.term, output_file=args.output, max_workers=args.workers)

if __name__ == '__main__':
    main()
