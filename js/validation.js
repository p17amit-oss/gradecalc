/**
 * validation.js — Validation rules per calculator type.
 * Pure functions — no DOM access. Returns { valid, error }.
 */

'use strict';

const Validation = {

  /**
   * Validate CGPA input (0–10, max 2 decimal places)
   */
  cgpa(value) {
    if (value === '' || value === null || value === undefined) {
      return { valid: false, error: 'Required' };
    }
    const n = parseFloat(value);
    if (isNaN(n)) {
      return { valid: false, error: 'Enter a valid number' };
    }
    if (n < 0 || n > 10) {
      return { valid: false, error: 'Enter a value between 0 and 10' };
    }
    // Max 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
      return { valid: false, error: 'Maximum 2 decimal places' };
    }
    return { valid: true, error: null, value: n };
  },

  /**
   * Validate percentage input (0–100, max 2 decimal places)
   */
  percentage(value) {
    if (value === '' || value === null || value === undefined) {
      return { valid: false, error: 'Required' };
    }
    const n = parseFloat(value);
    if (isNaN(n)) {
      return { valid: false, error: 'Enter a valid number' };
    }
    if (n < 0 || n > 100) {
      return { valid: false, error: 'Enter a value between 0 and 100' };
    }
    if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
      return { valid: false, error: 'Maximum 2 decimal places' };
    }
    return { valid: true, error: null, value: n };
  },

  /**
   * Validate credit hours (0.5–12, 0.5 increments)
   */
  credits(value) {
    if (value === '' || value === null || value === undefined) {
      return { valid: false, error: 'Required' };
    }
    const n = parseFloat(value);
    if (isNaN(n)) {
      return { valid: false, error: 'Enter a valid number' };
    }
    if (n < 0.5 || n > 12) {
      return { valid: false, error: 'Enter a value between 0.5 and 12' };
    }
    // Must be a multiple of 0.5
    if (Math.round(n * 2) !== n * 2) {
      return { valid: false, error: 'Use 0.5 increments (e.g. 1.5, 3.0)' };
    }
    return { valid: true, error: null, value: n };
  },

  /**
   * Validate IB score (integer, 0–45)
   */
  ibScore(value) {
    if (value === '' || value === null || value === undefined) {
      return { valid: false, error: 'Required' };
    }
    const n = parseInt(value, 10);
    if (isNaN(n) || String(n) !== String(value).trim()) {
      return { valid: false, error: 'Enter a whole number (no decimals)' };
    }
    if (n < 0 || n > 45) {
      return { valid: false, error: 'Enter a value between 0 and 45' };
    }
    return { valid: true, error: null, value: n };
  },

  /**
   * Validate dropdown selection (must have a non-empty value)
   */
  dropdown(value) {
    if (!value || value === '' || value === '__placeholder__') {
      return { valid: false, error: 'Required' };
    }
    return { valid: true, error: null, value };
  },

  /**
   * Validate remaining weight for grade-needed calculator (1–99)
   */
  remainingWeight(value) {
    if (value === '' || value === null || value === undefined) {
      return { valid: false, error: 'Required' };
    }
    const n = parseFloat(value);
    if (isNaN(n)) {
      return { valid: false, error: 'Enter a valid number' };
    }
    if (n <= 0) {
      return { valid: false, error: 'Remaining weight cannot be zero' };
    }
    if (n >= 100) {
      return { valid: false, error: 'Remaining weight must be less than 100%' };
    }
    if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) {
      return { valid: false, error: 'Maximum 2 decimal places' };
    }
    return { valid: true, error: null, value: n };
  },

  /**
   * Validate GPA value (0.0–4.0)
   */
  gpa(value) {
    if (value === '' || value === null || value === undefined) {
      return { valid: false, error: 'Required' };
    }
    const n = parseFloat(value);
    if (isNaN(n)) {
      return { valid: false, error: 'Enter a valid number' };
    }
    if (n < 0 || n > 4.0) {
      return { valid: false, error: 'Enter a GPA between 0.0 and 4.0' };
    }
    return { valid: true, error: null, value: n };
  },

  /**
   * Apply validation to a field element and show/hide error
   * @param {HTMLElement} fieldEl — wrapper with class "field"
   * @param {object} result — { valid, error } from a validator above
   */
  applyToField(fieldEl, result) {
    if (!fieldEl) return;
    const errorEl = fieldEl.querySelector('.field__error');
    if (result.valid) {
      fieldEl.classList.remove('field--error');
      if (errorEl) errorEl.textContent = '';
    } else {
      fieldEl.classList.add('field--error');
      if (errorEl) errorEl.textContent = result.error;
    }
  },
};

window.Validation = Validation;
