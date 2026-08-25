import ical, { type VEvent } from "node-ical";
import { ensureCalendarTable } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeedConfig = { name: string; url: string; type?: "kids" | "work" | "family"; color?: string };
const colors = { kids: "#b85dc7", work: "#3186c7", family: "#e76f35" };

function getEnvironmentFeeds(): FeedConfig[] {
  try {
    const parsed = JSON.parse(process.env.CALENDAR_FEEDS_JSON || "[]");
    return Array.isArray(parsed) ? parsed.filter((feed) => feed?.name && feed?.url?.startsWith("https://")) : [];
  } catch { return []; }
}

export async function GET(request: Request) {
  const sql = await ensureCalendarTable();
  const databaseFeeds = sql ? await sql`SELECT name, url, type, color FROM calendar_feeds ORDER BY created_at` as unknown as FeedConfig[] : [];
  const feeds = [...getEnvironmentFeeds(), ...databaseFeeds];
  if (!feeds.length) return Response.json({ configured: false, events: [] });
  const requestUrl = new URL(request.url);
  const from = new Date(requestUrl.searchParams.get("from") || Date.now());
  const to = new Date(requestUrl.searchParams.get("to") || from.getTime() + 14 * 86400000);
  const results = await Promise.allSettled(feeds.map(async (feed) => {
    const response = await fetch(feed.url, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
    if (!response.ok) throw new Error(`Calendar feed unavailable: ${feed.name}`);
    const parsed = await ical.async.parseICS(await response.text());
    const type = feed.type || "family";
    return Object.values(parsed).flatMap((item) => {
      if (!item || item.type !== "VEVENT") return [];
      const event = item as VEvent;
      const instances = event.rrule ? ical.expandRecurringEvent(event, { from, to }) : event.start && event.end ? [{ start: event.start, end: event.end, isFullDay: event.datetype === "date" }] : [];
      return instances.filter((instance) => instance.end >= from && instance.start <= to).map((instance) => ({
        id: `${event.uid || feed.name}-${instance.start.toISOString()}`,
        title: String(event.summary || "Calendar event"),
        start: instance.start.toISOString(), end: instance.end.toISOString(), allDay: instance.isFullDay,
        location: event.location ? String(event.location) : "", calendar: feed.name, type, color: feed.color || colors[type],
      }));
    });
  }));
  const events = results.flatMap((result) => result.status === "fulfilled" ? result.value : []).sort((a, b) => a.start.localeCompare(b.start));
  return Response.json({ configured: true, events, feedErrors: results.filter((result) => result.status === "rejected").length }, { headers: { "Cache-Control": "private, max-age=0, s-maxage=300" } });
}
