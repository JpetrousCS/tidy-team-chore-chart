"use client";

import { useEffect, useMemo, useState } from "react";
import { platformAuthenticatorIsAvailable, startAuthentication, startRegistration } from "@simplewebauthn/browser";

type Member = { id: string; name: string; initial: string; color: string; celebrationEmoji: string; celebrationMessage: string; rewardGoalId?: string };
type Cadence = "daily" | "weekly" | "monthly" | "flexible";
type Routine = "morning" | "afternoon" | "evening" | "anytime";
type Verification = "none" | "parent" | "photo" | "sibling";
type Room = "bedroom" | "bathroom" | "kitchen" | "playroom" | "outside" | "family";
type Chore = { id: string; title: string; detail: string; icon: string; points: number; teamBonus?: number; teamMode?: "one" | "everyone"; roles?: Record<string, string>; verification?: Verification; memberId: string; memberIds?: string[]; cadence: Cadence; routine?: Routine; startTime?: string; endTime?: string; area?: Room; beforeAfter?: boolean; dueDay?: number; dueDate?: number; weeklyGoal?: number };
type Completion = { id?: string; choreId: string; date: string; status?: "pending" | "approved"; proofPath?: string; participantIds?: string[] };
type RewardLimit = "unlimited" | "daily" | "weekly" | "monthly";
type Reward = { id: string; title: string; detail: string; emoji: string; cost: number; scope?: "individual" | "family"; memberIds?: string[]; limit?: RewardLimit; limitQuantity?: number };
type Redemption = { id: string; rewardId: string; rewardTitle: string; memberId: string; cost: number; quantity?: number; contributions?: Record<string, number>; redeemedAt: string; status?: "pending" | "approved" };
type PointAdjustment = { id: string; memberId: string; amount: number; note: string; createdAt: string };
type PointPolicy = { reset: "never" | "weekly" | "monthly"; dailyEarnLimit: number; maxBalance: number };
type NotificationSettings = { enabled: boolean; evening: boolean; rewards: boolean; calendar: boolean; quietStart: string; quietEnd: string; memberIds: string[] };
type AccessibilitySettings = { highContrast: boolean; largeText: boolean; reducedMotion: boolean; sounds: boolean; spokenChores: boolean };
type RewardSuggestion = { id: string; memberId: string; title: string; emoji: string; createdAt: string; status: "pending" | "approved" };
type JournalEntry = { id: string; memberId: string; choreId?: string; note: string; createdAt: string; mediaPath?: string; mediaType?: "photo" | "audio"; status: "pending" | "approved" };
type SuggestedChore = { title: string; detail: string; icon: string; points: number; cadence: Cadence; routine: Routine; area: Room; team?: boolean };
type EngagementSettings = { mysteryEnabled: boolean; mysteryChance: number; questEnabled: boolean; questTarget: number; questReward: string; mode: "normal" | "vacation" | "visit"; shields: Record<string, number>; photoRetentionDays: number; weatherZip: string };
type AppState = { household: string; members: Member[]; chores: Chore[]; completions: Completion[]; rewards: Reward[]; redemptions: Redemption[]; adjustments: PointAdjustment[]; rewardSuggestions: RewardSuggestion[]; journalEntries: JournalEntry[]; removedDefaultChoreIds: string[]; examplesSeeded?: boolean; pointPolicy: PointPolicy; notificationSettings: NotificationSettings; accessibilitySettings: AccessibilitySettings; engagementSettings: EngagementSettings };
type CalendarEvent = { id: string; title: string; start: string; end: string; allDay: boolean; location: string; calendar: string; type: string; color: string; emoji?: string };
type CalendarFeedSummary = { id: string; name: string; type: string; color: string; emoji: string; visible: boolean };
type WeatherReport = { zip: string; place: string; updatedAt: string; temperature: number; feelsLike: number; wind: number; precipitation: number; label: string; emoji: string; forecast: { date: string; high: number; low: number; label: string; emoji: string }[] };

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const celebrationChoices = [
  { emoji: "🦄", name: "Unicorn" }, { emoji: "✨", name: "Sparkles" }, { emoji: "🌈", name: "Rainbow" },
  { emoji: "🧚", name: "Fairy" }, { emoji: "🏎️", name: "Race car" }, { emoji: "🚀", name: "Rocket" },
  { emoji: "🦖", name: "Dinosaur" }, { emoji: "⚽", name: "Soccer ball" }, { emoji: "🐉", name: "Dragon" },
  { emoji: "🎉", name: "Party popper" }, { emoji: "🏆", name: "Trophy" }, { emoji: "⭐", name: "Superstar" },
];
const rewardEmojiChoices = [
  { emoji: "🎁", name: "Surprise gift" }, { emoji: "📱", name: "Tablet or screen time" }, { emoji: "🎮", name: "Video game time" }, { emoji: "🎬", name: "Movie night" },
  { emoji: "🍦", name: "Ice cream or sweet treat" }, { emoji: "🍕", name: "Pizza or favorite meal" }, { emoji: "🍿", name: "Snack or movie treat" }, { emoji: "🧁", name: "Dessert or baking" },
  { emoji: "⛳", name: "Putt-putt or sports outing" }, { emoji: "🏰", name: "Kids Empire or play place" }, { emoji: "🛝", name: "Playground adventure" }, { emoji: "🎳", name: "Bowling outing" },
  { emoji: "🎨", name: "Art or craft activity" }, { emoji: "📚", name: "Book or reading reward" }, { emoji: "🧸", name: "Toy or small prize" }, { emoji: "🧩", name: "Puzzle or game" },
  { emoji: "🚲", name: "Bike ride" }, { emoji: "🏊", name: "Swimming activity" }, { emoji: "🎪", name: "Special family outing" }, { emoji: "🚀", name: "Big adventure" },
  { emoji: "⭐", name: "Generic star reward" }, { emoji: "👑", name: "Special choice or privilege" }, { emoji: "🎉", name: "Celebration" }, { emoji: "💛", name: "Kindness experience" },
];
const badgeCatalog = [
  { id: "starter", emoji: "🌟", name: "Super Starter", detail: "Complete 5 chores", target: 5, kind: "count" },
  { id: "momentum", emoji: "⚡", name: "Momentum Maker", detail: "Complete 20 chores", target: 20, kind: "count" },
  { id: "legend", emoji: "🏆", name: "Tidy Team Legend", detail: "Complete 50 chores", target: 50, kind: "count" },
  { id: "kind", emoji: "💛", name: "Secret Kindness Agent", detail: "Complete 5 kindness missions", target: 5, kind: "kind" },
  { id: "team", emoji: "🤝", name: "Together We Shine", detail: "Join 3 team chores", target: 3, kind: "team" },
  { id: "room", emoji: "🧭", name: "Room Rescue Ranger", detail: "Finish 5 bedroom jobs", target: 5, kind: "room" },
  { id: "morning", emoji: "🌞", name: "Sunrise Superstar", detail: "Finish 7 morning jobs", target: 7, kind: "morning" },
  { id: "evening", emoji: "🌙", name: "Moonlight Routine Master", detail: "Finish 7 evening jobs", target: 7, kind: "evening" },
  { id: "reading", emoji: "📚", name: "Story Trailblazer", detail: "Complete 5 reading tasks", target: 5, kind: "reading" },
  { id: "helper", emoji: "🛠️", name: "Project Sidekick", detail: "Help with 3 projects", target: 3, kind: "project" },
  { id: "journal", emoji: "📸", name: "Proud Moment Collector", detail: "Share 3 journal moments", target: 3, kind: "journal" },
  { id: "saving", emoji: "🐉", name: "Star Hoard Guardian", detail: "Save 250 stars", target: 250, kind: "points" },
  { id: "first-step", emoji: "👣", name: "First Step Adventurer", detail: "Complete your first chore", target: 1, kind: "count" },
  { id: "century", emoji: "💯", name: "Century of Helping", detail: "Complete 100 chores", target: 100, kind: "count" },
  { id: "after-school", emoji: "🎒", name: "After-School Ace", detail: "Finish 7 afternoon jobs", target: 7, kind: "afternoon" },
  { id: "bathroom", emoji: "🫧", name: "Squeaky-Clean Captain", detail: "Finish 10 bathroom jobs", target: 10, kind: "bathroom" },
  { id: "kitchen", emoji: "🥄", name: "Kitchen Helper Hero", detail: "Finish 10 kitchen jobs", target: 10, kind: "kitchen" },
  { id: "outside", emoji: "🌳", name: "Outdoor Adventure Helper", detail: "Finish 5 outdoor jobs", target: 5, kind: "outside" },
  { id: "hygiene", emoji: "🪥", name: "Fresh Start Champion", detail: "Finish 15 hygiene jobs", target: 15, kind: "hygiene" },
  { id: "tidy", emoji: "🧺", name: "Everything Has a Home", detail: "Finish 15 pickup or tidy jobs", target: 15, kind: "tidy" },
  { id: "flexible", emoji: "🔁", name: "Any-Day Achiever", detail: "Complete 5 flexible weekly opportunities", target: 5, kind: "flexible" },
  { id: "team-ten", emoji: "🌈", name: "Teamwork Makes Magic", detail: "Join 10 team chores", target: 10, kind: "team" },
  { id: "kind-ten", emoji: "🕵️", name: "Kindness Detective", detail: "Complete 10 kindness missions", target: 10, kind: "kind" },
  { id: "saving-big", emoji: "🏰", name: "Dream Reward Builder", detail: "Save 500 stars", target: 500, kind: "points" },
] as const;
const themeColors = [
  { value: "#b85dc7", name: "Berry pink" }, { value: "#dc6f9f", name: "Rose pink" },
  { value: "#e76f35", name: "Tangerine" }, { value: "#d9a62e", name: "Sunshine gold" },
  { value: "#3f8b76", name: "Garden green" }, { value: "#65a45f", name: "Leaf green" },
  { value: "#3186c7", name: "Sky blue" }, { value: "#416fb3", name: "Rocket blue" },
  { value: "#6957d5", name: "Adventure purple" }, { value: "#8b67b8", name: "Lavender" },
  { value: "#497f87", name: "Ocean teal" }, { value: "#b2674e", name: "Warm coral" },
];
const rooms: { id: Room | "all"; emoji: string; name: string }[] = [{ id: "all", emoji: "🗺️", name: "All rooms" }, { id: "bedroom", emoji: "🛏️", name: "Bedroom" }, { id: "bathroom", emoji: "🫧", name: "Bathroom" }, { id: "kitchen", emoji: "🍽️", name: "Kitchen" }, { id: "playroom", emoji: "🧸", name: "Playroom" }, { id: "outside", emoji: "🌳", name: "Outside" }, { id: "family", emoji: "🏡", name: "Family zone" }];
const roomFor = (chore: Chore): Room => chore.area ?? (/teeth|shower|bath|sink/i.test(chore.title) ? "bathroom" : /bed|room|clothes|laundry/i.test(chore.title) ? "bedroom" : /table|dish|meal|trash/i.test(chore.title) ? "kitchen" : /toy|tidy/i.test(chore.title) ? "playroom" : /plant|yard|outside/i.test(chore.title) ? "outside" : "family");

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
  { id: "movie-choice", title: "Choose the family movie", detail: "You pick what everyone watches", emoji: "🎬", cost: 75 },
  { id: "dessert-choice", title: "Choose tonight’s dessert", detail: "Pick a family treat", emoji: "🧁", cost: 90 },
  { id: "stay-up", title: "Stay up 20 minutes later", detail: "A special weekend privilege", emoji: "🌙", cost: 120 },
  { id: "family-bowling", title: "Family bowling trip", detail: "Everyone contributes to an outing", emoji: "🎳", cost: 300, scope: "family" },
  { id: "craft-kit", title: "Choose a craft kit", detail: "A creative project to take home", emoji: "🎨", cost: 175 },
];
const coreChores = [
  { slug: "teeth", title: "Brush your teeth", detail: "Morning & bedtime", icon: "🪥", points: 5, routine: "morning" as Routine },
  { slug: "bed", title: "Make your bed", detail: "Start the day tidy", icon: "🛏️", points: 5, routine: "morning" as Routine },
  { slug: "kind", title: "Do something kind", detail: "Help or encourage someone", icon: "💛", points: 10, routine: "anytime" as Routine },
  { slug: "tidy", title: "Tidy your things", detail: "Toys, clothes & belongings", icon: "🧸", points: 8, routine: "evening" as Routine },
  { slug: "bath", title: "Take a shower or bath", detail: "Get squeaky clean", icon: "🛁", points: 10, routine: "evening" as Routine },
  { slug: "room", title: "Clean your room", detail: "Put things back where they belong", icon: "🧹", points: 15, routine: "evening" as Routine },
  { slug: "dad-project", title: "Help Dad with a project", detail: "Family teamwork", icon: "🛠️", points: 15, routine: "anytime" as Routine },
  { slug: "dressed", title: "Get dressed", detail: "Choose clean clothes and get ready", icon: "👕", points: 5, routine: "morning" as Routine },
  { slug: "hair", title: "Brush or style your hair", detail: "Get ready for the day", icon: "🪮", points: 5, routine: "morning" as Routine },
  { slug: "hygiene", title: "Personal hygiene check", detail: "Wash face, use deodorant when appropriate, and feel fresh", icon: "🫧", points: 7, routine: "morning" as Routine },
  { slug: "pajamas", title: "Put on pajamas", detail: "Get cozy and put daytime clothes away", icon: "🌙", points: 5, routine: "evening" as Routine },
  { slug: "pickup", title: "Pick up after yourself", detail: "Return personal items to their homes", icon: "🧺", points: 8, routine: "evening" as Routine },
] as const;
const suggestedChores: SuggestedChore[] = [
  { title: "Empty your lunchbox", detail: "Put containers away and bring dishes to the kitchen", icon: "🥪", points: 8, cadence: "daily", routine: "afternoon", area: "kitchen" },
  { title: "Pack tomorrow’s backpack", detail: "Check papers, homework, and school supplies", icon: "🎒", points: 10, cadence: "daily", routine: "evening", area: "bedroom" },
  { title: "Put dirty clothes in the hamper", detail: "Keep bedroom and bathroom floors clear", icon: "👕", points: 5, cadence: "daily", routine: "evening", area: "bedroom" },
  { title: "Clear dishes after meals", detail: "Bring your cup, plate, and utensils to the kitchen", icon: "🍽️", points: 7, cadence: "daily", routine: "anytime", area: "kitchen" },
  { title: "Read for 15 minutes", detail: "Choose a book and enjoy some quiet reading", icon: "📚", points: 10, cadence: "daily", routine: "evening", area: "bedroom" },
  { title: "Set out tomorrow’s clothes", detail: "Choose an outfit and place it somewhere tidy", icon: "👚", points: 7, cadence: "daily", routine: "evening", area: "bedroom" },
  { title: "Help prepare dinner", detail: "Choose a safe job and work together", icon: "🥗", points: 15, cadence: "weekly", routine: "evening", area: "kitchen", team: true },
  { title: "Ten-minute family pickup", detail: "Everyone chooses an area and tidies together", icon: "⏱️", points: 12, cadence: "daily", routine: "evening", area: "family", team: true },
  { title: "Pack or unpack for visits", detail: "Use the family calendar and visit checklist", icon: "🧳", points: 18, cadence: "flexible", routine: "anytime", area: "bedroom" },
  { title: "Do one helpful job without being asked", detail: "Notice what the family needs and lend a hand", icon: "💛", points: 15, cadence: "daily", routine: "anytime", area: "family" },
  { title: "Set or clear the table", detail: "Choose a safe kitchen job", icon: "🍽️", points: 8, cadence: "daily", routine: "evening", area: "kitchen" },
  { title: "Feed a pet", detail: "Follow the pet’s regular routine", icon: "🐾", points: 8, cadence: "daily", routine: "anytime", area: "family" },
  { title: "Water plants", detail: "Check the soil first", icon: "🪴", points: 8, cadence: "weekly", routine: "anytime", area: "family" },
  { title: "Sort or fold laundry", detail: "Match socks or fold age-appropriate items", icon: "🧺", points: 12, cadence: "weekly", routine: "anytime", area: "bedroom" },
  { title: "Sweep or vacuum a room", detail: "Choose one safe area", icon: "🧹", points: 15, cadence: "weekly", routine: "anytime", area: "family" },
  { title: "Unload the dishwasher", detail: "Only handle age-appropriate dishes", icon: "🍽️", points: 15, cadence: "weekly", routine: "afternoon", area: "kitchen" },
  { title: "Take out the trash", detail: "Ask for help with heavy bags", icon: "🗑️", points: 15, cadence: "weekly", routine: "anytime", area: "family" },
  { title: "Change your bedsheets", detail: "Ask for help with fitted corners", icon: "🛏️", points: 20, cadence: "weekly", routine: "anytime", area: "bedroom" },
  { title: "Clean the bathroom sink", detail: "Use only parent-approved supplies", icon: "🧽", points: 20, cadence: "weekly", routine: "anytime", area: "bathroom" },
  { title: "Help Dad with a project", detail: "Choose a safe role and work together", icon: "🛠️", points: 25, cadence: "weekly", routine: "anytime", area: "family", team: true },
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
  adjustments: [],
  rewardSuggestions: [],
  journalEntries: [],
  removedDefaultChoreIds: [],
  examplesSeeded: true,
  pointPolicy: { reset: "never", dailyEarnLimit: 0, maxBalance: 0 },
  notificationSettings: { enabled: false, evening: true, rewards: true, calendar: true, quietStart: "20:00", quietEnd: "07:00", memberIds: ["charli", "andy", "henry"] },
  accessibilitySettings: { highContrast: false, largeText: false, reducedMotion: false, sounds: false, spokenChores: false },
  engagementSettings: { mysteryEnabled: true, mysteryChance: 12, questEnabled: true, questTarget: 500, questReward: "Family pizza night", mode: "normal", shields: { charli: 2, andy: 2, henry: 2 }, photoRetentionDays: 30, weatherZip: "48064" },
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
    if (value === "get dressed") return "dressed";
    if (value.includes("brush or style") && value.includes("hair")) return "hair";
    if (value.includes("personal hygiene check")) return "hygiene";
    if (value.includes("put on pajamas")) return "pajamas";
    if (value.includes("pick up after yourself")) return "pickup";
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
  const notificationSettings = Object.assign({ enabled: false, evening: true, rewards: true, calendar: true, quietStart: "20:00", quietEnd: "07:00", memberIds: members.map((member) => member.id) }, saved.notificationSettings ?? {}) as NotificationSettings;
  const accessibilitySettings = Object.assign({ highContrast: false, largeText: false, reducedMotion: false, sounds: false, spokenChores: false }, saved.accessibilitySettings ?? {}) as AccessibilitySettings;
  const engagementSettings = Object.assign({ mysteryEnabled: true, mysteryChance: 12, questEnabled: true, questTarget: 500, questReward: "Family pizza night", mode: "normal", shields: Object.fromEntries(members.map((member) => [member.id, 2])), photoRetentionDays: 30, weatherZip: "48064" }, saved.engagementSettings ?? {}) as EngagementSettings;
  const rewards = [...(saved.rewards ?? [])]; if (!saved.examplesSeeded) for (const example of starterRewards) if (!rewards.some((reward) => reward.id === example.id)) rewards.push(example);
  return { ...saved, members, chores: chores.map((chore) => chore.memberIds?.length ? { ...chore, teamBonus: chore.teamBonus ?? 5, teamMode: chore.teamMode ?? "one" } : chore), completions, rewards: rewards.map((reward) => ({ ...reward, scope: reward.scope ?? "individual", memberIds: reward.memberIds ?? members.map((member) => member.id), limit: reward.limit ?? "unlimited", limitQuantity: reward.limitQuantity ?? 1 })), redemptions: saved.redemptions ?? [], adjustments: saved.adjustments ?? [], rewardSuggestions: saved.rewardSuggestions ?? [], journalEntries: saved.journalEntries ?? [], removedDefaultChoreIds, examplesSeeded: true, pointPolicy: saved.pointPolicy ?? { reset: "never", dailyEarnLimit: 0, maxBalance: 0 }, notificationSettings, accessibilitySettings, engagementSettings };
}

