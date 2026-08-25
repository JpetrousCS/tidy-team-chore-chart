"use client";

import { useEffect, useMemo, useState } from "react";

type Member = { id: string; name: string; initial: string; color: string; celebration: "unicorn" | "racecar" | "rocket" };
type Chore = { id: string; title: string; detail: string; icon: string; points: number; memberId: string; cadence: "daily" | "weekly"; dueDay?: number };
type Completion = { choreId: string; date: string };
type AppState = { household: string; members: Member[]; chores: Chore[]; completions: Completion[] };
type CalendarEvent = { id: string; title: string; start: string; end: string; allDay: boolean; location: string; calendar: string; type: "kids" | "work" | "family"; color: string };

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const starterState: AppState = {
  household: "The Petrous Family",
  members: [
    { id: "charli", name: "Charli", initial: "C", color: "#b85dc7", celebration: "unicorn" },
    { id: "andy", name: "Andy", initial: "A", color: "#e76f35", celebration: "racecar" },
    { id: "henry", name: "Henry", initial: "H", color: "#3186c7", celebration: "rocket" },
  ],
  chores: [
    { id: "charli-teeth", title: "Brush your teeth", detail: "Morning & bedtime", icon: "🪥", points: 5, memberId: "charli", cadence: "daily" },
    { id: "charli-bed", title: "Make your bed", detail: "Before breakfast", icon: "🛏️", points: 5, memberId: "charli", cadence: "daily" },
    { id: "charli-kind", title: "Do something kind", detail: "For Andy or Henry", icon: "💜", points: 12, memberId: "charli", cadence: "daily" },
    { id: "andy-teeth", title: "Brush your teeth", detail: "Morning & bedtime", icon: "🪥", points: 5, memberId: "andy", cadence: "daily" },
    { id: "andy-toys", title: "Pick up your toys", detail: "Before bedtime", icon: "🧸", points: 8, memberId: "andy", cadence: "daily" },
    { id: "andy-bath", title: "Take a shower or bath", detail: "Get squeaky clean", icon: "🛁", points: 10, memberId: "andy", cadence: "weekly", dueDay: 3 },
    { id: "henry-teeth", title: "Brush your teeth", detail: "Morning & bedtime", icon: "🪥", points: 5, memberId: "henry", cadence: "daily" },
    { id: "henry-bed", title: "Make your bed", detail: "Before breakfast", icon: "🛏️", points: 5, memberId: "henry", cadence: "daily" },
    { id: "henry-kind", title: "Do something kind", detail: "For Charli or Andy", icon: "💙", points: 12, memberId: "henry", cadence: "daily" },
    { id: "charli-room", title: "Clean your room", detail: "Saturday reset", icon: "🧹", points: 20, memberId: "charli", cadence: "weekly", dueDay: 6 },
    { id: "andy-room", title: "Clean your room", detail: "Saturday reset", icon: "🧹", points: 20, memberId: "andy", cadence: "weekly", dueDay: 6 },
    { id: "henry-toys", title: "Pick up your toys", detail: "Put everything away", icon: "🧸", points: 8, memberId: "henry", cadence: "daily" },
    { id: "dad-project", title: "Help Dad with a project", detail: "Weekend teamwork", icon: "🛠️", points: 25, memberId: "henry", cadence: "weekly", dueDay: 6 },
  ],
  completions: [],
};

const iso = (date = new Date()) => date.toISOString().slice(0, 10);
const addDays = (date: Date, amount: number) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
const startOfWeek = (date: Date) => addDays(date, -date.getDay());

