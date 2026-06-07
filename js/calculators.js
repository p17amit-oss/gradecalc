/**
 * calculators.js — Pure calculation functions. No DOM access.
 * All functions return { result, confidence, formula, note, error? }
 */

'use strict';

/* ============================================================
   CONFIDENCE TIERS
   ============================================================ */
const CONFIDENCE = {
  HIGH:     'high',
  MODERATE: 'moderate',
  ESTIMATE: 'estimate',
};

/* ============================================================
   1. CGPA → PERCENTAGE
   ============================================================ */

/**
 * Anna University: official formula CGPA × 9.5
 * Source: Anna University circular
 * @param {number} cgpa
 * @returns {object}
 */
function cgpaToPercentageAnna(cgpa) {
  if (cgpa < 0 || cgpa > 10) {
    return { error: 'Enter a CGPA between 0 and 10' };
  }
  const result = +(cgpa * 9.5).toFixed(2);
  return {
    result,
    confidence: CONFIDENCE.HIGH,
    formula: `${cgpa} × 9.5 = ${result}%`,
    source: 'Anna University Official Circular',
    sourceUrl: 'https://www.annauniv.edu/',
    note: 'Used by all Anna University affiliated colleges in Tamil Nadu.',
    university: 'Anna University',
  };
}

/**
 * VTU: official formula (CGPA − 0.75) × 10
 * Source: VTU official notification
 * @param {number} cgpa
 * @returns {object}
 */
function cgpaToPercentageVTU(cgpa) {
  if (cgpa < 0 || cgpa > 10) {
    return { error: 'Enter a CGPA between 0 and 10' };
  }
  if (cgpa < 1.0) {
    return {
      error: null,
      warning: 'VTU minimum valid CGPA is 1.0. Please check your grade card.',
      result: null,
      confidence: CONFIDENCE.HIGH,
    };
  }
  const raw = (cgpa - 0.75) * 10;
  const result = +raw.toFixed(2);
  if (result > 100) {
    return {
      error: null,
      warning: 'Result exceeds 100% — please check your input.',
      result,
      confidence: CONFIDENCE.HIGH,
      formula: `(${cgpa} − 0.75) × 10 = ${result}%`,
    };
  }
  return {
    result,
    confidence: CONFIDENCE.HIGH,
    formula: `(${cgpa} − 0.75) × 10 = ${result}%`,
    source: 'VTU Official Notification',
    sourceUrl: 'https://vtu.ac.in/',
    note: 'Official VTU formula published in university notification.',
    university: 'VTU',
  };
}

/**
 * Mumbai University: official formula (CGPA × 7.1) + 11
 * Source: University of Mumbai ordinance
 * @param {number} cgpa
 * @returns {object}
 */
function cgpaToPercentageMumbai(cgpa) {
  if (cgpa < 0 || cgpa > 10) {
    return { error: 'Enter a CGPA between 0 and 10' };
  }
  const result = +((cgpa * 7.1) + 11).toFixed(2);
  return {
    result,
    confidence: CONFIDENCE.HIGH,
    formula: `(${cgpa} × 7.1) + 11 = ${result}%`,
    source: 'University of Mumbai Ordinance',
    sourceUrl: 'https://mu.ac.in/',
    note: 'Official formula per University of Mumbai ordinance.',
    university: 'Mumbai University',
  };
}

/**
 * Generic CGPA → percentage (two approximations shown)
 * @param {number} cgpa
 * @returns {object}
 */
function cgpaToPercentageGeneric(cgpa) {
  if (cgpa < 0 || cgpa > 10) {
    return { error: 'Enter a CGPA between 0 and 10' };
  }
  const r95  = +(cgpa * 9.5).toFixed(2);
  const r100 = +(cgpa * 10).toFixed(2);
  return {
    result: r95,
    resultAlt: r100,
    confidence: CONFIDENCE.ESTIMATE,
    formula: `${cgpa} × 9.5 = ${r95}% (or ${cgpa} × 10 = ${r100}%)`,
    note: "We don't have your university's official formula. This estimate may be 5–15% off from your actual percentage. Check your university website or grade card, or ask the AI Advisor below for help.",
    university: 'Other / Unknown',
  };
}

