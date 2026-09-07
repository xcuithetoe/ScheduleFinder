import json
import re

with open("course_info.json", "r", encoding="utf-8") as f:
    courses = json.load(f)

def evaluate_restriction_string(r_str, profile):
    """
    Evaluates a single restriction string against user profile.
    Returns (passed: bool, reason: str or None)
    """
    if not r_str or r_str == "None" or r_str == "Class: None" or r_str == "Section: None":
        return True, None

    r_clean = r_str.replace("Class:", "").replace("Section:", "").strip()
    r_lower = r_clean.lower()
    
    st = profile.get("studentType", "continuing")  # new_freshman, new_transfer, continuing, graduate
    standing = profile.get("standing", "freshman") # freshman, sophomore, junior, senior, graduate
    major = profile.get("major", "").strip().lower()
    is_premajor = profile.get("isPreMajor", False)
    minor = profile.get("minor", "").strip().lower()
    dept_consent = profile.get("deptConsent", False)
    inst_consent = profile.get("instructorConsent", False)
    honors = profile.get("honors", False)

    # 1. New Transfers Only / Transfer Students
    if "new transfers only" in r_lower or "transfer students" in r_lower:
        if st != "new_transfer":
            return False, f'Requires "New Transfers Only" (your profile: {st.replace("_", " ").title()})'

    # 2. First-Year Freshmen Only
    if "first-year freshmen only" in r_lower:
        if st != "new_freshman" and standing != "freshman":
            return False, f'Requires "First-Year Freshmen Only" (your profile: {st.replace("_", " ").title()}, {standing.title()})'

    # 3. New Students Only
    if "new students only" in r_lower:
        if st not in ["new_freshman", "new_transfer"]:
            return False, f'Restricted to "New Students Only" during orientation pass (your profile: Continuing Student)'

    # 4. Standing Checks
    if "sophomores and above" in r_lower or "sophomores or juniors or seniors" in r_lower:
        if standing == "freshman":
            return False, f'Requires "Sophomores and Above" (your standing: Freshman)'

    if "juniors and above" in r_lower:
        if standing in ["freshman", "sophomore"]:
            return False, f'Requires "Juniors and Above" (your standing: {standing.title()})'

    if "seniors only" in r_lower:
        if standing not in ["senior", "graduate"]:
            return False, f'Requires "Seniors Only" (your standing: {standing.title()})'
    elif "seniors and above" in r_lower:
        if standing not in ["senior", "graduate"]:
            return False, f'Requires "Seniors and Above" (your standing: {standing.title()})'

    if "graduate students" in r_lower:
        if standing != "graduate":
            return False, f'Requires "Graduate Students" (your standing: {standing.title()})'

    if "undergraduate students only" in r_lower:
        if standing == "graduate":
            return False, f'Requires "Undergraduate Students Only" (your standing: Graduate)'

    # 5. Pre-majors Excluded
    if "premajors are excluded" in r_lower:
        if is_premajor:
            return False, f'Restricted: "Premajors Are Excluded From This Population" (you have Pre-Major status)'

    # 6. Non-English Majors
    if "non-english majors" in r_lower:
        if "english" in major:
            return False, f'Restricted to "Non-English Majors" (your major is English)'

    # 7. Consent
    if "department consent" in r_lower:
        if not dept_consent:
            return False, f'Requires "Department Consent"'
    if "instructor consent" in r_lower:
        if not inst_consent:
            return False, f'Requires "Instructor Consent"'

    # 8. Honors
    if "college honors program" in r_lower:
        if not honors:
            return False, f'Requires "College Honors Program Students"'

    # 9. Major checks
    # If the restriction explicitly mentions "... Majors" or "... Minors"
    # We check if user's major / minor satisfies any of the required disciplines
    if "major" in r_lower and not ("open to all" in r_lower or "non-english" in r_lower):
        # Extract potential major names mentioned
        # Look for phrases before "majors" or "premajors"
        # If user major is specified, let's see if it's included
        # List of majors mentioned in this restriction
        if major:
            # Check if user major keyword is in r_lower or minor keyword is in r_lower
            # e.g. "art majors", "anthropology majors", "cognitive science"
            user_major_words = [w for w in re.split(r'[\s/,-]+', major) if len(w) >= 3]
            user_minor_words = [w for w in re.split(r'[\s/,-]+', minor) if len(w) >= 3] if minor else []
            
            # Check if this restriction has a specific major restriction
            has_major_kw = any(re.search(r'\b' + re.escape(w) + r'\b', r_lower) for w in user_major_words)
            has_minor_kw = any(re.search(r'\b' + re.escape(w) + r'\b', r_lower) for w in user_minor_words)
            
            # If restriction specifies certain majors (e.g. "Art Majors", "Data Theory", "Philosophy Majors")
            # And user has NO matching word:
            # Let's check if the restriction is indeed limiting to specific majors
            spec_major_match = re.search(r'([A-Za-z\s,/&|]+)\s+(?:Majors|Premajors|Minors)', r_clean, re.IGNORECASE)
            if spec_major_match and not ("non-" in r_lower):
                target_majors = spec_major_match.group(1).strip()
                if not has_major_kw and not has_minor_kw:
                    return False, f'Restricted to {target_majors} Majors/Minors (your major is {profile.get("major", "Undeclared")})'

    return True, None

