(() => {
  const container = document.querySelector('.reviews.row');
  if (!container) return [];
  const cards = Array.from(container.querySelectorAll('.review.reviewcard'));
  return cards.map(card => {
    const id = card.getAttribute('data-id') || null;
    let quarter = null;
    const termDivs = card.querySelectorAll('.qtaken-flex-container > div');
    termDivs.forEach(d => {
      if (d.innerText.includes('Quarter:')) {
        quarter = d.innerText.replace('Quarter:', '').trim();
      }
    });
    let grade = null;
    const gradeDiv = card.querySelector('.grade-margin');
    if (gradeDiv) {
      grade = gradeDiv.innerText.replace('Grade:', '').trim();
    }
    const dateEl = card.querySelector('.date');
    const date = dateEl ? dateEl.innerText.trim() : null;
    const verified = !!card.querySelector('.verified-tag');
    const covid = card.innerText.includes('COVID-19');
    const upvoteEl = card.querySelector('.upvote-value');
    const downvoteEl = card.querySelector('.downvote-value');
    const helpful = upvoteEl ? parseInt(upvoteEl.innerText.trim(), 10) : 0;
    const unhelpful = downvoteEl ? parseInt(downvoteEl.innerText.trim(), 10) : 0;
    const paragraphArea = card.querySelector('.review-paragraph');
    let reviewText = "";
    if (paragraphArea) {
      const ps = Array.from(paragraphArea.querySelectorAll('p'));
      if (ps.length > 0) {
        reviewText = ps.map(p => p.innerText.trim()).join('\n\n');
      } else {
        reviewText = paragraphArea.innerText.trim();
      }
    }
    return {
      review_id: id,
      date: date,
      quarter: quarter,
      grade: grade,
      verified_reviewer: verified,
      covid_review: covid,
      helpful_count: isNaN(helpful) ? 0 : helpful,
      unhelpful_count: isNaN(unhelpful) ? 0 : unhelpful,
      review_text: reviewText
    };
  });
})();