/**
 * All-formulas result for the generic page
 * Returns results from all four formulas for a given CGPA
 * @param {number} cgpa
 * @returns {Array}
 */
function cgpaToPercentageAll(cgpa) {
  return [
    cgpaToPercentageAnna(cgpa),
    cgpaToPercentageVTU(cgpa),
    cgpaToPercentageMumbai(cgpa),
    cgpaToPercentageGeneric(cgpa),
  ];
}

/* ============================================================
   2. PERCENTAGE → US GPA
   ============================================================ */

/**
 * Standard 10-point band mapping (no national standard)
 * @param {number} pct — 0 to 100
 * @returns {object}
 */
function percentageToUSGPA(pct) {
  if (pct < 0 || pct > 100) {
    return { error: 'Enter a percentage between 0 and 100' };
  }
  let gpa;
  if (pct >= 93)      gpa = 4.0;
  else if (pct >= 90) gpa = 3.7;
  else if (pct >= 87) gpa = 3.3;
  else if (pct >= 83) gpa = 3.0;
  else if (pct >= 80) gpa = 2.7;
  else if (pct >= 77) gpa = 2.3;
  else if (pct >= 73) gpa = 2.0;
  else if (pct >= 70) gpa = 1.7;
  else if (pct >= 67) gpa = 1.3;
  else if (pct >= 65) gpa = 1.0;
  else                gpa = 0.0;

  const wes = wesFromPercentage(pct);

  return {
    result: gpa,
    wesEstimate: wes.result,
    confidence: CONFIDENCE.ESTIMATE,
    formula: `${pct}% → ${gpa} GPA (standard band mapping)`,
    note: 'The US does not have a national percentage-to-GPA standard. Graduate schools read your transcript directly. This conversion is an approximation used for general reference.',
    wesNote: 'WES (World Education Services), the most widely accepted credential evaluator, may calculate this differently. See our WES GPA Calculator for a more accepted conversion.',
  };
}

/* ============================================================
   3. WES GPA CALCULATOR
   ============================================================ */

/**
 * WES iGPA methodology for Indian 10-point CGPA scale
 * @param {number} cgpa
 * @returns {object}
 */
function wesFromCGPA(cgpa) {
  if (cgpa < 0 || cgpa > 10) {
    return { error: 'Enter a CGPA between 0 and 10' };
  }
  let gpa, grade;
  if (cgpa >= 9.0)      { gpa = 4.0;  grade = 'A';  }
  else if (cgpa >= 8.0) { gpa = 3.7;  grade = 'A-'; }
  else if (cgpa >= 7.0) { gpa = 3.3;  grade = 'B+'; }
  else if (cgpa >= 6.0) { gpa = 3.0;  grade = 'B';  }
  else if (cgpa >= 5.0) { gpa = 2.3;  grade = 'C+'; }
  else if (cgpa >= 4.0) { gpa = 2.0;  grade = 'C';  }
  else                  { gpa = 0.0;  grade = 'F';  }

  return {
    result: gpa,
    grade,
    confidence: CONFIDENCE.MODERATE,
    formula: `CGPA ${cgpa} → WES iGPA ${gpa} (${grade})`,
    note: 'Based on WES iGPA Calculator methodology. Actual WES evaluation may vary.',
    wesNote: 'WES is accepted by most US and Canadian universities as an official credential evaluator.',
  };
}

/**
 * WES iGPA from percentage (Indian universities)
 * @param {number} pct
 * @returns {object}
 */
function wesFromPercentage(pct) {
  if (pct < 0 || pct > 100) {
    return { error: 'Enter a percentage between 0 and 100' };
  }
  let gpa, classification;
  if (pct >= 60)      { gpa = [3.7, 4.0]; classification = 'First Division with Distinction'; }
  else if (pct >= 55) { gpa = [3.3, 3.3]; classification = 'First Division'; }
  else if (pct >= 50) { gpa = [2.7, 2.7]; classification = 'Second Division'; }
  else if (pct >= 40) { gpa = [2.0, 2.0]; classification = 'Pass'; }
  else                { gpa = [0.0, 0.0]; classification = 'Fail'; }

  const result = gpa[0] === gpa[1] ? gpa[0] : null;
  const resultRange = gpa[0] === gpa[1] ? `${gpa[0]}` : `${gpa[0]}–${gpa[1]}`;

  return {
    result: result !== null ? result : gpa[0],
    resultRange,
    classification,
    confidence: CONFIDENCE.MODERATE,
    formula: `${pct}% (${classification}) → WES GPA ${resultRange}`,
    note: 'Based on WES iGPA Calculator methodology. Actual WES evaluation may vary.',
  };
}

