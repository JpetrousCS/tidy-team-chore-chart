"use client";

import { useEffect, useMemo, useState } from "react";
import { platformAuthenticatorIsAvailable, startAuthentication, startRegistration } from "@simplewebauthn/browser";

type Member = { id: string; name: string; initial: string; color: string; celebrationEmoji: string; celebrationMessage: string };
type Cadence = "daily" | "weekly" | "monthly" | "flexible";
type Routine = "morning" | "afternoon" | "evening" | "anytime";
type Verification = "none" | "parent" | "photo" | "sibling";
type Chore = { id: string; title: string; detail: string; icon: string; points: number; teamBonus?: number; verification?: Verification; memberId: string; memberIds?: string[]; cadence: Cadence; routine?: Routine; dueDay?: number; dueDate?: number; weeklyGoal?: number };
type Completion = { id?: string; choreId: string; date: string; status?: "pending" | "approved"; proofPath?: string };
type Reward = { id: string; title: string; detail: string; emoji: string; cost: number };
type Redemption = { id: string; rewardId: string; rewardTitle: string; memberId: string; cost: number; redeemedAt: string; status?: "pending" | "approved" };
type PointPolicy = { reset: "never" | "weekly" | "monthly"; dailyEarnLimit: number; maxBalance: number };
type NotificationSettings = { enabled: boolean; evening: boolean; rewards: boolean; calendar: boolean };
type AppState = { household: string; members: Member[]; chores: Chore[]; completions: Completion[]; rewards: Reward[]; redemptions: Redemption[]; removedDefaultChoreIds: string[]; pointPolicy: PointPolicy; notificationSettings: NotificationSettings };
type CalendarEvent = { id: string; title: string; start: string; end: string; allDay: boolean; location: string; calendar: string; type: "kids" | "work" | "family"; color: string };

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const celebrationChoices = [
  { emoji: "🦄", name: "Unicorn" }, { emoji: "✨", name: "Sparkles" }, { emoji: "🌈", name: "Rainbow" },
  { emoji: "🧚", name: "Fairy" }, { emoji: "🏎️", name: "Race car" }, { emoji: "🚀", name: "Rocket" },
  { emoji: "🦖", name: "Dinosaur" }, { emoji: "⚽", name: "Soccer ball" }, { emoji: "🐉", name: "Dragon" },
  { emoji: "🎉", name: "Party popper" }, { emoji: "🏆", name: "Trophy" }, { emoji: "⭐", name: "Superstar" },
];
const themeColors = [
  { value: "#b85dc7", name: "Berry pink" }, { value: "#dc6f9f", name: "Rose pink" },
  { value: "#e76f35", name: "Tangerine" }, { value: "#d9a62e", name: "Sunshine gold" },
  { value: "#3f8b76", name: "Garden green" }, { value: "#65a45f", name: "Leaf green" },
  { value: "#3186c7", name: "Sky blue" }, { value: "#416fb3", name: "Rocket blue" },
  { value: "#6957d5", name: "Adventure purple" }, { value: "#8b67b8", name: "Lavender" },
  { value: "#497f87", name: "Ocean teal" }, { value: "#b2674e", name: "Warm coral" },
];

function ThemeColorPicker({ member }: { member: Member }) {
  const [selectedColor, setSelectedColor] = useState(member.color);

  return <>
    <label>Theme color<select className="themeSelect" name={`${member.id}-color`} value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)} style={{ borderColor: selectedColor }}>{themeColors.map((color) => <option key={color.value} value={color.value}>{color.name}</option>)}</select></label>
    <div className="themePalette" role="group" aria-label={`${member.name}'s theme color`}>
      {themeColors.map((color) => <button key={color.value} type="button" className={color.value === selectedColor ? "selected" : ""} style={{ background: color.value }} onClick={() => setSelectedColor(color.value)} aria-label={color.name} aria-pressed={color.value === selectedColor} title={color.name}><span>{color.name}</span></button>)}
    </div>
  </>;
}
const starterRewards: Reward[] = [
  { id: "tablet-30", title: "30 minutes of tablet time", detail: "Choose a favorite app or show", emoji: "📱", cost: 40 },
  { id: "games-30", title: "30 minutes of video games", detail: "Bonus game time", emoji: "🎮", cost: 50 },
  { id: "putt-putt", title: "Putt-putt and ice cream", detail: "A special family outing", emoji: "⛳", cost: 250 },
  { id: "kids-empire", title: "Visit to Kids Empire", detail: "Indoor play adventure", emoji: "🏰", cost: 350 },
];
const coreChores = [
  { slug: "teeth", title: "Brush your teeth", detail: "Morning & bedtime", icon: "🪥", points: 5, routine: "morning" as Routine },
  { slug: "bed", title: "Make your bed", detail: "Start the day tidy", icon: "🛏️", points: 5, routine: "morning" as Routine },
  { slug: "kind", title: "Do something kind", detail: "Help or encourage someone", icon: "💛", points: 10, routine: "anytime" as Routine },
  { slug: "tidy", title: "Tidy your things", detail: "Toys, clothes & belongings", icon: "🧸", points: 8, routine: "evening" as Routine },
  { slug: "bath", title: "Take a shower or bath", detail: "Get squeaky clean", icon: "🛁", points: 10, routine: "evening" as Routine },
  { slug: "room", title: "Clean your room", detail: "Put things back where they belong", icon: "🧹", points: 15, routine: "evening" as Routine },
  { slug: "dad-project", title: "Help Dad with a project", detail: "Family teamwork", icon: "🛠️", points: 15, routine: "anytime" as Routine },
] as const;
const suggestedChores = [
  { title: "Put dirty clothes in the hamper", detail: "Little helper", icon: "👕", points: 5, cadence: "daily" as const },
  { title: "Set or clear the table", detail: "Little helper", icon: "🍽️", points: 8, cadence: "daily" as const },
  { title: "Feed a pet", detail: "Little helper", icon: "🐾", points: 8, cadence: "daily" as const },
  { title: "Water plants", detail: "Little helper", icon: "🪴", points: 8, cadence: "weekly" as const },
  { title: "Sort or fold laundry", detail: "Growing helper", icon: "🧺", points: 12, cadence: "weekly" as const },
  { title: "Sweep or vacuum a room", detail: "Growing helper", icon: "🧹", points: 15, cadence: "weekly" as const },
  { title: "Unload the dishwasher", detail: "Growing helper", icon: "🍽️", points: 15, cadence: "weekly" as const },
  { title: "Help prepare a meal", detail: "With adult supervision", icon: "🥗", points: 18, cadence: "weekly" as const },
  { title: "Take out the trash", detail: "Independent helper", icon: "🗑️", points: 15, cadence: "weekly" as const },
  { title: "Change your bedsheets", detail: "Independent helper", icon: "🛏️", points: 20, cadence: "weekly" as const },
  { title: "Clean the bathroom sink", detail: "Independent helper", icon: "🧽", points: 20, cadence: "weekly" as const },
  { title: "Help Dad with a project", detail: "Family teamwork", icon: "🛠️", points: 25, cadence: "weekly" as const },
];
const starterState: AppState = {
  household: "The Petrous Family",
  members: [
    { id: "charli", name: "Charli", initial: "C", color: "#b85dc7", celebrationEmoji: "🦄", celebrationMessage: "Magical job!" },
    { id: "andy", name: "Andy", initial: "A", color: "#e76f35", celebrationEmoji: "🏎️", celebrationMessage: "You raced through it!" },
    { id: "henry", name: "Henry", initial: "H", color: "#3186c7", celebrationEmoji: "🚀", celebrationMessage: "Blast-off—great job!" },
  ],
  chores: [
    { id: "charli-teeth", title: "Brush your teeth", detail: "Morning & bedtime", icon: "🪥", points: 5, memberId: "charli", cadence: "daily" },
    { id: "charli-bed", title: "Make your bed", detail: "Before breakfast", icon: "🛏️", points: 5, memberId: "charli", cadence: "daily" },
    { id: "charli-kind", title: "Do something kind", detail: "For Andy or Henry", icon: "💜", points: 12, memberId: "charli", cadence: "daily" },
    { id: "charli-tidy", title: "Tidy your things", detail: "Toys, clothes & belongings", icon: "🧸", points: 8, memberId: "charli", cadence: "daily" },
    { id: "andy-teeth", title: "Brush your teeth", detail: "Morning & bedtime", icon: "🪥", points: 5, memberId: "andy", cadence: "daily" },
    { id: "andy-bed", title: "Make your bed", detail: "Start the day tidy", icon: "🛏️", points: 5, memberId: "andy", cadence: "daily" },
    { id: "andy-kind", title: "Do something kind", detail: "Help or encourage someone", icon: "💛", points: 10, memberId: "andy", cadence: "daily" },
    { id: "andy-tidy", title: "Tidy your things", detail: "Toys, clothes & belongings", icon: "🧸", points: 8, memberId: "andy", cadence: "daily" },
    { id: "andy-toys", title: "Pick up your toys", detail: "Before bedtime", icon: "🧸", points: 8, memberId: "andy", cadence: "daily" },
    { id: "andy-bath", title: "Take a shower or bath", detail: "Get squeaky clean", icon: "🛁", points: 10, memberId: "andy", cadence: "weekly", dueDay: 3 },
    { id: "henry-teeth", title: "Brush your teeth", detail: "Morning & bedtime", icon: "🪥", points: 5, memberId: "henry", cadence: "daily" },
    { id: "henry-bed", title: "Make your bed", detail: "Before breakfast", icon: "🛏️", points: 5, memberId: "henry", cadence: "daily" },
    { id: "henry-kind", title: "Do something kind", detail: "For Charli or Andy", icon: "💙", points: 12, memberId: "henry", cadence: "daily" },
    { id: "henry-tidy", title: "Tidy your things", detail: "Toys, clothes & belongings", icon: "🧸", points: 8, memberId: "henry", cadence: "daily" },
    { id: "charli-room", title: "Clean your room", detail: "Saturday reset", icon: "🧹", points: 20, memberId: "charli", cadence: "weekly", dueDay: 6 },
    { id: "andy-room", title: "Clean your room", detail: "Saturday reset", icon: "🧹", points: 20, memberId: "andy", cadence: "weekly", dueDay: 6 },
    { id: "henry-toys", title: "Pick up your toys", detail: "Put everything away", icon: "🧸", points: 8, memberId: "henry", cadence: "daily" },
    { id: "dad-project", title: "Help Dad with a project", detail: "Weekend teamwork", icon: "🛠️", points: 25, memberId: "henry", cadence: "weekly", dueDay: 6 },
  ],
  completions: [],
  rewards: starterRewards,
  redemptions: [],
  removedDefaultChoreIds: [],
  pointPolicy: { reset: "never", dailyEarnLimit: 0, maxBalance: 0 },
  notificationSettings: { enabled: false, evening: true, rewards: true, calendar: true },
};

