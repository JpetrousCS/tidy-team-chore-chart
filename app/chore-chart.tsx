"use client";

import { useEffect, useMemo, useState } from "react";

type Member = { id: string; name: string; initial: string; color: string; celebrationEmoji: string; celebrationMessage: string };
type Cadence = "daily" | "weekly" | "monthly";
type Chore = { id: string; title: string; detail: string; icon: string; points: number; memberId: string; cadence: Cadence; dueDay?: number; dueDate?: number };
type Completion = { choreId: string; date: string };
type Reward = { id: string; title: string; detail: string; emoji: string; cost: number };
type Redemption = { id: string; rewardId: string; rewardTitle: string; memberId: string; cost: number; redeemedAt: string };
type AppState = { household: string; members: Member[]; chores: Chore[]; completions: Completion[]; rewards: Reward[]; redemptions: Redemption[] };
type CalendarEvent = { id: string; title: string; start: string; end: string; allDay: boolean; location: string; calendar: string; type: "kids" | "work" | "family"; color: string };

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const celebrationChoices = ["🦄", "✨", "🌈", "🧚", "🏎️", "🚀", "🦖", "⚽", "🐉", "🎉", "🏆", "⭐"];
const starterRewards: Reward[] = [
  { id: "tablet-30", title: "30 minutes of tablet time", detail: "Choose a favorite app or show", emoji: "📱", cost: 40 },
  { id: "games-30", title: "30 minutes of video games", detail: "Bonus game time", emoji: "🎮", cost: 50 },
  { id: "putt-putt", title: "Putt-putt and ice cream", detail: "A special family outing", emoji: "⛳", cost: 250 },
  { id: "kids-empire", title: "Visit to Kids Empire", detail: "Indoor play adventure", emoji: "🏰", cost: 350 },
];
const coreChores = [
  { slug: "teeth", title: "Brush your teeth", detail: "Morning & bedtime", icon: "🪥", points: 5 },
  { slug: "bed", title: "Make your bed", detail: "Start the day tidy", icon: "🛏️", points: 5 },
  { slug: "kind", title: "Do something kind", detail: "Help or encourage someone", icon: "💛", points: 10 },
  { slug: "tidy", title: "Tidy your things", detail: "Toys, clothes & belongings", icon: "🧸", points: 8 },
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
    return null;
  };
  const replacedIds = new Map<string, string>();
  const chores = saved.chores.filter((chore) => {
    const slug = coreSlug(chore.title);
    if (slug) replacedIds.set(chore.id, `${chore.memberId}-${slug}`);
    return !slug;
  });
  for (const member of members) for (const core of coreChores) chores.push({ id: `${member.id}-${core.slug}`, title: core.title, detail: core.detail, icon: core.icon, points: core.points, memberId: member.id, cadence: "daily" });
  const completions = Array.from(new Map(saved.completions.map((item) => { const mapped = { ...item, choreId: replacedIds.get(item.choreId) || item.choreId }; return [`${mapped.choreId}-${mapped.date}`, mapped]; })).values());
  return { ...saved, members, chores, completions, rewards: saved.rewards ?? starterRewards, redemptions: saved.redemptions ?? [] };
}

const iso = (date = new Date()) => date.toISOString().slice(0, 10);
const addDays = (date: Date, amount: number) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
const startOfWeek = (date: Date) => addDays(date, -date.getDay());
const scheduledOn = (chore: Chore, date: Date) => chore.cadence === "daily" || (chore.cadence === "weekly" && chore.dueDay === date.getDay()) || (chore.cadence === "monthly" && chore.dueDate === date.getDate());
const repeatLabel = (chore: Chore) => chore.cadence === "daily" ? "Every day" : chore.cadence === "weekly" ? `Every ${dayNames[chore.dueDay ?? 0]}` : `Monthly on day ${chore.dueDate ?? 1}`;

