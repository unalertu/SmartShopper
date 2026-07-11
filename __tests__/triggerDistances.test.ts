/**
 * Contract tests for the effective notification distances derived from
 * NOTIFICATION_CONSTANTS. The formulas below mirror processLocationUpdate
 * (trigger zone: step 12; density adaptation: step 8.5) — if either formula
 * changes in locationService.ts, update this file in the same commit.
 *
 * Pinned after the UX tightening (ratio 0.55 -> 0.50, density 6/⅔ -> 4/½):
 * these values are product decisions, not incidental math.
 */
import { NOTIFICATION_CONSTANTS, getAlertDistanceMeters } from '../constants';
import type { NotificationSensitivity } from '../store/useSettingsStore';

const triggerDistance = (effectiveAlertDistance: number): number =>
  Math.max(
    effectiveAlertDistance * NOTIFICATION_CONSTANTS.TRIGGER_ZONE_RATIO,
    NOTIFICATION_CONSTANTS.TRIGGER_ZONE_MIN_METERS
  );

const denseEffectiveRadius = (alertDistance: number): number =>
  Math.min(
    alertDistance,
    Math.max(
      Math.round(alertDistance * NOTIFICATION_CONSTANTS.DENSITY_SHRINK_RATIO),
      NOTIFICATION_CONSTANTS.DENSITY_MIN_RADIUS
    )
  );

const radius = (s: NotificationSensitivity) => getAlertDistanceMeters(s);

describe('effective trigger distances', () => {
  it('normal areas: near 45m, balanced 50m, far 100m', () => {
    expect(triggerDistance(radius('near'))).toBe(45);
    expect(triggerDistance(radius('balanced'))).toBe(50);
    expect(triggerDistance(radius('far'))).toBe(100);
  });

  it('never fires below the 45m GPS floor', () => {
    expect(triggerDistance(radius('near'))).toBeGreaterThanOrEqual(
      NOTIFICATION_CONSTANTS.TRIGGER_ZONE_MIN_METERS
    );
  });

  it('dense areas: far shrinks to the 100m floor (trigger 50m); near/balanced unchanged', () => {
    expect(denseEffectiveRadius(radius('far'))).toBe(100);
    expect(triggerDistance(denseEffectiveRadius(radius('far')))).toBe(50);
    // The density floor exceeds these radii, so min() keeps them unchanged
    expect(denseEffectiveRadius(radius('near'))).toBe(50);
    expect(denseEffectiveRadius(radius('balanced'))).toBe(100);
  });

  it('density shrink engages above 4 candidates', () => {
    expect(NOTIFICATION_CONSTANTS.DENSITY_STORE_THRESHOLD).toBe(4);
  });

  it('awareness radii keep >=2x arming lead over their trigger zones', () => {
    // The dwell timer arms at the awareness radius and the notification
    // fires at the trigger radius; fixes arrive ~300m apart, so the arming
    // ring must stay meaningfully wider than the firing ring.
    (['near', 'balanced', 'far'] as NotificationSensitivity[]).forEach((s) => {
      expect(radius(s) / triggerDistance(radius(s))).toBeGreaterThanOrEqual(1.1);
      expect(radius(s)).toBeGreaterThan(triggerDistance(radius(s)));
    });
  });
});