function normalizeState(saved: AppState): AppState {
  const members = saved.members.map((member) => {
    const legacy = member as Member & { celebration?: string };
    const fallback = legacy.celebration === "unicorn" ? "🦄" : legacy.celebration === "racecar" ? "🏎️" : "🚀";
    return { ...member, celebrationEmoji: member.celebrationEmoji || fallback, celebrationMessage: member.celebrationMessage || "Way to go!" };
  });
  const coreSlug = (title: string) => {
    const value = title.toLowerCase();
    if (value.includes("brush") && value.includes("teeth")) return "teeth";
    if (value.includes("make") && value.includes("bed")) return "bed";
    if (value.includes("something kind")) return "kind";
    if (value.includes("tidy your things") || value.includes("pick up your toys")) return "tidy";
    if (value.includes("shower") || value.includes("bath")) return "bath";
    if (value.includes("clean your room")) return "room";
    if (value.includes("help dad") && value.includes("project")) return "dad-project";
    return null;
  };
  const replacedIds = new Map<string, string>();
  const chores = saved.chores.filter((chore) => {
    const slug = coreSlug(chore.title);
    if (slug) replacedIds.set(chore.id, `${chore.memberId}-${slug}`);
    return !slug;
  });
  const removedDefaultChoreIds = saved.removedDefaultChoreIds ?? [];
  for (const member of members) for (const core of coreChores) if (!removedDefaultChoreIds.includes(`${member.id}-${core.slug}`)) chores.push({ id: `${member.id}-${core.slug}`, title: core.title, detail: core.detail, icon: core.icon, points: core.points, routine: core.routine, memberId: member.id, cadence: "daily" });
  const completions = Array.from(new Map(saved.completions.map((item) => { const mapped = { ...item, choreId: replacedIds.get(item.choreId) || item.choreId }; return [mapped.id || `${mapped.choreId}-${mapped.date}`, mapped]; })).values());
  return { ...saved, members, chores: chores.map((chore) => chore.memberIds?.length ? { ...chore, teamBonus: chore.teamBonus ?? 5 } : chore), completions, rewards: saved.rewards ?? starterRewards, redemptions: saved.redemptions ?? [], removedDefaultChoreIds, pointPolicy: saved.pointPolicy ?? { reset: "never", dailyEarnLimit: 0, maxBalance: 0 }, notificationSettings: saved.notificationSettings ?? { enabled: false, evening: true, rewards: true, calendar: true } };
}

const iso = (date = new Date()) => date.toISOString().slice(0, 10);
const addDays = (date: Date, amount: number) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
const startOfWeek = (date: Date) => addDays(date, -date.getDay());
const scheduledOn = (chore: Chore, date: Date) => chore.cadence === "daily" || chore.cadence === "flexible" || (chore.cadence === "weekly" && chore.dueDay === date.getDay()) || (chore.cadence === "monthly" && chore.dueDate === date.getDate());
const repeatLabel = (chore: Chore) => chore.cadence === "daily" ? "Every day" : chore.cadence === "weekly" ? `Every ${dayNames[chore.dueDay ?? 0]}` : chore.cadence === "monthly" ? `Monthly on day ${chore.dueDate ?? 1}` : `Any day · ${chore.weeklyGoal ?? 1}× per week`;
const routineLabel = (routine: Routine = "anytime") => routine === "morning" ? "☀️ Morning" : routine === "afternoon" ? "🎒 After school" : routine === "evening" ? "🌙 Evening" : "✨ Anytime";

