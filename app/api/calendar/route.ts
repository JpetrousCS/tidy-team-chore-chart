import ical, { type VEvent } from "node-ical";
import { ensureCalendarTable } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeedConfig = { name: string; url: string; type?: string; color?: string; emoji?: string; visible?: boolean };

function getEnvironmentFeeds(): FeedConfig[] {
  try {
    const parsed = JSON.parse(process.env.CALENDAR_FEEDS_JSON || "[]");
    return Array.isArray(parsed) ? parsed.filter((feed) => feed?.name && feed?.url?.startsWith("https://")) : [];
  } catch { return []; }
}

export async function GET(request: Request) {
  const sql = await ensureCalendarTable();
  const databaseFeeds = sql ? await sql`SELECT name, url, type, color, emoji, visible FROM calendar_feeds ORDER BY created_at` as unknown as FeedConfig[] : [];
  const feeds = [...getEnvironmentFeeds(), ...databaseFeeds].filter((feed) => feed.visible !== false);
  const requestUrl = new URL(request.url);
  const from = new Date(requestUrl.searchParams.get("from") || Date.now());
  const to = new Date(requestUrl.searchParams.get("to") || from.getTime() + 14 * 86400000);
  const familyEvents = sql ? await sql`SELECT id, title, starts_at, ends_at, all_day, location, calendar, color, emoji FROM family_calendar_events WHERE ends_at >= ${from} AND starts_at <= ${to} ORDER BY starts_at` : [];
  const results = await Promise.allSettled(feeds.map(async (feed) => {
    const response = await fetch(feed.url, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
    if (!response.ok) throw new Error(`Calendar feed unavailable: ${feed.name}`);
    const parsed = await ical.async.parseICS(await response.text());
    const type = feed.type || "Family";
    return Object.values(parsed).flatMap((item) => {
      if (!item || item.type !== "VEVENT") return [];
      const event = item as VEvent;
      const instances = event.rrule ? ical.expandRecurringEvent(event, { from, to }) : event.start && event.end ? [{ start: event.start, end: event.end, isFullDay: event.datetype === "date" }] : [];
      return instances.filter((instance) => instance.end >= from && instance.start <= to).map((instance) => ({
        id: `${event.uid || feed.name}-${instance.start.toISOString()}`,
        title: String(event.summary || "Calendar event"),
        start: instance.start.toISOString(), end: instance.end.toISOString(), allDay: instance.isFullDay,
        location: event.location ? String(event.location) : "", calendar: feed.name, type, color: feed.color || "#e76f35", emoji: feed.emoji || "🗓️",
      }));
    });
  }));
  const manualEvents = familyEvents.map((event) => ({ id: String(event.id), title: String(event.title), start: new Date(String(event.starts_at)).toISOString(), end: new Date(String(event.ends_at)).toISOString(), allDay: Boolean(event.all_day), location: String(event.location), calendar: String(event.calendar), type: "family", color: String(event.color), emoji: String(event.emoji), manual: true }));
  const events = [...results.flatMap((result) => result.status === "fulfilled" ? result.value : []), ...manualEvents].sort((a, b) => a.start.localeCompare(b.start));
  return Response.json({ configured: feeds.length > 0 || manualEvents.length > 0, events, feedErrors: results.filter((result) => result.status === "rejected").length }, { headers: { "Cache-Control": "private, max-age=0, s-maxage=300" } });
}