def evaluate_course(course_code, profile):
    cdata = courses.get(course_code)
    if not cdata:
        return False, "Course not found in database."

    lectures = cdata.get("lectures", [])
    if not lectures:
        return True, "No lecture sections listed."

    # Check lectures
    lec_errors = []
    has_valid_lec = False
    
    for idx, lec in enumerate(lectures):
        lec_id = lec.get("section_id", f"Lec {idx+1}")
        lec_restrs = lec.get("restrictions", [])
        
        lec_passed = True
        for r in lec_restrs:
            passed, reason = evaluate_restriction_string(r, profile)
            if not passed:
                lec_passed = False
                lec_errors.append(f"[{lec_id}] {reason}")
                break
                
        if not lec_passed:
            continue
            
        # If lecture passed, check discussions
        discs = lec.get("discussions", [])
        if not discs:
            # Lecture has no discussions and passed
            has_valid_lec = True
            break
            
        # Check open discussions vs closed discussions
        open_discs = [d for d in discs if d.get("status") == "Open"]
        discs_to_check = open_discs if open_discs else discs
        
        valid_discs = []
        disc_errors = []
        
        for d in discs_to_check:
            sec_id = d.get("section_id", "Dis")
            restr_obj = d.get("restrictions", {})
            d_restrs = []
            if isinstance(restr_obj, dict):
                for k in ("section", "class"):
                    if restr_obj.get(k): d_restrs.append(restr_obj[k])
                for r in restr_obj.get("raw", []):
                    if r not in d_restrs and r != "Section: None" and r != "Class: None":
                        d_restrs.append(r)
            elif isinstance(restr_obj, list):
                d_restrs = restr_obj
                
            d_passed = True
            for r in d_restrs:
                passed, reason = evaluate_restriction_string(r, profile)
                if not passed:
                    d_passed = False
                    disc_errors.append(f"[{sec_id}] {reason}")
                    break
            if d_passed:
                valid_discs.append(sec_id)
                
        if valid_discs:
            has_valid_lec = True
            break
        else:
            # All available discussion sections are restricted
            lec_errors.append(f"All available discussion sections in {lec_id} are restricted: {'; '.join(set(disc_errors))}")

    if has_valid_lec:
        return True, "Course meets all eligibility criteria!"
    else:
        return False, " | ".join(lec_errors)

# Test Scenarios
scenarios = [
    {
        "name": "New Freshman adding CLASSIC 10 (Restricted to New Students Only)",
        "profile": {"studentType": "new_freshman", "standing": "freshman", "major": "Undeclared"},
        "course": "CLASSIC0010"
    },
    {
        "name": "Continuing Student adding CLASSIC 10 (Restricted to New Students Only)",
        "profile": {"studentType": "continuing", "standing": "sophomore", "major": "History"},
        "course": "CLASSIC0010"
    },
    {
        "name": "New Freshman adding ARCHUD 30 (All open discussions restricted to New Transfers Only)",
        "profile": {"studentType": "new_freshman", "standing": "freshman", "major": "Art"},
        "course": "ARCHUD0030"
    },
    {
        "name": "New Transfer adding ARCHUD 30",
        "profile": {"studentType": "new_transfer", "standing": "junior", "major": "Architecture"},
        "course": "ARCHUD0030"
    },
    {
        "name": "Non-Art Major adding ART 31A (Restricted to Art Majors)",
        "profile": {"studentType": "new_freshman", "standing": "freshman", "major": "Computer Science"},
        "course": "ART0031A"
    },
    {
        "name": "Art Major adding ART 31A",
        "profile": {"studentType": "new_freshman", "standing": "freshman", "major": "Art"},
        "course": "ART0031A"
    },
    {
        "name": "English Major adding ENGL 90 (Restricted to Non-English Majors)",
        "profile": {"studentType": "new_freshman", "standing": "freshman", "major": "English"},
        "course": "ENGL0090"
    }
]

print("Running test scenarios:")
for s in scenarios:
    passed, reason = evaluate_course(s["course"], s["profile"])
    print(f"\nScenario: {s['name']}")
    print(f"Result: {'ALLOWED (Added to Draft Schedule)' if passed else 'DENIED'}")
    print(f"Detail: {reason}")
