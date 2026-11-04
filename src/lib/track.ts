/**
 * Single entry point for analytics events. Does nothing by default (no analytics
 * service is installed); forward to one here when it is added. Logs in dev only.
 */
export type TrackProps = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: string, props?: TrackProps): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[track] ${name}`, props ?? {});
  }
}
