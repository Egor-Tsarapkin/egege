"use client";

import type { Provider, User } from "@supabase/supabase-js";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ExamAttempt } from "./exam-station";

const TypingTrainer = lazy(() => import("./typing-trainer"));
const TheorySpace = lazy(() => import("./theory-space"));
const ExamStation = lazy(() => import("./exam-station"));

type Section = "home" | "tasks" | "variants" | "theory" | "game" | "trainer" | "dashboard" | "profile";
type GateSection = Extract<Section, "theory" | "game" | "trainer" | "dashboard">;
type Difficulty = "Базовый" | "Средний" | "Высокий";
type Activity = Record<string, number>;
type Theme = "dark" | "light";
type Accent = "lime" | "blue" | "red" | "pink" | "beige";
type Reaction = "xp" | "hearts" | "letters" | "fire" | "fireworks" | "random";
type BurstReaction = Exclude<Reaction, "random">;
type Preferences = {
  theme: Theme;
  accent: Accent;
  reaction: Reaction;
};

type Task = {
  id: string;
  number: number;
  difficulty: Difficulty;
  source: string;
  title: string;
  note?: string;
  html: string;
  answer: string;
  files: Array<{ name: string; href: string; meta: string }>;
};

type TaskSourceKind = "official" | "author" | "kege";

type Variant = {
  kim: string;
  title: string;
  taskCount: number;
  sourceUrl: string;
};

type VariantYearGroup = {
  year: string;
  official: Variant[];
  teachers: Variant[];
};

function groupVariants(variants: Variant[]): VariantYearGroup[] {
  const boundaries = [
    { year: "2025/26", start: 0, end: 77, officialEnd: 12 },
    { year: "2024/25", start: 77, end: 135, officialEnd: 91 },
    { year: "2023/24", start: 135, end: 196, officialEnd: 145 },
  ];

  return boundaries.map(({ year, start, officialEnd }) => ({
    year,
    official: variants.slice(start, Math.min(officialEnd, variants.length)),
    teachers: [],
  })).filter((group) => group.official.length);
}

function getDownloadHref(href: string) {
  if (!href.startsWith("/api/task-file?")) return href;
  try {
    const source = new URLSearchParams(href.split("?")[1] ?? "").get("source");
    return source && new URL(source).hostname === "kompege.ru" ? source : href;
  } catch {
    return href;
  }
}

type ExamVariantData = {
  kim: string;
  title: string;
  sourceUrl: string;
  tasks: Array<{
    id: string;
    number: number;
    html: string;
    table: { cols: number; rows: number };
    files: Array<{ name: string; href: string }>;
    answer?: string;
  }>;
};

type Burst = {
  id: number;
  x: number;
  y: number;
  reaction: BurstReaction;
};

type LeaderboardScope = "all" | "friends";
type CommunityProfile = {
  userId: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  xp: number;
  correctCount: number;
  protectionActiveUntil: number;
};
type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  xp: number;
  correctCount: number;
  isCurrent: boolean;
  isFriend: boolean;
};
type FriendEntry = {
  userId: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  xp: number;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing" | "friend";
};
type CommunityPayload = {
  profile: CommunityProfile;
  leaderboard: LeaderboardEntry[];
  friends: FriendEntry[];
  completedTaskIds: string[];
  activity: Activity;
  protection: { active: boolean; until: number };
  view: LeaderboardScope;
};
type ClaimResult = {
  status: "awarded" | "duplicate" | "too_fast" | "protected";
  message: string;
  completed: boolean;
  xp?: number;
  correctCount?: number;
  dateKey?: string;
  retryAfter?: number;
};

const PREFERENCES_KEY = "egege-preferences-v1";
const EXAM_HISTORY_KEY = "egege-exam-history-v1";
const PREMIUM_KEY = "egege-premium-demo-v1";
const PENDING_ACCESS_KEY = "egege-pending-access-v1";
const sectionPaths: Record<Section, string> = {
  home: "/",
  tasks: "/tasks",
  variants: "/variants",
  theory: "/theory",
  game: "/game",
  trainer: "/trainer",
  dashboard: "/dashboard",
  profile: "/profile",
};

function sectionFromPath(pathname: string): Section {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  return (Object.entries(sectionPaths).find(([, path]) => path === `/${segment}`)?.[0] as Section) ??
    "home";
}
const XP_PER_ANSWER = 10;
const defaultPreferences: Preferences = {
  theme: "dark",
  accent: "lime",
  reaction: "xp",
};

const burstParticles = [
  { x: -92, y: -104, r: -18, label: "XP" },
  { x: -55, y: -145, r: 12, label: "+10" },
  { x: -20, y: -112, r: -7, label: "•" },
  { x: 20, y: -160, r: 9, label: "XP" },
  { x: 54, y: -118, r: 18, label: "+10" },
  { x: 92, y: -88, r: -13, label: "•" },
  { x: -112, y: -58, r: 22, label: "•" },
  { x: 112, y: -45, r: -20, label: "XP" },
  { x: -70, y: -38, r: -10, label: "+10" },
  { x: 72, y: -24, r: 12, label: "•" },
];

const heartParticles = burstParticles.map((particle, index) => ({
  ...particle,
  label: index % 3 === 0 ? "♡" : "♥",
}));

const letterParticles = burstParticles.map((particle, index) => ({
  ...particle,
  label: ["А", "Q", "Ж", "E", "Ю", "Z", "Б", "G", "Я", "R"][index],
}));

const fireParticles = burstParticles.map((particle, index) => ({
  ...particle,
  label: index % 4 === 0 ? "·" : "🔥",
}));

const fireworkParticles = burstParticles.map((particle, index) => ({
  ...particle,
  label: index % 3 === 0 ? "✦" : "•",
}));

const randomReactions: BurstReaction[] = ["xp", "hearts", "letters", "fire", "fireworks"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function communityRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const client = await getSupabaseBrowserClient();
  if (!client) throw new Error("Авторизация не подключена.");
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Нужно войти в аккаунт.");

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Не удалось выполнить действие.");
  return body;
}

