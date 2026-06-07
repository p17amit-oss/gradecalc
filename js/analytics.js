/**
 * analytics.js — GTM-compatible event layer.
 * Pushes to window.dataLayer. No PII, no raw input values.
 * All event types match the spec exactly.
 */

'use strict';

window.dataLayer = window.dataLayer || [];

const Analytics = {
  /**
   * Push a structured event to dataLayer.
   * @param {string} event
   * @param {object} params — must not contain PII or raw user input values
   */
  track(event, params = {}) {
    try {
      window.dataLayer.push({
        event,
        ...params,
        timestamp: Date.now(),
      });
    } catch (e) {
      // Analytics must never break the user experience
    }
  },

  // ── Typed helpers ──────────────────────────────────────────

  calculatorUsed(calculatorType) {
    this.track('calculator_used', {
      calculator_type: calculatorType,
      page: window.location.pathname,
    });
  },

  conversionCompleted(calculatorType, confidenceTier, resultRangeLabel) {
    this.track('conversion_completed', {
      calculator_type: calculatorType,
      page: window.location.pathname,
      confidence_tier: confidenceTier,
      result_range_label: resultRangeLabel,
      // Never include the actual raw input value
    });
  },

  aiQuerySent(contextType) {
    this.track('ai_query_sent', {
      page: window.location.pathname,
      context_type: contextType,
    });
  },

  aiResponseReceived(responseTimeMs) {
    this.track('ai_response_received', {
      page: window.location.pathname,
      response_time_ms: responseTimeMs,
      streamed: true,
    });
  },

  confidenceBadgeClicked(tier) {
    this.track('confidence_badge_clicked', {
      page: window.location.pathname,
      tier,
    });
  },

  darkModeToggled(toMode) {
    this.track('dark_mode_toggled', { to_mode: toMode });
  },

  adSlotLoaded(slotPosition) {
    this.track('ad_slot_loaded', {
      page: window.location.pathname,
      slot_position: slotPosition,
    });
  },

  adSlotFailed(slotPosition) {
    this.track('ad_slot_failed', {
      page: window.location.pathname,
      slot_position: slotPosition,
    });
  },

  errorDisplayed(field, errorType) {
    this.track('error_displayed', {
      page: window.location.pathname,
      field,
      error_type: errorType,
    });
  },
};

window.Analytics = Analytics;