const iso = (date = new Date()) => date.toISOString().slice(0, 10);
const addDays = (date: Date, amount: number) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
const startOfWeek = (date: Date) => addDays(date, -date.getDay());
const scheduledOn = (chore: Chore, date: Date) => chore.cadence === "daily" || chore.cadence === "flexible" || (chore.cadence === "weekly" && chore.dueDay === date.getDay()) || (chore.cadence === "monthly" && chore.dueDate === date.getDate());
const repeatLabel = (chore: Chore) => chore.cadence === "daily" ? "Every day" : chore.cadence === "weekly" ? `Every ${dayNames[chore.dueDay ?? 0]}` : chore.cadence === "monthly" ? `Monthly on day ${chore.dueDate ?? 1}` : `Any day · ${chore.weeklyGoal ?? 1}× per week`;
const routineLabel = (routine: Routine = "anytime") => routine === "morning" ? "☀️ Morning" : routine === "afternoon" ? "🎒 After school" : routine === "evening" ? "🌙 Evening" : "✨ Anytime";
const formatTime = (value: string) => new Date(`2000-01-01T${value}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const timeLabel = (chore: Chore) => chore.startTime && chore.endTime ? `${formatTime(chore.startTime)}–${formatTime(chore.endTime)}` : chore.startTime ? `After ${formatTime(chore.startTime)}` : chore.endTime ? `Before ${formatTime(chore.endTime)}` : "";
const inTimeWindow = (chore: Chore, now = new Date()) => { if (!chore.startTime && !chore.endTime) return false; const current = now.toTimeString().slice(0, 5); if (chore.startTime && chore.endTime && chore.startTime > chore.endTime) return current >= chore.startTime || current <= chore.endTime; return (!chore.startTime || current >= chore.startTime) && (!chore.endTime || current <= chore.endTime); };

export function ChoreChart() {
  const [state, setState] = useState<AppState>(() => normalizeState(starterState));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeMember, setActiveMember] = useState("all");
  const [tab, setTab] = useState<"today" | "week" | "family" | "kids">("today");
  const [familyRange, setFamilyRange] = useState<"day" | "week">("day");
  const [childHome, setChildHome] = useState("charli");
  const [routineFocus, setRoutineFocus] = useState<Routine | "all" | "now">(() => { const hour = new Date().getHours(); return hour < 11 ? "morning" : hour < 16 ? "afternoon" : "evening"; });
  const [activitySearch, setActivitySearch] = useState("");
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
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const [calendarFeeds, setCalendarFeeds] = useState<CalendarFeedSummary[]>([]);
  const [calendarError, setCalendarError] = useState("");
  const [syncLabel, setSyncLabel] = useState("Loading…");
  const [showLaunch, setShowLaunch] = useState(true);
  const [roomFilter, setRoomFilter] = useState<Room | "all">("all");
  const [showFunSettings, setShowFunSettings] = useState(false);
  const [showRewardSuggestion, setShowRewardSuggestion] = useState(false);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardQuantities, setRewardQuantities] = useState<Record<string, number>>({});
  const [journalChore, setJournalChore] = useState<Chore | null>(null);
  const [journalMember, setJournalMember] = useState("charli");
  const [journalError, setJournalError] = useState("");
  const [showBadges, setShowBadges] = useState(false);

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

  useEffect(() => { setWeatherError(false); fetch(`/api/weather?zip=${encodeURIComponent(state.engagementSettings.weatherZip)}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then(setWeather).catch(() => setWeatherError(true)); }, [state.engagementSettings.weatherZip]);

  useEffect(() => {
    if (!state.notificationSettings.enabled || !state.notificationSettings.evening || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const timer = window.setInterval(() => { const now = new Date(); const current = now.toTimeString().slice(0, 5); const { quietStart, quietEnd } = state.notificationSettings; const quiet = quietStart > quietEnd ? current >= quietStart || current < quietEnd : current >= quietStart && current < quietEnd; if (!quiet && now.getHours() === 19 && now.getMinutes() === 0) new Notification("Tidy Team evening check", { body: "Take a look at any chores still waiting for a high-five." }); }, 60_000);
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
    const routineMatches = tab !== "today" || routineFocus === "all" || (routineFocus === "now" ? inTimeWindow(chore) : (chore.routine ?? "anytime") === routineFocus || chore.routine === "anytime");
    return memberMatches && routineMatches && (roomFilter === "all" || roomFor(chore) === roomFilter) && (tab === "week" || dateMatches);
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
    let adjustments = state.adjustments;
    let mysteryMessage = "";
    if (!wasComplete && selectedChore && state.engagementSettings.mysteryEnabled && Math.random() * 100 < state.engagementSettings.mysteryChance) {
      const winnerId = selectedChore.memberIds?.[0] ?? selectedChore.memberId;
      const prizes = [{ amount: selectedChore.points, label: "Double stars!" }, { amount: 5, label: "Mystery treasure chest!" }, { amount: 0, label: "Pick a five-minute dance party!" }];
      const prize = prizes[Math.floor(Math.random() * prizes.length)];
      mysteryMessage = prize.label;
      if (prize.amount) adjustments = [...adjustments, { id: `mystery-${Date.now()}`, memberId: winnerId, amount: prize.amount, note: prize.label, createdAt: new Date().toISOString() }];
    }
    persist({ ...state, completions, adjustments });
    if (!wasComplete && (!selectedChore?.verification || selectedChore.verification === "none")) {
      if (state.accessibilitySettings.sounds) try { const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (AudioCtx) { const audio = new AudioCtx(); const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.frequency.setValueAtTime(660, audio.currentTime); oscillator.frequency.exponentialRampToValueAtTime(990, audio.currentTime + .18); gain.gain.setValueAtTime(.08, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .25); oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .25); } } catch { /* Audio feedback is optional. */ }
      const chore = state.chores.find((item) => item.id === choreId);
      const member = state.members.find((item) => item.id === chore?.memberId);
      if (mysteryMessage) {
        setCelebration({ emoji: "🎁", color: "#d9a62e", name: "surprise", message: mysteryMessage });
        window.setTimeout(() => setCelebration(null), 2200);
      } else if (chore?.memberIds?.length) {
        setCelebration({ emoji: "🤝", color: "#6957d5", name: "Tidy Team", message: "Amazing teamwork," });
        window.setTimeout(() => setCelebration(null), 1500);
      } else if (member) {
        setCelebration({ emoji: member.celebrationEmoji, color: member.color, name: member.name, message: member.celebrationMessage });
        window.setTimeout(() => setCelebration(null), 1500);
      }
    }
  };
  const confirmTeamPart = (chore: Chore, memberId: string, date = selectedIso) => {
    const existing = state.completions.find((item) => item.choreId === chore.id && item.date === date);
    const participants = new Set(existing?.participantIds ?? []);
    if (participants.has(memberId)) participants.delete(memberId); else participants.add(memberId);
    const participantIds = Array.from(participants);
    const allJoined = (chore.memberIds ?? []).every((id) => participants.has(id));
    const nextCompletion: Completion = { ...(existing ?? { id: `${Date.now()}`, choreId: chore.id, date }), participantIds, status: allJoined ? "approved" : "pending" };
    const completions = participantIds.length === 0 ? state.completions.filter((item) => item !== existing) : existing ? state.completions.map((item) => item === existing ? nextCompletion : item) : [...state.completions, nextCompletion];
    persist({ ...state, completions });
    if (allJoined) { setCelebration({ emoji: "🤝", color: "#6957d5", name: "Tidy Team", message: "Everyone joined in—bonus unlocked for" }); window.setTimeout(() => setCelebration(null), 1800); }
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
    const spent = state.redemptions.filter((item) => (item.memberId === member.id || Boolean(item.contributions?.[member.id])) && item.status !== "pending" && item.redeemedAt.slice(0, 10) >= pointPeriodStart).reduce((sum, item) => sum + (item.contributions?.[member.id] ?? item.cost), 0);
    const adjusted = state.adjustments.filter((item) => item.memberId === member.id && item.createdAt.slice(0, 10) >= pointPeriodStart).reduce((sum, item) => sum + item.amount, 0);
    const available = Math.max(0, earned + adjusted - spent);
    return { ...member, earned, adjusted, spent, points: state.pointPolicy.maxBalance > 0 ? Math.min(available, state.pointPolicy.maxBalance) : available };
  }).sort((a, b) => b.points - a.points);
  const rewardKid = pointsByMember.find((member) => member.id === rewardMember) ?? pointsByMember[0];
  const badgeProgress = (memberId: string, kind: typeof badgeCatalog[number]["kind"]) => { const memberCompletions = state.completions.filter((item) => item.status !== "pending" && state.chores.some((chore) => chore.id === item.choreId && (chore.memberId === memberId || chore.memberIds?.includes(memberId)))); const matching = (test: (chore: Chore) => boolean) => memberCompletions.filter((item) => { const chore = state.chores.find((entry) => entry.id === item.choreId); return Boolean(chore && test(chore)); }).length; if (kind === "count") return memberCompletions.length; if (kind === "kind") return matching((chore) => /kind|helpful|compliment/i.test(chore.title)); if (kind === "team") return matching((chore) => Boolean(chore.memberIds?.length)); if (kind === "room") return matching((chore) => roomFor(chore) === "bedroom"); if (kind === "bathroom") return matching((chore) => roomFor(chore) === "bathroom"); if (kind === "kitchen") return matching((chore) => roomFor(chore) === "kitchen"); if (kind === "outside") return matching((chore) => roomFor(chore) === "outside"); if (kind === "morning") return matching((chore) => chore.routine === "morning"); if (kind === "afternoon") return matching((chore) => chore.routine === "afternoon"); if (kind === "evening") return matching((chore) => chore.routine === "evening"); if (kind === "reading") return matching((chore) => /read|book/i.test(chore.title)); if (kind === "project") return matching((chore) => /project|prepare|build/i.test(chore.title)); if (kind === "hygiene") return matching((chore) => /teeth|hair|hygiene|shower|bath|pajama/i.test(chore.title)); if (kind === "tidy") return matching((chore) => /tidy|pick up|clean|put .* away/i.test(chore.title)); if (kind === "flexible") return matching((chore) => chore.cadence === "flexible"); if (kind === "journal") return state.journalEntries.filter((entry) => entry.memberId === memberId).length; return pointsByMember.find((member) => member.id === memberId)?.points ?? 0; };
  const activityLedger = [
    ...state.completions.map((item) => { const chore = state.chores.find((entry) => entry.id === item.choreId); const members = state.members.filter((member) => chore && (chore.memberId === member.id || chore.memberIds?.includes(member.id))).map((member) => member.name).join(", "); return { id: `completion-${item.id || item.choreId + item.date}`, date: item.date, text: `${members || "Someone"} ${item.status === "pending" ? "submitted" : "completed"} ${chore?.title || "a chore"}`, kind: item.status === "pending" ? "⏳" : "✓" }; }),
    ...state.redemptions.map((item) => ({ id: `redemption-${item.id}`, date: item.redeemedAt.slice(0, 10), text: `${state.members.find((member) => member.id === item.memberId)?.name || "A child"} ${item.status === "pending" ? "requested" : "redeemed"} ${item.rewardTitle} for ${item.cost} stars`, kind: item.status === "pending" ? "⏳" : "🎁" })),
    ...state.adjustments.map((item) => ({ id: `adjustment-${item.id}`, date: item.createdAt.slice(0, 10), text: `${state.members.find((member) => member.id === item.memberId)?.name || "A child"}: ${item.amount > 0 ? "+" : ""}${item.amount} stars — ${item.note}`, kind: "⭐" })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const yesterday = addDays(new Date(), -1);
  const missedYesterday = state.chores.filter((chore) => scheduledOn(chore, yesterday) && !isComplete(chore.id, iso(yesterday)));
  const calendarSuggestions = Array.from(new Set(calendarEvents.flatMap((event) => event.type === "kids" ? ["Pack overnight bag"] : event.type === "work" ? ["Choose a quiet activity"] : [])));
  const familyQuestPoints = state.completions.filter((item) => weekDates.map(iso).includes(item.date) && item.status !== "pending").reduce((total, item) => { const chore = state.chores.find((entry) => entry.id === item.choreId); return total + (chore ? chore.points * (chore.memberIds?.length ?? 1) + (chore.memberIds?.length ? (chore.teamBonus ?? 5) * chore.memberIds.length : 0) : 0); }, 0);
  const familyQuestPercent = Math.min(100, Math.round((familyQuestPoints / Math.max(1, state.engagementSettings.questTarget)) * 100));

  const addChore = (form: FormData) => {
    const title = String(form.get("title") || "").trim();
    if (!title) return;
    const cadence = String(form.get("cadence")) as Cadence;
    const assignee = String(form.get("memberId"));
    const base = {
      title, detail: String(form.get("detail") || "").trim() || "Custom family job",
      icon: String(form.get("icon") || "✨"), points: Number(form.get("points")) || 5, teamBonus: assignee === "team" ? Math.max(0, Number(form.get("teamBonus")) || 0) : undefined, teamMode: assignee === "team" ? String(form.get("teamMode") || "everyone") as "one" | "everyone" : undefined, roles: assignee === "team" ? Object.fromEntries(state.members.map((member) => [member.id, String(form.get(`role-${member.id}`) || "Help the team")])) : undefined, verification: String(form.get("verification") || "none") as Verification,
      cadence, routine: String(form.get("routine")) as Routine, startTime: String(form.get("startTime") || "") || undefined, endTime: String(form.get("endTime") || "") || undefined, area: String(form.get("area") || "family") as Room, beforeAfter: form.get("beforeAfter") === "on", ...(cadence === "weekly" ? { dueDay: Number(form.get("dueDay")) } : {}), ...(cadence === "monthly" ? { dueDate: Number(form.get("dueDate")) } : {}), ...(cadence === "flexible" ? { weeklyGoal: Math.max(1, Number(form.get("weeklyGoal")) || 1) } : {}),
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
    const updated: Chore = { ...editingChore, title: String(form.get("title") || editingChore.title), detail: String(form.get("detail") || editingChore.detail), icon: String(form.get("icon")), points: Number(form.get("points")) || 1, teamBonus: assignee === "team" ? Math.max(0, Number(form.get("teamBonus")) || 0) : undefined, teamMode: assignee === "team" ? String(form.get("teamMode") || "everyone") as "one" | "everyone" : undefined, roles: assignee === "team" ? Object.fromEntries(state.members.map((member) => [member.id, String(form.get(`role-${member.id}`) || editingChore.roles?.[member.id] || "Help the team")])) : undefined, verification: String(form.get("verification") || "none") as Verification, memberId: assignee === "team" ? state.members[0].id : assignee, memberIds: assignee === "team" ? state.members.map((member) => member.id) : undefined, cadence, routine: String(form.get("routine")) as Routine, startTime: String(form.get("startTime") || "") || undefined, endTime: String(form.get("endTime") || "") || undefined, area: String(form.get("area") || roomFor(editingChore)) as Room, beforeAfter: form.get("beforeAfter") === "on", dueDay: cadence === "weekly" ? Number(form.get("dueDay")) : undefined, dueDate: cadence === "monthly" ? Number(form.get("dueDate")) : undefined, weeklyGoal: cadence === "flexible" ? Math.max(1, Number(form.get("weeklyGoal")) || 1) : undefined };
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
    const notificationSettings: NotificationSettings = { enabled: form.get("notifications") === "on", evening: form.get("notifyEvening") === "on", rewards: form.get("notifyRewards") === "on", calendar: form.get("notifyCalendar") === "on", quietStart: String(form.get("quietStart") || "20:00"), quietEnd: String(form.get("quietEnd") || "07:00"), memberIds: state.members.filter((member) => form.get(`notify-${member.id}`) === "on").map((member) => member.id) };
    const accessibilitySettings: AccessibilitySettings = { highContrast: form.get("highContrast") === "on", largeText: form.get("largeText") === "on", reducedMotion: form.get("reducedMotion") === "on", sounds: form.get("sounds") === "on", spokenChores: form.get("spokenChores") === "on" };
    if (notificationSettings.enabled && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    persist({ ...state, members, pointPolicy, notificationSettings, accessibilitySettings }); setShowPeople(false);
  };

  const addSuggestion = (suggestion: SuggestedChore) => {
    if (suggestion.team) {
      const chore: Chore = { ...suggestion, id: `team-${Date.now()}`, memberId: state.members[0].id, memberIds: state.members.map((member) => member.id), teamMode: "everyone", teamBonus: 5, weeklyGoal: suggestion.cadence === "flexible" ? 2 : undefined, dueDay: suggestion.cadence === "weekly" ? selectedDate.getDay() : undefined, roles: Object.fromEntries(state.members.map((member) => [member.id, "Choose one part and help the team"])) };
      persist({ ...state, chores: [...state.chores, chore] }); return;
    }
    const assignees = suggestionMember === "all" ? state.members.map((member) => member.id) : [suggestionMember];
    const chores: Chore[] = assignees.map((memberId, index) => ({ id: `${memberId}-${Date.now()}-${index}`, ...suggestion, memberId, ...(suggestion.cadence === "weekly" ? { dueDay: selectedDate.getDay() } : {}), ...(suggestion.cadence === "flexible" ? { weeklyGoal: 2 } : {}) }));
    persist({ ...state, chores: [...state.chores, ...chores] });
  };

  const addCalendarSuggestion = (title: string) => {
    const template = title === "Pack overnight bag" ? { icon: "🎒", detail: "Before the upcoming kid visit", points: 12 } : { icon: "🤫", detail: "During Dad’s work meeting", points: 8 };
    const chores = state.members.map((member, index) => ({ id: `${member.id}-calendar-${Date.now()}-${index}`, title, ...template, memberId: member.id, cadence: "weekly" as Cadence, routine: "anytime" as Routine, dueDay: selectedDate.getDay() }));
    persist({ ...state, chores: [...state.chores, ...chores] });
  };
  const openCalendarSettings = async () => { setCalendarError(""); const response = await fetch("/api/calendar/settings", { cache: "no-store" }); if (response.ok) { const data = await response.json(); setCalendarFeeds(data.feeds ?? []); setShowCalendarSettings(true); } else { setCalendarError("Connect Postgres before adding private calendar feeds."); setShowCalendarSettings(true); } };
  const addCalendarFeed = async (form: FormData) => { setCalendarError(""); const response = await fetch("/api/calendar/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name"), url: form.get("url"), type: form.get("type"), color: form.get("color"), emoji: form.get("emoji") }) }); const result = await response.json(); if (!response.ok) { setCalendarError(result.error || "Calendar could not be added."); return; } await openCalendarSettings(); };
  const updateCalendarFeed = async (form: FormData) => { setCalendarError(""); const response = await fetch("/api/calendar/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: form.get("id"), name: form.get("name"), type: form.get("type"), color: form.get("color"), emoji: form.get("emoji"), visible: form.get("visible") === "on" }) }); const result = await response.json(); if (!response.ok) { setCalendarError(result.error || "Calendar could not be updated."); return; } await openCalendarSettings(); };
  const removeCalendarFeed = async (id: string) => { const response = await fetch(`/api/calendar/settings?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (response.ok) setCalendarFeeds(calendarFeeds.filter((feed) => feed.id !== id)); };

  const redeemReward = (reward: Reward) => {
    const quantity = Math.max(1, rewardQuantities[reward.id] ?? 1); const totalCost = reward.cost * quantity;
    if (!rewardKid) return;
    if (reward.scope !== "family" && reward.memberIds?.length && !reward.memberIds.includes(rewardKid.id)) return;
    const contributions = reward.scope === "family" ? Object.fromEntries(state.members.map((member, index) => [member.id, Math.floor(totalCost / state.members.length) + (index < totalCost % state.members.length ? 1 : 0)])) : undefined;
    const familyReady = !contributions || state.members.every((member) => (pointsByMember.find((item) => item.id === member.id)?.points ?? 0) >= contributions[member.id]);
    const limitOwner = reward.scope === "family" ? "family" : rewardKid.id;
    if (!familyReady || (reward.scope !== "family" && rewardKid.points < totalCost) || rewardRemaining(reward, limitOwner) < quantity) return;
    const redemption: Redemption = { id: `${Date.now()}`, rewardId: reward.id, rewardTitle: reward.title, memberId: reward.scope === "family" ? "family" : rewardKid.id, cost: totalCost, quantity, contributions, redeemedAt: new Date().toISOString(), status: "pending" };
    persist({ ...state, redemptions: [...state.redemptions, redemption] });
    setCelebration({ emoji: reward.emoji, color: rewardKid.color, name: rewardKid.name, message: "Reward request sent for" });
    window.setTimeout(() => setCelebration(null), 1800);
  };

  const approveRedemption = (redemption: Redemption) => {
    const member = pointsByMember.find((item) => item.id === redemption.memberId);
    const affordable = redemption.contributions ? state.members.every((item) => (pointsByMember.find((member) => member.id === item.id)?.points ?? 0) >= (redemption.contributions?.[item.id] ?? 0)) : Boolean(member && member.points >= redemption.cost);
    if (!affordable) return;
    persist({ ...state, redemptions: state.redemptions.map((item) => item.id === redemption.id ? { ...item, status: "approved" } : item) });
  };

  function rewardRemaining(reward: Reward, memberId: string) {
    if (reward.scope !== "family" && reward.memberIds?.length && !reward.memberIds.includes(memberId)) return 0;
    if (!reward.limit || reward.limit === "unlimited") return 999;
    const now = new Date(); const start = reward.limit === "daily" ? iso(now) : reward.limit === "weekly" ? iso(startOfWeek(now)) : iso(new Date(now.getFullYear(), now.getMonth(), 1));
    const used = state.redemptions.filter((item) => item.rewardId === reward.id && item.memberId === memberId && item.redeemedAt.slice(0, 10) >= start).reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    return Math.max(0, (reward.limitQuantity ?? 1) - used);
  }

  const adjustPoints = (memberId: string, amount: number) => {
    const member = state.members.find((item) => item.id === memberId);
    const note = window.prompt(`Why are you ${amount > 0 ? "adding" : "removing"} ${Math.abs(amount)} stars for ${member?.name}?`, amount > 0 ? "Parent bonus" : "Correction");
    if (note === null) return;
    persist({ ...state, adjustments: [...state.adjustments, { id: `${Date.now()}`, memberId, amount, note: note.trim() || "Parent adjustment", createdAt: new Date().toISOString() }] });
  };

  const setRewardGoal = (memberId: string, rewardGoalId: string) => persist({ ...state, members: state.members.map((member) => member.id === memberId ? { ...member, rewardGoalId } : member) });
  const speakChore = (chore: Chore) => { if (typeof speechSynthesis === "undefined") return; speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(`${chore.title}. ${chore.detail}`)); };

  const unlockParent = async (form: FormData) => {
    setPinError("");
    const response = await fetch("/api/parent-pin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin: String(form.get("pin") || "") }) });
    if (response.ok) { setIsParent(true); setShowPin(false); setShowParentDashboard(true); const cloud = await fetch("/api/state", { cache: "no-store" }); if (cloud.ok) { const saved = await cloud.json(); if (saved) setState(normalizeState(saved)); } } else setPinError("That PIN didn’t match. Try again.");
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
    const reward: Reward = { id: editingReward?.id ?? `${Date.now()}`, title, detail: String(form.get("detail") || "A custom family reward").trim(), emoji: String(form.get("emoji") || "🎁"), cost: Math.max(1, Number(form.get("cost")) || 25), scope: String(form.get("scope") || "individual") as Reward["scope"], memberIds: state.members.filter((member) => form.get(`reward-member-${member.id}`) === "on").map((member) => member.id), limit: String(form.get("limit") || "unlimited") as RewardLimit, limitQuantity: Math.max(1, Number(form.get("limitQuantity")) || 1) };
    persist({ ...state, rewards: editingReward ? state.rewards.map((item) => item.id === reward.id ? reward : item) : [...state.rewards, reward] });
    setEditingReward(null); setShowRewardEditor(false);
  };

  const submitJournal = async (form: FormData) => {
    setJournalError(""); const photo = form.get("photo"); const audio = form.get("audio"); const file = photo instanceof File && photo.size ? photo : audio; let mediaPath: string | undefined; let mediaType: JournalEntry["mediaType"];
    if (file instanceof File && file.size) { const upload = new FormData(); upload.set("file", file); const response = await fetch("/api/media", { method: "POST", body: upload }); const result = await response.json(); if (!response.ok) { setJournalError(result.error || "Media could not be saved."); return; } mediaPath = result.pathname; mediaType = file.type.startsWith("audio/") ? "audio" : "photo"; }
    const note = String(form.get("note") || "").trim(); if (!note && !mediaPath) { setJournalError("Add a note, photo, or voice memo first."); return; }
    const entry: JournalEntry = { id: `${Date.now()}`, memberId: journalMember, choreId: journalChore?.id, note, createdAt: new Date().toISOString(), mediaPath, mediaType, status: "pending" };
    await persist({ ...state, journalEntries: [...state.journalEntries, entry] }); setJournalChore(null);
  };
  const dictateNote = () => { const Speech = (window as typeof window & { webkitSpeechRecognition?: new () => { lang: string; start: () => void; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void } }).webkitSpeechRecognition; if (!Speech) { setJournalError("Speech-to-text is not available in this browser."); return; } const recognition = new Speech(); recognition.lang = "en-US"; recognition.onresult = (event) => { const input = document.querySelector<HTMLInputElement>("#journal-note"); if (input) input.value = event.results[0][0].transcript; }; recognition.start(); };
  const deleteJournalEntry = async (entry: JournalEntry) => { if (entry.mediaPath) await fetch(`/api/media?pathname=${encodeURIComponent(entry.mediaPath)}`, { method: "DELETE" }); await persist({ ...state, journalEntries: state.journalEntries.filter((item) => item.id !== entry.id) }); };
  const deleteExpiredMedia = async () => { const cutoff = Date.now() - state.engagementSettings.photoRetentionDays * 86400000; const expired = state.journalEntries.filter((entry) => entry.mediaPath && new Date(entry.createdAt).getTime() < cutoff); for (const entry of expired) await fetch(`/api/media?pathname=${encodeURIComponent(entry.mediaPath!)}`, { method: "DELETE" }); await persist({ ...state, journalEntries: state.journalEntries.map((entry) => expired.includes(entry) ? { ...entry, mediaPath: undefined, mediaType: undefined, note: entry.note || "Media expired according to the family retention setting." } : entry) }); };

  const suggestReward = (form: FormData) => {
    const title = String(form.get("title") || "").trim(); if (!title) return;
    persist({ ...state, rewardSuggestions: [...state.rewardSuggestions, { id: `${Date.now()}`, memberId: childHome, title, emoji: String(form.get("emoji") || "🎁"), createdAt: new Date().toISOString(), status: "pending" }] });
    setShowRewardSuggestion(false); setCelebration({ emoji: "💡", color: state.members.find((member) => member.id === childHome)?.color || "#6957d5", name: "idea", message: "Your parent will review your" }); window.setTimeout(() => setCelebration(null), 1600);
  };
  const approveRewardSuggestion = (suggestion: RewardSuggestion) => {
    const cost = Number(window.prompt(`How many stars should “${suggestion.title}” cost?`, "100")); if (!cost || cost < 1) return;
    persist({ ...state, rewards: [...state.rewards, { id: `suggested-${suggestion.id}`, title: suggestion.title, detail: "Suggested by a kid and approved by a parent", emoji: suggestion.emoji, cost }], rewardSuggestions: state.rewardSuggestions.map((item) => item.id === suggestion.id ? { ...item, status: "approved" } : item) });
  };
  const saveFunSettings = (form: FormData) => {
    const engagementSettings: EngagementSettings = { mysteryEnabled: form.get("mysteryEnabled") === "on", mysteryChance: Math.min(100, Math.max(0, Number(form.get("mysteryChance")) || 0)), questEnabled: form.get("questEnabled") === "on", questTarget: Math.max(1, Number(form.get("questTarget")) || 500), questReward: String(form.get("questReward") || "Family celebration"), mode: String(form.get("mode")) as EngagementSettings["mode"], shields: Object.fromEntries(state.members.map((member) => [member.id, Math.max(0, Number(form.get(`shield-${member.id}`)) || 0)])), photoRetentionDays: Math.max(1, Number(form.get("photoRetentionDays")) || 30), weatherZip: String(form.get("weatherZip") || "48064").replace(/\D/g, "").slice(0, 5) };
    persist({ ...state, engagementSettings }); setShowFunSettings(false);
  };
  const speakList = (memberId: string) => { const member = state.members.find((item) => item.id === memberId); const list = state.chores.filter((chore) => (chore.memberId === memberId || chore.memberIds?.includes(memberId)) && scheduledOn(chore, selectedDate) && !isComplete(chore.id)); if (typeof speechSynthesis === "undefined") return; speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(list.length ? `${member?.name}, your next jobs are: ${list.map((chore) => chore.title).join(", ")}.` : `${member?.name}, you are all done!`)); };

  return <main className={`shell ${state.accessibilitySettings.highContrast ? "highContrast" : ""} ${state.accessibilitySettings.largeText ? "largeText" : ""} ${state.accessibilitySettings.reducedMotion ? "reduceMotion" : ""}`}>
    {showLaunch && <section className="familyLaunch" aria-labelledby="check-in-title"><button className="launchParent" onClick={() => { setShowLaunch(false); if (isParent) setShowParentDashboard(true); else setShowPin(true); }}>🔒 Parent</button><div><span className="launchMark">✓</span><p className="eyebrow">{state.household}</p><h1 id="check-in-title">Who&apos;s checking in?</h1><p>Tap your color to start today&apos;s adventure.</p></div><div className="launchKids">{state.members.map((member) => <button key={member.id} style={{ "--kid-color": member.color } as React.CSSProperties} onClick={() => { setChildHome(member.id); setTab("kids"); setShowLaunch(false); }}><span>{member.celebrationEmoji}</span><i style={{ background: member.color }}>{member.initial}</i><strong>{member.name}</strong><small>Let&apos;s go!</small></button>)}</div><button className="launchFamily" onClick={() => { setTab("family"); setShowLaunch(false); }}>👨‍👩‍👧 See everyone together</button></section>}
    <header className="topbar">
      <button className="brand" onClick={() => setShowLaunch(true)}><span className="brandMark">✓</span><span>Tidy Team</span></button>
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

    <section className="weatherCard" aria-labelledby="weather-heading"><div className="weatherNow"><span>{weather?.emoji ?? (weatherError ? "🌈" : "⏳")}</span><div><p className="eyebrow">Right outside</p><h2 id="weather-heading">{weather ? `${weather.temperature}° · ${weather.label}` : weatherError ? "Weather is taking a break" : "Checking the sky…"}</h2><small>{weather ? `${weather.place} · Feels like ${weather.feelsLike}° · Wind ${weather.wind} mph` : weatherError ? "Try refreshing again in a moment." : `ZIP ${state.engagementSettings.weatherZip}`}</small></div></div>{weather && <div className="weatherForecast">{weather.forecast.map((day, index) => <article key={day.date}><span>{day.emoji}</span><div><strong>{index === 0 ? "Today" : new Date(`${day.date}T12:00:00`).toLocaleDateString([], { weekday: "short" })}</strong><small>{day.label}</small></div><b>{day.high}° <i>{day.low}°</i></b></article>)}</div>}</section>

    {state.engagementSettings.questEnabled && <section className={`familyQuest ${familyQuestPercent >= 100 ? "complete" : ""}`}><span>{familyQuestPercent >= 100 ? "🎉" : "🗺️"}</span><div><p className="eyebrow">Weekly family quest</p><h2>{familyQuestPercent >= 100 ? `${state.engagementSettings.questReward} unlocked!` : `Reach ${state.engagementSettings.questTarget} family stars`}</h2><div><i style={{ width: `${familyQuestPercent}%` }} /></div><small>{familyQuestPoints} of {state.engagementSettings.questTarget} stars · Everyone contributes</small></div></section>}

    <section className="familyCalendar" aria-labelledby="calendar-heading">
      <div className="calendarTitle"><div><p className="eyebrow">Family schedule</p><h2 id="calendar-heading">What’s happening this week?</h2></div><div className="calendarLegend">{Array.from(new Map(calendarEvents.map((event) => [event.calendar, event])).values()).map((event) => <span key={event.calendar}><i style={{ background: event.color }} />{event.emoji} {event.calendar}</span>)}</div></div>
      {calendarEvents.length > 0 ? <div className="eventRail">{calendarEvents.map((event) => { const start = new Date(event.start); const end = new Date(event.end); return <article className="eventCard" key={event.id} style={{ "--event-color": event.color } as React.CSSProperties}><div className="eventDate"><strong>{dayNames[start.getDay()]}</strong><span>{start.getDate()}</span></div><div><small>{event.calendar}</small><h3>{event.title}</h3><p>{event.allDay ? "All day" : `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}{event.location ? ` · ${event.location}` : ""}</p></div></article>; })}</div>
      : <div className="calendarEmpty"><span>🗓️</span><div><strong>{calendarConfigured === false ? "Your calendars are ready to connect" : "No events this week"}</strong><p>{calendarConfigured === false ? "Add your private Google, iCloud, or Outlook calendar feed during deployment." : "Looks like a wide-open week!"}</p></div></div>}
      {isParent && calendarSuggestions.length > 0 && <div className="calendarSuggestions"><strong>Suggested from your calendar</strong>{calendarSuggestions.map((suggestion) => <button key={suggestion} onClick={() => addCalendarSuggestion(suggestion)}>＋ {suggestion}</button>)}</div>}
    </section>

    <section className="rewardsShop" aria-labelledby="rewards-heading">
      <div className="rewardsTop"><div><p className="eyebrow">Spend your stars</p><h2 id="rewards-heading">Rewards Shop</h2><small>Stars roll over every month and never expire.</small></div>{isParent && <button className="ideaButton" onClick={() => { setEditingReward(null); setShowRewardEditor(true); }}>⚙️ Manage rewards</button>}</div>
      <div className="rewardMembers">{pointsByMember.map((member) => <button key={member.id} className={rewardMember === member.id ? "active" : ""} onClick={() => setRewardMember(member.id)}><span style={{ background: member.color }}>{member.initial}</span><strong>{member.name}</strong><b>⭐ {member.points}</b></button>)}</div>
      <div className="rewardRail">{state.rewards.map((reward) => { const eligibleKids = state.members.filter((member) => reward.memberIds?.includes(member.id)); const kidEligible = reward.scope === "family" || Boolean(rewardKid && reward.memberIds?.includes(rewardKid.id)); const limitOwner = reward.scope === "family" ? "family" : rewardKid?.id ?? ""; const remaining = rewardKid && kidEligible ? rewardRemaining(reward, limitOwner) : 0; const quantity = Math.min(remaining, Math.max(1, rewardQuantities[reward.id] ?? 1)); const total = reward.cost * quantity; const shares = Object.fromEntries(state.members.map((member, index) => [member.id, Math.floor(total / state.members.length) + (index < total % state.members.length ? 1 : 0)])); const affordable = reward.scope === "family" ? remaining > 0 && state.members.every((member) => (pointsByMember.find((item) => item.id === member.id)?.points ?? 0) >= shares[member.id]) : Boolean(rewardKid && kidEligible && rewardKid.points >= total && remaining > 0); return <article className={`rewardCard ${reward.scope === "family" ? "familyReward" : ""}`} key={reward.id}>{isParent && <button className="rewardEditButton" onClick={() => { setEditingReward(reward); setShowRewardEditor(true); }} aria-label={`Edit ${reward.title}`}>✎ Edit reward</button>}<span>{reward.emoji}</span><div><h3>{reward.title}</h3><p>{reward.detail}</p><small className="rewardScope">{reward.scope === "family" ? "👨‍👩‍👧 Everyone contributes" : `👤 For ${eligibleKids.map((member) => member.name).join(", ") || "a selected child"}`}</small>{reward.scope === "family" && <div className="contributionShares">{state.members.map((member) => <span key={member.id} style={{ color: member.color }}>{member.initial}: ⭐ {shares[member.id]}</span>)}</div>}<small className="rewardLimit">{reward.limit === "unlimited" || !reward.limit ? "Unlimited redemptions" : kidEligible ? `${remaining} of ${reward.limitQuantity ?? 1} left ${reward.limit}` : "Not available for this child"}</small></div><div className="rewardRedeem"><label>Quantity<select value={quantity} disabled={remaining === 0} onChange={(event) => setRewardQuantities({ ...rewardQuantities, [reward.id]: Number(event.target.value) })}>{Array.from({ length: Math.min(10, remaining) }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><button disabled={!affordable} onClick={() => redeemReward(reward)}>{affordable ? `Request · ⭐ ${total}` : !kidEligible ? `For ${eligibleKids.map((member) => member.name).join(" & ") || "another child"}` : remaining === 0 ? "Limit reached" : reward.scope === "family" ? "Everyone needs more stars" : `Need ⭐ ${total}`}</button></div></article>; })}</div>
      {state.redemptions.length > 0 && <details className="rewardHistory" open={isParent && state.redemptions.some((item) => item.status === "pending")}><summary>{state.redemptions.some((item) => item.status === "pending") ? "Reward requests waiting" : "Recent rewards"}</summary>{state.redemptions.slice(-8).reverse().map((item) => { const member = state.members.find((entry) => entry.id === item.memberId); return <p key={item.id}><span>{item.status === "pending" ? "⏳" : "✓"} {item.contributions ? "The family" : member?.name} requested <strong>{item.rewardTitle}</strong> for ⭐ {item.cost}{item.quantity && item.quantity > 1 ? ` · quantity ${item.quantity}` : ""}{item.contributions ? ` · ${state.members.map((child) => `${child.name} ${item.contributions?.[child.id] ?? 0}`).join(", ")}` : ""}</span>{isParent && <span className="historyActions">{item.status === "pending" && <button onClick={() => approveRedemption(item)}>Approve</button>}<button onClick={() => persist({ ...state, redemptions: state.redemptions.filter((entry) => entry.id !== item.id) })}>{item.status === "pending" ? "Decline" : "Undo"}</button></span>}</p>; })}</details>}
    </section>

    <section className="dashboard" aria-label="Chore chart">
      <div className="controls">
        <div className="tabs"><button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>My day</button><button className={tab === "kids" ? "active" : ""} onClick={() => setTab("kids")}>Kid home</button><button className={tab === "week" ? "active" : ""} onClick={() => setTab("week")}>Our week</button><button className={tab === "family" ? "active" : ""} onClick={() => setTab("family")}>Kids side by side</button></div>
        {tab === "family" ? <div className="familyRange" aria-label="Family board range"><button className={familyRange === "day" ? "active" : ""} onClick={() => setFamilyRange("day")}>Day</button><button className={familyRange === "week" ? "active" : ""} onClick={() => setFamilyRange("week")}>Week</button></div> : tab === "kids" ? <div className="memberFilters childChooser">{state.members.map((m) => <button key={m.id} className={childHome === m.id ? "active" : ""} onClick={() => setChildHome(m.id)}><span style={{ background: m.color }}>{m.initial}</span>{m.name}</button>)}</div> : <div className="memberFilters"><button className={activeMember === "all" ? "active" : ""} onClick={() => setActiveMember("all")}>Everyone</button>{state.members.map((m) => <button key={m.id} className={activeMember === m.id ? "active" : ""} onClick={() => setActiveMember(m.id)}><span style={{ background: m.color }}>{m.initial}</span>{m.name}</button>)}</div>}
        {isParent && <><button className="ideaButton" onClick={() => setShowSuggestions(true)}>💡 Chore ideas</button><button className="addButton" onClick={() => setShowAdd(true)}>＋ Add a job</button></>}
      </div>
      {tab === "today" && <div className="routineFocus" aria-label="Routine"><button className={routineFocus === "now" ? "active now" : ""} onClick={() => setRoutineFocus("now")}>⏰ Due now</button><button className={routineFocus === "all" ? "active" : ""} onClick={() => setRoutineFocus("all")}>All day</button><button className={routineFocus === "morning" ? "active" : ""} onClick={() => setRoutineFocus("morning")}>☀️ Morning</button><button className={routineFocus === "afternoon" ? "active" : ""} onClick={() => setRoutineFocus("afternoon")}>🎒 After school</button><button className={routineFocus === "evening" ? "active" : ""} onClick={() => setRoutineFocus("evening")}>🌙 Bedtime</button></div>}
      {(tab === "today" || tab === "kids") && <div className="roomMap" aria-label="Choose a room">{rooms.map((room) => <button key={room.id} className={roomFilter === room.id ? "active" : ""} onClick={() => setRoomFilter(room.id)}><span>{room.emoji}</span>{room.name}</button>)}</div>}
      <div className="weekStrip">{weekDates.map((date) => <button key={iso(date)} className={iso(date) === selectedIso ? "active" : ""} onClick={() => setSelectedDate(date)}><span>{dayNames[date.getDay()]}</span><strong>{date.getDate()}</strong>{iso(date) === iso() && <i>Today</i>}</button>)}</div>

      {tab === "today" ? <div className="choreGrid">{visibleChores.map((chore) => {
        const member = state.members.find((entry) => entry.id === chore.memberId)!; const count = chore.cadence === "flexible" ? flexibleCount(chore.id) : 0; const done = chore.cadence === "flexible" ? count >= (chore.weeklyGoal ?? 1) : isComplete(chore.id);
        const collaborators = chore.memberIds?.map((id) => state.members.find((entry) => entry.id === id)).filter(Boolean) as Member[] | undefined;
        return <article className={`choreCard ${done ? "done" : ""} ${collaborators?.length ? "teamChore" : ""}`} key={chore.id} style={{ "--member-color": collaborators?.length ? "#6957d5" : member.color } as React.CSSProperties}>
          <button className="check" onClick={() => chore.cadence === "flexible" ? recordFlexible(chore) : toggle(chore.id)} disabled={(chore.cadence === "flexible" && done) || (Boolean(collaborators?.length) && chore.teamMode === "everyone")} aria-label={collaborators?.length && chore.teamMode === "everyone" ? `Use each child button for ${chore.title}` : chore.cadence === "flexible" ? `Record ${chore.title}` : `${done ? "Mark incomplete" : "Complete"} ${chore.title}`}>{done ? "✓" : chore.cadence === "flexible" ? "+" : collaborators?.length && chore.teamMode === "everyone" ? (state.completions.find((item) => item.choreId === chore.id && item.date === selectedIso)?.participantIds?.length ?? 0) : ""}</button>{isParent && <button className="editChore" onClick={() => setEditingChore(chore)} aria-label={`Edit ${chore.title}`}>✎</button>}
          <div className="choreIcon">{chore.icon}</div><div className="choreCopy"><h2>{chore.title}</h2><p>{chore.detail}</p><span className="repeatBadge">↻ {repeatLabel(chore)}</span><span className="routineBadge">{routineLabel(chore.routine)}</span>{timeLabel(chore) && <span className={`timeBadge ${inTimeWindow(chore) ? "dueNow" : ""}`}>⏰ {timeLabel(chore)}</span>}{chore.verification && chore.verification !== "none" && <span className="verifyBadge">{chore.verification === "photo" ? "📷 Photo proof" : chore.verification === "sibling" ? "🤝 Sibling check" : "🔐 Parent approval"}</span>}{collaborators?.length && chore.teamMode === "everyone" && <div className="teamConfirmations">{collaborators.map((person) => { const joined = state.completions.find((item) => item.choreId === chore.id && item.date === selectedIso)?.participantIds?.includes(person.id); return <button key={person.id} className={joined ? "joined" : ""} onClick={() => confirmTeamPart(chore, person.id)}><i style={{ background: person.color }}>{person.initial}</i>{joined ? "Ready" : chore.roles?.[person.id] || "My part"}</button>; })}</div>}</div>
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
      : tab === "family" ? <div className="familyBoard" aria-label={`${familyRange === "day" ? "Daily" : "Weekly"} chores by child`}>
        {state.members.map((member) => { const memberChores = state.chores.filter((chore) => (chore.memberId === member.id || chore.memberIds?.includes(member.id)) && (familyRange === "week" || scheduledOn(chore, selectedDate))); const completed = memberChores.filter((chore) => familyRange === "day" ? isComplete(chore.id) : weekDates.some((date) => isComplete(chore.id, iso(date)))).length; return <section className="familyColumn" key={member.id} style={{ "--member-color": member.color } as React.CSSProperties}>
          <header><span style={{ background: member.color }}>{member.initial}</span><div><h2>{member.name}</h2><small>{completed} of {memberChores.length} started</small></div><strong>⭐ {pointsByMember.find((entry) => entry.id === member.id)?.points ?? 0}</strong></header>
          <div className="familyProgress"><i style={{ width: `${memberChores.length ? Math.round((completed / memberChores.length) * 100) : 0}%`, background: member.color }} /></div>
          <div className="familyChores">{memberChores.map((chore) => { const team = Boolean(chore.memberIds?.length); const doneToday = isComplete(chore.id); return <article className={`${doneToday ? "done" : ""} ${team ? "team" : ""}`} key={chore.id}>
            <div className="familyChoreTitle"><span>{chore.icon}</span><div><strong>{chore.title}</strong><small>{team ? `${chore.roles?.[member.id] || "Team part"} · +${chore.points + (chore.teamBonus ?? 5)} each` : `+${chore.points} stars`}</small></div>{familyRange === "day" && <button className="familyCheck" onClick={() => team && chore.teamMode === "everyone" ? confirmTeamPart(chore, member.id) : chore.cadence === "flexible" ? recordFlexible(chore) : toggle(chore.id)} aria-label={`${doneToday ? "Mark incomplete" : "Complete"} ${chore.title} for ${member.name}`}>{team && chore.teamMode === "everyone" ? state.completions.find((item) => item.choreId === chore.id && item.date === selectedIso)?.participantIds?.includes(member.id) ? "✓" : "" : doneToday ? "✓" : ""}</button>}</div>
            {familyRange === "week" && <div className="familyWeek">{weekDates.map((date) => { const allowed = scheduledOn(chore, date); const done = isComplete(chore.id, iso(date)); return <button key={iso(date)} disabled={!allowed} className={done ? "done" : ""} onClick={() => chore.cadence === "flexible" ? recordFlexible(chore, iso(date)) : toggle(chore.id, iso(date))} aria-label={`${chore.title} for ${member.name}, ${dayNames[date.getDay()]}`}><span>{dayNames[date.getDay()].slice(0, 1)}</span><b>{done ? "✓" : allowed ? "○" : "—"}</b></button>; })}</div>}
          </article>; })}{memberChores.length === 0 && <p className="familyEmpty">Nothing scheduled—enjoy the break! ☀️</p>}</div>
        </section>; })}
      </div>
      : (() => { const member = state.members.find((item) => item.id === childHome) ?? state.members[0]; const pointInfo = pointsByMember.find((item) => item.id === member.id); const chores = state.chores.filter((chore) => (chore.memberId === member.id || chore.memberIds?.includes(member.id)) && scheduledOn(chore, selectedDate)); const completed = chores.filter((chore) => isComplete(chore.id)).length; const goal = state.rewards.find((reward) => reward.id === member.rewardGoalId) ?? state.rewards[0]; const streak = Array.from({ length: 30 }, (_, index) => iso(addDays(new Date(), -index))).findIndex((date) => !state.completions.some((completion) => completion.date === date && state.chores.some((chore) => chore.id === completion.choreId && (chore.memberId === member.id || chore.memberIds?.includes(member.id))))); const streakCount = streak === -1 ? 30 : streak; return <section className="kidHome" style={{ "--kid-color": member.color } as React.CSSProperties}>
        <header><div className="kidIdentity"><span style={{ background: member.color }}>{member.initial}</span><div><p className="eyebrow">{routineFocus === "morning" ? "Good morning" : routineFocus === "evening" ? "Good evening" : "Your adventure"}</p><h2>{member.name}&apos;s day</h2></div></div><div className="kidStats"><strong>⭐ {pointInfo?.points ?? 0}</strong><strong>🔥 {streakCount} day streak</strong><strong>🛡️ {state.engagementSettings.shields[member.id] ?? 0} shields</strong><strong>{member.celebrationEmoji} {member.celebrationMessage}</strong></div></header>
        <div className="kidGoal"><span>{goal?.emoji ?? "🎁"}</span><div><small>Saving for</small><strong>{goal?.title ?? "Choose a reward"}</strong><div><i style={{ width: `${goal ? Math.min(100, Math.round(((pointInfo?.points ?? 0) / goal.cost) * 100)) : 0}%` }} /></div><p>{pointInfo?.points ?? 0} of {goal?.cost ?? 0} stars</p></div><select aria-label="Choose reward goal" value={goal?.id ?? ""} onChange={(event) => setRewardGoal(member.id, event.target.value)}>{state.rewards.map((reward) => <option key={reward.id} value={reward.id}>{reward.emoji} {reward.title}</option>)}</select></div>
        <div className="kidQuickActions"><button onClick={() => speakList(member.id)}>🔊 Read my list</button><button onClick={() => { const next = chores.find((chore) => !isComplete(chore.id)); if (next) speakChore(next); }}>👉 What&apos;s next?</button><button onClick={() => setShowRewardSuggestion(true)}>💡 Suggest a reward</button></div>
        <div className="kidBadges" style={{ "--badge-color": member.color } as React.CSSProperties}><strong>My badges</strong>{badgeCatalog.filter((badge) => badgeProgress(member.id, badge.kind) >= badge.target).slice(0, 4).map((badge) => <span key={badge.id}><i>{badge.emoji}</i> {badge.name}</span>)}<button onClick={() => setShowBadges(true)}>🏅 See all badges</button></div>
        <div className="kidChores">{chores.filter((chore) => roomFilter === "all" || roomFor(chore) === roomFilter).map((chore) => { const done = isComplete(chore.id); const teamPartDone = state.completions.find((item) => item.choreId === chore.id && item.date === selectedIso)?.participantIds?.includes(member.id); return <article className={done ? "done" : ""} key={chore.id}><button className="kidDone" onClick={() => chore.memberIds?.length && chore.teamMode === "everyone" ? confirmTeamPart(chore, member.id) : chore.cadence === "flexible" ? recordFlexible(chore) : toggle(chore.id)} aria-label={`${done ? "Undo" : "Complete"} ${chore.title}`}>{chore.memberIds?.length && chore.teamMode === "everyone" ? teamPartDone ? "✓" : "My part!" : done ? "✓" : "I’m done!"}</button><span>{chore.icon}</span><div><h3>{chore.title}</h3><p>{chore.memberIds?.length ? `${chore.roles?.[member.id] || chore.detail} · Team bonus` : chore.detail} · ⭐ +{chore.points + (chore.memberIds?.length ? chore.teamBonus ?? 5 : 0)}</p><button className="journalButton" onClick={() => { setJournalMember(member.id); setJournalChore(chore); }}>📓 Tell what I did</button></div>{state.accessibilitySettings.spokenChores && <button className="speakChore" onClick={() => speakChore(chore)} aria-label={`Read ${chore.title} aloud`}>🔊</button>}</article>; })}{chores.length === 0 && <div className="empty"><span>🌈</span><h2>All clear!</h2><p>Nothing is scheduled right now.</p></div>}</div>
        <div className="kidProgress"><strong>{completed}/{chores.length}</strong><span>jobs finished today</span><div><i style={{ width: `${chores.length ? Math.round((completed / chores.length) * 100) : 0}%` }} /></div></div>
      </section>; })()}
    </section>
    <footer><span>👆 Tap the big circle when your job is finished.</span><span>Kind helpers make happy homes! ⭐</span></footer>

    {showAdd && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowAdd(false)}><form className="modal" action={addChore}>
      <button type="button" className="close" onClick={() => setShowAdd(false)} aria-label="Close">×</button><p className="eyebrow">New assignment</p><h2>Add a chore</h2>
      <label>Chore name<input name="title" placeholder="e.g. Sweep the kitchen" autoFocus required /></label>
      <label>Helpful note<input name="detail" placeholder="e.g. After dinner" /></label>
      <div className="formRow"><label>Icon<select name="icon" defaultValue="✨"><option>✨</option><option>🪥</option><option>🛏️</option><option>🧹</option><option>🧸</option><option>🛁</option><option>💜</option><option>💙</option><option>🛠️</option><option>🧺</option><option>🪴</option><option>🐾</option><option>♻️</option></select></label><label>Points<input name="points" type="number" min="1" max="100" defaultValue="10" /></label></div>
      <div className="formRow"><label>Assigned to<select name="memberId"><option value="all">Everyone — separately</option><option value="team">🤝 Team chore — together</option>{state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Routine<select name="routine" defaultValue="anytime"><option value="morning">Morning</option><option value="afternoon">After school</option><option value="evening">Evening</option><option value="anytime">Anytime</option></select></label></div>
      <div className="formRow"><label>Available starting<input name="startTime" type="time" /></label><label>Finish by<input name="endTime" type="time" /></label></div><p className="fieldHint">Times are optional. Use one time for “after” or “before,” or both for a complete window.</p>
      <label>Room on the map<select name="area" defaultValue="family">{rooms.filter((room) => room.id !== "all").map((room) => <option key={room.id} value={room.id}>{room.emoji} {room.name}</option>)}</select></label><label className="toggleField"><input name="beforeAfter" type="checkbox" /> Offer a private before-and-after photo moment</label>
      <label>Teamwork bonus per child<input name="teamBonus" type="number" min="0" max="100" defaultValue="5" /></label><p className="fieldHint">Used only for a team chore. Every child earns the regular points plus this bonus.</p>
      <label>Team completion<select name="teamMode" defaultValue="everyone"><option value="everyone">Everyone confirms their part</option><option value="one">One completion finishes it for everyone</option></select></label><div className="teamRoles">{state.members.map((member) => <label key={member.id}>{member.name}&apos;s role<input name={`role-${member.id}`} placeholder="e.g. Gather the toys" /></label>)}</div>
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
      <div className="formRow"><label>Available starting<input name="startTime" type="time" defaultValue={editingChore.startTime ?? ""} /></label><label>Finish by<input name="endTime" type="time" defaultValue={editingChore.endTime ?? ""} /></label></div><p className="fieldHint">Times are optional. Tasks inside their window appear under “Due now.”</p>
      <label>Room on the map<select name="area" defaultValue={roomFor(editingChore)}>{rooms.filter((room) => room.id !== "all").map((room) => <option key={room.id} value={room.id}>{room.emoji} {room.name}</option>)}</select></label><label className="toggleField"><input name="beforeAfter" type="checkbox" defaultChecked={editingChore.beforeAfter} /> Offer a private before-and-after photo moment</label>
      <label>Teamwork bonus per child<input name="teamBonus" type="number" min="0" max="100" defaultValue={editingChore.teamBonus ?? 5} /></label><p className="fieldHint">Used only for a team chore. Every child earns the regular points plus this bonus.</p>
      <label>Team completion<select name="teamMode" defaultValue={editingChore.teamMode ?? "everyone"}><option value="everyone">Everyone confirms their part</option><option value="one">One completion finishes it for everyone</option></select></label><div className="teamRoles">{state.members.map((member) => <label key={member.id}>{member.name}&apos;s role<input name={`role-${member.id}`} defaultValue={editingChore.roles?.[member.id] ?? ""} placeholder="e.g. Gather the toys" /></label>)}</div>
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
      <fieldset className="personEditor pointRules"><legend>🔔 Notifications</legend><label className="toggleField"><input name="notifications" type="checkbox" defaultChecked={state.notificationSettings.enabled} /> Allow notifications on this device</label><div className="notificationChoices"><label><input name="notifyEvening" type="checkbox" defaultChecked={state.notificationSettings.evening} /> Evening chores</label><label><input name="notifyRewards" type="checkbox" defaultChecked={state.notificationSettings.rewards} /> Reward requests</label><label><input name="notifyCalendar" type="checkbox" defaultChecked={state.notificationSettings.calendar} /> Calendar reminders</label></div><div className="formRow"><label>Quiet time starts<input name="quietStart" type="time" defaultValue={state.notificationSettings.quietStart} /></label><label>Quiet time ends<input name="quietEnd" type="time" defaultValue={state.notificationSettings.quietEnd} /></label></div><div className="notificationChoices">{state.members.map((member) => <label key={member.id}><input name={`notify-${member.id}`} type="checkbox" defaultChecked={state.notificationSettings.memberIds.includes(member.id)} /> {member.name}</label>)}</div><p className="fieldHint">Notifications can be turned off here at any time. Quiet hours suppress family reminders.</p></fieldset>
      <fieldset className="personEditor pointRules"><legend>♿ Accessibility & feedback</legend><div className="accessibilityChoices"><label><input name="largeText" type="checkbox" defaultChecked={state.accessibilitySettings.largeText} /> Larger text</label><label><input name="highContrast" type="checkbox" defaultChecked={state.accessibilitySettings.highContrast} /> High contrast</label><label><input name="reducedMotion" type="checkbox" defaultChecked={state.accessibilitySettings.reducedMotion} /> Reduce motion</label><label><input name="spokenChores" type="checkbox" defaultChecked={state.accessibilitySettings.spokenChores} /> Read chores aloud</label><label><input name="sounds" type="checkbox" defaultChecked={state.accessibilitySettings.sounds} /> Completion sounds</label></div></fieldset>
      <button className="saveButton" type="submit">Save team</button>
    </form></div>}

    {showParentDashboard && isParent && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowParentDashboard(false)}><section className="modal parentDashboard" role="dialog" aria-modal="true" aria-labelledby="parent-dashboard-title">
      <button type="button" className="close" onClick={() => setShowParentDashboard(false)} aria-label="Close">×</button><p className="eyebrow">Grown-ups only</p><h2 id="parent-dashboard-title">Parent dashboard</h2>
      <div className="parentOverview"><article><span>✓</span><strong>{weekStats.completed}/{weekStats.possible}</strong><small>chores this week</small></article><article><span>⏳</span><strong>{state.redemptions.filter((item) => item.status === "pending").length}</strong><small>reward requests</small></article><article><span>🗓️</span><strong>{calendarConfigured ? calendarEvents.length : "—"}</strong><small>{calendarConfigured ? "events this week" : "calendar not connected"}</small></article></div>
      <section className="todayGlance"><div><p className="eyebrow">Today at a glance</p><h3>{state.engagementSettings.mode === "normal" ? "The family rhythm is on" : `${state.engagementSettings.mode === "vacation" ? "Vacation" : "Kid visit"} mode is active`}</h3></div><span>🌙 {state.chores.filter((chore) => chore.routine === "evening" && scheduledOn(chore, new Date()) && !isComplete(chore.id, iso())).length} bedtime jobs left</span><span>⏳ {state.completions.filter((item) => item.status === "pending").length + state.redemptions.filter((item) => item.status === "pending").length} approvals</span><span>🗓️ {calendarEvents.filter((event) => iso(new Date(event.start)) === iso(addDays(new Date(), 1))).length} events tomorrow</span></section>
      <div className="parentBalances">{pointsByMember.map((member) => <article key={member.id}><span style={{ background: member.color }}>{member.initial}</span><div><strong>{member.name}</strong><small>Earned {member.earned} · Adjusted {member.adjusted >= 0 ? "+" : ""}{member.adjusted} · Spent {member.spent}</small></div><b>⭐ {member.points}</b><div className="quickPoints"><button onClick={() => adjustPoints(member.id, 5)}>+5</button><button onClick={() => adjustPoints(member.id, -5)}>−5</button></div></article>)}</div>
      {state.completions.some((item) => item.status === "pending") && <div className="approvalQueue"><strong>Chores waiting for approval</strong>{state.completions.filter((item) => item.status === "pending").map((item) => { const chore = state.chores.find((entry) => entry.id === item.choreId); return <article key={item.id || `${item.choreId}-${item.date}`}><span>{item.proofPath ? "📷" : "⏳"} {chore?.title || "Chore"} · {item.date}</span><span><button onClick={() => approveCompletion(item)}>Approve points</button><button onClick={() => persist({ ...state, completions: state.completions.filter((entry) => entry !== item) })}>Decline</button></span></article>; })}</div>}
      {state.rewardSuggestions.some((item) => item.status === "pending") && <div className="approvalQueue"><strong>Kid-created reward ideas</strong>{state.rewardSuggestions.filter((item) => item.status === "pending").map((item) => <article key={item.id}><span>{item.emoji} {state.members.find((member) => member.id === item.memberId)?.name}: {item.title}</span><span><button onClick={() => approveRewardSuggestion(item)}>Set cost & approve</button><button onClick={() => persist({ ...state, rewardSuggestions: state.rewardSuggestions.filter((entry) => entry.id !== item.id) })}>Decline</button></span></article>)}</div>}
      <details className="missedReview"><summary>Missed yesterday · {missedYesterday.length}</summary>{missedYesterday.slice(0, 20).map((chore) => <p key={chore.id}><span>{chore.icon} {chore.title}</span><small>{state.members.find((member) => member.id === chore.memberId)?.name}</small></p>)}</details>
      <section className="activityLedger"><div><strong>Family activity</strong><input aria-label="Search activity" placeholder="Search chores, rewards, or names" value={activitySearch} onChange={(event) => setActivitySearch(event.target.value)} /></div>{activityLedger.filter((item) => item.text.toLowerCase().includes(activitySearch.toLowerCase())).slice(0, 30).map((item) => <p key={item.id}><span>{item.kind}</span><span>{item.text}</span><time>{item.date}</time></p>)}</section>
      <section className="familyJournal"><div><strong>Private family journal</strong><small>Notes and media require Parent Mode to view or remove.</small><button className="cleanupMedia" onClick={deleteExpiredMedia}>Delete media older than {state.engagementSettings.photoRetentionDays} days</button></div>{state.journalEntries.length === 0 ? <p className="journalEmpty">No journal moments yet.</p> : state.journalEntries.slice().reverse().map((entry) => { const member = state.members.find((item) => item.id === entry.memberId); const chore = state.chores.find((item) => item.id === entry.choreId); return <article key={entry.id}><span style={{ background: member?.color }}>{member?.initial}</span><div><strong>{member?.name} {chore ? `· ${chore.title}` : ""}</strong><p>{entry.note || (entry.mediaType === "audio" ? "Voice memo" : "Progress photo")}</p><small>{new Date(entry.createdAt).toLocaleString()} · {entry.status}</small></div><div className="journalActions">{entry.mediaPath && <a href={`/api/media?pathname=${encodeURIComponent(entry.mediaPath)}`} target="_blank" rel="noreferrer">{entry.mediaType === "audio" ? "▶ Listen" : "🖼 View / download"}</a>}{entry.status === "pending" && <button onClick={() => persist({ ...state, journalEntries: state.journalEntries.map((item) => item.id === entry.id ? { ...item, status: "approved" } : item) })}>Approve</button>}<button onClick={() => deleteJournalEntry(entry)}>Delete</button></div></article>; })}</section>
      <div className="dashboardRules"><strong>Point rules</strong><span>{state.pointPolicy.reset === "never" ? "No automatic reset" : `Reset ${state.pointPolicy.reset}`}</span><span>{state.pointPolicy.dailyEarnLimit > 0 ? `${state.pointPolicy.dailyEarnLimit} points/day maximum` : "No daily limit"}</span><span>{state.pointPolicy.maxBalance > 0 ? `${state.pointPolicy.maxBalance} maximum balance` : "No balance limit"}</span></div>
      <div className="parentActions"><button onClick={() => { setShowParentDashboard(false); setShowPeople(true); }}>👨‍👩‍👧 Edit family, reactions & points</button><button onClick={() => { setShowParentDashboard(false); setShowAdd(true); }}>＋ Add a chore</button><button onClick={() => { setShowParentDashboard(false); setShowSuggestions(true); }}>💡 Browse chore ideas</button><button onClick={() => { setShowParentDashboard(false); setShowRewardEditor(true); }}>🎁 Manage rewards</button><button onClick={() => { setShowParentDashboard(false); setShowFunSettings(true); }}>🎉 Fun, quests & family modes</button></div>
      <p className="calendarAdminStatus"><strong>Calendar:</strong> {calendarConfigured ? `${calendarEvents.length} events loaded for this week.` : "Ready for private Google, iCloud, or Outlook feed links."}</p><button className="passkeySetup" onClick={openCalendarSettings}>🗓️ Connect & manage calendars</button>
      {biometricSupported && <button className="passkeySetup" onClick={enrollPasskey}>👆 {passkeyAvailable ? "Add another trusted thumbprint" : "Set up thumbprint / Face ID"}</button>}{pinError && <p className="pinError" role="alert">{pinError}</p>}<button className="lockParent" onClick={lockParent}>🔒 Lock Parent Mode</button>
    </section></div>}

    {showFunSettings && isParent && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowFunSettings(false)}><form className="modal" action={saveFunSettings}><button type="button" className="close" onClick={() => setShowFunSettings(false)} aria-label="Close">×</button><p className="eyebrow">Parent controls</p><h2>Fun & family modes</h2><fieldset className="personEditor"><legend>🌤️ Family weather</legend><label>Home ZIP code<input name="weatherZip" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} defaultValue={state.engagementSettings.weatherZip} /></label><p className="fieldHint">Used only to request your local weather. The five-digit ZIP can be changed here anytime.</p></fieldset><fieldset className="personEditor"><legend>🎁 Surprise moments</legend><label className="toggleField"><input name="mysteryEnabled" type="checkbox" defaultChecked={state.engagementSettings.mysteryEnabled} /> Enable occasional mystery rewards</label><label>Chance after an approved routine chore<input name="mysteryChance" type="number" min="0" max="100" defaultValue={state.engagementSettings.mysteryChance} /></label><p className="fieldHint">A small percentage keeps surprises special. Set to 0 or switch it off anytime.</p></fieldset><fieldset className="personEditor"><legend>🗺️ Weekly family quest</legend><label className="toggleField"><input name="questEnabled" type="checkbox" defaultChecked={state.engagementSettings.questEnabled} /> Show the shared quest</label><div className="formRow"><label>Family-star goal<input name="questTarget" type="number" min="1" defaultValue={state.engagementSettings.questTarget} /></label><label>Celebration reward<input name="questReward" defaultValue={state.engagementSettings.questReward} /></label></div></fieldset><fieldset className="personEditor"><legend>🛡️ Gentle streaks</legend><div className="teamRoles">{state.members.map((member) => <label key={member.id}>{member.name}&apos;s shields<input name={`shield-${member.id}`} type="number" min="0" max="20" defaultValue={state.engagementSettings.shields[member.id] ?? 0} /></label>)}</div></fieldset><fieldset className="personEditor"><legend>🧳 Family mode</legend><label>Current schedule<select name="mode" defaultValue={state.engagementSettings.mode}><option value="normal">Normal routine</option><option value="vacation">Vacation — protect streaks</option><option value="visit">Kid visit — show travel rhythm</option></select></label><label>Private photos delete after<input name="photoRetentionDays" type="number" min="1" max="365" defaultValue={state.engagementSettings.photoRetentionDays} /></label><p className="fieldHint">Days to keep before-and-after or proof photos. Photos remain parent-protected.</p></fieldset><button className="saveButton" type="submit">Save fun settings</button></form></div>}

    {showRewardSuggestion && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowRewardSuggestion(false)}><form className="modal pinModal" action={suggestReward}><button type="button" className="close" onClick={() => setShowRewardSuggestion(false)} aria-label="Close">×</button><p className="eyebrow">Dream it up</p><h2>Suggest a reward</h2><p className="modalIntro">Your idea goes to the Parent Dashboard. A parent chooses the star cost.</p><label>Reward idea<input name="title" placeholder="A fun family activity" maxLength={60} required /></label><label>Reward symbol<select name="emoji" defaultValue="🎁">{rewardEmojiChoices.map((choice) => <option key={choice.emoji} value={choice.emoji}>{choice.emoji} {choice.name}</option>)}</select></label><button className="saveButton" type="submit">Send my idea</button></form></div>}

    {showBadges && (() => { const member = state.members.find((item) => item.id === childHome) ?? state.members[0]; const unlocked = badgeCatalog.filter((badge) => badgeProgress(member.id, badge.kind) >= badge.target).length; return <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowBadges(false)}><section className="modal badgeCabinet" style={{ "--badge-color": member.color } as React.CSSProperties}><button type="button" className="close" onClick={() => setShowBadges(false)} aria-label="Close">×</button><div className="badgeCabinetTitle"><span style={{ background: member.color }}>{member.initial}</span><div><p className="eyebrow">Keep exploring</p><h2>{member.name}&apos;s Badge Cabinet</h2></div></div><p className="modalIntro">{unlocked} of {badgeCatalog.length} badges unlocked. Every badge celebrates personal growth—there is no sibling ranking.</p><div className="badgeGrid">{badgeCatalog.map((badge) => { const progress = badgeProgress(member.id, badge.kind); const earned = progress >= badge.target; return <article key={badge.id} className={earned ? "earned" : "locked"}><span className="badgeMedallion"><em>{badge.emoji}</em>{earned ? <b>{member.initial}</b> : <small>🔒</small>}</span><div><h3>{badge.name}</h3><p>{badge.detail}</p><div><i style={{ width: `${Math.min(100, Math.round(progress / badge.target * 100))}%` }} /></div><small>{earned ? `Earned by ${member.name}` : `${Math.min(progress, badge.target)} of ${badge.target}`}</small></div></article>; })}</div></section></div>; })()}

    {showCalendarSettings && isParent && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowCalendarSettings(false)}><section className="modal calendarSettings">
      <button type="button" className="close" onClick={() => setShowCalendarSettings(false)} aria-label="Close">×</button><p className="eyebrow">Private family schedule</p><h2>Connect calendars</h2><p className="modalIntro">Paste a private iCal/ICS subscription link from Google Calendar, Apple Calendar, or Outlook. Links stay on the protected server and are never sent to the public page.</p>
      <form action={addCalendarFeed} className="calendarFeedForm"><label>Calendar name<input name="name" placeholder="School, soccer, appointments…" required /></label><label>Private iCal / ICS link<input name="url" type="text" inputMode="url" placeholder="https://… or webcal://…" required /></label><div className="calendarCustomRow"><label>Icon<input name="emoji" defaultValue="🗓️" maxLength={8} /></label><label>Category<input name="type" defaultValue="Family" placeholder="Family, School, Sports…" maxLength={30} /></label><label>Color<input name="color" type="color" defaultValue="#e76f35" /></label></div>{calendarError && <p className="pinError" role="alert">{calendarError}</p>}<button className="saveButton" type="submit">Connect calendar</button></form>
      {calendarFeeds.length > 0 && <div className="connectedFeeds"><strong>Connected calendars · tap one to customize</strong>{calendarFeeds.map((feed) => <details key={feed.id}><summary><i style={{ background: feed.color }} /><span>{feed.emoji} {feed.name}<small>{feed.type} · {feed.visible ? "shown" : "hidden"}</small></span></summary><form action={updateCalendarFeed} className="editCalendarFeed"><input name="id" type="hidden" value={feed.id} /><label>Name<input name="name" defaultValue={feed.name} required /></label><div className="calendarCustomRow"><label>Icon<input name="emoji" defaultValue={feed.emoji || "🗓️"} maxLength={8} /></label><label>Category<input name="type" defaultValue={feed.type} maxLength={30} /></label><label>Color<input name="color" type="color" defaultValue={feed.color} /></label></div><label className="toggleField"><input name="visible" type="checkbox" defaultChecked={feed.visible !== false} /> Show events from this calendar</label><div className="calendarFeedActions"><button type="submit">Save changes</button><button type="button" onClick={() => removeCalendarFeed(feed.id)}>Remove calendar</button></div></form></details>)}</div>}
    </section></div>}

    {proofChore && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setProofChore(null)}><form className="modal" action={submitPhotoProof}>
      <button type="button" className="close" onClick={() => setProofChore(null)} aria-label="Close">×</button><p className="eyebrow">Photo verification</p><h2>Show the finished job</h2><p className="modalIntro">Take or choose a photo for “{proofChore.title}.” A parent will approve the points.</p><label>Completion photo<input name="file" type="file" accept="image/*" capture="environment" required /></label>{!isParent && <p className="pinError">Unlock Parent Mode before securely uploading this photo.</p>}{proofError && <p className="pinError" role="alert">{proofError}</p>}<button className="saveButton" type="submit" disabled={!isParent}>Upload for approval</button>
    </form></div>}

    {showSuggestions && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowSuggestions(false)}><section className="modal suggestionModal" role="dialog" aria-modal="true" aria-labelledby="suggestion-title">
      <button type="button" className="close" onClick={() => setShowSuggestions(false)} aria-label="Close">×</button><p className="eyebrow">Ready-to-assign ideas</p><h2 id="suggestion-title">Chore library</h2>
      <p className="modalIntro">Choose the child, then tap any idea to add it. Start with tasks they can do safely and add responsibility as their skills grow.</p>
      <label>Assign ideas to<select value={suggestionMember} onChange={(event) => setSuggestionMember(event.target.value)}><option value="all">Everyone</option>{state.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <div className="suggestionList">{suggestedChores.map((suggestion) => <button type="button" key={suggestion.title} onClick={() => addSuggestion(suggestion)}><span>{suggestion.icon}</span><span><strong>{suggestion.title}</strong><small>{suggestion.detail} · {suggestion.team ? "team chore" : `${routineLabel(suggestion.routine)} · ${repeatLabel({ ...suggestion, id: "idea", memberId: "idea" })}`}</small></span><b>＋</b></button>)}</div>
    </section></div>}

    {showRewardEditor && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowRewardEditor(false)}><form className="modal" action={addReward} key={editingReward?.id ?? "new"}>
      <button type="button" className="close" onClick={() => { setEditingReward(null); setShowRewardEditor(false); }} aria-label="Close">×</button><p className="eyebrow">Make it your own</p><h2>{editingReward ? "Edit reward" : "Add a reward"}</h2>
      <label>Reward name<input name="title" placeholder="e.g. Pick Friday's movie" defaultValue={editingReward?.title ?? ""} autoFocus required /></label>
      <label>What they earn<input name="detail" placeholder="A short description" defaultValue={editingReward?.detail ?? ""} /></label>
      <div className="formRow"><label>Reward symbol<select name="emoji" defaultValue={editingReward?.emoji ?? "🎁"}>{rewardEmojiChoices.map((choice) => <option key={choice.emoji} value={choice.emoji}>{choice.emoji} {choice.name}</option>)}</select></label><label>Star cost<input name="cost" type="number" min="1" max="10000" defaultValue={editingReward?.cost ?? 100} /></label></div>
      <label>Who contributes?<select name="scope" defaultValue={editingReward?.scope ?? "individual"}><option value="individual">One child redeems with their own stars</option><option value="family">All children contribute an equal share</option></select></label><p className="fieldHint">Family rewards split the total cost as evenly as possible across Charli, Andy, and Henry.</p>
      <fieldset className="rewardEligibility"><legend>Who can redeem this reward?</legend>{state.members.map((member) => <label key={member.id}><input name={`reward-member-${member.id}`} type="checkbox" defaultChecked={!editingReward?.memberIds?.length || editingReward.memberIds.includes(member.id)} /><span style={{ background: member.color }}>{member.initial}</span>{member.name}</label>)}<p>Family-contribution rewards always include everyone.</p></fieldset>
      <div className="formRow"><label>Redemption limit<select name="limit" defaultValue={editingReward?.limit ?? "unlimited"}><option value="unlimited">Unlimited</option><option value="daily">Per day</option><option value="weekly">Per week</option><option value="monthly">Per month</option></select></label><label>Quantity allowed<input name="limitQuantity" type="number" min="1" max="100" defaultValue={editingReward?.limitQuantity ?? 1} /></label></div>
      <button className="saveButton" type="submit">{editingReward ? "Save reward changes" : "Add to the shop"}</button>
      {state.rewards.length > 0 && <div className="manageRewards"><strong>Current rewards</strong>{state.rewards.map((reward) => <div key={reward.id}><span>{reward.emoji} {reward.title} · ⭐ {reward.cost} · {reward.scope === "family" ? "family contribution" : "individual"} · {reward.limit === "unlimited" || !reward.limit ? "unlimited" : `${reward.limitQuantity ?? 1}/${reward.limit}`}</span><span><button type="button" onClick={() => setEditingReward(reward)}>Edit</button><button type="button" onClick={() => persist({ ...state, rewards: state.rewards.filter((item) => item.id !== reward.id) })}>Remove</button></span></div>)}</div>}
    </form></div>}

    {journalChore && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setJournalChore(null)}><form className="modal journalModal" action={submitJournal}><button type="button" className="close" onClick={() => setJournalChore(null)} aria-label="Close">×</button><p className="eyebrow">My proud moment</p><h2>{journalChore.icon} {journalChore.title}</h2><p className="modalIntro">Tell your family what you did. A note is enough—photos and voice memos are always optional.</p><label>My note<input id="journal-note" name="note" placeholder="I was proud because…" maxLength={500} /></label><button className="dictateButton" type="button" onClick={dictateNote}>🎙️ Say my note</button><div className="journalMediaChoices"><label>📷 Optional progress photo<input name="photo" type="file" accept="image/*" capture="environment" /></label><label>🎙️ Optional voice memo<input name="audio" type="file" accept="audio/*" capture="user" /></label></div><p className="fieldHint">Choose either a photo or voice memo. Private media is stored only from a trusted family device and appears in the Parent Dashboard.</p>{journalError && <p className="pinError" role="alert">{journalError}</p>}<button className="saveButton" type="submit">Save my proud moment</button></form></div>}

    {showPin && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowPin(false)}><form className="modal pinModal" action={unlockParent}>
      <button type="button" className="close" onClick={() => setShowPin(false)} aria-label="Close">×</button><p className="eyebrow">Grown-ups only</p><h2>Unlock Parent Mode</h2><p className="modalIntro">Enter the four-digit family PIN to edit chores, manage rewards, or approve redemptions.</p>
      <label>Parent PIN<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" autoFocus required /></label>{pinError && <p className="pinError" role="alert">{pinError}</p>}<button className="saveButton" type="submit">Unlock</button>
      {passkeyAvailable && biometricSupported && <button className="passkeyButton" type="button" onClick={unlockWithPasskey}>👆 Use thumbprint, Face ID, or device passkey</button>}
    </form></div>}

    {celebration && <div className="celebration" aria-live="polite" style={{ "--celebrate": celebration.color } as React.CSSProperties}><div className="burst"><i>✦</i><i>★</i><span>{celebration.emoji}</span><i>✦</i><i>★</i></div><strong>{celebration.message} {celebration.name}!</strong></div>}
  </main>;
}