/* ============================================================
   4. US GPA CALCULATOR (Weighted Cumulative)
   ============================================================ */

const GRADE_POINTS = {
  'A':  4.0, 'A+': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B':  3.0, 'B-': 2.7,
  'C+': 2.3, 'C':  2.0, 'C-': 1.7,
  'D+': 1.3, 'D':  1.0, 'D-': 0.7,
  'F':  0.0,
};

/**
 * Calculate weighted and unweighted cumulative GPA
 * @param {Array<{grade: string, credits: number}>} courses
 * @returns {object}
 */
function calculateUSGPA(courses) {
  if (!courses || courses.length === 0) {
    return { error: 'Add at least one course' };
  }

  const validCourses = courses.filter(c =>
    c.grade in GRADE_POINTS && c.credits > 0
  );

  if (validCourses.length === 0) {
    return { error: 'Add at least one valid course with grade and credits' };
  }

  const totalPoints  = validCourses.reduce((sum, c) => sum + GRADE_POINTS[c.grade] * c.credits, 0);
  const totalCredits = validCourses.reduce((sum, c) => sum + c.credits, 0);
  const sumPoints    = validCourses.reduce((sum, c) => sum + GRADE_POINTS[c.grade], 0);

  const weightedGPA    = +(totalPoints / totalCredits).toFixed(2);
  const unweightedGPA  = +(sumPoints / validCourses.length).toFixed(2);

  return {
    result: weightedGPA,
    weightedGPA,
    unweightedGPA,
    totalCredits,
    courseCount: validCourses.length,
    confidence: CONFIDENCE.HIGH,
    formula: `Σ(grade_points × credits) / Σ(credits) = ${totalPoints.toFixed(2)} / ${totalCredits} = ${weightedGPA}`,
    note: 'This is a direct arithmetic calculation — no approximation.',
  };
}

/* ============================================================
   5. UK DEGREE → US GPA
   ============================================================ */

/**
 * UK degree classification or percentage → US GPA range
 * @param {string|null} classification — 'first'|'upper_second'|'lower_second'|'third'|'fail'
 * @param {number|null} percentage — 0 to 100
 * @returns {object}
 */
function ukToUSGPA(classification, percentage) {
  let cls = classification;

  if (percentage !== null && percentage !== undefined) {
    if (percentage < 0 || percentage > 100) {
      return { error: 'Enter a percentage between 0 and 100' };
    }
    if (percentage >= 70)      cls = 'first';
    else if (percentage >= 60) cls = 'upper_second';
    else if (percentage >= 50) cls = 'lower_second';
    else if (percentage >= 40) cls = 'third';
    else                       cls = 'fail';
  }

  const map = {
    first:        { label: 'First Class (1st)',         gpaLow: 4.0, gpaHigh: 4.0, pctRange: '70%+' },
    upper_second: { label: 'Upper Second (2:1)',         gpaLow: 3.3, gpaHigh: 3.7, pctRange: '60–69%' },
    lower_second: { label: 'Lower Second (2:2)',         gpaLow: 2.7, gpaHigh: 3.0, pctRange: '50–59%' },
    third:        { label: 'Third Class (3rd)',          gpaLow: 2.0, gpaHigh: 2.3, pctRange: '40–49%' },
    fail:         { label: 'Fail',                       gpaLow: 0.0, gpaHigh: 0.0, pctRange: '<40%' },
  };

  if (!cls || !(cls in map)) {
    return { error: 'Select a classification or enter a valid percentage' };
  }

  const entry = map[cls];
  const isExact = entry.gpaLow === entry.gpaHigh;
  const resultRange = isExact ? `${entry.gpaLow}` : `${entry.gpaLow}–${entry.gpaHigh}`;

  return {
    result: entry.gpaLow,
    resultHigh: entry.gpaHigh,
    resultRange,
    classification: entry.label,
    pctRange: entry.pctRange,
    confidence: entry.gpaLow === entry.gpaHigh ? CONFIDENCE.HIGH : CONFIDENCE.MODERATE,
    formula: `${entry.label} → ${resultRange} US GPA`,
    source: 'Based on WES and common US graduate admissions practice.',
    note: entry.gpaLow !== entry.gpaHigh
      ? 'Range shown because exact conversion depends on the receiving institution. Many US graduate programs accept 2:1 or better.'
      : null,
  };
}