function DatabaseIcon() {
  return (
    <span className="dock-icon database-icon" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function VariantsIcon() {
  return (
    <span className="dock-icon variants-icon" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function DashboardIcon() {
  return (
    <span className="dock-icon dashboard-icon" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function TheoryIcon() {
  return (
    <span className="dock-icon theory-icon" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

function GameIcon() {
  return (
    <span className="dock-icon game-icon" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function TrainerIcon() {
  return (
    <span className="dock-icon trainer-icon" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
    </span>
  );
}

function AccessBadge({
  premium = false,
  compact = false,
}: {
  premium?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={`access-lock ${premium ? "is-premium" : ""} ${compact ? "is-compact" : ""}`}
      aria-hidden="true"
    >
      <span className="chain-strand chain-forward">
        {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
      </span>
      {premium && (
        <span className="chain-strand chain-reverse">
          {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
        </span>
      )}
      <span className="chain-padlock"><i /></span>
    </span>
  );
}

function repelAccessLock(event: React.PointerEvent<HTMLButtonElement>) {
  if (window.matchMedia("(hover: none)").matches) return;
  const lock = event.currentTarget.querySelector<HTMLElement>(".chain-padlock");
  if (!lock) return;
  const box = lock.getBoundingClientRect();
  const deltaX = box.left + box.width / 2 - event.clientX;
  const deltaY = box.top + box.height / 2 - event.clientY;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const strength = Math.max(0, 1 - distance / 105) * 18;
  lock.style.setProperty("--lock-away-x", `${(deltaX / distance) * strength}px`);
  lock.style.setProperty("--lock-away-y", `${(deltaY / distance) * strength}px`);
  lock.style.setProperty("--lock-tilt", `${(deltaX / distance) * 9}deg`);
}

function resetAccessLock(event: React.PointerEvent<HTMLButtonElement>) {
  const lock = event.currentTarget.querySelector<HTMLElement>(".chain-padlock");
  lock?.style.removeProperty("--lock-away-x");
  lock?.style.removeProperty("--lock-away-y");
  lock?.style.removeProperty("--lock-tilt");
}

function Dock({
  navigate,
  isRegistered,
  isPremium,
  rattlingSection,
}: {
  navigate: (section: Section) => void;
  isRegistered: boolean;
  isPremium: boolean;
  rattlingSection: GateSection | null;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  const dockFrame = useRef<number | null>(null);
  const [scales, setScales] = useState([1, 1, 1]);

  const reactToPointer = (clientX: number) => {
    if (dockFrame.current !== null || window.matchMedia("(hover: none)").matches) return;
    dockFrame.current = requestAnimationFrame(() => {
      dockFrame.current = null;
      const buttons = dockRef.current?.querySelectorAll<HTMLButtonElement>(".dock-item");
      if (!buttons) return;
      setScales(
        Array.from(buttons).map((button) => {
          const box = button.getBoundingClientRect();
          const distance = Math.abs(clientX - (box.left + box.width / 2));
          return 1 + Math.max(0, 1 - distance / 140) * 0.18;
        }),
      );
    });
  };

  const items: Array<{
    section: Section;
    label: string;
    icon: React.ReactNode;
    locked?: boolean;
    premium?: boolean;
  }> = [
    { section: "tasks", label: "База заданий", icon: <DatabaseIcon /> },
    { section: "variants", label: "Варианты", icon: <VariantsIcon /> },
    {
      section: "theory",
      label: "Теория",
      icon: <TheoryIcon />,
      locked: !isRegistered || !isPremium,
      premium: true,
    },
    {
      section: "game",
      label: "Игра",
      icon: <GameIcon />,
      locked: !isRegistered,
    },
    {
      section: "trainer",
      label: "Тренажёр",
      icon: <TrainerIcon />,
      locked: !isRegistered,
    },
    {
      section: "dashboard",
      label: "Дашборд",
      icon: <DashboardIcon />,
      locked: !isRegistered,
    },
  ];

  return (
    <div
      className="dock"
      ref={dockRef}
      onPointerMove={(event) => reactToPointer(event.clientX)}
      onPointerLeave={() => setScales(items.map(() => 1))}
      aria-label="Основная навигация"
    >
      {items.map((item, index) => (
        <button
          className={`dock-item ${item.locked ? "is-locked" : ""} ${
            rattlingSection === item.section ? "is-rattling" : ""
          }`}
          style={{ "--dock-scale": scales[index] ?? 1 } as React.CSSProperties}
          onClick={() => navigate(item.section)}
          onPointerMove={item.locked ? repelAccessLock : undefined}
          onPointerLeave={item.locked ? resetAccessLock : undefined}
          aria-label={
            item.locked
              ? `${item.label}: ${item.premium ? "нужны регистрация и премиум" : "нужна регистрация"}`
              : item.label
          }
          key={item.section}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.locked && <AccessBadge premium={item.premium} />}
        </button>
      ))}
    </div>
  );
}

function AppHeader({
  section,
  navigate,
  isRegistered,
  isPremium,
  rattlingSection,
  profile,
}: {
  section: Section;
  navigate: (section: Section) => void;
  isRegistered: boolean;
  isPremium: boolean;
  rattlingSection: GateSection | null;
  profile: React.ReactNode;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const navItems: Array<{
    section: Exclude<Section, "home">;
    label: string;
    locked?: boolean;
    premium?: boolean;
  }> = [
    { section: "tasks", label: "База" },
    { section: "variants", label: "Варианты" },
    {
      section: "theory",
      label: "Теория",
      locked: !isRegistered || !isPremium,
      premium: true,
    },
    { section: "game", label: "Игра", locked: !isRegistered },
    { section: "trainer", label: "Тренажёр", locked: !isRegistered },
    { section: "dashboard", label: "Дашборд", locked: !isRegistered },
  ];

  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>(".nav-active")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [section]);

  return (
    <header className="topbar">
      <button className="wordmark" onClick={() => navigate("home")}>
        <span className="mini-mark">Е</span>
        <span className="wordmark-name"><b>EGE</b>GE</span>
        <small className="wordmark-by">by Tsarapkin</small>
      </button>
      <div className="topbar-actions">
        <nav ref={navRef} aria-label="Разделы">
          {navItems.map((item) => (
            <button
              className={`${section === item.section ? "nav-active" : ""} ${
                item.locked ? "is-locked" : ""
              } ${rattlingSection === item.section ? "is-rattling" : ""}`}
              onClick={() => navigate(item.section)}
              onPointerMove={item.locked ? repelAccessLock : undefined}
              onPointerLeave={item.locked ? resetAccessLock : undefined}
              aria-label={
                item.locked
                  ? `${item.label}: ${item.premium ? "нужны регистрация и премиум" : "нужна регистрация"}`
                  : item.label
              }
              key={item.section}
            >
              {item.label}
              {item.locked && <AccessBadge premium={item.premium} compact />}
            </button>
          ))}
        </nav>
        {profile}
      </div>
    </header>
  );
}

function ProfileMenu({
  open,
  user,
  authConfigured,
  preferences,
  isPremium,
  onToggle,
  onPreference,
  onPremiumChange,
  onEmailLogin,
  onGoogleLogin,
  onLogout,
  home = false,
}: {
  open: boolean;
  user: User | null;
  authConfigured: boolean | null;
  preferences: Preferences;
  isPremium: boolean;
  onToggle: () => void;
  onPreference: (next: Partial<Preferences>) => void;
  onPremiumChange: (next: boolean) => void;
  onEmailLogin: (email: string) => Promise<string>;
  onGoogleLogin: () => Promise<string>;
  onLogout: () => Promise<void>;
  home?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const isRegistered = Boolean(user);
  const userLabel =
    user?.email ??
    user?.user_metadata?.preferred_username ??
    user?.user_metadata?.name ??
    "Ученик EGEGE";
  const userInitial = userLabel.trim().charAt(0).toUpperCase() || "Е";
  const accents: Array<{ value: Accent; label: string }> = [
    { value: "lime", label: "Лайм" },
    { value: "blue", label: "Синий" },
    { value: "red", label: "Красный" },
    { value: "pink", label: "Розовый" },
    { value: "beige", label: "Бежевый" },
  ];
  const reactions: Array<{ value: Reaction; label: string; icon: string }> = [
    { value: "xp", label: "XP", icon: "+10" },
    { value: "hearts", label: "Сердца", icon: "♥" },
    { value: "letters", label: "Буквы", icon: "ЯA" },
    { value: "fire", label: "Огоньки", icon: "🔥" },
    { value: "fireworks", label: "Салют", icon: "✦" },
    { value: "random", label: "Случайно", icon: "?" },
  ];
  const runAuth = async (action: () => Promise<string>) => {
    setAuthBusy(true);
    setAuthMessage("");
    const message = await action();
    setAuthMessage(message);
    setAuthBusy(false);
  };

  return (
    <div className={`profile ${home ? "profile-home" : ""}`}>
      <button
        className={`profile-trigger ${isRegistered ? "is-user" : "is-guest"} ${
          isPremium ? "is-premium" : ""
        }`}
        onClick={onToggle}
        aria-expanded={open}
        aria-label={isRegistered ? "Открыть профиль" : "Войти"}
      >
        {isRegistered ? (
          <>
            {isPremium && <i className="premium-crown" aria-hidden="true" />}
            <span>{userInitial}</span>
          </>
        ) : "Войти"}
      </button>
      <section className={`profile-panel ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="profile-panel-heading">
          <div>
            <strong>{isRegistered ? "Профиль ученика" : "Настройте под себя"}</strong>
            <span>
              {isRegistered
                ? userLabel
                : "Оформление сохраняется на этом устройстве"}
            </span>
          </div>
          <button onClick={onToggle} aria-label="Закрыть профиль">×</button>
        </div>

        <fieldset className="settings-block">
          <legend>Тема</legend>
          <div className="segmented-control">
            <button
              className={preferences.theme === "dark" ? "is-selected" : ""}
              onClick={() => onPreference({ theme: "dark" })}
            >
              Тёмная
            </button>
            <button
              className={preferences.theme === "light" ? "is-selected" : ""}
              onClick={() => onPreference({ theme: "light" })}
            >
              Светлая
            </button>
          </div>
        </fieldset>

        <fieldset className="settings-block">
          <legend>Акцент</legend>
          <div className="accent-options">
            {accents.map((accent) => (
              <button
                className={`accent-swatch accent-${accent.value} ${
                  preferences.accent === accent.value ? "is-selected" : ""
                }`}
                onClick={() => onPreference({ accent: accent.value })}
                aria-label={accent.label}
                title={accent.label}
                key={accent.value}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="settings-block">
          <legend>Анимация ответа</legend>
          <div className="reaction-options">
            {reactions.map((reaction) => (
              <button
                className={preferences.reaction === reaction.value ? "is-selected" : ""}
                onClick={() => onPreference({ reaction: reaction.value })}
                key={reaction.value}
              >
                <i>{reaction.icon}</i>
                <span>{reaction.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="profile-auth">
          {isRegistered ? (
            <>
              <div className={`premium-demo ${isPremium ? "is-active" : ""}`}>
                <div>
                  <span className="premium-label">
                    <i className="premium-crown is-inline" aria-hidden="true" />
                    Тестовый премиум
                  </span>
                  <small>
                    {isPremium
                      ? "Теория открыта"
                      : "Включите, чтобы проверить раздел теории"}
                  </small>
                </div>
                <button
                  className="premium-switch"
                  role="switch"
                  aria-checked={isPremium}
                  aria-label="Переключить тестовый премиум"
                  onClick={() => onPremiumChange(!isPremium)}
                >
                  <span />
                </button>
              </div>
              <div className="profile-person">
                <span className={isPremium ? "has-premium" : ""}>
                  {isPremium && <i className="premium-crown" aria-hidden="true" />}
                  {userInitial}
                </span>
                <div>
                  <strong>{userLabel}</strong>
                  <small>{isPremium ? "Премиум-профиль" : "Обычный профиль"}</small>
                </div>
              </div>
              <button className="secondary-auth" onClick={() => void onLogout()}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <p>Войдите удобным способом — пароль создавать не нужно.</p>
              <div className="social-auth-list">
                <button
                  className="social-auth google-auth"
                  onClick={() => void runAuth(onGoogleLogin)}
                  disabled={!authConfigured || authBusy}
                >
                  <b aria-hidden="true">G</b>
                  Продолжить с Google
                </button>
              </div>
              <div className="auth-divider"><span>или по почте</span></div>
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAuth(() => onEmailLogin(email));
                }}
              >
                <label>
                  <span>Электронная почта</span>
                  <input
                    autoComplete="email"
                    inputMode="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.ru"
                    required
                    disabled={!authConfigured || authBusy}
                  />
                </label>
                <button
                  className="primary-auth"
                  type="submit"
                  disabled={!authConfigured || authBusy}
                >
                  {authBusy ? "Отправляем…" : "Получить ссылку"}
                </button>
              </form>
              {authConfigured === null && <p className="auth-status">Проверяем подключение…</p>}
              {authConfigured === false && (
                <p className="auth-status is-warning">
                  Авторизация подготовлена. Осталось подключить проект Supabase.
                </p>
              )}
              {authMessage && <p className="auth-status">{authMessage}</p>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function TaskItem({
  task,
  completed,
  onCorrect,
  onIncorrect,
}: {
  task: Task;
  completed: boolean;
  onCorrect: (taskId: string, event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  onIncorrect: () => void;
}) {
  const [answerOpen, setAnswerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const sourceKind = getTaskSourceKind(task);
  const sourceLabel =
    sourceKind === "official"
      ? "Официальный источник"
      : sourceKind === "author"
        ? "Авторская задача"
        : "База КЕГЭ";

  const markCorrect = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (completed || saving) return;
    setSaving(true);
    try {
      await onCorrect(task.id, event);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="task-item" data-task-number={task.number}>
      <div className="task-heading-row">
        <span className="task-number-badge">{task.number === 19 ? "19–21" : task.number}</span>
        <div>
          <p className="task-primary-source">{task.note || sourceLabel}</p>
          <div className="task-meta">
            <span className="task-id">ID {task.id}</span>
            <span>{task.difficulty}</span>
            <span className={`task-source-tag is-${sourceKind}`}>{sourceLabel}</span>
          </div>
        </div>
      </div>
      <div
        className="task-body task-html"
        dangerouslySetInnerHTML={{ __html: task.html }}
      />
      {task.files.length > 0 && (
        <div className="task-files">
          {task.files.map((file) => (
            <a
              className="file-link"
              href={getDownloadHref(file.href)}
              target="_blank"
              rel="noreferrer"
              key={file.href}
            >
              <span className="file-icon" aria-hidden="true">↓</span>
              <span>
                <b>{file.name}</b>
                <small>{file.meta}</small>
              </span>
            </a>
          ))}
        </div>
      )}
      <button
        className={`answer-toggle ${answerOpen ? "is-open" : ""}`}
        onClick={() => setAnswerOpen((current) => !current)}
        aria-expanded={answerOpen}
      >
        {answerOpen ? "Скрыть ответ" : "Показать ответ"}
      </button>
      <div className={`answer-reveal ${answerOpen ? "is-open" : ""}`}>
        <div>
          <div className="answer-inner">
            <p className="answer-label">Ответ</p>
            <p className="answer-value">{task.answer}</p>
            <div className="match-row">
              <span>{completed ? "Ответ уже отмечен" : "Ваш ответ совпал?"}</span>
              <button
                className={`match-yes ${completed ? "is-complete" : ""}`}
                onClick={markCorrect}
                disabled={completed || saving}
              >
                {completed ? "Учтено" : saving ? "Сохраняем…" : "Да"}
              </button>
              <button onClick={onIncorrect} disabled={completed || saving}>Нет</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

const OFFICIAL_SOURCE_PATTERN =
  /(демовер|досроч|основн|пересдач|резерв|открыт(?:ый|ого)\s+вариант|егкр)/i;

function getTaskSourceKind(task: Task): TaskSourceKind {
  if (OFFICIAL_SOURCE_PATTERN.test(task.note ?? "")) return "official";
  if (/<a\b[^>]*href=/i.test(task.html)) return "author";
  return "kege";
}

function getGameTaskPartHtml(task: Task) {
  if (task.number !== 20 && task.number !== 21) return task.html;

  const secondParagraphStart = task.html.search(/<\/p>\s*<p(?:\s|>)/i);
  if (secondParagraphStart >= 0) {
    const nextParagraph = task.html.indexOf("<p", secondParagraphStart + 4);
    if (nextParagraph >= 0) return task.html.slice(nextParagraph);
  }

  const referenceStart = task.html.search(
    /<p[^>]*>\s*Для(?:\s|&nbsp;)*игры,(?:\s|&nbsp;)*описанной в задании(?:\s|&nbsp;)*19/i,
  );

  return referenceStart >= 0 ? task.html.slice(referenceStart) : task.html;
}

function mergeGameTasks(groups: Task[][]): Task[] {
  const byId = new Map<string, Partial<Record<19 | 20 | 21, Task>>>();
  for (const group of groups) {
    for (const task of group) {
      const part = task.number as 19 | 20 | 21;
      const parentId = part === 19 ? task.id : task.id.replace(/(?:20|21)$/, "");
      const entry = byId.get(parentId) ?? {};
      entry[part] = task;
      byId.set(parentId, entry);
    }
  }

  return [...byId.entries()].flatMap(([id, parts]) => {
    const base = parts[19];
    if (!base) return [];
    const available = ([19, 20, 21] as const).filter((number) => parts[number]);
    return [{
      ...base,
      id,
      number: 19,
      title: "Задание №19–21",
      html: available.map((number) =>
        `<section class="game-task-part"><h3>Задание №${number}</h3>${getGameTaskPartHtml(parts[number]!)}</section>`,
      ).join(""),
      answer: available.map((number) => `№${number}: ${parts[number]!.answer}`).join("\n"),
      files: available.flatMap((number) => parts[number]!.files),
    }];
  });
}

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="tasks-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

function PremiumPlaceholder({ section }: { section: "theory" | "game" }) {
  const isTheory = section === "theory";

  return (
    <>
      <PageHeading
        eyebrow={isTheory ? "Премиум-раздел" : "Для учеников EGEGE"}
        title={isTheory ? "Теория" : "Игра"}
        description={
          isTheory
            ? "Здесь появится удобный учебник по программированию и темам ЕГЭ."
            : "Здесь появятся короткие игровые уровни, которые удобно проходить с телефона."
        }
      />
      <section className={`premium-placeholder placeholder-${section}`}>
        <div className="placeholder-visual" aria-hidden="true">
          {isTheory ? (
            <span className="placeholder-book">
              <i />
              <i />
            </span>
          ) : (
            <span className="placeholder-path">
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
        <div className="placeholder-copy">
          <span className="soon-badge"><i /> Скоро</span>
          <h2>{isTheory ? "Собираем знания по главам" : "Готовим первую вселенную"}</h2>
          <p>
            {isTheory
              ? "Перенесём и переработаем материалы из Notion, добавим понятную навигацию и связи с практикой."
              : "Первый прототип будет состоять из коротких уровней с кодом, блоками и упражнениями на отступы."}
          </p>
        </div>
      </section>
    </>
  );
}

function GatePreview({ section }: { section: GateSection }) {
  if (section === "dashboard") {
    return (
      <div className="gate-preview preview-dashboard" aria-hidden="true">
        <div className="preview-stat-row">
          <span><i />42</span>
          <span><i />7 дней</span>
        </div>
        <div className="preview-heatmap">
          {Array.from({ length: 35 }, (_, index) => (
            <i
              style={{ "--cell-index": index } as React.CSSProperties}
              key={index}
            />
          ))}
        </div>
        <div className="preview-progress">
          <span />
        </div>
      </div>
    );
  }

  if (section === "theory") {
    const theoryCards = ["if", "for", "def"];
    return (
      <div className="gate-preview preview-theory" aria-hidden="true">
        {theoryCards.map((keyword, index) => (
          <div
            className="preview-theory-card"
            style={{ "--card-index": index } as React.CSSProperties}
            key={keyword}
          >
            <span>{keyword}</span>
            <i />
            <i />
            <i />
          </div>
        ))}
        <div className="preview-premium-lock">
          <AccessBadge premium compact />
        </div>
      </div>
    );
  }

  if (section === "trainer") {
    return (
      <div className="gate-preview preview-trainer" aria-hidden="true">
        <div className="preview-trainer-code">
          <i />
          <i />
          <i />
        </div>
        <div className="preview-trainer-keyboard">
          {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
        </div>
        <span>42 зн/мин</span>
      </div>
    );
  }

  return (
    <div className="gate-preview preview-game" aria-hidden="true">
      <span className="preview-path-line" />
      <i className="preview-level level-one" />
      <i className="preview-level level-two" />
      <i className="preview-level level-three" />
      <i className="preview-level level-four" />
      <span className="preview-computer-mascot">
        <span className="computer-screen">
          <i />
          <i />
        </span>
        <span className="computer-stand" />
      </span>
    </div>
  );
}

function AccessGateModal({
  section,
  isRegistered,
  onClose,
  onContinue,
}: {
  section: GateSection;
  isRegistered: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  const isTheory = section === "theory";
  const copy = {
    game: {
      eyebrow: "Бесплатно после регистрации",
      title: "Учитесь через игру",
      description:
        "Короткие уровни с кодом, отступами и блоками. Прогресс будет сохраняться между устройствами.",
      features: ["Уровни по 2–4 минуты", "На компьютере и телефоне"],
    },
    dashboard: {
      eyebrow: "Бесплатно после регистрации",
      title: "Весь прогресс в одном месте",
      description:
        "Активность, XP и серии дней будут привязаны к вашему профилю и не потеряются.",
      features: ["Календарь активности", "Личная статистика"],
    },
    trainer: {
      eyebrow: "Бесплатно после регистрации",
      title: "Печатайте код быстрее",
      description:
        "Тренажёр показывает следующую клавишу и правильный палец, а прогресс остаётся в вашем профиле.",
      features: ["Python, русский и символы", "На компьютере и телефоне"],
    },
    theory: {
      eyebrow: "Премиум-раздел",
      title: "Теория без лишней воды",
      description:
        "Главы по программированию и темам ЕГЭ с понятными примерами, мини-проверками и связями с практикой.",
      features: ["Нужна регистрация", "Нужен премиум"],
    },
  }[section];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="gate-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className={`gate-modal gate-${section}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="gate-close" onClick={onClose} aria-label="Закрыть">×</button>
        <div className="gate-visual">
          <GatePreview section={section} />
          <span className="gate-preview-label">Мини-превью</span>
        </div>
        <div className="gate-copy">
          <p className="gate-eyebrow">{copy.eyebrow}</p>
          <h2 id="gate-title">{copy.title}</h2>
          <p className="gate-description">{copy.description}</p>
          <div className="gate-features">
            {copy.features.map((feature, index) => (
              <span key={feature}>
                {isTheory && index === 1 ? (
                  <span className="feature-lock-mark" aria-hidden="true"><i /></span>
                ) : <i />}
                {feature}
              </span>
            ))}
          </div>
          <button className="gate-primary" onClick={onContinue}>
            {!isRegistered
              ? "Войти или зарегистрироваться"
              : isTheory
                ? "Посмотреть премиум"
                : "Продолжить"}
          </button>
          <button className="gate-secondary" onClick={onClose}>Пока не сейчас</button>
          {isTheory && isRegistered && (
            <small className="gate-demo-note">
              В тестовой версии премиум включается в личном кабинете.
            </small>
          )}
        </div>
      </section>
    </div>
  );
}

function Dashboard({
  activity,
  community,
  loading,
  scope,
  onScope,
  onSetUsername,
  onAddFriend,
  onFriendAction,
}: {
  activity: Activity;
  community: CommunityPayload | null;
  loading: boolean;
  scope: LeaderboardScope;
  onScope: (scope: LeaderboardScope) => void;
  onSetUsername: (username: string) => Promise<void>;
  onAddFriend: (username: string) => Promise<void>;
  onFriendAction: (
    action: "accept_friend" | "decline_friend" | "remove_friend",
    userId: string,
  ) => Promise<void>;
}) {
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [friendUsername, setFriendUsername] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const resolvedUsername = usernameDraft ?? community?.profile.username ?? "";

  const calendar = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - 111);
    const padding = (start.getDay() + 6) % 7;
    const days = Array.from({ length: 112 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dateKey(date);
      return { key, count: activity[key] ?? 0 };
    });
    return { days, padding };
  }, [activity]);

  const total =
    community?.profile.correctCount ??
    Object.values(activity).reduce((sum, count) => sum + count, 0);
  const xp = community?.profile.xp ?? total * XP_PER_ANSWER;
  const activeDays = Object.values(activity).filter((count) => count > 0).length;
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  while ((activity[dateKey(cursor)] ?? 0) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const friends = community?.friends.filter((friend) => friend.status === "accepted") ?? [];
  const incoming =
    community?.friends.filter(
      (friend) => friend.status === "pending" && friend.direction === "incoming",
    ) ?? [];
  const outgoing =
    community?.friends.filter(
      (friend) => friend.status === "pending" && friend.direction === "outgoing",
    ) ?? [];
  const visibleLeaderboard: LeaderboardEntry[] =
    scope === "all"
      ? community?.leaderboard ?? []
      : community
        ? [
            {
              rank: 0,
              userId: community.profile.userId,
              username: community.profile.username,
              displayName: community.profile.displayName,
              avatarEmoji: community.profile.avatarEmoji,
              xp: community.profile.xp,
              correctCount: community.profile.correctCount,
              isCurrent: true,
              isFriend: false,
            },
            ...friends.map((friend) => ({
              rank: 0,
              userId: friend.userId,
              username: friend.username,
              displayName: friend.displayName,
              avatarEmoji: friend.avatarEmoji,
              xp: friend.xp,
              correctCount: 0,
              isCurrent: false,
              isFriend: true,
            })),
          ]
            .sort((first, second) => second.xp - first.xp || first.username.localeCompare(second.username))
            .map((entry, index) => ({ ...entry, rank: index + 1 }))
        : [];

  const run = async (key: string, action: () => Promise<void>) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      await action();
    } catch {
      // The parent action already shows a concise error toast.
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="dashboard-content">
      <section className="stats-grid" aria-label="Статистика">
        <article>
          <span>Правильных ответов</span>
          <strong>{total}</strong>
        </article>
        <article>
          <span>Накоплено</span>
          <strong>{xp}<small> XP</small></strong>
        </article>
        <article>
          <span>Активных дней</span>
          <strong>{activeDays}</strong>
        </article>
        <article>
          <span>Серия</span>
          <strong>{streak}<small> дн.</small></strong>
        </article>
      </section>

      <section className="activity-card">
        <div className="activity-heading">
          <div>
            <h2>Активность</h2>
            <p>Каждое задание может добавить XP только один раз.</p>
          </div>
          <span>Последние 16 недель</span>
        </div>
        <div className="calendar-scroll">
          <div className="activity-grid" aria-label="Календарь активности">
            {Array.from({ length: calendar.padding }, (_, index) => (
              <i className="activity-day is-empty" key={`empty-${index}`} />
            ))}
            {calendar.days.map((day) => {
              const level =
                day.count === 0 ? 0 : day.count === 1 ? 1 : day.count < 4 ? 2 : day.count < 7 ? 3 : 4;
              return (
                <i
                  className={`activity-day level-${level}`}
                  title={`${day.key}: ${day.count}`}
                  aria-label={`${day.key}: ${day.count} правильных ответов`}
                  key={day.key}
                />
              );
            })}
          </div>
        </div>
        <div className="activity-legend" aria-hidden="true">
          <span>Меньше</span>
          {[0, 1, 2, 3, 4].map((level) => <i className={`level-${level}`} key={level} />)}
          <span>Больше</span>
        </div>
      </section>

      {community?.protection.active && (
        <section className="protection-notice" role="status">
          <span aria-hidden="true">!</span>
          <div>
            <h2>Включена защита от накрутки</h2>
            <p>
              XP временно не начисляется из-за слишком быстрых отметок. Защита
              отключится в{" "}
              {new Date(community.protection.until * 1000).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}.
            </p>
          </div>
        </section>
      )}

      <div className="community-grid">
        <section className="leaderboard-card">
          <div className="community-heading">
            <div>
              <p className="community-eyebrow">Рейтинг</p>
              <h2>Ученики EGEGE</h2>
            </div>
            <div className="leaderboard-tabs" aria-label="Фильтр рейтинга">
              <button
                className={scope === "all" ? "is-active" : ""}
                onClick={() => onScope("all")}
              >
                Все
              </button>
              <button
                className={scope === "friends" ? "is-active" : ""}
                onClick={() => onScope("friends")}
              >
                Друзья
              </button>
            </div>
          </div>

          <div className={`leaderboard-list ${loading ? "is-loading" : ""}`}>
            {loading && !community ? (
              Array.from({ length: 5 }, (_, index) => (
                <div className="leaderboard-skeleton" key={index} />
              ))
            ) : visibleLeaderboard.length ? (
              visibleLeaderboard.map((entry) => (
                <article
                  className={`leaderboard-row ${entry.isCurrent ? "is-current" : ""}`}
                  key={entry.userId}
                >
                  <span className={`leaderboard-rank rank-${entry.rank}`}>{entry.rank}</span>
                  <span className="leaderboard-avatar" aria-hidden="true">{entry.avatarEmoji}</span>
                  <div className="leaderboard-person">
                    <strong>{entry.displayName}</strong>
                    <small>
                      @{entry.username}
                      {entry.isCurrent ? " · это вы" : entry.isFriend ? " · друг" : ""}
                    </small>
                  </div>
                  <div className="leaderboard-score">
                    <strong>{entry.xp}</strong>
                    <small>XP</small>
                  </div>
                </article>
              ))
            ) : (
              <div className="community-empty">
                <span>◎</span>
                <p>
                  {scope === "friends"
                    ? "Добавьте друзей — здесь появится ваш личный рейтинг."
                    : "Рейтинг появится после первых правильных ответов."}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="friends-card">
          <div className="community-heading">
            <div>
              <p className="community-eyebrow">Профиль</p>
              <h2>Друзья</h2>
            </div>
            <span className="friends-count">{friends.length}</span>
          </div>

          <form
            className="username-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run("username", () => onSetUsername(resolvedUsername));
            }}
          >
            <label>
              <span>Ваш уникальный username</span>
              <div>
                <i>@</i>
                <input
                  value={resolvedUsername}
                  onChange={(event) =>
                    setUsernameDraft(
                      event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20),
                    )
                  }
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                  required
                />
                <button
                  disabled={
                    busyKey === "username" ||
                    resolvedUsername === community?.profile.username
                  }
                >
                  {busyKey === "username" ? "…" : "Сохранить"}
                </button>
              </div>
            </label>
          </form>

          <form
            className="friend-search"
            onSubmit={(event) => {
              event.preventDefault();
              void run("add", async () => {
                await onAddFriend(friendUsername);
                setFriendUsername("");
              });
            }}
          >
            <label htmlFor="friend-username">Добавить по username</label>
            <div>
              <i>@</i>
              <input
                id="friend-username"
                value={friendUsername}
                onChange={(event) =>
                  setFriendUsername(
                    event.target.value.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, ""),
                  )
                }
                placeholder="username"
                minLength={3}
                maxLength={20}
                required
              />
              <button disabled={busyKey === "add"}>
                {busyKey === "add" ? "Ищем…" : "Добавить"}
              </button>
            </div>
          </form>

          {incoming.length > 0 && (
            <div className="friend-group">
              <p>Входящие заявки</p>
              {incoming.map((friend) => (
                <article className="friend-row" key={friend.userId}>
                  <span>{friend.avatarEmoji}</span>
                  <div>
                    <strong>{friend.displayName}</strong>
                    <small>@{friend.username}</small>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="accept"
                      disabled={Boolean(busyKey)}
                      onClick={() =>
                        void run(`accept:${friend.userId}`, () =>
                          onFriendAction("accept_friend", friend.userId),
                        )
                      }
                    >
                      Принять
                    </button>
                    <button
                      aria-label={`Отклонить заявку от ${friend.username}`}
                      disabled={Boolean(busyKey)}
                      onClick={() =>
                        void run(`decline:${friend.userId}`, () =>
                          onFriendAction("decline_friend", friend.userId),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="friend-group">
            <p>Ваши друзья</p>
            {friends.length ? (
              friends.map((friend) => (
                <article className="friend-row" key={friend.userId}>
                  <span>{friend.avatarEmoji}</span>
                  <div>
                    <strong>{friend.displayName}</strong>
                    <small>@{friend.username} · {friend.xp} XP</small>
                  </div>
                  <button
                    className="friend-remove"
                    aria-label={`Удалить ${friend.username} из друзей`}
                    disabled={Boolean(busyKey)}
                    onClick={() =>
                      void run(`remove:${friend.userId}`, () =>
                        onFriendAction("remove_friend", friend.userId),
                      )
                    }
                  >
                    ×
                  </button>
                </article>
              ))
            ) : (
              <p className="friends-placeholder">Пока здесь никого нет.</p>
            )}
          </div>

          {outgoing.length > 0 && (
            <p className="outgoing-note">
              Отправлено заявок: <b>{outgoing.length}</b>
            </p>
          )}
        </section>
      </div>

      {total === 0 && (
        <section className="dashboard-note">
          <span>0 XP</span>
          <div>
            <h2>Начните с любого задания</h2>
            <p>Откройте ответ и нажмите «Да» — активность сразу появится здесь.</p>
          </div>
        </section>
      )}
    </div>
  );
}

function StudentCabinet({
  user,
  attempts,
  preferences,
  onPreference,
  onDeleteAttempt,
}: {
  user: User;
  attempts: ExamAttempt[];
  preferences: Preferences;
  onPreference: (next: Partial<Preferences>) => void;
  onDeleteAttempt: (attempt: ExamAttempt) => void;
}) {
  const scores = attempts.map((attempt) => attempt.testScore);
  const average = scores.length
    ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
    : 0;
  const averageSeconds = attempts.length
    ? Math.round(attempts.reduce((total, attempt) => total + attempt.durationSeconds, 0) / attempts.length)
    : 0;
  const formatDuration = (seconds: number) =>
    `${Math.floor(seconds / 3600)} ч ${Math.floor((seconds % 3600) / 60)} мин`;
  const name = user.user_metadata?.name ?? user.email ?? "Ученик EGEGE";

  return (
    <div className="student-cabinet">
      <section className="cabinet-hero">
        <div>
          <p>Личный кабинет</p>
          <h1>{name}</h1>
          <span>Здесь собираются результаты завершённых вариантов на этом устройстве.</span>
        </div>
        <div className="cabinet-avatar">{name.trim().charAt(0).toUpperCase() || "Е"}</div>
      </section>

      <section className="cabinet-stats" aria-label="Статистика вариантов">
        <div><span>Средний балл</span><strong>{average}</strong></div>
        <div><span>Лучший</span><strong>{scores.length ? Math.max(...scores) : "—"}</strong></div>
        <div><span>Худший</span><strong>{scores.length ? Math.min(...scores) : "—"}</strong></div>
        <div><span>Среднее время</span><strong>{attempts.length ? formatDuration(averageSeconds) : "—"}</strong></div>
      </section>

      <div className="cabinet-grid">
        <section className="cabinet-history">
          <div className="cabinet-section-title">
            <div><p>История</p><h2>Завершённые варианты</h2></div>
            <span>{attempts.length}</span>
          </div>
          {attempts.length ? (
            <div className="cabinet-attempts">
              {attempts.map((attempt) => (
                <article key={`${attempt.kim}-${attempt.completedAt}`}>
                  <div><strong>КИМ № {attempt.kim}</strong><span>{new Date(attempt.completedAt).toLocaleDateString("ru-RU")}</span></div>
                  <b>{attempt.testScore}<small>/100</small></b>
                  <span>{formatDuration(attempt.durationSeconds)}</span>
                  <button
                    className="cabinet-attempt-delete"
                    onClick={() => onDeleteAttempt(attempt)}
                    aria-label={`Удалить попытку КИМ № ${attempt.kim}`}
                    title="Удалить попытку"
                  >
                    Удалить
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="cabinet-empty">Завершите первый вариант — результат появится здесь.</div>
          )}
        </section>

        <section className="cabinet-settings">
          <div className="cabinet-section-title"><div><p>Оформление</p><h2>Настройки сайта</h2></div></div>
          <fieldset className="settings-block">
            <legend>Тема</legend>
            <div className="segmented-control">
              <button className={preferences.theme === "dark" ? "is-selected" : ""} onClick={() => onPreference({ theme: "dark" })}>Тёмная</button>
              <button className={preferences.theme === "light" ? "is-selected" : ""} onClick={() => onPreference({ theme: "light" })}>Светлая</button>
            </div>
          </fieldset>
          <fieldset className="settings-block">
            <legend>Акцентный цвет</legend>
            <div className="accent-options">
              {(["lime", "blue", "red", "pink", "beige"] as Accent[]).map((accent) => (
                <button
                  className={`accent-swatch accent-${accent} ${preferences.accent === accent ? "is-selected" : ""}`}
                  onClick={() => onPreference({ accent })}
                  aria-label={`Выбрать цвет ${accent}`}
                  key={accent}
                />
              ))}
            </div>
          </fieldset>
        </section>
      </div>
    </div>
  );
}

export default function Home() {
  const [section, setSection] = useState<Section>("home");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [source, setSource] = useState("all");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");
  const [examVariant, setExamVariant] = useState<ExamVariantData | null>(null);
  const [openingVariantKim, setOpeningVariantKim] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activity, setActivity] = useState<Activity>({});
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => new Set());
  const [community, setCommunity] = useState<CommunityPayload | null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>("all");
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [gateSection, setGateSection] = useState<GateSection | null>(null);
  const [rattlingSection, setRattlingSection] = useState<GateSection | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [authConfigured, setAuthConfigured] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(EXAM_HISTORY_KEY) ?? "[]") as ExamAttempt[];
    } catch {
      return [];
    }
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstId = useRef(0);
  const claimingTasks = useRef(new Set<string>());
  const taskIndex = useRef<Record<string, number>>({});
  const isRegistered = Boolean(user);

  useEffect(() => {
    const syncSectionFromUrl = () => setSection(sectionFromPath(window.location.pathname));
    syncSectionFromUrl();
    window.addEventListener("popstate", syncSectionFromUrl);
    return () => window.removeEventListener("popstate", syncSectionFromUrl);
  }, []);

  useEffect(() => {
    if (section !== "tasks") {
      queueMicrotask(() => setShowScrollTop(false));
      return;
    }
    let previousY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      setShowScrollTop(currentY > 650 && currentY < previousY);
      previousY = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [section]);

  useEffect(() => {
    let restored = defaultPreferences;

    try {
      const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "{}") as
        Partial<Preferences>;
      restored = {
        theme: saved.theme === "light" ? "light" : "dark",
        accent: ["lime", "blue", "red", "pink", "beige"].includes(saved.accent ?? "")
          ? (saved.accent as Accent)
          : defaultPreferences.accent,
        reaction: ["xp", "hearts", "letters", "fire", "fireworks", "random"].includes(
          saved.reaction ?? "",
        )
          ? (saved.reaction as Reaction)
          : defaultPreferences.reaction,
      };
    } catch {
      // Invalid local preferences are replaced with safe defaults.
    }

    document.documentElement.dataset.theme = restored.theme;
    document.documentElement.dataset.accent = restored.accent;
    queueMicrotask(() => setPreferences(restored));
  }, []);

  const notify = (message: string) => {
    setToast("");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    requestAnimationFrame(() => setToast(message));
    toastTimer.current = setTimeout(() => setToast(""), 2500);
  };

  const applyCommunity = (payload: CommunityPayload) => {
    setCommunity(payload);
    setActivity(payload.activity);
    setCompletedTaskIds(new Set(payload.completedTaskIds));
  };

  const refreshCommunity = async () => {
    const payload = await communityRequest<CommunityPayload>("/api/community?view=all");
    applyCommunity(payload);
    return payload;
  };

  useEffect(() => {
    queueMicrotask(() => {
      if (!user) {
        setIsPremium(false);
        return;
      }
      try {
        setIsPremium(window.localStorage.getItem(`${PREMIUM_KEY}:${user.id}`) === "true");
      } catch {
        setIsPremium(false);
      }
    });
  }, [user]);

  useEffect(() => {
    void fetch("/data/task-index.json")
      .then((response) => (response.ok ? response.json() : {}))
      .then((index: Record<string, number>) => {
        taskIndex.current = index;
      })
      .catch(() => {
        taskIndex.current = {};
      });
  }, []);

  useEffect(() => {
    if (section !== "variants" || variants.length > 0 || variantsLoading) return;

    queueMicrotask(() => setVariantsLoading(true));
    void fetch("/data/variant-manifest.json")
      .then((response) => {
        if (!response.ok) throw new Error("Не удалось загрузить каталог вариантов");
        return response.json() as Promise<{ variants: Variant[] }>;
      })
      .then((payload) => setVariants(payload.variants ?? []))
      .catch(() => notify("Не удалось загрузить каталог вариантов"))
      .finally(() => setVariantsLoading(false));
  }, [section, variants.length, variantsLoading]);

  useEffect(() => {
    if (!type) {
      queueMicrotask(() => {
        setTasks([]);
        setTasksLoading(false);
      });
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      setTasks([]);
      setTasksLoading(true);
    });

    const taskRequest =
      type === "19"
        ? Promise.all(
            [19, 20, 21].map(async (number) => {
              const response = await fetch(`/data/tasks/${number}.json`, {
                signal: controller.signal,
              });
              if (!response.ok) throw new Error("Не удалось загрузить задания");
              return response.json() as Promise<Task[]>;
            }),
          ).then(mergeGameTasks)
        : fetch(`/data/tasks/${type}.json`, { signal: controller.signal }).then(
            (response) => {
              if (!response.ok) throw new Error("Не удалось загрузить задания");
              return response.json() as Promise<Task[]>;
            },
          );

    void taskRequest
      .then((data) => {
        setTasks(data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        notify("Не удалось загрузить выбранный номер");
      })
      .finally(() => {
        if (!controller.signal.aborted) setTasksLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [type]);

  useEffect(() => {
    if (!user) return;

    let active = true;
    queueMicrotask(() => {
      if (active) setCommunityLoading(true);
    });
    void communityRequest<CommunityPayload>("/api/community?view=all")
      .then((payload) => {
        if (!active) return;
        applyCommunity(payload);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Рейтинг временно недоступен.";
        setToast(message);
        window.setTimeout(() => setToast(""), 3200);
      })
      .finally(() => {
        if (active) setCommunityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void getSupabaseBrowserClient().then(async (client) => {
      if (!active) return;
      if (!client) {
        setAuthConfigured(false);
        return;
      }

      setAuthConfigured(true);
      const { data } = await client.auth.getSession();
      if (active) setUser(data.session?.user ?? null);

      const listener = client.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        if (!session?.user) {
          setCommunity(null);
          setActivity({});
          setCompletedTaskIds(new Set());
          setCommunityLoading(false);
        }
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!isRegistered) return;
    let pending: GateSection | null = null;
    try {
      pending = window.sessionStorage.getItem(PENDING_ACCESS_KEY) as GateSection | null;
      window.sessionStorage.removeItem(PENDING_ACCESS_KEY);
    } catch {
      // Continue without restoring the intended section.
    }
    if (!pending) return;
    queueMicrotask(() => {
      if (pending === "theory") {
        setGateSection("theory");
        return;
      }
      setSection(pending);
      window.scrollTo({ top: 0 });
    });
  }, [isRegistered]);

  useEffect(() => {
    return () => {
      if (gateTimer.current) clearTimeout(gateTimer.current);
    };
  }, []);

  const showAccessGate = (target: GateSection) => {
    if (gateTimer.current) clearTimeout(gateTimer.current);
    setRattlingSection(target);
    gateTimer.current = setTimeout(() => {
      setRattlingSection(null);
      setGateSection(target);
    }, 420);
  };

  const navigate = (nextSection: Section) => {
    if (
      (nextSection === "dashboard" || nextSection === "game" || nextSection === "trainer") &&
      !isRegistered
    ) {
      showAccessGate(nextSection);
      return;
    }
    if (nextSection === "theory" && (!isRegistered || !isPremium)) {
      showAccessGate("theory");
      return;
    }
    setSection(nextSection);
    const nextPath = sectionPaths[nextSection];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ section: nextSection }, "", nextPath);
    }
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const authResult = url.searchParams.get("auth");
    if (!authResult) return;

    url.searchParams.delete("auth");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    let timer = 0;
    const frame = window.requestAnimationFrame(() => {
      setToast(
        authResult === "confirmed"
          ? "Почта подтверждена — профиль открыт"
          : "Ссылка не сработала или уже была использована",
      );
      if (authResult !== "confirmed") setProfileOpen(true);
      timer = window.setTimeout(() => setToast(""), 3600);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const addCorrectAnswer = async (
    taskId: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (!user) {
      setProfileOpen(true);
      notify("Войдите, чтобы сохранить XP и место в рейтинге");
      return;
    }
    if (completedTaskIds.has(taskId)) {
      notify("За это задание XP уже учтён");
      return;
    }
    if (claimingTasks.current.has(taskId)) return;
    claimingTasks.current.add(taskId);

    try {
      const result = await communityRequest<ClaimResult>("/api/community", {
        method: "POST",
        body: JSON.stringify({ action: "claim_xp", taskId }),
      });
      if (result.completed) {
        setCompletedTaskIds((current) => new Set(current).add(taskId));
      }
      if (result.status !== "awarded") {
        notify(result.message);
        void refreshCommunity().catch(() => undefined);
        return;
      }

      const selectedReaction =
        preferences.reaction === "random"
          ? randomReactions[Math.floor(Math.random() * randomReactions.length)]
          : preferences.reaction;
      const nextBurst = {
        id: ++burstId.current,
        x: event.clientX,
        y: event.clientY,
        reaction: selectedReaction,
      };
      setBursts((current) => [...current, nextBurst]);
      window.setTimeout(() => {
        setBursts((current) => current.filter((burst) => burst.id !== nextBurst.id));
      }, 900);

      if (result.dateKey) {
        setActivity((current) => ({
          ...current,
          [result.dateKey as string]: (current[result.dateKey as string] ?? 0) + 1,
        }));
      }
      setCommunity((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                xp: result.xp ?? current.profile.xp + XP_PER_ANSWER,
                correctCount: result.correctCount ?? current.profile.correctCount + 1,
              },
              completedTaskIds: [...current.completedTaskIds, taskId],
            }
          : current,
      );
      notify(result.message);
      void refreshCommunity().catch(() => undefined);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось сохранить XP.");
    } finally {
      claimingTasks.current.delete(taskId);
    }
  };

  const updatePreferences = (next: Partial<Preferences>) => {
    setPreferences((current) => {
      const updated = { ...current, ...next };
      document.documentElement.dataset.theme = updated.theme;
      document.documentElement.dataset.accent = updated.accent;
      try {
        window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      } catch {
        // The settings still work for the current session.
      }
      return updated;
    });
  };

  const updatePremium = (next: boolean) => {
    if (!user) return;
    setIsPremium(next);
    try {
      window.localStorage.setItem(`${PREMIUM_KEY}:${user.id}`, String(next));
    } catch {
      // The demo switch still works for the current session.
    }
    if (!next && section === "theory") {
      setSection("dashboard");
    }
    notify(next ? "Премиум включён — теория открыта" : "Премиум выключен");
  };

  const sendMagicLink = async (email: string) => {
    const client = await getSupabaseBrowserClient();
    if (!client) return "Нужно подключить Supabase — инструкция уже подготовлена.";

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });
    if (error) return `Не удалось отправить письмо: ${error.message}`;
    return "Ссылка отправлена. Проверьте почту.";
  };

  const loginWithProvider = async (provider: Provider, label: string) => {
    const client = await getSupabaseBrowserClient();
    if (!client) return "Нужно подключить Supabase — инструкция уже подготовлена.";

    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });
    return error ? `Не удалось войти: ${error.message}` : `Открываем ${label}…`;
  };

  const loginWithGoogle = () => loginWithProvider("google", "Google");

  const logout = async () => {
    const client = await getSupabaseBrowserClient();
    if (client) await client.auth.signOut();
    setUser(null);
    if (
      section === "dashboard" ||
      section === "theory" ||
      section === "game" ||
      section === "trainer"
    ) {
      setSection("tasks");
    }
    setProfileOpen(false);
    notify("Вы вышли из профиля");
  };

  const profile = (
    <ProfileMenu
      open={profileOpen}
      user={user}
      authConfigured={authConfigured}
      preferences={preferences}
      isPremium={isPremium}
      onToggle={() => isRegistered ? navigate("profile") : setProfileOpen((current) => !current)}
      onPreference={updatePreferences}
      onPremiumChange={updatePremium}
      onEmailLogin={sendMagicLink}
      onGoogleLogin={loginWithGoogle}
      onLogout={logout}
    />
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const normalizedSearch = search.trim();
        const sourceKind = getTaskSourceKind(task);
        return (
          (!normalizedSearch || task.id.includes(normalizedSearch)) &&
          task.number === Number(type) &&
          (difficulty === "all" || task.difficulty === difficulty) &&
          (source === "all" || source === "kege" || source === sourceKind)
        );
      }).sort((a, b) => {
        const order: Record<TaskSourceKind, number> = {
          official: 0,
          author: 1,
          kege: 2,
        };
        return order[getTaskSourceKind(a)] - order[getTaskSourceKind(b)];
      }),
    [tasks, search, type, difficulty, source],
  );

  const variantYears = useMemo(() => {
    const query = variantSearch.trim().toLowerCase();
    return groupVariants(variants).map((group) => ({
      ...group,
      official: group.official.filter((variant) =>
        !query || variant.kim.includes(query) || variant.title.toLowerCase().includes(query),
      ),
      teachers: group.teachers.filter((variant) =>
        !query || variant.kim.includes(query) || variant.title.toLowerCase().includes(query),
      ),
    })).filter((group) => group.official.length || group.teachers.length);
  }, [variantSearch, variants]);
  const visibleVariantTotal = variantYears.reduce(
    (total, group) => total + group.official.length,
    0,
  );

  const openExamVariant = async (kim: string) => {
    if (openingVariantKim) return;
    setOpeningVariantKim(kim);
    try {
      const response = await fetch(`/data/variants/${kim}.json`);
      if (!response.ok) throw new Error("Вариант не загрузился");
      setExamVariant(await response.json() as ExamVariantData);
    } catch {
      notify("Не удалось открыть экзаменационную станцию");
    } finally {
      setOpeningVariantKim("");
    }
  };

  const saveExamAttempt = (attempt: ExamAttempt) => {
    setExamAttempts((current) => {
      const next = [attempt, ...current].slice(0, 50);
      try {
        window.localStorage.setItem(EXAM_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // The result remains visible even when browser storage is unavailable.
      }
      return next;
    });
  };

  const deleteExamAttempt = (attempt: ExamAttempt) => {
    if (!window.confirm(`Удалить попытку КИМ № ${attempt.kim}?`)) return;
    setExamAttempts((current) => {
      const next = current.filter((item) =>
        item.kim !== attempt.kim || item.completedAt !== attempt.completedAt
      );
      try {
        window.localStorage.setItem(EXAM_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // The attempt is still removed from the current session.
      }
      return next;
    });
    notify("Попытка удалена");
  };

  const resetFilters = () => {
    setSearch("");
    setType("");
    setDifficulty("all");
    setSource("all");
  };

  const updateTaskSearch = (value: string) => {
    const nextSearch = value.replace(/\D/g, "");
    setSearch(nextSearch);
    const matchedNumber = taskIndex.current[nextSearch];
    if (matchedNumber) {
      setType(String(matchedNumber === 20 || matchedNumber === 21 ? 19 : matchedNumber));
    }
  };

  const mutateCommunity = async (payload: Record<string, string>) => {
    try {
      const result = await communityRequest<{ message: string }>("/api/community", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      notify(result.message);
      await refreshCommunity();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Не удалось сохранить изменение.");
      throw error;
    }
  };

  const setCommunityUsername = (username: string) =>
    mutateCommunity({ action: "set_username", username });

  const addCommunityFriend = (username: string) =>
    mutateCommunity({ action: "add_friend", username });

  const updateCommunityFriend = (
    action: "accept_friend" | "decline_friend" | "remove_friend",
    userId: string,
  ) => mutateCommunity({ action, userId });

  const taskProps = {
    onCorrect: addCorrectAnswer,
    onIncorrect: () => notify("Ответ отмечен — попробуйте ещё одно задание"),
  };

  const continueFromGate = () => {
    if (!gateSection) return;
    if (!isRegistered) {
      try {
        window.sessionStorage.setItem(PENDING_ACCESS_KEY, gateSection);
      } catch {
        // Sign-in still works without restoring the requested section.
      }
    }
    setGateSection(null);
    requestAnimationFrame(() => setProfileOpen(true));
  };

  if (section === "home") {
    return (
      <main className="home">
        <ProfileMenu
          open={profileOpen}
          user={user}
          authConfigured={authConfigured}
          preferences={preferences}
          isPremium={isPremium}
          onToggle={() => isRegistered ? navigate("profile") : setProfileOpen((current) => !current)}
          onPreference={updatePreferences}
          onPremiumChange={updatePremium}
          onEmailLogin={sendMagicLink}
          onGoogleLogin={loginWithGoogle}
          onLogout={logout}
          home
        />
        <div className="home-content">
          <div className="brand-mark" aria-hidden="true">Е</div>
          <h1><span className="ege-part">EGE</span><span className="ge-part">GE</span></h1>
          <p className="brand-by">by Tsarapkin</p>
          <p className="eyebrow">ЕГЭ по информатике</p>
          <Dock
            navigate={navigate}
            isRegistered={isRegistered}
            isPremium={isPremium}
            rattlingSection={rattlingSection}
          />
        </div>
        <p className="home-note">
          {isPremium
            ? "Премиум активен · теория открыта"
            : isRegistered
              ? "Игра, тренажёр и дашборд открыты · теория в премиуме"
              : "Открытая база · без регистрации"}
        </p>
        {gateSection && (
          <AccessGateModal
            section={gateSection}
            isRegistered={isRegistered}
            onClose={() => setGateSection(null)}
            onContinue={continueFromGate}
          />
        )}
        <Toast message={toast} />
      </main>
    );
  }

  return (
    <main className="tasks-page">
      <AppHeader
        section={section}
        navigate={navigate}
        isRegistered={isRegistered}
        isPremium={isPremium}
        rattlingSection={rattlingSection}
        profile={profile}
      />

      <div
        className={`tasks-shell ${section === "trainer" ? "is-trainer-shell" : ""} ${
          section === "theory" ? "is-theory-shell" : ""
        }`}
      >
        {section === "tasks" && (
          <>
            <PageHeading
              eyebrow="Подготовка к ЕГЭ"
              title="База заданий"
              description="Выберите тему — все подходящие задания появятся ниже."
            />

            <section className="filter-panel" aria-label="Фильтры заданий">
              <label className="search-field">
                <span>Поиск по ID</span>
                <div>
                  <i aria-hidden="true" />
                  <input
                    inputMode="numeric"
                    value={search}
                    onChange={(event) => updateTaskSearch(event.target.value)}
                    placeholder="Например, 1042"
                  />
                  {search && (
                    <button aria-label="Очистить поиск" onClick={() => setSearch("")}>×</button>
                  )}
                </div>
              </label>
              <label>
                <span>Номер задания</span>
                <select value={type} onChange={(event) => setType(event.target.value)}>
                  <option value="" disabled>Выберите номер</option>
                  {Array.from({ length: 27 }, (_, index) => index + 1)
                    .filter((number) => number !== 20 && number !== 21)
                    .map((number) => (
                      <option value={number} key={number}>
                        {number === 19 ? "№19–21 · Теория игр" : `№${number}`}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Сложность</span>
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  <option value="all">Любая</option>
                  <option>Базовый</option>
                  <option>Средний</option>
                  <option>Высокий</option>
                </select>
              </label>
              <label>
                <span>Источник</span>
                <select value={source} onChange={(event) => setSource(event.target.value)}>
                  <option value="all">Все источники</option>
                  <option value="official">Официальные источники</option>
                  <option value="author">Авторские задачи</option>
                  <option value="kege">КЕГЭ</option>
                </select>
              </label>
              <button className="reset-button" onClick={resetFilters}>
                <span aria-hidden="true">↺</span> Сбросить
              </button>
            </section>

            {type && (
              <div className="results-bar">
                <span>Найдено: <b>{filteredTasks.length}</b></span>
                <i />
                <span>Загружен только №{type}</span>
              </div>
            )}

            <section className="task-list" aria-live="polite">
              {!type ? (
                <div className="empty-state choose-task-number">
                  <span>№</span>
                  <h2>Выберите номер задания</h2>
                  <p>Мы загрузим только нужный тип — так база останется быстрой.</p>
                </div>
              ) : tasksLoading ? (
                <div className="empty-state is-loading">
                  <span>•••</span>
                  <h2>Загружаем задания</h2>
                  <p>База откроется через несколько секунд.</p>
                </div>
              ) : filteredTasks.length ? (
                filteredTasks.map((task) => (
                  <TaskItem
                    task={task}
                    completed={completedTaskIds.has(task.id)}
                    key={task.id}
                    {...taskProps}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <span>∅</span>
                  <h2>Ничего не найдено</h2>
                  <p>Попробуйте изменить фильтры или проверить ID.</p>
                  <button onClick={resetFilters}>Сбросить фильтры</button>
                </div>
              )}
            </section>
          </>
        )}

        {section === "variants" && (
          <>
            <PageHeading
              eyebrow="Экзаменационный режим"
              title="Варианты"
              description="Официальные варианты КЕГЭ с 2023/24 учебного года."
            />
            <div className="variant-toolbar">
              <label>
                <span>Найти вариант</span>
                <input
                  inputMode="search"
                  value={variantSearch}
                  onChange={(event) => setVariantSearch(event.target.value)}
                  placeholder="КИМ или название"
                />
              </label>
              <span>{visibleVariantTotal} вариантов</span>
            </div>
            <section className="variant-catalog" aria-label="Доступные варианты">
              {variantsLoading && (
                <div className="variant-catalog-state">Загружаем каталог вариантов…</div>
              )}
              {variantYears.map((group) => (
                <section className="variant-year" key={group.year}>
                  <h2>Варианты за {group.year} учебный год</h2>
                  {group.official.length > 0 && (
                    <div className="variant-group">
                      <h3>Открытые пробники и реальные варианты</h3>
                      <div className="variant-tiles">
                        {group.official.map((variant) => (
                          <button
                            className="variant-tile is-official"
                            onClick={() => void openExamVariant(variant.kim)}
                            disabled={Boolean(openingVariantKim)}
                            key={variant.kim}
                          >
                            <span>{variant.title}</span>
                            <small>КИМ {variant.kim}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </section>
            <section className="variant-station-note">
              <span>Режим станции</span>
              <p>
                Номера 1–27, сохранение ответов, таймер, прикреплённые файлы
                и итоговый экран — в одном полноэкранном интерфейсе.
              </p>
            </section>
          </>
        )}

        {section === "theory" && user && (
          <Suspense
            fallback={
              <div className="theory-loading" role="status">
                <span>•••</span>
                <p>Готовим космос знаний</p>
              </div>
            }
          >
            <TheorySpace userId={user.id} />
          </Suspense>
        )}

        {section === "game" && <PremiumPlaceholder section="game" />}

        {section === "trainer" && user && (
          <Suspense
            fallback={
              <div className="trainer-loading" role="status">
                <span>•••</span>
                <p>Готовим клавиатуру</p>
              </div>
            }
          >
            <TypingTrainer userId={user.id} />
          </Suspense>
        )}

        {section === "dashboard" && (
          <>
            <PageHeading
              eyebrow="Ваш профиль"
              title="Дашборд"
              description="Прогресс, рейтинг и друзья синхронизируются с вашим аккаунтом."
            />
            <Dashboard
              activity={activity}
              community={community}
              loading={communityLoading}
              scope={leaderboardScope}
              onScope={setLeaderboardScope}
              onSetUsername={setCommunityUsername}
              onAddFriend={addCommunityFriend}
              onFriendAction={updateCommunityFriend}
            />
          </>
        )}

        {section === "profile" && user && (
          <StudentCabinet
            user={user}
            attempts={examAttempts}
            preferences={preferences}
            onPreference={updatePreferences}
            onDeleteAttempt={deleteExamAttempt}
          />
        )}
      </div>

      <footer>
        <button className="wordmark footer-wordmark" onClick={() => navigate("home")}>
          <span className="wordmark-name"><b>EGE</b>GE</span>
        </button>
        <span>by Tsarapkin · открытая база заданий</span>
      </footer>

      {gateSection && (
        <AccessGateModal
          section={gateSection}
          isRegistered={isRegistered}
          onClose={() => setGateSection(null)}
          onContinue={continueFromGate}
        />
      )}
      <Toast message={toast} />
      <button
        className={`scroll-to-top ${showScrollTop ? "is-visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Вернуться к фильтрам"
      >
        ↑
      </button>
      {examVariant && (
        <Suspense fallback={<div className="exam-loading-screen">Готовим вариант…</div>}>
          <ExamStation
            variant={examVariant}
            onClose={() => setExamVariant(null)}
            onFinish={saveExamAttempt}
          />
        </Suspense>
      )}
      <div className="xp-layer" aria-hidden="true">
        {bursts.map((burst) => (
          <div
            className={`xp-burst reaction-${burst.reaction}`}
            style={{ left: burst.x, top: burst.y }}
            key={burst.id}
          >
            <strong>
              {burst.reaction === "xp" && `+${XP_PER_ANSWER} XP`}
              {burst.reaction === "hearts" && "♥"}
              {burst.reaction === "letters" && "ЕГЭ"}
              {burst.reaction === "fire" && "🔥"}
              {burst.reaction === "fireworks" && "✦"}
            </strong>
            {(burst.reaction === "xp"
              ? burstParticles
              : burst.reaction === "hearts"
                ? heartParticles
                : burst.reaction === "letters"
                  ? letterParticles
                  : burst.reaction === "fire"
                    ? fireParticles
                    : fireworkParticles
            ).map((particle, index) => (
              <i
                className={
                  particle.label === "•"
                    ? burst.reaction === "fireworks"
                      ? `firework-spark firework-color-${index % 5}`
                      : "xp-spark"
                    : burst.reaction === "hearts"
                      ? "heart-token"
                      : burst.reaction === "letters"
                        ? "letter-token"
                        : burst.reaction === "fire"
                          ? particle.label === "·" ? "fire-ember" : "fire-token"
                          : burst.reaction === "fireworks"
                            ? `firework-star firework-color-${index % 5}`
                            : "xp-token"
                }
                style={{
                  "--xp-x": `${particle.x}px`,
                  "--xp-y": `${particle.y}px`,
                  "--xp-r": `${particle.r}deg`,
                  "--xp-delay": `${index * 12}ms`,
                } as React.CSSProperties}
                key={index}
              >
                {particle.label}
              </i>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className={`toast ${message ? "is-visible" : ""}`} role="status">
      <span className="toast-dot" />
      {message}
    </div>
  );
}
