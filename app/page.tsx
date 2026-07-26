"use client";

import type { Provider, User } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Section = "home" | "tasks" | "variants" | "theory" | "game" | "dashboard";
type GateSection = Extract<Section, "theory" | "game" | "dashboard">;
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

type Variant = {
  id: string;
  title: string;
  description: string;
  taskIds: string[];
};

type Burst = {
  id: number;
  x: number;
  y: number;
  reaction: BurstReaction;
};

const STORAGE_KEY = "egege-activity-v1";
const PREFERENCES_KEY = "egege-preferences-v1";
const PREMIUM_KEY = "egege-premium-demo-v1";
const PENDING_ACCESS_KEY = "egege-pending-access-v1";
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
        {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
      </span>
      {premium && (
        <span className="chain-strand chain-reverse">
          {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
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
    { section: "dashboard", label: "Дашборд", locked: !isRegistered },
  ];

  return (
    <header className="topbar">
      <button className="wordmark" onClick={() => navigate("home")}>
        <span className="mini-mark">Е</span>
        <span className="wordmark-name"><b>EGE</b>GE</span>
        <small className="wordmark-by">by Tsarapkin</small>
      </button>
      <div className="topbar-actions">
        <nav aria-label="Разделы">
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
  onCorrect,
  onIncorrect,
}: {
  task: Task;
  onCorrect: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onIncorrect: () => void;
}) {
  const [answerOpen, setAnswerOpen] = useState(false);

  return (
    <article className="task-item">
      <div className="task-meta">
        <span className="task-id">{task.id}</span>
        <span>№{task.number}</span>
        <span>{task.difficulty}</span>
        <span>{task.source}</span>
      </div>
      <h2>{task.title}</h2>
      {task.note && <p className="task-note">{task.note}</p>}
      <div
        className="task-body task-html"
        dangerouslySetInnerHTML={{ __html: task.html }}
      />
      {task.files.length > 0 && (
        <div className="task-files">
          {task.files.map((file) => (
            <a className="file-link" href={file.href} download key={file.href}>
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
              <span>Ваш ответ совпал?</span>
              <button className="match-yes" onClick={onCorrect}>Да</button>
              <button onClick={onIncorrect}>Нет</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
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
    const theoryCards = ["if", "for", "while", "def"];
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
          <AccessBadge premium />
        </div>
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

function Dashboard({ activity }: { activity: Activity }) {
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

  const total = Object.values(activity).reduce((sum, count) => sum + count, 0);
  const activeDays = Object.values(activity).filter((count) => count > 0).length;
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  while ((activity[dateKey(cursor)] ?? 0) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return (
    <div className="dashboard-content">
      <section className="stats-grid" aria-label="Статистика">
        <article>
          <span>Правильных ответов</span>
          <strong>{total}</strong>
        </article>
        <article>
          <span>Накоплено</span>
          <strong>{total * XP_PER_ANSWER}<small> XP</small></strong>
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
            <p>Каждая отметка «Да» добавляет один правильный ответ.</p>
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

export default function Home() {
  const [section, setSection] = useState<Section>("home");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [source, setSource] = useState("all");
  const [openVariant, setOpenVariant] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Activity) : {};
    } catch {
      return {};
    }
  });
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [gateSection, setGateSection] = useState<GateSection | null>(null);
  const [rattlingSection, setRattlingSection] = useState<GateSection | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [authConfigured, setAuthConfigured] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(() => {
    if (typeof window === "undefined") return defaultPreferences;
    try {
      const saved = window.localStorage.getItem(PREFERENCES_KEY);
      return saved
        ? { ...defaultPreferences, ...(JSON.parse(saved) as Partial<Preferences>) }
        : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstId = useRef(0);
  const isRegistered = Boolean(user);

  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      return;
    }
    try {
      setIsPremium(window.localStorage.getItem(`${PREMIUM_KEY}:${user.id}`) === "true");
    } catch {
      setIsPremium(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    void fetch("/data/kompege-tasks.json")
      .then((response) => {
        if (!response.ok) throw new Error("Не удалось загрузить задания");
        return response.json() as Promise<Task[]>;
      })
      .then((data) => {
        if (active) setTasks(data);
      })
      .catch(() => {
        if (active) notify("Не удалось загрузить базу заданий");
      })
      .finally(() => {
        if (active) setTasksLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
        if (active) setUser(session?.user ?? null);
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
    if (pending === "theory") {
      setGateSection("theory");
      return;
    }
    setSection(pending);
    window.scrollTo({ top: 0 });
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
    if ((nextSection === "dashboard" || nextSection === "game") && !isRegistered) {
      showAccessGate(nextSection);
      return;
    }
    if (nextSection === "theory" && (!isRegistered || !isPremium)) {
      showAccessGate("theory");
      return;
    }
    setSection(nextSection);
    setProfileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notify = (message: string) => {
    setToast("");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    requestAnimationFrame(() => setToast(message));
    toastTimer.current = setTimeout(() => setToast(""), 2500);
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

  const addCorrectAnswer = (event: React.MouseEvent<HTMLButtonElement>) => {
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

    const key = dateKey(new Date());
    setActivity((current) => {
      const next = { ...current, [key]: (current[key] ?? 0) + 1 };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keep the in-memory dashboard working if storage is unavailable.
      }
      return next;
    });
    notify(`+${XP_PER_ANSWER} XP · записано в дашборд`);
  };

  const updatePreferences = (next: Partial<Preferences>) => {
    setPreferences((current) => {
      const updated = { ...current, ...next };
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
    if (section === "dashboard" || section === "theory" || section === "game") setSection("tasks");
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
      onToggle={() => setProfileOpen((current) => !current)}
      onPreference={updatePreferences}
      onPremiumChange={updatePremium}
      onEmailLogin={sendMagicLink}
      onGoogleLogin={loginWithGoogle}
      onLogout={logout}
    />
  );

  const appearance = {
    "data-theme": preferences.theme,
    "data-accent": preferences.accent,
  };

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const normalizedSearch = search.trim();
        return (
          (!normalizedSearch || task.id.includes(normalizedSearch)) &&
          (type === "all" || task.number === Number(type)) &&
          (difficulty === "all" || task.difficulty === difficulty) &&
          (source === "all" || task.source === source)
        );
      }),
    [tasks, search, type, difficulty, source],
  );

  const variants = useMemo<Variant[]>(
    () => [
      {
        id: "01",
        title: "Разминка",
        description: "Три коротких задания из разных тем.",
        taskIds: [tasks[0]?.id, tasks[9]?.id, tasks[21]?.id].filter(Boolean) as string[],
      },
      {
        id: "02",
        title: "Практика с файлами",
        description: "Два задания повышенной сложности.",
        taskIds: [tasks[48]?.id, tasks[75]?.id].filter(Boolean) as string[],
      },
    ],
    [tasks],
  );

  const resetFilters = () => {
    setSearch("");
    setType("all");
    setDifficulty("all");
    setSource("all");
  };

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
      <main className="home" {...appearance}>
        <ProfileMenu
          open={profileOpen}
          user={user}
          authConfigured={authConfigured}
          preferences={preferences}
          isPremium={isPremium}
          onToggle={() => setProfileOpen((current) => !current)}
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
              ? "Игра и дашборд открыты · теория в премиуме"
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
    <main className="tasks-page" {...appearance}>
      <AppHeader
        section={section}
        navigate={navigate}
        isRegistered={isRegistered}
        isPremium={isPremium}
        rattlingSection={rattlingSection}
        profile={profile}
      />

      <div className="tasks-shell">
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
                    onChange={(event) => setSearch(event.target.value.replace(/\D/g, ""))}
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
                  <option value="all">Все номера</option>
                  {Array.from({ length: 27 }, (_, index) => index + 1).map((number) => (
                    <option value={number} key={number}>№{number}</option>
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
                  <option>КЕГЭ</option>
                </select>
              </label>
              <button className="reset-button" onClick={resetFilters}>
                <span aria-hidden="true">↺</span> Сбросить
              </button>
            </section>

            <div className="results-bar">
              <span>Найдено: <b>{filteredTasks.length}</b></span>
              <i />
              <span>Показаны все задания</span>
            </div>

            <section className="task-list" aria-live="polite">
              {tasksLoading ? (
                <div className="empty-state is-loading">
                  <span>•••</span>
                  <h2>Загружаем задания</h2>
                  <p>База откроется через несколько секунд.</p>
                </div>
              ) : filteredTasks.length ? (
                filteredTasks.map((task) => (
                  <TaskItem task={task} key={task.id} {...taskProps} />
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
              eyebrow="Тестовый режим"
              title="Варианты"
              description="Небольшие подборки заданий для быстрой тренировки."
            />
            <section className="variant-list" aria-label="Доступные варианты">
              {variants.map((variant) => {
                const isOpen = openVariant === variant.id;
                return (
                  <article className={`variant-card ${isOpen ? "is-open" : ""}`} key={variant.id}>
                    <div className="variant-number">{variant.id}</div>
                    <div className="variant-copy">
                      <h2>{variant.title}</h2>
                      <p>{variant.description}</p>
                    </div>
                    <span className="variant-count">{variant.taskIds.length} задания</span>
                    <button onClick={() => setOpenVariant(isOpen ? null : variant.id)}>
                      {isOpen ? "Свернуть" : "Открыть"}
                    </button>
                  </article>
                );
              })}
            </section>

            {openVariant && (
              <section className="variant-run">
                <div className="variant-run-heading">
                  <span>Вариант {openVariant}</span>
                  <p>Ответы можно смотреть в любом порядке.</p>
                </div>
                {variants
                  .find((variant) => variant.id === openVariant)
                  ?.taskIds.map((taskId) => {
                    const task = tasks.find((item) => item.id === taskId);
                    return task ? <TaskItem task={task} key={task.id} {...taskProps} /> : null;
                  })}
              </section>
            )}
          </>
        )}

        {section === "theory" && <PremiumPlaceholder section="theory" />}

        {section === "game" && <PremiumPlaceholder section="game" />}

        {section === "dashboard" && (
          <>
            <PageHeading
              eyebrow="Ваш профиль"
              title="Дашборд"
              description="Пока прогресс хранится в этом браузере; синхронизацию подключим после базы пользователей."
            />
            <Dashboard activity={activity} />
          </>
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