/* ============================================================
   6. IB SCORE → US GPA
   ============================================================ */

/**
 * IB total score (0–45) → US GPA
 * @param {number} score — integer 0 to 45
 * @returns {object}
 */
function ibToGPA(score) {
  if (!Number.isInteger(score) || score < 0 || score > 45) {
    return { error: 'Enter an integer IB score between 0 and 45' };
  }
  let gpa;
  if (score === 45)          gpa = 4.0;
  else if (score >= 42)      gpa = 3.9;
  else if (score >= 38)      gpa = 3.7;
  else if (score >= 34)      gpa = 3.3;
  else if (score >= 30)      gpa = 3.0;
  else if (score >= 26)      gpa = 2.7;
  else if (score >= 24)      gpa = 2.3;
  else                       gpa = parseFloat((2.0 - (24 - score) * 0.1).toFixed(1));

  return {
    result: gpa,
    confidence: CONFIDENCE.MODERATE,
    formula: `IB ${score}/45 → ${gpa} US GPA`,
    note: 'IB to GPA conversion varies by institution. This is a widely-used approximation.',
  };
}

/* ============================================================
   7. GRADE NEEDED CALCULATOR
   ============================================================ */

/**
 * What grade is needed on remaining assessments to hit target overall?
 * @param {number} currentGrade — 0 to 100
 * @param {number} currentWeight — 0 to 100 (percentage already completed)
 * @param {number} targetGrade  — 0 to 100
 * @returns {object}
 */
function gradeNeeded(currentGrade, currentWeight, targetGrade) {
  if (currentGrade < 0 || currentGrade > 100) return { error: 'Current grade must be 0–100' };
  if (currentWeight <= 0 || currentWeight >= 100) return { error: 'Completed weight must be between 1 and 99' };
  if (targetGrade < 0 || targetGrade > 100) return { error: 'Target grade must be 0–100' };

  const remaining = (100 - currentWeight) / 100;
  const done = currentWeight / 100;
  const required = (targetGrade - currentGrade * done) / remaining;
  const requiredRounded = +required.toFixed(1);

  if (required > 100) {
    return {
      result: requiredRounded,
      state: 'impossible',
      confidence: CONFIDENCE.HIGH,
      formula: `(${targetGrade} − ${currentGrade} × ${done}) / ${remaining} = ${requiredRounded}%`,
      message: `Mathematically impossible with current grades. You would need ${requiredRounded}% on remaining work — which exceeds 100%. Lower your target or speak with your instructor.`,
    };
  }

  // Already achieved?
  const currentProjected = currentGrade; // if weight is 100%, already done
  const alreadyAchieved = currentGrade * done >= targetGrade;

  if (alreadyAchieved) {
    return {
      result: requiredRounded,
      state: 'achieved',
      confidence: CONFIDENCE.HIGH,
      formula: `(${targetGrade} − ${currentGrade} × ${done}) / ${remaining} = ${requiredRounded}%`,
      message: `You've already secured your target! You only need ${requiredRounded}% on remaining work to hit exactly ${targetGrade}%.`,
    };
  }

  return {
    result: requiredRounded,
    state: 'achievable',
    confidence: CONFIDENCE.HIGH,
    formula: `(${targetGrade} − ${currentGrade} × ${done}) / ${remaining} = ${requiredRounded}%`,
    message: `You need ${requiredRounded}% on your remaining ${100 - currentWeight}% of assessments to achieve ${targetGrade}% overall.`,
  };
}