export function ChoreChart() {
  const [state, setState] = useState<AppState>(starterState);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeMember, setActiveMember] = useState("all");
  const [tab, setTab] = useState<"today" | "week">("today");
  const [showAdd, setShowAdd] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [showPeople, setShowPeople] = useState(false);
  const [celebration, setCelebration] = useState<{ emoji: string; color: string; name: string } | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarConfigured, setCalendarConfigured] = useState<boolean | null>(null);
  const [syncLabel, setSyncLabel] = useState("Loading…");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const saved = (await response.json()) as AppState | null;
        if (saved) setState(saved);
        setSyncLabel("Synced");
      } catch {
        const local = window.localStorage.getItem("tidy-team-state-v4");
        if (local) setState(JSON.parse(local));
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
    const dateMatches = chore.cadence === "daily" || chore.dueDay === selectedDate.getDay();
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
        const emoji = member.celebration === "unicorn" ? "🦄" : member.celebration === "racecar" ? "🏎️" : "🚀";
        setCelebration({ emoji, color: member.color, name: member.name });
        window.setTimeout(() => setCelebration(null), 1500);
      }
    }
  };

  const weekStats = useMemo(() => {
    const dates = weekDates.map(iso);
    const possible = state.chores.reduce((count, chore) => count + (chore.cadence === "daily" ? 7 : 1), 0);
    const completed = state.completions.filter((item) => dates.includes(item.date)).length;
    return { completed, possible, percent: possible ? Math.round((completed / possible) * 100) : 0 };
  }, [state.chores, state.completions, weekDates]);

  const pointsByMember = state.members.map((member) => ({ ...member, points: state.completions.reduce((sum, item) => {
    const chore = state.chores.find((entry) => entry.id === item.choreId && entry.memberId === member.id);
    return sum + (chore ? chore.points : 0);
  }, 0) })).sort((a, b) => b.points - a.points);

  const addChore = (form: FormData) => {
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const cadence = String(form.get("cadence")) as "daily" | "weekly";
    const chore: Chore = {
      id: `${Date.now()}`, title, detail: cadence === "daily" ? "Every day" : dayNames[selectedDate.getDay()],
      icon: String(form.get("icon") || "✨"), points: Number(form.get("points")) || 5,
      memberId: String(form.get("memberId")), cadence, ...(cadence === "weekly" ? { dueDay: selectedDate.getDay() } : {}),
    };
    persist({ ...state, chores: [...state.chores, chore] });
    setShowAdd(false);
  };

  const saveChore = (form: FormData) => {
    if (!editingChore) return;
    const cadence = String(form.get("cadence")) as "daily" | "weekly";
    const updated: Chore = { ...editingChore, title: String(form.get("title") || editingChore.title), icon: String(form.get("icon")), points: Number(form.get("points")) || 1, memberId: String(form.get("memberId")), cadence, ...(cadence === "weekly" ? { dueDay: Number(form.get("dueDay")) } : { dueDay: undefined }) };
    persist({ ...state, chores: state.chores.map((chore) => chore.id === updated.id ? updated : chore) });
    setEditingChore(null);
  };

  const savePeople = (form: FormData) => {
    const members = state.members.map((member) => { const name = String(form.get(member.id) || member.name).trim(); return { ...member, name, initial: name.slice(0, 1).toUpperCase() }; });
    persist({ ...state, members }); setShowPeople(false);
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

    <section className="dashboard" aria-label="Chore chart">
      <div className="controls">
        <div className="tabs"><button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>My day</button><button className={tab === "week" ? "active" : ""} onClick={() => setTab("week")}>Our week</button></div>
        <div className="memberFilters"><button className={activeMember === "all" ? "active" : ""} onClick={() => setActiveMember("all")}>Everyone</button>{state.members.map((m) => <button key={m.id} className={activeMember === m.id ? "active" : ""} onClick={() => setActiveMember(m.id)}><span style={{ background: m.color }}>{m.initial}</span>{m.name}</button>)}</div>
        <button className="addButton" onClick={() => setShowAdd(true)}>＋ Add a job</button>
      </div>
      <div className="weekStrip">{weekDates.map((date) => <button key={iso(date)} className={iso(date) === selectedIso ? "active" : ""} onClick={() => setSelectedDate(date)}><span>{dayNames[date.getDay()]}</span><strong>{date.getDate()}</strong>{iso(date) === iso() && <i>Today</i>}</button>)}</div>

      {tab === "today" ? <div className="choreGrid">{visibleChores.map((chore) => {
        const member = state.members.find((entry) => entry.id === chore.memberId)!; const done = isComplete(chore.id);
        return <article className={`choreCard ${done ? "done" : ""}`} key={chore.id} style={{ "--member-color": member.color } as React.CSSProperties}>
          <button className="check" onClick={() => toggle(chore.id)} aria-label={`${done ? "Mark incomplete" : "Complete"} ${chore.title}`}>{done ? "✓" : ""}</button><button className="editChore" onClick={() => setEditingChore(chore)} aria-label={`Edit ${chore.title}`}>✎</button>
          <div className="choreIcon">{chore.icon}</div><div className="choreCopy"><h2>{chore.title}</h2><p>{chore.detail}</p></div>
          <div className="cardMeta"><span className="assigned" style={{ color: member.color }}><i style={{ background: member.color }}>{member.initial}</i>{member.name}</span><strong>⭐ +{chore.points}</strong></div>
        </article>;
      })}{visibleChores.length === 0 && <div className="empty"><span>☀️</span><h2>All clear</h2><p>No chores are scheduled for this view.</p></div>}</div>
      : <div className="weeklyTable"><div className="weeklyHead"><span>Chore</span>{weekDates.map((date) => <span key={iso(date)}>{dayNames[date.getDay()]}</span>)}</div>{visibleChores.map((chore) => {
        const member = state.members.find((entry) => entry.id === chore.memberId)!;
        return <div className="weeklyRow" key={chore.id}><div><b>{chore.icon} {chore.title}</b><small style={{ color: member.color }}>{member.name} · {chore.points} pts</small></div>{weekDates.map((date) => {
          const allowed = chore.cadence === "daily" || chore.dueDay === date.getDay(); const done = isComplete(chore.id, iso(date));
          return <button key={iso(date)} disabled={!allowed} className={done ? "complete" : ""} onClick={() => toggle(chore.id, iso(date))} aria-label={`${chore.title}, ${dayNames[date.getDay()]}`}>{allowed ? (done ? "✓" : "○") : "—"}</button>;
        })}</div>;
      })}</div>}
    </section>
    <footer><span>👆 Tap the big circle when your job is finished.</span><span>Kind helpers make happy homes! ⭐</span></footer>

    {showAdd && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowAdd(false)}><form className="modal" action={addChore}>
      <button type="button" className="close" onClick={() => setShowAdd(false)} aria-label="Close">×</button><p className="eyebrow">New assignment</p><h2>Add a chore</h2>
      <label>Chore name<input name="title" placeholder="e.g. Sweep the kitchen" autoFocus required /></label>
      <div className="formRow"><label>Icon<select name="icon" defaultValue="✨"><option>✨</option><option>🪥</option><option>🛏️</option><option>🧹</option><option>🧸</option><option>🛁</option><option>💜</option><option>💙</option><option>🛠️</option><option>🧺</option><option>🪴</option><option>🐾</option><option>♻️</option></select></label><label>Points<input name="points" type="number" min="1" max="100" defaultValue="10" /></label></div>
      <div className="formRow"><label>Assigned to<select name="memberId">{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Repeats<select name="cadence"><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label></div>
      <button className="saveButton" type="submit">Add to the chart</button>
    </form></div>}

    {editingChore && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditingChore(null)}><form className="modal" action={saveChore}>
      <button type="button" className="close" onClick={() => setEditingChore(null)} aria-label="Close">×</button><p className="eyebrow">Update assignment</p><h2>Edit chore</h2>
      <label>Chore name<input name="title" defaultValue={editingChore.title} required /></label>
      <div className="formRow"><label>Icon<select name="icon" defaultValue={editingChore.icon}><option>✨</option><option>🪥</option><option>🛏️</option><option>🧹</option><option>🧸</option><option>🛁</option><option>💜</option><option>💙</option><option>🛠️</option><option>🧺</option><option>🪴</option><option>🐾</option><option>♻️</option><option>🍽️</option></select></label><label>Points<input name="points" type="number" min="1" max="100" defaultValue={editingChore.points} /></label></div>
      <div className="formRow"><label>Assigned to<select name="memberId" defaultValue={editingChore.memberId}>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Repeats<select name="cadence" defaultValue={editingChore.cadence}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label></div>
      <label>Weekly due day<select name="dueDay" defaultValue={editingChore.dueDay ?? selectedDate.getDay()}>{dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
      <div className="modalActions"><button type="button" className="deleteButton" onClick={() => { persist({ ...state, chores: state.chores.filter((chore) => chore.id !== editingChore.id), completions: state.completions.filter((item) => item.choreId !== editingChore.id) }); setEditingChore(null); }}>Delete</button><button className="saveButton" type="submit">Save changes</button></div>
    </form></div>}

    {showPeople && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowPeople(false)}><form className="modal" action={savePeople}>
      <button type="button" className="close" onClick={() => setShowPeople(false)} aria-label="Close">×</button><p className="eyebrow">Your household</p><h2>Edit the team</h2>
      {state.members.map((member) => <label className="personField" key={member.id}><span style={{ background: member.color }}>{member.initial}</span><span>{member.celebration === "unicorn" ? "🦄 Sparkles & unicorns" : member.celebration === "racecar" ? "🏎️ Race cars" : "🚀 Rocketships"}</span><input name={member.id} defaultValue={member.name} required /></label>)}
      <button className="saveButton" type="submit">Save team</button>
    </form></div>}

    {celebration && <div className="celebration" aria-live="polite" style={{ "--celebrate": celebration.color } as React.CSSProperties}><div className="burst"><i>✦</i><i>★</i><span>{celebration.emoji}</span><i>✦</i><i>★</i></div><strong>Way to go, {celebration.name}!</strong></div>}
  </main>;
}