export function ChoreChart() {
  const [state, setState] = useState<AppState>(() => normalizeState(starterState));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeMember, setActiveMember] = useState("all");
  const [tab, setTab] = useState<"today" | "week" | "family">("today");
  const [familyRange, setFamilyRange] = useState<"day" | "week">("day");
  const [showAdd, setShowAdd] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showRewardEditor, setShowRewardEditor] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [pinError, setPinError] = useState("");
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [suggestionMember, setSuggestionMember] = useState("charli");
  const [rewardMember, setRewardMember] = useState("charli");
  const [celebration, setCelebration] = useState<{ emoji: string; color: string; name: string; message: string } | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConfigured, setCalendarConfigured] = useState<boolean | null>(null);
  const [proofChore, setProofChore] = useState<Chore | null>(null);
  const [proofDate, setProofDate] = useState("");
  const [proofError, setProofError] = useState("");
  const [syncLabel, setSyncLabel] = useState("Loading…");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const saved = (await response.json()) as AppState | null;
        if (saved) setState(normalizeState(saved));
        setSyncLabel("Synced");
      } catch {
        const local = window.localStorage.getItem("tidy-team-state-v4");
        if (local) setState(normalizeState(JSON.parse(local)));
        setSyncLabel("Saved on this device");
      }
    };
    load();
    platformAuthenticatorIsAvailable().then(setBiometricSupported).catch(() => setBiometricSupported(false));
    fetch("/api/passkey?mode=available").then((response) => response.json()).then((data) => setPasskeyAvailable(Boolean(data.available))).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!state.notificationSettings.enabled || !state.notificationSettings.evening || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const timer = window.setInterval(() => { const now = new Date(); if (now.getHours() === 19 && now.getMinutes() === 0) new Notification("Tidy Team evening check", { body: "Take a look at any chores still waiting for a high-five." }); }, 60_000);
    return () => window.clearInterval(timer);
  }, [state.notificationSettings]);

  const persist = async (next: AppState) => {
    setState(next);
    window.localStorage.setItem("tidy-team-state-v4", JSON.stringify(next));
    setSyncLabel("Saving…");
    try {
      const response = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
      if (!response.ok) throw new Error();
      setSyncLabel("Synced");
    } catch { setSyncLabel("Saved on this device"); }
  };

  const selectedIso = iso(selectedDate);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDate), index)), [selectedDate]);
  useEffect(() => {
    const from = weekDates[0].toISOString(); const to = addDays(weekDates[6], 1).toISOString();
    fetch(`/api/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" })
      .then((response) => response.json()).then((data) => { setCalendarEvents(data.events || []); setCalendarConfigured(Boolean(data.configured)); })
      .catch(() => setCalendarConfigured(false));
  }, [weekDates]);
  const visibleChores = state.chores.filter((chore) => {
    const memberMatches = activeMember === "all" || chore.memberId === activeMember || chore.memberIds?.includes(activeMember);
    const dateMatches = scheduledOn(chore, selectedDate);
    return memberMatches && (tab === "week" || dateMatches);
  });
  const isComplete = (choreId: string, date = selectedIso) => state.completions.some((item) => item.choreId === choreId && item.date === date);
  const flexibleCount = (choreId: string) => { const dates = new Set(weekDates.map(iso)); return state.completions.filter((item) => item.choreId === choreId && dates.has(item.date)).length; };
  const toggle = (choreId: string, date = selectedIso) => {
    const wasComplete = isComplete(choreId, date);
    const selectedChore = state.chores.find((item) => item.id === choreId);
    if (!wasComplete && selectedChore?.verification === "photo") { setProofChore(selectedChore); setProofDate(date); setProofError(""); return; }
    const completions = wasComplete
      ? state.completions.filter((item) => !(item.choreId === choreId && item.date === date))
      : [...state.completions, { id: `${Date.now()}`, choreId, date, status: selectedChore?.verification && selectedChore.verification !== "none" ? "pending" as const : "approved" as const }];
    persist({ ...state, completions });
    if (!wasComplete && (!selectedChore?.verification || selectedChore.verification === "none")) {
      const chore = state.chores.find((item) => item.id === choreId);
      const member = state.members.find((item) => item.id === chore?.memberId);
      if (chore?.memberIds?.length) {
        setCelebration({ emoji: "🤝", color: "#6957d5", name: "Tidy Team", message: "Amazing teamwork," });
        window.setTimeout(() => setCelebration(null), 1500);
      } else if (member) {
        setCelebration({ emoji: member.celebrationEmoji, color: member.color, name: member.name, message: member.celebrationMessage });
        window.setTimeout(() => setCelebration(null), 1500);
      }
    }
  };

  const recordFlexible = (chore: Chore, date = selectedIso) => {
    const goal = chore.weeklyGoal ?? 1;
    if (flexibleCount(chore.id) >= goal) return;
    if (chore.verification === "photo") { setProofChore(chore); setProofDate(date); setProofError(""); return; }
    persist({ ...state, completions: [...state.completions, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, choreId: chore.id, date, status: chore.verification && chore.verification !== "none" ? "pending" : "approved" }] });
    const member = state.members.find((item) => item.id === chore.memberId);
    setCelebration({ emoji: chore.memberIds?.length ? "🤝" : member?.celebrationEmoji || "⭐", color: chore.memberIds?.length ? "#6957d5" : member?.color || "#6957d5", name: chore.memberIds?.length ? "Tidy Team" : member?.name || "helper", message: "Weekly progress added for" });
    window.setTimeout(() => setCelebration(null), 1500);
  };

  const undoFlexible = (choreId: string) => {
    const dates = new Set(weekDates.map(iso));
    const latest = [...state.completions].reverse().find((item) => item.choreId === choreId && dates.has(item.date));
    if (latest) persist({ ...state, completions: state.completions.filter((item) => item !== latest) });
  };

  const submitPhotoProof = async (form: FormData) => {
    if (!proofChore) return;
    setProofError("");
    const upload = new FormData(); upload.set("file", form.get("file") as File);
    const response = await fetch("/api/proof", { method: "POST", body: upload });
    const result = await response.json();
    if (!response.ok) { setProofError(result.error || "Photo could not be saved."); return; }
    await persist({ ...state, completions: [...state.completions, { id: `${Date.now()}`, choreId: proofChore.id, date: proofDate || selectedIso, status: "pending", proofPath: result.pathname }] });
    setProofChore(null);
  };

  const approveCompletion = (completion: Completion) => persist({ ...state, completions: state.completions.map((item) => item === completion ? { ...item, status: "approved" } : item) });

  const weekStats = useMemo(() => {
    const dates = weekDates.map(iso);
    const possible = state.chores.reduce((count, chore) => count + (chore.cadence === "flexible" ? (chore.weeklyGoal ?? 1) : weekDates.filter((date) => scheduledOn(chore, date)).length), 0);
    const completed = state.completions.filter((item) => dates.includes(item.date)).length;
    return { completed, possible, percent: possible ? Math.round((completed / possible) * 100) : 0 };
  }, [state.chores, state.completions, weekDates]);

  const pointPeriodStart = (() => { const now = new Date(); if (state.pointPolicy.reset === "weekly") return iso(startOfWeek(now)); if (state.pointPolicy.reset === "monthly") return iso(new Date(now.getFullYear(), now.getMonth(), 1)); return "0000-00-00"; })();
  const pointsByMember = state.members.map((member) => {
    const earnedByDay = new Map<string, number>();
    state.completions.filter((item) => item.date >= pointPeriodStart && item.status !== "pending").forEach((item) => {
      const chore = state.chores.find((entry) => entry.id === item.choreId && (entry.memberId === member.id || entry.memberIds?.includes(member.id)));
      if (chore) earnedByDay.set(item.date, (earnedByDay.get(item.date) ?? 0) + chore.points + (chore.memberIds?.length ? chore.teamBonus ?? 5 : 0));
    });
    const earned = Array.from(earnedByDay.values()).reduce((sum, amount) => sum + (state.pointPolicy.dailyEarnLimit > 0 ? Math.min(amount, state.pointPolicy.dailyEarnLimit) : amount), 0);
    const spent = state.redemptions.filter((item) => item.memberId === member.id && item.status !== "pending" && item.redeemedAt.slice(0, 10) >= pointPeriodStart).reduce((sum, item) => sum + item.cost, 0);
    const available = Math.max(0, earned - spent);
    return { ...member, earned, spent, points: state.pointPolicy.maxBalance > 0 ? Math.min(available, state.pointPolicy.maxBalance) : available };
  }).sort((a, b) => b.points - a.points);
  const rewardKid = pointsByMember.find((member) => member.id === rewardMember) ?? pointsByMember[0];

  const addChore = (form: FormData) => {
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const cadence = String(form.get("cadence")) as Cadence;
    const assignee = String(form.get("memberId"));
    const base = {
      title, detail: String(form.get("detail") || "").trim() || "Custom family job",
      icon: String(form.get("icon") || "✨"), points: Number(form.get("points")) || 5, teamBonus: assignee === "team" ? Math.max(0, Number(form.get("teamBonus")) || 0) : undefined, verification: String(form.get("verification") || "none") as Verification,
      cadence, routine: String(form.get("routine")) as Routine, ...(cadence === "weekly" ? { dueDay: Number(form.get("dueDay")) } : {}), ...(cadence === "monthly" ? { dueDate: Number(form.get("dueDate")) } : {}), ...(cadence === "flexible" ? { weeklyGoal: Math.max(1, Number(form.get("weeklyGoal")) || 1) } : {}),
    };
    const assignees = assignee === "all" ? state.members.map((member) => member.id) : assignee === "team" ? ["team"] : [assignee];
    const chores = assignees.map((memberId, index) => memberId === "team" ? ({ id: `${Date.now()}-${index}`, memberId: state.members[0].id, memberIds: state.members.map((member) => member.id), ...base }) : ({ id: `${Date.now()}-${index}`, memberId, ...base }));
    persist({ ...state, chores: [...state.chores, ...chores] });
    setShowAdd(false);
  };

  const saveChore = (form: FormData) => {
    if (!editingChore) return;
    const cadence = String(form.get("cadence")) as Cadence;
    const assignee = String(form.get("memberId"));
    const updated: Chore = { ...editingChore, title: String(form.get("title") || editingChore.title), detail: String(form.get("detail") || editingChore.detail), icon: String(form.get("icon")), points: Number(form.get("points")) || 1, teamBonus: assignee === "team" ? Math.max(0, Number(form.get("teamBonus")) || 0) : undefined, verification: String(form.get("verification") || "none") as Verification, memberId: assignee === "team" ? state.members[0].id : assignee, memberIds: assignee === "team" ? state.members.map((member) => member.id) : undefined, cadence, routine: String(form.get("routine")) as Routine, dueDay: cadence === "weekly" ? Number(form.get("dueDay")) : undefined, dueDate: cadence === "monthly" ? Number(form.get("dueDate")) : undefined, weeklyGoal: cadence === "flexible" ? Math.max(1, Number(form.get("weeklyGoal")) || 1) : undefined };
    persist({ ...state, chores: state.chores.map((chore) => chore.id === updated.id ? updated : chore) });
    setEditingChore(null);
  };

  const deleteChore = (chore: Chore) => {
    const isDefault = coreChores.some((item) => `${chore.memberId}-${item.slug}` === chore.id);
    persist({ ...state, chores: state.chores.filter((item) => item.id !== chore.id), completions: state.completions.filter((item) => item.choreId !== chore.id), removedDefaultChoreIds: isDefault ? Array.from(new Set([...state.removedDefaultChoreIds, chore.id])) : state.removedDefaultChoreIds });
    setEditingChore(null);
  };

  const savePeople = (form: FormData) => {
    const members = state.members.map((member) => { const name = String(form.get(`${member.id}-name`) || member.name).trim(); return { ...member, name, initial: name.slice(0, 1).toUpperCase(), color: String(form.get(`${member.id}-color`) || member.color), celebrationEmoji: String(form.get(`${member.id}-emoji`) || member.celebrationEmoji), celebrationMessage: String(form.get(`${member.id}-message`) || member.celebrationMessage).trim() }; });
    const pointPolicy: PointPolicy = { reset: String(form.get("pointReset")) as PointPolicy["reset"], dailyEarnLimit: Math.max(0, Number(form.get("dailyEarnLimit")) || 0), maxBalance: Math.max(0, Number(form.get("maxBalance")) || 0) };
    const notificationSettings: NotificationSettings = { enabled: form.get("notifications") === "on", evening: form.get("notifyEvening") === "on", rewards: form.get("notifyRewards") === "on", calendar: form.get("notifyCalendar") === "on" };
    if (notificationSettings.enabled && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    persist({ ...state, members, pointPolicy, notificationSettings }); setShowPeople(false);
  };

  const addSuggestion = (suggestion: typeof suggestedChores[number]) => {
    const assignees = suggestionMember === "all" ? state.members.map((member) => member.id) : [suggestionMember];
    const chores: Chore[] = assignees.map((memberId, index) => ({ id: `${memberId}-${Date.now()}-${index}`, ...suggestion, routine: "anytime", memberId, ...(suggestion.cadence === "weekly" ? { dueDay: selectedDate.getDay() } : {}) }));
    persist({ ...state, chores: [...state.chores, ...chores] });
  };

  const redeemReward = (reward: Reward) => {
    if (!rewardKid || rewardKid.points < reward.cost) return;
    const redemption: Redemption = { id: `${Date.now()}`, rewardId: reward.id, rewardTitle: reward.title, memberId: rewardKid.id, cost: reward.cost, redeemedAt: new Date().toISOString(), status: "pending" };
    persist({ ...state, redemptions: [...state.redemptions, redemption] });
    setCelebration({ emoji: reward.emoji, color: rewardKid.color, name: rewardKid.name, message: "Reward request sent for" });
    window.setTimeout(() => setCelebration(null), 1800);
  };

  const approveRedemption = (redemption: Redemption) => {
    const member = pointsByMember.find((item) => item.id === redemption.memberId);
    if (!member || member.points < redemption.cost) return;
    persist({ ...state, redemptions: state.redemptions.map((item) => item.id === redemption.id ? { ...item, status: "approved" } : item) });
  };

  const unlockParent = async (form: FormData) => {
    setPinError("");
    const response = await fetch("/api/parent-pin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin: String(form.get("pin") || "") }) });
    if (response.ok) { setIsParent(true); setShowPin(false); setShowParentDashboard(true); } else setPinError("That PIN didn’t match. Try again.");
  };

  const enrollPasskey = async () => {
    setPinError("");
    try {
      const optionsResponse = await fetch("/api/passkey?mode=register");
      if (!optionsResponse.ok) throw new Error("Unlock Parent Mode before setting up a thumbprint.");
      const registration = await startRegistration({ optionsJSON: await optionsResponse.json() });
      const verification = await fetch("/api/passkey?mode=register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(registration) });
      if (!verification.ok) throw new Error("The biometric setup could not be verified.");
      setPasskeyAvailable(true);
    } catch (error) { setPinError(error instanceof Error ? error.message : "Biometric setup was cancelled."); }
  };

  const unlockWithPasskey = async () => {
    setPinError("");
    try {
      const optionsResponse = await fetch("/api/passkey?mode=authenticate");
      if (!optionsResponse.ok) throw new Error("No thumbprint or passkey is set up yet.");
      const authentication = await startAuthentication({ optionsJSON: await optionsResponse.json() });
      const verification = await fetch("/api/passkey?mode=authenticate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(authentication) });
      if (!verification.ok) throw new Error("The biometric sign-in could not be verified.");
      setIsParent(true); setShowPin(false); setShowParentDashboard(true);
    } catch (error) { setPinError(error instanceof Error ? error.message : "Biometric sign-in was cancelled."); }
  };

  const lockParent = async () => { await fetch("/api/parent-pin", { method: "DELETE" }); setIsParent(false); setShowParentDashboard(false); };

  const addReward = (form: FormData) => {
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const reward: Reward = { id: `${Date.now()}`, title, detail: String(form.get("detail") || "A custom family reward").trim(), emoji: String(form.get("emoji") || "🎁"), cost: Math.max(1, Number(form.get("cost")) || 25) };
    persist({ ...state, rewards: [...state.rewards, reward] });
    setShowRewardEditor(false);
  };

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#top"><span className="brandMark">✓</span><span>Tidy Team</span></a>
      <div className="headerActions"><button className={`parentButton ${isParent ? "unlocked" : ""}`} onClick={() => isParent ? setShowParentDashboard(true) : setShowPin(true)}>{isParent ? "⚙️ Parent dashboard" : "🔒 Parent"}</button><button className="household" onClick={() => isParent ? setShowPeople(true) : setShowPin(true)} aria-label="Edit household members"><span className="avatarStack">{state.members.map((m) => <i key={m.id} style={{ background: m.color }}>{m.initial}</i>)}</span><span><strong>{state.household}</strong><small>{syncLabel} · {isParent ? "Edit" : "Locked"}</small></span></button></div>
    </header>

    <section className="hero" id="top">
      <div><p className="eyebrow">Our family adventure</p><h1>Small jobs.<br /><em>Big high-fives!</em></h1><p className="subhead">Choose a job, tap the circle when you’re done, and collect stars with your team.</p></div>
      <div className="scoreCard">
        <div className="scoreTop"><span>Team star power</span><strong>{weekStats.percent}%</strong></div>
        <div className="progressTrack"><span style={{ width: `${weekStats.percent}%` }} /></div><p>{weekStats.completed} of {weekStats.possible} jobs finished — keep going!</p>
        <div className="leaderRow">{pointsByMember.map((m, i) => <div key={m.id}><span style={{ background: m.color }}>{m.initial}</span><p>{i === 0 && m.points > 0 ? "Star helper!" : m.name}</p><strong>⭐ {m.points}</strong></div>)}</div><p className="pointRuleSummary">{state.pointPolicy.reset === "never" ? "Points roll over" : `Points reset ${state.pointPolicy.reset}`}{state.pointPolicy.dailyEarnLimit > 0 ? ` · ${state.pointPolicy.dailyEarnLimit}/day max` : ""}{state.pointPolicy.maxBalance > 0 ? ` · ${state.pointPolicy.maxBalance} saved max` : ""}</p>
      </div>
    </section>

    <section className="familyCalendar" aria-labelledby="calendar-heading">
      <div className="calendarTitle"><div><p className="eyebrow">Family schedule</p><h2 id="calendar-heading">What’s happening this week?</h2></div><div className="calendarLegend"><span><i className="kidsDot" />Kid visits</span><span><i className="workDot" />Work</span><span><i className="familyDot" />Family</span></div></div>
      {calendarEvents.length > 0 ? <div className="eventRail">{calendarEvents.map((event) => { const start = new Date(event.start); const end = new Date(event.end); return <article className="eventCard" key={event.id} style={{ "--event-color": event.color } as React.CSSProperties}><div className="eventDate"><strong>{dayNames[start.getDay()]}</strong><span>{start.getDate()}</span></div><div><small>{event.calendar}</small><h3>{event.title}</h3><p>{event.allDay ? "All day" : `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}{event.location ? ` · ${event.location}` : ""}</p></div></article>; })}</div>
      : <div className="calendarEmpty"><span>🗓️</span><div><strong>{calendarConfigured === false ? "Your calendars are ready to connect" : "No events this week"}</strong><p>{calendarConfigured === false ? "Add your private Google, iCloud, or Outlook calendar feed during deployment." : "Looks like a wide-open week!"}</p></div></div>}
    </section>

    <section className="rewardsShop" aria-labelledby="rewards-heading">
      <div className="rewardsTop"><div><p className="eyebrow">Spend your stars</p><h2 id="rewards-heading">Rewards Shop</h2><small>Stars roll over every month and never expire.</small></div>{isParent && <button className="ideaButton" onClick={() => setShowRewardEditor(true)}>＋ Custom reward</button>}</div>
      <div className="rewardMembers">{pointsByMember.map((member) => <button key={member.id} className={rewardMember === member.id ? "active" : ""} onClick={() => setRewardMember(member.id)}><span style={{ background: member.color }}>{member.initial}</span><strong>{member.name}</strong><b>⭐ {member.points}</b></button>)}</div>
      <div className="rewardRail">{state.rewards.map((reward) => { const affordable = Boolean(rewardKid && rewardKid.points >= reward.cost); return <article className="rewardCard" key={reward.id}><span>{reward.emoji}</span><div><h3>{reward.title}</h3><p>{reward.detail}</p></div><button disabled={!affordable} onClick={() => redeemReward(reward)}>{affordable ? `Redeem · ⭐ ${reward.cost}` : `Need ⭐ ${reward.cost}`}</button></article>; })}</div>
      {state.redemptions.length > 0 && <details className="rewardHistory" open={isParent && state.redemptions.some((item) => item.status === "pending")}><summary>{state.redemptions.some((item) => item.status === "pending") ? "Reward requests waiting" : "Recent rewards"}</summary>{state.redemptions.slice(-8).reverse().map((item) => { const member = state.members.find((entry) => entry.id === item.memberId); return <p key={item.id}><span>{item.status === "pending" ? "⏳" : "✓"} {member?.name} requested <strong>{item.rewardTitle}</strong> for ⭐ {item.cost}</span>{isParent && <span className="historyActions">{item.status === "pending" && <button onClick={() => approveRedemption(item)}>Approve</button>}<button onClick={() => persist({ ...state, redemptions: state.redemptions.filter((entry) => entry.id !== item.id) })}>{item.status === "pending" ? "Decline" : "Undo"}</button></span>}</p>; })}</details>}
    </section>

    <section className="dashboard" aria-label="Chore chart">
      <div className="controls">
        <div className="tabs"><button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>My day</button><button className={tab === "week" ? "active" : ""} onClick={() => setTab("week")}>Our week</button><button className={tab === "family" ? "active" : ""} onClick={() => setTab("family")}>Kids side by side</button></div>
        {tab !== "family" ? <div className="memberFilters"><button className={activeMember === "all" ? "active" : ""} onClick={() => setActiveMember("all")}>Everyone</button>{state.members.map((m) => <button key={m.id} className={activeMember === m.id ? "active" : ""} onClick={() => setActiveMember(m.id)}><span style={{ background: m.color }}>{m.initial}</span>{m.name}</button>)}</div> : <div className="familyRange" aria-label="Family board range"><button className={familyRange === "day" ? "active" : ""} onClick={() => setFamilyRange("day")}>Day</button><button className={familyRange === "week" ? "active" : ""} onClick={() => setFamilyRange("week")}>Week</button></div>}
        {isParent && <><button className="ideaButton" onClick={() => setShowSuggestions(true)}>💡 Chore ideas</button><button className="addButton" onClick={() => setShowAdd(true)}>＋ Add a job</button></>}
      </div>
      <div className="weekStrip">{weekDates.map((date) => <button key={iso(date)} className={iso(date) === selectedIso ? "active" : ""} onClick={() => setSelectedDate(date)}><span>{dayNames[date.getDay()]}</span><strong>{date.getDate()}</strong>{iso(date) === iso() && <i>Today</i>}</button>)}</div>

      {tab === "today" ? <div className="choreGrid">{visibleChores.map((chore) => {
        const member = state.members.find((entry) => entry.id === chore.memberId)!; const count = chore.cadence === "flexible" ? flexibleCount(chore.id) : 0; const done = chore.cadence === "flexible" ? count >= (chore.weeklyGoal ?? 1) : isComplete(chore.id);
        const collaborators = chore.memberIds?.map((id) => state.members.find((entry) => entry.id === id)).filter(Boolean) as Member[] | undefined;
        return <article className={`choreCard ${done ? "done" : ""} ${collaborators?.length ? "teamChore" : ""}`} key={chore.id} style={{ "--member-color": collaborators?.length ? "#6957d5" : member.color } as React.CSSProperties}>
          <button className="check" onClick={() => chore.cadence === "flexible" ? recordFlexible(chore) : toggle(chore.id)} disabled={chore.cadence === "flexible" && done} aria-label={chore.cadence === "flexible" ? `Record ${chore.title}` : `${done ? "Mark incomplete" : "Complete"} ${chore.title}`}>{done ? "✓" : chore.cadence === "flexible" ? "+" : ""}</button>{isParent && <button className="editChore" onClick={() => setEditingChore(chore)} aria-label={`Edit ${chore.title}`}>✎</button>}
          <div className="choreIcon">{chore.icon}</div><div className="choreCopy"><h2>{chore.title}</h2><p>{chore.detail}</p><span className="repeatBadge">↻ {repeatLabel(chore)}</span><span className="routineBadge">{routineLabel(chore.routine)}</span>{chore.verification && chore.verification !== "none" && <span className="verifyBadge">{chore.verification === "photo" ? "📷 Photo proof" : chore.verification === "sibling" ? "🤝 Sibling check" : "🔐 Parent approval"}</span>}</div>
          <div className="cardMeta">{collaborators?.length ? <span className="assigned teamAssigned"><span className="miniStack">{collaborators.map((person) => <i key={person.id} style={{ background: person.color }}>{person.initial}</i>)}</span>Team chore</span> : <span className="assigned" style={{ color: member.color }}><i style={{ background: member.color }}>{member.initial}</i>{member.name}</span>}<strong>{chore.cadence === "flexible" ? `${count}/${chore.weeklyGoal ?? 1} this week · ` : ""}⭐ +{chore.points + (collaborators?.length ? chore.teamBonus ?? 5 : 0)}{collaborators?.length ? ` each (${chore.teamBonus ?? 5} bonus)` : ""}</strong>{chore.cadence === "flexible" && count > 0 && isParent && <button className="undoCount" onClick={() => undoFlexible(chore.id)}>Undo last</button>}</div>
        </article>;
      })}{visibleChores.length === 0 && <div className="empty"><span>☀️</span><h2>All clear</h2><p>No chores are scheduled for this view.</p></div>}</div>
      : tab === "week" ? <div className="weeklyTable"><div className="weeklyHead"><span>Chore</span>{weekDates.map((date) => <span key={iso(date)}>{dayNames[date.getDay()]}</span>)}</div>{visibleChores.map((chore) => {
        const member = state.members.find((entry) => entry.id === chore.memberId)!;
        return <div className="weeklyRow" key={chore.id}><div className="weeklyChoreName"><b>{chore.icon} {chore.title}</b><small style={{ color: chore.memberIds?.length ? "#6957d5" : member.color }}>{chore.memberIds?.length ? "Tidy Team" : member.name} · {chore.points + (chore.memberIds?.length ? chore.teamBonus ?? 5 : 0)} pts{chore.memberIds?.length ? ` each (${chore.teamBonus ?? 5} bonus)` : ""}</small>{isParent && <button className="weeklyEdit" onClick={() => setEditingChore(chore)} aria-label={`Edit or remove ${chore.title}`}>✎ Edit</button>}</div>{weekDates.map((date) => {
          const allowed = scheduledOn(chore, date); const dayCount = state.completions.filter((item) => item.choreId === chore.id && item.date === iso(date)).length; const done = chore.cadence === "flexible" ? flexibleCount(chore.id) >= (chore.weeklyGoal ?? 1) : isComplete(chore.id, iso(date));
          return <button key={iso(date)} disabled={!allowed || (chore.cadence === "flexible" && done)} className={done ? "complete" : ""} onClick={() => chore.cadence === "flexible" ? recordFlexible(chore, iso(date)) : toggle(chore.id, iso(date))} aria-label={`${chore.title}, ${dayNames[date.getDay()]}`}>{allowed ? (chore.cadence === "flexible" ? (dayCount ? `+${dayCount}` : "+") : done ? "✓" : "○") : "—"}</button>;
        })}</div>;
      })}</div>
      : <div className="familyBoard" aria-label={`${familyRange === "day" ? "Daily" : "Weekly"} chores by child`}>
        {state.members.map((member) => { const memberChores = state.chores.filter((chore) => (chore.memberId === member.id || chore.memberIds?.includes(member.id)) && (familyRange === "week" || scheduledOn(chore, selectedDate))); const completed = memberChores.filter((chore) => familyRange === "day" ? isComplete(chore.id) : weekDates.some((date) => isComplete(chore.id, iso(date)))).length; return <section className="familyColumn" key={member.id} style={{ "--member-color": member.color } as React.CSSProperties}>
          <header><span style={{ background: member.color }}>{member.initial}</span><div><h2>{member.name}</h2><small>{completed} of {memberChores.length} started</small></div><strong>⭐ {pointsByMember.find((entry) => entry.id === member.id)?.points ?? 0}</strong></header>
          <div className="familyProgress"><i style={{ width: `${memberChores.length ? Math.round((completed / memberChores.length) * 100) : 0}%`, background: member.color }} /></div>
          <div className="familyChores">{memberChores.map((chore) => { const team = Boolean(chore.memberIds?.length); const doneToday = isComplete(chore.id); return <article className={`${doneToday ? "done" : ""} ${team ? "team" : ""}`} key={chore.id}>
            <div className="familyChoreTitle"><span>{chore.icon}</span><div><strong>{chore.title}</strong><small>{team ? `Team · +${chore.points + (chore.teamBonus ?? 5)} each` : `+${chore.points} stars`}</small></div>{familyRange === "day" && <button className="familyCheck" onClick={() => chore.cadence === "flexible" ? recordFlexible(chore) : toggle(chore.id)} aria-label={`${doneToday ? "Mark incomplete" : "Complete"} ${chore.title} for ${member.name}`}>{doneToday ? "✓" : ""}</button>}</div>
            {familyRange === "week" && <div className="familyWeek">{weekDates.map((date) => { const allowed = scheduledOn(chore, date); const done = isComplete(chore.id, iso(date)); return <button key={iso(date)} disabled={!allowed} className={done ? "done" : ""} onClick={() => chore.cadence === "flexible" ? recordFlexible(chore, iso(date)) : toggle(chore.id, iso(date))} aria-label={`${chore.title} for ${member.name}, ${dayNames[date.getDay()]}`}><span>{dayNames[date.getDay()].slice(0, 1)}</span><b>{done ? "✓" : allowed ? "○" : "—"}</b></button>; })}</div>}
          </article>; })}{memberChores.length === 0 && <p className="familyEmpty">Nothing scheduled—enjoy the break! ☀️</p>}</div>
        </section>; })}
      </div>}
    </section>
    <footer><span>👆 Tap the big circle when your job is finished.</span><span>Kind helpers make happy homes! ⭐</span></footer>

    {showAdd && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowAdd(false)}><form className="modal" action={addChore}>
      <button type="button" className="close" onClick={() => setShowAdd(false)} aria-label="Close">×</button><p className="eyebrow">New assignment</p><h2>Add a chore</h2>
      <label>Chore name<input name="title" placeholder="e.g. Sweep the kitchen" autoFocus required /></label>
      <label>Helpful note<input name="detail" placeholder="e.g. After dinner" /></label>
      <div className="formRow"><label>Icon<select name="icon" defaultValue="✨"><option>✨</option><option>🪥</option><option>🛏️</option><option>🧹</option><option>🧸</option><option>🛁</option><option>💜</option><option>💙</option><option>🛠️</option><option>🧺</option><option>🪴</option><option>🐾</option><option>♻️</option></select></label><label>Points<input name="points" type="number" min="1" max="100" defaultValue="10" /></label></div>
      <div className="formRow"><label>Assigned to<select name="memberId"><option value="all">Everyone — separately</option><option value="team">🤝 Team chore — together</option>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Routine<select name="routine" defaultValue="anytime"><option value="morning">Morning</option><option value="afternoon">After school</option><option value="evening">Evening</option><option value="anytime">Anytime</option></select></label></div>
      <label>Teamwork bonus per child<input name="teamBonus" type="number" min="0" max="100" defaultValue="5" /></label><p className="fieldHint">Used only for a team chore. Every child earns the regular points plus this bonus.</p>
      <label>Completion check<select name="verification" defaultValue="none"><option value="none">No approval needed</option><option value="parent">Ask a parent</option><option value="photo">Photo proof + parent approval</option><option value="sibling">Sibling confirmation</option></select></label>
      <label>Repeats<select name="cadence"><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option><option value="flexible">Any day — multiple times per week</option></select></label>
      <div className="formRow"><label>Weekly day<select name="dueDay" defaultValue={selectedDate.getDay()}>{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label>Monthly date<input name="dueDate" type="number" min="1" max="31" defaultValue={selectedDate.getDate()} /></label></div>
      <label>Times it can count each week<input name="weeklyGoal" type="number" min="1" max="21" defaultValue="3" /></label><p className="fieldHint">This limit is used only for “Any day.” Each completion earns points.</p>
      <button className="saveButton" type="submit">Add to the chart</button>
    </form></div>}

    {editingChore && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditingChore(null)}><form className="modal" action={saveChore}>
      <button type="button" className="close" onClick={() => setEditingChore(null)} aria-label="Close">×</button><p className="eyebrow">Update assignment</p><h2>Edit chore</h2>
      <label>Chore name<input name="title" defaultValue={editingChore.title} required /></label>
      <label>Helpful note<input name="detail" defaultValue={editingChore.detail} /></label>
      <div className="formRow"><label>Icon<select name="icon" defaultValue={editingChore.icon}><option>✨</option><option>🪥</option><option>🛏️</option><option>🧹</option><option>🧸</option><option>🛁</option><option>💜</option><option>💙</option><option>🛠️</option><option>🧺</option><option>🪴</option><option>🐾</option><option>♻️</option><option>🍽️</option></select></label><label>Points<input name="points" type="number" min="1" max="100" defaultValue={editingChore.points} /></label></div>
      <div className="formRow"><label>Assigned to<select name="memberId" defaultValue={editingChore.memberIds?.length ? "team" : editingChore.memberId}><option value="team">🤝 Team chore — together</option>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Routine<select name="routine" defaultValue={editingChore.routine ?? "anytime"}><option value="morning">Morning</option><option value="afternoon">After school</option><option value="evening">Evening</option><option value="anytime">Anytime</option></select></label></div>
      <label>Teamwork bonus per child<input name="teamBonus" type="number" min="0" max="100" defaultValue={editingChore.teamBonus ?? 5} /></label><p className="fieldHint">Used only for a team chore. Every child earns the regular points plus this bonus.</p>
      <label>Completion check<select name="verification" defaultValue={editingChore.verification ?? "none"}><option value="none">No approval needed</option><option value="parent">Ask a parent</option><option value="photo">Photo proof + parent approval</option><option value="sibling">Sibling confirmation</option></select></label>
      <label>Repeats<select name="cadence" defaultValue={editingChore.cadence}><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option><option value="flexible">Any day — multiple times per week</option></select></label>
      <div className="formRow"><label>Weekly day<select name="dueDay" defaultValue={editingChore.dueDay ?? selectedDate.getDay()}>{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label>Monthly date<input name="dueDate" type="number" min="1" max="31" defaultValue={editingChore.dueDate ?? selectedDate.getDate()} /></label></div>
      <label>Times it can count each week<input name="weeklyGoal" type="number" min="1" max="21" defaultValue={editingChore.weeklyGoal ?? 3} /></label><p className="fieldHint">This limit is used only for “Any day.” Each completion earns points.</p>
      <div className="modalActions"><button type="button" className="deleteButton" onClick={() => deleteChore(editingChore)}>Remove chore</button><button className="saveButton" type="submit">Save changes</button></div>
    </form></div>}

    {showPeople && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowPeople(false)}><form className="modal" action={savePeople}>
      <button type="button" className="close" onClick={() => setShowPeople(false)} aria-label="Close">×</button><p className="eyebrow">Your household</p><h2>Edit the team</h2>
      <p className="modalIntro">Everyone can choose any celebration they like. Pick an emoji and personalize the cheer.</p>
      {state.members.map((member) => <fieldset className="personEditor" key={member.id}><legend><span style={{ background: member.color }}>{member.initial}</span>{member.name}</legend><label>Name<input name={`${member.id}-name`} defaultValue={member.name} required /></label><ThemeColorPicker member={member} /><div className="formRow"><label>Reaction<select name={`${member.id}-emoji`} defaultValue={member.celebrationEmoji}>{celebrationChoices.map((choice) => <option key={choice.emoji} value={choice.emoji}>{choice.emoji} {choice.name}</option>)}</select></label><label>Cheer<input name={`${member.id}-message`} defaultValue={member.celebrationMessage} maxLength={40} /></label></div></fieldset>)}
      <fieldset className="personEditor pointRules"><legend>⭐ Point rules</legend><label>Reset points<select name="pointReset" defaultValue={state.pointPolicy.reset}><option value="never">Never — keep rolling over</option><option value="weekly">At the start of each week</option><option value="monthly">At the start of each month</option></select></label><div className="formRow"><label>Daily earning limit<input name="dailyEarnLimit" type="number" min="0" max="10000" defaultValue={state.pointPolicy.dailyEarnLimit} /></label><label>Maximum saved balance<input name="maxBalance" type="number" min="0" max="100000" defaultValue={state.pointPolicy.maxBalance} /></label></div><p className="fieldHint">Use 0 for no limit. These rules apply equally to every child.</p></fieldset>
      <fieldset className="personEditor pointRules"><legend>🔔 Notifications</legend><label className="toggleField"><input name="notifications" type="checkbox" defaultChecked={state.notificationSettings.enabled} /> Allow notifications on this device</label><div className="notificationChoices"><label><input name="notifyEvening" type="checkbox" defaultChecked={state.notificationSettings.evening} /> Evening chores</label><label><input name="notifyRewards" type="checkbox" defaultChecked={state.notificationSettings.rewards} /> Reward requests</label><label><input name="notifyCalendar" type="checkbox" defaultChecked={state.notificationSettings.calendar} /> Calendar reminders</label></div><p className="fieldHint">Notifications can be turned off here at any time. The browser may also ask for permission.</p></fieldset>
      <button className="saveButton" type="submit">Save team</button>
    </form></div>}

    {showParentDashboard && isParent && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowParentDashboard(false)}><section className="modal parentDashboard" role="dialog" aria-modal="true" aria-labelledby="parent-dashboard-title">
      <button type="button" className="close" onClick={() => setShowParentDashboard(false)} aria-label="Close">×</button><p className="eyebrow">Grown-ups only</p><h2 id="parent-dashboard-title">Parent dashboard</h2>
      <div className="parentOverview"><article><span>✓</span><strong>{weekStats.completed}/{weekStats.possible}</strong><small>chores this week</small></article><article><span>⏳</span><strong>{state.redemptions.filter((item) => item.status === "pending").length}</strong><small>reward requests</small></article><article><span>🗓️</span><strong>{calendarConfigured ? calendarEvents.length : "—"}</strong><small>{calendarConfigured ? "events this week" : "calendar not connected"}</small></article></div>
      <div className="parentBalances">{pointsByMember.map((member) => <article key={member.id}><span style={{ background: member.color }}>{member.initial}</span><div><strong>{member.name}</strong><small>Earned {member.earned} · Spent {member.spent}</small></div><b>⭐ {member.points}</b></article>)}</div>
      {state.completions.some((item) => item.status === "pending") && <div className="approvalQueue"><strong>Chores waiting for approval</strong>{state.completions.filter((item) => item.status === "pending").map((item) => { const chore = state.chores.find((entry) => entry.id === item.choreId); return <article key={item.id || `${item.choreId}-${item.date}`}><span>{item.proofPath ? "📷" : "⏳"} {chore?.title || "Chore"} · {item.date}</span><span><button onClick={() => approveCompletion(item)}>Approve points</button><button onClick={() => persist({ ...state, completions: state.completions.filter((entry) => entry !== item) })}>Decline</button></span></article>; })}</div>}
      <div className="dashboardRules"><strong>Point rules</strong><span>{state.pointPolicy.reset === "never" ? "No automatic reset" : `Reset ${state.pointPolicy.reset}`}</span><span>{state.pointPolicy.dailyEarnLimit > 0 ? `${state.pointPolicy.dailyEarnLimit} points/day maximum` : "No daily limit"}</span><span>{state.pointPolicy.maxBalance > 0 ? `${state.pointPolicy.maxBalance} maximum balance` : "No balance limit"}</span></div>
      <div className="parentActions"><button onClick={() => { setShowParentDashboard(false); setShowPeople(true); }}>👨‍👩‍👧 Edit family, reactions & points</button><button onClick={() => { setShowParentDashboard(false); setShowAdd(true); }}>＋ Add a chore</button><button onClick={() => { setShowParentDashboard(false); setShowSuggestions(true); }}>💡 Browse chore ideas</button><button onClick={() => { setShowParentDashboard(false); setShowRewardEditor(true); }}>🎁 Manage rewards</button></div>
      <p className="calendarAdminStatus"><strong>Calendar:</strong> {calendarConfigured ? `${calendarEvents.length} events loaded for this week.` : "Ready for private Google, iCloud, or Outlook feed links."}</p>
      {biometricSupported && <button className="passkeySetup" onClick={enrollPasskey}>👆 {passkeyAvailable ? "Add another trusted thumbprint" : "Set up thumbprint / Face ID"}</button>}{pinError && <p className="pinError" role="alert">{pinError}</p>}<button className="lockParent" onClick={lockParent}>🔒 Lock Parent Mode</button>
    </section></div>}

    {proofChore && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setProofChore(null)}><form className="modal" action={submitPhotoProof}>
      <button type="button" className="close" onClick={() => setProofChore(null)} aria-label="Close">×</button><p className="eyebrow">Photo verification</p><h2>Show the finished job</h2><p className="modalIntro">Take or choose a photo for “{proofChore.title}.” A parent will approve the points.</p><label>Completion photo<input name="file" type="file" accept="image/*" capture="environment" required /></label>{!isParent && <p className="pinError">Unlock Parent Mode before securely uploading this photo.</p>}{proofError && <p className="pinError" role="alert">{proofError}</p>}<button className="saveButton" type="submit" disabled={!isParent}>Upload for approval</button>
    </form></div>}

    {showSuggestions && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowSuggestions(false)}><section className="modal suggestionModal" role="dialog" aria-modal="true" aria-labelledby="suggestion-title">
      <button type="button" className="close" onClick={() => setShowSuggestions(false)} aria-label="Close">×</button><p className="eyebrow">Ready-to-assign ideas</p><h2 id="suggestion-title">Chore library</h2>
      <p className="modalIntro">Choose the child, then tap any idea to add it. Start with tasks they can do safely and add responsibility as their skills grow.</p>
      <label>Assign ideas to<select value={suggestionMember} onChange={(event) => setSuggestionMember(event.target.value)}><option value="all">Everyone</option>{state.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <div className="suggestionList">{suggestedChores.map((suggestion) => <button type="button" key={suggestion.title} onClick={() => addSuggestion(suggestion)}><span>{suggestion.icon}</span><span><strong>{suggestion.title}</strong><small>{suggestion.detail} · {suggestion.cadence}</small></span><b>＋</b></button>)}</div>
    </section></div>}

    {showRewardEditor && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowRewardEditor(false)}><form className="modal" action={addReward}>
      <button type="button" className="close" onClick={() => setShowRewardEditor(false)} aria-label="Close">×</button><p className="eyebrow">Make it your own</p><h2>Add a reward</h2>
      <label>Reward name<input name="title" placeholder="e.g. Pick Friday's movie" autoFocus required /></label>
      <label>What they earn<input name="detail" placeholder="A short description" /></label>
      <div className="formRow"><label>Emoji<select name="emoji" defaultValue="🎁"><option>🎁</option><option>📱</option><option>🎮</option><option>🍦</option><option>⛳</option><option>🏰</option><option>🎬</option><option>🍕</option><option>🛝</option><option>⭐</option></select></label><label>Star cost<input name="cost" type="number" min="1" max="10000" defaultValue="100" /></label></div>
      <button className="saveButton" type="submit">Add to the shop</button>
      {state.rewards.length > 0 && <div className="manageRewards"><strong>Current rewards</strong>{state.rewards.map((reward) => <div key={reward.id}><span>{reward.emoji} {reward.title} · ⭐ {reward.cost}</span><button type="button" onClick={() => persist({ ...state, rewards: state.rewards.filter((item) => item.id !== reward.id) })}>Remove</button></div>)}</div>}
    </form></div>}

    {showPin && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowPin(false)}><form className="modal pinModal" action={unlockParent}>
      <button type="button" className="close" onClick={() => setShowPin(false)} aria-label="Close">×</button><p className="eyebrow">Grown-ups only</p><h2>Unlock Parent Mode</h2><p className="modalIntro">Enter the four-digit family PIN to edit chores, manage rewards, or approve redemptions.</p>
      <label>Parent PIN<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" autoFocus required /></label>{pinError && <p className="pinError" role="alert">{pinError}</p>}<button className="saveButton" type="submit">Unlock</button>
      {passkeyAvailable && biometricSupported && <button className="passkeyButton" type="button" onClick={unlockWithPasskey}>👆 Use thumbprint, Face ID, or device passkey</button>}
    </form></div>}

    {celebration && <div className="celebration" aria-live="polite" style={{ "--celebrate": celebration.color } as React.CSSProperties}><div className="burst"><i>✦</i><i>★</i><span>{celebration.emoji}</span><i>✦</i><i>★</i></div><strong>{celebration.message} {celebration.name}!</strong></div>}
  </main>;
}