/* ============================================================
   8. PERCENTAGE → LETTER GRADE (US)
   ============================================================ */

function percentageToLetterGrade(pct) {
  if (pct < 0 || pct > 100) return { error: 'Enter a percentage between 0 and 100' };
  let letter, gpa, description;
  if (pct >= 93)      { letter = 'A';  gpa = 4.0; description = 'Excellent'; }
  else if (pct >= 90) { letter = 'A-'; gpa = 3.7; description = 'Excellent'; }
  else if (pct >= 87) { letter = 'B+'; gpa = 3.3; description = 'Good'; }
  else if (pct >= 83) { letter = 'B';  gpa = 3.0; description = 'Good'; }
  else if (pct >= 80) { letter = 'B-'; gpa = 2.7; description = 'Good'; }
  else if (pct >= 77) { letter = 'C+'; gpa = 2.3; description = 'Average'; }
  else if (pct >= 73) { letter = 'C';  gpa = 2.0; description = 'Average'; }
  else if (pct >= 70) { letter = 'C-'; gpa = 1.7; description = 'Average'; }
  else if (pct >= 67) { letter = 'D+'; gpa = 1.3; description = 'Below average'; }
  else if (pct >= 63) { letter = 'D';  gpa = 1.0; description = 'Below average'; }
  else if (pct >= 60) { letter = 'D-'; gpa = 0.7; description = 'Below average'; }
  else                { letter = 'F';  gpa = 0.0; description = 'Failing'; }

  return {
    result: letter,
    gpa,
    description,
    confidence: CONFIDENCE.HIGH,
    formula: `${pct}% → ${letter} (${gpa} GPA)`,
    note: 'Standard US letter grade scale. Individual institutions may use slightly different cutoffs.',
  };
}

/* ============================================================
   9. LETTER GRADE → GPA
   ============================================================ */

function letterGradeToGPA(letter) {
  const upper = (letter || '').toUpperCase().trim();
  if (!(upper in GRADE_POINTS)) {
    return { error: `"${letter}" is not a recognized grade. Use A, A-, B+, B, B-, C+, C, C-, D+, D, F` };
  }
  const gpa = GRADE_POINTS[upper];
  return {
    result: gpa,
    letter: upper,
    confidence: CONFIDENCE.HIGH,
    formula: `${upper} → ${gpa} GPA`,
    note: 'Standard 4.0 scale used by most US universities.',
  };
}

/* ============================================================
   10. CUMULATIVE GPA CALCULATOR
   ============================================================ */

/**
 * Cumulative GPA across multiple terms
 * @param {Array<{gpa: number, credits: number}>} terms
 * @returns {object}
 */
function cumulativeGPA(terms) {
  if (!terms || terms.length === 0) return { error: 'Add at least one term' };

  const valid = terms.filter(t => t.gpa >= 0 && t.gpa <= 4.0 && t.credits > 0);
  if (valid.length === 0) return { error: 'Enter valid GPA (0–4.0) and credits for at least one term' };

  const totalPoints  = valid.reduce((s, t) => s + t.gpa * t.credits, 0);
  const totalCredits = valid.reduce((s, t) => s + t.credits, 0);
  const cumGPA = +(totalPoints / totalCredits).toFixed(2);

  return {
    result: cumGPA,
    totalCredits,
    termCount: valid.length,
    confidence: CONFIDENCE.HIGH,
    formula: `Σ(GPA × credits) / Σ(credits) = ${totalPoints.toFixed(2)} / ${totalCredits} = ${cumGPA}`,
    note: 'Weighted cumulative GPA across all entered terms.',
  };
}

/* ============================================================
   UK DEGREE CLASSIFICATION (standalone)
   ============================================================ */