export function ChoreChart() {
  const [state, setState] = useState<AppState>(() => normalizeState(starterState));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeMember, setActiveMember] = useState("all");
  const [tab, setTab] = useState<"today" | "week">("today");
  const [showAdd, setShowAdd] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showRewardEditor, setShowRewardEditor] = useState(false);
  const [suggestionMember, setSuggestionMember] = useState("charli");
  const [rewardMember, setRewardMember] = useState("charli");
  const [celebration, setCelebration] = useState<{ emoji: string; color: string; name: string; message: string } | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConfigured, setCalendarConfigured] = useState<boolean | null>(null);
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
  }, []);

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
    const memberMatches = activeMember === "all" || chore.memberId === activeMember;
    const dateMatches = scheduledOn(chore, selectedDate);
    return memberMatches && (tab === "week" || dateMatches);
  });
  const isComplete = (choreId: string, date = selectedIso) => state.completions.some((item) => item.choreId === choreId && item.date === date);
  const toggle = (choreId: string, date = selectedIso) => {
    const wasComplete = isComplete(choreId, date);
    const completions = wasComplete
      ? state.completions.filter((item) => !(item.choreId === choreId && item.date === date))
      : [...state.completions, { choreId, date }];
    persist({ ...state, completions });
    if (!wasComplete) {
      const chore = state.chores.find((item) => item.id === choreId);
      const member = state.members.find((item) => item.id === chore?.memberId);
      if (member) {
        setCelebration({ emoji: member.celebrationEmoji, color: member.color, name: member.name, message: member.celebrationMessage });
        window.setTimeout(() => setCelebration(null), 1500);
      }
    }
  };

  const weekStats = useMemo(() => {
    const dates = weekDates.map(iso);
    const possible = state.chores.reduce((count, chore) => count + weekDates.filter((date) => scheduledOn(chore, date)).length, 0);
    const completed = state.completions.filter((item) => dates.includes(item.date)).length;
    return { completed, possible, percent: possible ? Math.round((completed / possible) * 100) : 0 };
  }, [state.chores, state.completions, weekDates]);

  const pointsByMember = state.members.map((member) => ({ ...member, earned: state.completions.reduce((sum, item) => {
    const chore = state.chores.find((entry) => entry.id === item.choreId && entry.memberId === member.id);
    return sum + (chore ? chore.points : 0);
  }, 0), spent: state.redemptions.filter((item) => item.memberId === member.id).reduce((sum, item) => sum + item.cost, 0) })).map((member) => ({ ...member, points: member.earned - member.spent })).sort((a, b) => b.points - a.points);
  const rewardKid = pointsByMember.find((member) => member.id === rewardMember) ?? pointsByMember[0];

  const addChore = (form: FormData) => {
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const cadence = String(form.get("cadence")) as Cadence;
    const chore: Chore = {
      id: `${Date.now()}`, title, detail: String(form.get("detail") || "").trim() || "Custom family job",
      icon: String(form.get("icon") || "✨"), points: Number(form.get("points")) || 5,
      memberId: String(form.get("memberId")), cadence, ...(cadence === "weekly" ? { dueDay: Number(form.get("dueDay")) } : {}), ...(cadence === "monthly" ? { dueDate: Number(form.get("dueDate")) } : {}),
    };
    persist({ ...state, chores: [...state.chores, chore] });
    setShowAdd(false);
  };

  const saveChore = (form: FormData) => {
    if (!editingChore) return;
    const cadence = String(form.get("cadence")) as Cadence;
    const updated: Chore = { ...editingChore, title: String(form.get("title") || editingChore.title), detail: String(form.get("detail") || editingChore.detail), icon: String(form.get("icon")), points: Number(form.get("points")) || 1, memberId: String(form.get("memberId")), cadence, dueDay: cadence === "weekly" ? Number(form.get("dueDay")) : undefined, dueDate: cadence === "monthly" ? Number(form.get("dueDate")) : undefined };
    persist({ ...state, chores: state.chores.map((chore) => chore.id === updated.id ? updated : chore) });
    setEditingChore(null);
  };

  const savePeople = (form: FormData) => {
    const members = state.members.map((member) => { const name = String(form.get(`${member.id}-name`) || member.name).trim(); return { ...member, name, initial: name.slice(0, 1).toUpperCase(), celebrationEmoji: String(form.get(`${member.id}-emoji`) || member.celebrationEmoji), celebrationMessage: String(form.get(`${member.id}-message`) || member.celebrationMessage).trim() }; });
    persist({ ...state, members }); setShowPeople(false);
  };

  const addSuggestion = (suggestion: typeof suggestedChores[number]) => {
    const chore: Chore = { id: `${suggestionMember}-${Date.now()}`, ...suggestion, memberId: suggestionMember, ...(suggestion.cadence === "weekly" ? { dueDay: selectedDate.getDay() } : {}) };
    persist({ ...state, chores: [...state.chores, chore] });
  };

  const redeemReward = (reward: Reward) => {
    if (!rewardKid || rewardKid.points < reward.cost) return;
    const redemption: Redemption = { id: `${Date.now()}`, rewardId: reward.id, rewardTitle: reward.title, memberId: rewardKid.id, cost: reward.cost, redeemedAt: new Date().toISOString() };
    persist({ ...state, redemptions: [...state.redemptions, redemption] });
    setCelebration({ emoji: reward.emoji, color: rewardKid.color, name: rewardKid.name, message: "Reward unlocked—enjoy it," });
    window.setTimeout(() => setCelebration(null), 1800);
  };

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
      <button className="household" onClick={() => setShowPeople(true)} aria-label="Edit household members"><span className="avatarStack">{state.members.map((m) => <i key={m.id} style={{ background: m.color }}>{m.initial}</i>)}</span><span><strong>{state.household}</strong><small>{syncLabel} · Edit</small></span></button>
    </header>

    <section className="hero" id="top">
      <div><p className="eyebrow">Our family adventure</p><h1>Small jobs.<br /><em>Big high-fives!</em></h1><p className="subhead">Choose a job, tap the circle when you’re done, and collect stars with your team.</p></div>
      <div className="scoreCard">
        <div className="scoreTop"><span>Team star power</span><strong>{weekStats.percent}%</strong></div>
        <div className="progressTrack"><span style={{ width: `${weekStats.percent}%` }} /></div><p>{weekStats.completed} of {weekStats.possible} jobs finished — keep going!</p>
        <div className="leaderRow">{pointsByMember.map((m, i) => <div key={m.id}><span style={{ background: m.color }}>{m.initial}</span><p>{i === 0 && m.points > 0 ? "Star helper!" : m.name}</p><strong>⭐ {m.points}</strong></div>)}</div>
      </div>
    </section>

    <section className="familyCalendar" aria-labelledby="calendar-heading">
      <div className="calendarTitle"><div><p className="eyebrow">Family schedule</p><h2 id="calendar-heading">What’s happening this week?</h2></div><div className="calendarLegend"><span><i className="kidsDot" />Kid visits</span><span><i className="workDot" />Work</span><span><i className="familyDot" />Family</span></div></div>
      {calendarEvents.length > 0 ? <div className="eventRail">{calendarEvents.map((event) => { const start = new Date(event.start); const end = new Date(event.end); return <article className="eventCard" key={event.id} style={{ "--event-color": event.color } as React.CSSProperties}><div className="eventDate"><strong>{dayNames[start.getDay()]}</strong><span>{start.getDate()}</span></div><div><small>{event.calendar}</small><h3>{event.title}</h3><p>{event.allDay ? "All day" : `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}{event.location ? ` · ${event.location}` : ""}</p></div></article>; })}</div>
      : <div className="calendarEmpty"><span>🗓️</span><div><strong>{calendarConfigured === false ? "Your calendars are ready to connect" : "No events this week"}</strong><p>{calendarConfigured === false ? "Add your private Google, iCloud, or Outlook calendar feed during deployment." : "Looks like a wide-open week!"}</p></div></div>}
    </section>

    <section className="rewardsShop" aria-labelledby="rewards-heading">
      <div className="rewardsTop"><div><p className="eyebrow">Spend your stars</p><h2 id="rewards-heading">Rewards Shop</h2></div><button className="ideaButton" onClick={() => setShowRewardEditor(true)}>＋ Custom reward</button></div>
      <div className="rewardMembers">{pointsByMember.map((member) => <button key={member.id} className={rewardMember === member.id ? "active" : ""} onClick={() => setRewardMember(member.id)}><span style={{ background: member.color }}>{member.initial}</span><strong>{member.name}</strong><b>⭐ {member.points}</b></button>)}</div>
      <div className="rewardRail">{state.rewards.map((reward) => { const affordable = Boolean(rewardKid && rewardKid.points >= reward.cost); return <article className="rewardCard" key={reward.id}><span>{reward.emoji}</span><div><h3>{reward.title}</h3><p>{reward.detail}</p></div><button disabled={!affordable} onClick={() => redeemReward(reward)}>{affordable ? `Redeem · ⭐ ${reward.cost}` : `Need ⭐ ${reward.cost}`}</button></article>; })}</div>
      {state.redemptions.length > 0 && <details className="rewardHistory"><summary>Recent rewards</summary>{state.redemptions.slice(-5).reverse().map((item) => { const member = state.members.find((entry) => entry.id === item.memberId); return <p key={item.id}><span>{member?.name} redeemed <strong>{item.rewardTitle}</strong> for ⭐ {item.cost}</span><button onClick={() => persist({ ...state, redemptions: state.redemptions.filter((entry) => entry.id !== item.id) })}>Undo</button></p>; })}</details>}
    </section>

    <section className="dashboard" aria-label="Chore chart">
      <div className="controls">
        <div className="tabs"><button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>My day</button><button className={tab === "week" ? "active" : ""} onClick={() => setTab("week")}>Our week</button></div>
        <div className="memberFilters"><button className={activeMember === "all" ? "active" : ""} onClick={() => setActiveMember("all")}>Everyone</button>{state.members.map((m) => <button key={m.id} className={activeMember === m.id ? "active" : ""} onClick={() => setActiveMember(m.id)}><span style={{ background: m.color }}>{m.initial}</span>{m.name}</button>)}</div>
        <button className="ideaButton" onClick={() => setShowSuggestions(true)}>💡 Chore ideas</button><button className="addButton" onClick={() => setShowAdd(true)}>＋ Add a job</button>
      </div>
      <div className="weekStrip">{weekDates.map((date) => <button key={iso(date)} className={iso(date) === selectedIso ? "active" : ""} onClick={() => setSelectedDate(date)}><span>{dayNames[date.getDay()]}</span><strong>{date.getDate()}</strong>{iso(date) === iso() && <i>Today</i>}</button>)}</div>

      {tab === "today" ? <div className="choreGrid">{visibleChores.map((chore) => {
        const member = state.members.find((entry) => entry.id === chore.memberId)!; const done = isComplete(chore.id);
        return <article className={`choreCard ${done ? "done" : ""}`} key={chore.id} style={{ "--member-color": member.color } as React.CSSProperties}>
          <button className="check" onClick={() => toggle(chore.id)} aria-label={`${done ? "Mark incomplete" : "Complete"} ${chore.title}`}>{done ? "✓" : ""}</button><button className="editChore" onClick={() => setEditingChore(chore)} aria-label={`Edit ${chore.title}`}>✎</button>
          <div className="choreIcon">{chore.icon}</div><div className="choreCopy"><h2>{chore.title}</h2><p>{chore.detail}</p><span className="repeatBadge">↻ {repeatLabel(chore)}</span></div>
          <div className="cardMeta"><span className="assigned" style={{ color: member.color }}><i style={{ background: member.color }}>{member.initial}</i>{member.name}</span><strong>⭐ +{chore.points}</strong></div>
        </article>;
      })}{visibleChores.length === 0 && <div className="empty"><span>☀️</span><h2>All clear</h2><p>No chores are scheduled for this view.</p></div>}</div>
      : <div className="weeklyTable"><div className="weeklyHead"><span>Chore</span>{weekDates.map((date) => <span key={iso(date)}>{dayNames[date.getDay()]}</span>)}</div>{visibleChores.map((chore) => {
        const member = state.members.find((entry) => entry.id === chore.memberId)!;
        return <div className="weeklyRow" key={chore.id}><div><b>{chore.icon} {chore.title}</b><small style={{ color: member.color }}>{member.name} · {chore.points} pts</small></div>{weekDates.map((date) => {
          const allowed = scheduledOn(chore, date); const done = isComplete(chore.id, iso(date));
          return <button key={iso(date)} disabled={!allowed} className={done ? "complete" : ""} onClick={() => toggle(chore.id, iso(date))} aria-label={`${chore.title}, ${dayNames[date.getDay()]}`}>{allowed ? (done ? "✓" : "○") : "—"}</button>;
        })}</div>;
      })}</div>}
    </section>
    <footer><span>👆 Tap the big circle when your job is finished.</span><span>Kind helpers make happy homes! ⭐</span></footer>

    {showAdd && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowAdd(false)}><form className="modal" action={addChore}>
      <button type="button" className="close" onClick={() => setShowAdd(false)} aria-label="Close">×</button><p className="eyebrow">New assignment</p><h2>Add a chore</h2>
      <label>Chore name<input name="title" placeholder="e.g. Sweep the kitchen" autoFocus required /></label>
      <label>Helpful note<input name="detail" placeholder="e.g. After dinner" /></label>
      <div className="formRow"><label>Icon<select name="icon" defaultValue="✨"><option>✨</option><option>🪥</option><option>🛏️</option><option>🧹</option><option>🧸</option><option>🛁</option><option>💜</option><option>💙</option><option>🛠️</option><option>🧺</option><option>🪴</option><option>🐾</option><option>♻️</option></select></label><label>Points<input name="points" type="number" min="1" max="100" defaultValue="10" /></label></div>
      <div className="formRow"><label>Assigned to<select name="memberId">{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Repeats<select name="cadence"><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></label></div>
      <div className="formRow"><label>Weekly day<select name="dueDay" defaultValue={selectedDate.getDay()}>{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label>Monthly date<input name="dueDate" type="number" min="1" max="31" defaultValue={selectedDate.getDate()} /></label></div>
      <p className="fieldHint">Only the matching weekly day or monthly date will be used.</p>
      <button className="saveButton" type="submit">Add to the chart</button>
    </form></div>}

    {editingChore && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditingChore(null)}><form className="modal" action={saveChore}>
      <button type="button" className="close" onClick={() => setEditingChore(null)} aria-label="Close">×</button><p className="eyebrow">Update assignment</p><h2>Edit chore</h2>
      <label>Chore name<input name="title" defaultValue={editingChore.title} required /></label>
      <label>Helpful note<input name="detail" defaultValue={editingChore.detail} /></label>
      <div className="formRow"><label>Icon<select name="icon" defaultValue={editingChore.icon}><option>✨</option><option>🪥</option><option>🛏️</option><option>🧹</option><option>🧸</option><option>🛁</option><option>💜</option><option>💙</option><option>🛠️</option><option>🧺</option><option>🪴</option><option>🐾</option><option>♻️</option><option>🍽️</option></select></label><label>Points<input name="points" type="number" min="1" max="100" defaultValue={editingChore.points} /></label></div>
      <div className="formRow"><label>Assigned to<select name="memberId" defaultValue={editingChore.memberId}>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Repeats<select name="cadence" defaultValue={editingChore.cadence}><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></label></div>
      <div className="formRow"><label>Weekly day<select name="dueDay" defaultValue={editingChore.dueDay ?? selectedDate.getDay()}>{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label>Monthly date<input name="dueDate" type="number" min="1" max="31" defaultValue={editingChore.dueDate ?? selectedDate.getDate()} /></label></div>
      <p className="fieldHint">Only the matching weekly day or monthly date will be used.</p>
      <div className="modalActions"><button type="button" className="deleteButton" onClick={() => { persist({ ...state, chores: state.chores.filter((chore) => chore.id !== editingChore.id), completions: state.completions.filter((item) => item.choreId !== editingChore.id) }); setEditingChore(null); }}>Delete</button><button className="saveButton" type="submit">Save changes</button></div>
    </form></div>}

    {showPeople && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowPeople(false)}><form className="modal" action={savePeople}>
      <button type="button" className="close" onClick={() => setShowPeople(false)} aria-label="Close">×</button><p className="eyebrow">Your household</p><h2>Edit the team</h2>
      <p className="modalIntro">Everyone can choose any celebration they like. Pick an emoji and personalize the cheer.</p>
      {state.members.map((member) => <fieldset className="personEditor" key={member.id}><legend><span style={{ background: member.color }}>{member.initial}</span>{member.name}</legend><label>Name<input name={`${member.id}-name`} defaultValue={member.name} required /></label><div className="formRow"><label>Reaction<select name={`${member.id}-emoji`} defaultValue={member.celebrationEmoji}>{celebrationChoices.map((emoji) => <option key={emoji}>{emoji}</option>)}</select></label><label>Cheer<input name={`${member.id}-message`} defaultValue={member.celebrationMessage} maxLength={40} /></label></div></fieldset>)}
      <button className="saveButton" type="submit">Save team</button>
    </form></div>}

    {showSuggestions && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowSuggestions(false)}><section className="modal suggestionModal" role="dialog" aria-modal="true" aria-labelledby="suggestion-title">
      <button type="button" className="close" onClick={() => setShowSuggestions(false)} aria-label="Close">×</button><p className="eyebrow">Ready-to-assign ideas</p><h2 id="suggestion-title">Chore library</h2>
      <p className="modalIntro">Choose the child, then tap any idea to add it. Start with tasks they can do safely and add responsibility as their skills grow.</p>
      <label>Assign ideas to<select value={suggestionMember} onChange={(event) => setSuggestionMember(event.target.value)}>{state.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
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

    {celebration && <div className="celebration" aria-live="polite" style={{ "--celebrate": celebration.color } as React.CSSProperties}><div className="burst"><i>✦</i><i>★</i><span>{celebration.emoji}</span><i>✦</i><i>★</i></div><strong>{celebration.message} {celebration.name}!</strong></div>}
  </main>;
}
