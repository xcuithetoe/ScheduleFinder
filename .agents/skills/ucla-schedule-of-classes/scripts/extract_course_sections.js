/**
 * UCLA Schedule of Classes (SOC) Section & Availability Extractor
 * 
 * Usage in Chrome DevTools MCP (evaluate_script tool):
 * Pass this function to navigate or extract details from UCLA SOC.
 * 
 * @param {string} targetCourseId - Optional course element ID (e.g. "MATH0032A", "COM SCI0031", "CHEM0014A"). If omitted, extracts the first or all expanded courses.
 */
async function extractUclaCourseSchedule(targetCourseId = null) {
    const shadow = document.querySelector('ucla-sa-soc-app')?.shadowRoot || document;
    
    const courseTitles = Array.from(shadow.querySelectorAll('.class-title'));
    if (courseTitles.length === 0) {
        return { error: 'No course titles found on page. Make sure you are on a SOC results page.' };
    }
    
    const targetTitleEl = targetCourseId 
        ? shadow.querySelector('#' + targetCourseId.replace(/ /g, '\\ ')) 
        : courseTitles[0];
        
    if (!targetTitleEl) {
        return { 
            error: `Course ID ${targetCourseId} not found`, 
            availableCourses: courseTitles.map(el => ({ id: el.id, name: el.innerText.trim() })) 
        };
    }
    
    const courseCode = targetTitleEl.id;
    const courseName = targetTitleEl.innerText.trim();
    
    const courseBtn = targetTitleEl.querySelector('button');
    if (courseBtn && courseBtn.getAttribute('aria-expanded') !== 'true') {
        courseBtn.click();
        await new Promise(r => setTimeout(r, 2000));
    }
    
    const lectureCheckboxes = Array.from(shadow.querySelectorAll(`input[type="checkbox"][id*="${courseCode}"]`));
    for (const chk of lectureCheckboxes) {
        if (!chk.checked) {
            chk.click();
            await new Promise(r => setTimeout(r, 600));
        }
    }
    
    await new Promise(r => setTimeout(r, 1500));
    
    const container = shadow.querySelector(`#${courseCode}-container`) || targetTitleEl;
    const dataRows = Array.from(container.querySelectorAll('.row-fluid.data_row'));
    
    const lectures = [];
    let currentLecture = null;
    
    function parseEnrollment(statusStr) {
        if (statusStr.toLowerCase().includes('cancelled')) return null;
        const match = statusStr.match(/(\d+)\s+of\s+(\d+)\s+Enrolled/i);
        if (match) {
            const enrolled = parseInt(match[1], 10);
            const capacity = parseInt(match[2], 10);
            return {
                enrolled: enrolled,
                capacity: capacity,
                spots_left: capacity - enrolled
            };
        }
        return null;
    }

    function parseWaitlist(wlStr) {
        if (wlStr.toLowerCase().includes('no waitlist')) return null;
        const match = wlStr.match(/(\d+)\s+of\s+(\d+)\s+(Taken|Waitlisted)/i);
        if (match) {
            return {
                taken: parseInt(match[1], 10),
                capacity: parseInt(match[2], 10)
            };
        }
        return null;
    }

    function parseMeetings(daysStr, timeStr, locStr) {
        const days = daysStr.split('\n').map(s => s.trim()).filter(Boolean);
        const times = timeStr.split('\n').map(s => s.trim()).filter(Boolean);
        const locs = locStr.split('\n').map(s => s.trim()).filter(Boolean);
        
        const count = Math.max(days.length, times.length, locs.length, 1);
        const meetings = [];
        for (let i = 0; i < count; i++) {
            meetings.push({
                days: days[i] || days[0] || 'Not scheduled',
                time: times[i] || times[0] || 'To be arranged',
                location: locs[i] || locs[0] || 'No Location'
            });
        }
        return meetings;
    }
    
    for (const row of dataRows) {
        const secText = row.querySelector('.sectionColumn button, .sectionColumn a, .sectionColumn')?.innerText.trim() || '';
        const statusText = row.querySelector('.statusColumn')?.innerText.trim() || '';
        const waitlistText = row.querySelector('.waitlistColumn')?.innerText.trim() || '';
        const daysText = row.querySelector('.dayColumn')?.innerText.trim() || '';
        const timeText = row.querySelector('.timeColumn')?.innerText.trim() || '';
        const locText = row.querySelector('.locationColumn')?.innerText.trim() || '';
        const instrText = row.querySelector('.instructorColumn')?.innerText.trim() || '';
        
        const statusType = statusText.split('\n')[0].trim();
        
        const sectionData = {
            section_id: secText,
            instructor: instrText || 'No instructors',
            status: statusType || 'Unknown',
            enrollment: parseEnrollment(statusText),
            waitlist: parseWaitlist(waitlistText),
            meetings: parseMeetings(daysText, timeText, locText)
        };
        
        const isPrimary = row.classList.contains('primary-row') || secText.toLowerCase().startsWith('lec');
        if (isPrimary) {
            currentLecture = {
                ...sectionData,
                discussions: []
            };
            lectures.push(currentLecture);
        } else {
            if (currentLecture) {
                currentLecture.discussions.push(sectionData);
            }
        }
    }
    
    return {
        course: {
            title: courseName,
            course_code: courseCode
        },
        lectures: lectures
    };
}