function ukDegreeClassification(percentage) {
  if (percentage < 0 || percentage > 100) return { error: 'Enter a percentage between 0 and 100' };
  let classification, label, usGpaRange;
  if (percentage >= 70)      { classification = 'first';        label = 'First Class Honours (1st)'; usGpaRange = '4.0'; }
  else if (percentage >= 60) { classification = 'upper_second'; label = 'Upper Second Class (2:1)';  usGpaRange = '3.3–3.7'; }
  else if (percentage >= 50) { classification = 'lower_second'; label = 'Lower Second Class (2:2)';  usGpaRange = '2.7–3.0'; }
  else if (percentage >= 40) { classification = 'third';        label = 'Third Class Honours (3rd)'; usGpaRange = '2.0–2.3'; }
  else                        { classification = 'fail';         label = 'Fail';                      usGpaRange = '0.0'; }

  return {
    result: label,
    classification,
    usGpaRange,
    confidence: classification === 'first' || classification === 'fail' ? CONFIDENCE.HIGH : CONFIDENCE.MODERATE,
    formula: `${percentage}% → ${label}`,
    note: 'UK degree classification boundaries are standardized across UK universities.',
  };
}

/* ============================================================
   TEST CASES — Reference for manual QA
   ============================================================ */
const TEST_CASES = {
  cgpaToPercentage: [
    // [input_cgpa, university, expected_result]
    { cgpa: 7.0, university: 'anna',   expected: 66.5,  pass: cgpaToPercentageAnna(7.0).result === 66.5 },
    { cgpa: 7.0, university: 'vtu',    expected: 62.5,  pass: cgpaToPercentageVTU(7.0).result === 62.5 },
    { cgpa: 7.0, university: 'mumbai', expected: 60.7,  pass: cgpaToPercentageMumbai(7.0).result === 60.7 },
    { cgpa: 10.0, university: 'anna',  expected: 95.0,  pass: cgpaToPercentageAnna(10.0).result === 95.0 },
    { cgpa: 0.0,  university: 'anna',  expected: 0.0,   pass: cgpaToPercentageAnna(0.0).result === 0.0 },
    { cgpa: 10.1, university: 'anna',  expected: 'error', pass: !!cgpaToPercentageAnna(10.1).error },
    { cgpa: 0.5,  university: 'vtu',   expected: 'warning', pass: !!cgpaToPercentageVTU(0.5).warning },
  ],
  gradeNeeded: [
    // Current 70%, remaining 30%, target 80% → impossible (need 103.3%)
    { current: 70, weight: 70, target: 80, expected: 'impossible',
      pass: gradeNeeded(70, 70, 80).state === 'impossible' },
    // Current 85%, 60% done, target 80% → 72.5% needed
    { current: 85, weight: 60, target: 80, expected: 72.5,
      pass: gradeNeeded(85, 60, 80).result === 72.5 },
    // Current 90%, 80% done, target 85% → 65% needed
    { current: 90, weight: 80, target: 85, expected: 65,
      pass: gradeNeeded(90, 80, 85).result === 65 },
  ],
  usGPA: [
    // A(3cr) + B+(3cr) + B(2cr) → (12 + 9.9 + 6.0)/8 = 3.49
    { courses: [{grade:'A',credits:3},{grade:'B+',credits:3},{grade:'B',credits:2}],
      expected: 3.49,
      pass: calculateUSGPA([{grade:'A',credits:3},{grade:'B+',credits:3},{grade:'B',credits:2}]).weightedGPA === 3.49 },
    { courses: [{grade:'F',credits:0.5}], expected: 0.0,
      pass: calculateUSGPA([{grade:'F',credits:0.5}]).weightedGPA === 0.0 },
    { courses: [{grade:'A',credits:3}], expected: 4.0,
      pass: calculateUSGPA([{grade:'A',credits:3}]).weightedGPA === 4.0 },
  ],
};

/* ============================================================
   EXPORTS (available globally when script is loaded)
   ============================================================ */
window.Calculators = {
  cgpaToPercentageAnna,
  cgpaToPercentageVTU,
  cgpaToPercentageMumbai,
  cgpaToPercentageGeneric,
  cgpaToPercentageAll,
  percentageToUSGPA,
  wesFromCGPA,
  wesFromPercentage,
  calculateUSGPA,
  ukToUSGPA,
  ibToGPA,
  gradeNeeded,
  percentageToLetterGrade,
  letterGradeToGPA,
  cumulativeGPA,
  ukDegreeClassification,
  GRADE_POINTS,
  CONFIDENCE,
  TEST_CASES,
};
