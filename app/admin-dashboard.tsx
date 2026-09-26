"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { AppUser } from "@/lib/app-user";
import AvatarVisual from "./avatar-visual";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileText,
  Files,
  LayoutDashboard,
  LogIn,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";

type AdminUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  email: string;
  board_limit: number;
  board_count: number;
  last_seen_at: number;
  variants: number;
  average_score: number;
  marathon_seconds?: number;
  marathon_last_seen_at?: number;
  marathon_online?: number;
  acquisition_source: string;
  acquisition_campaign: string;
  acquisition_at: number;
};

type AdminPayload = {
  metrics: { registered: number; newUsers: number; visitorsToday: number };
  users: AdminUser[];
  activity: Array<{ day: string; visits: number; registrations: number }>;
  funnel: { opened: number; logged: number; started: number; completed: number };
  sources: Array<{ source: string; medium: string; campaign: string; content: string; referrer_host: string; visitors: number; registrations: number }>;
  content: Array<{ label: string; value: number }>;
  actions: Array<{ action: string; created_at: number; display_name: string; username: string }>;
  teacherTasks: Array<{ id: number; public_id: string; exam_number: number; note: string; statement_html: string; difficulty: string; approved: number; author: string }>;
  teacherVariants: Array<{ id: number; kim: string; title: string; description_html: string; task_count: number; approved: number; complete: boolean; author: string }>;
};

type AdminTab = "overview" | "users" | "sources" | "limits" | "content" | "events";

async function adminRequest<T>(init?: RequestInit) {
  const response = await fetch("/api/admin", {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Не удалось загрузить данные");
  return payload;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
}

function marathonTime(seconds: number) {
  if (!seconds) return "0 мин";
  if (seconds < 60) return `${Math.floor(seconds)} сек`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} мин` : `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}

function timeAgo(timestamp: number) {
  if (!timestamp) return "Ещё не входил";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

function ActivityChart({ data, dataKey, label }: {
  data: AdminPayload["activity"];
  dataKey: "visits" | "registrations";
  label: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chart = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - offset));
      const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
      const found = data.find((item) => item.day === key);
      return { key, visits: Number(found?.visits ?? 0), registrations: Number(found?.registrations ?? 0) };
    });
    const max = Math.max(1, ...days.map((item) => item[dataKey]));
    return { days, max };
  }, [data, dataKey]);
  const activeDay = activeIndex == null ? null : chart.days[activeIndex];
  const activeDate = activeDay
    ? new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
      .format(new Date(`${activeDay.key}T12:00:00`))
    : "";

  return (
    <div className={`admin-chart is-${dataKey}`}>
      <div className="admin-chart-canvas">
        <div className="admin-chart-scale"><span>{chart.max}</span><span>{Math.round(chart.max / 2)}</span><span>0</span></div>
        <div className="admin-chart-bars" aria-label={`${label} по дням за последние 30 дней`}>
          {chart.days.map((item, index) => <button
            aria-label={`${new Date(`${item.key}T12:00:00`).toLocaleDateString("ru-RU")}: ${item[dataKey]} — ${label.toLowerCase()}`}
            className={`admin-chart-bar ${activeIndex === index ? "is-active" : ""}`}
            key={item.key}
            onBlur={() => setActiveIndex((current) => current === index ? null : current)}
            onFocus={() => setActiveIndex(index)}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex((current) => current === index ? null : current)}
            style={{ height: `${Math.max(item[dataKey] ? 4 : 1, (item[dataKey] / chart.max) * 100)}%` }}
            type="button"
          />)}
        </div>
        {activeDay && <div
          className="admin-chart-tooltip"
          style={{ "--tooltip-x": `${(activeIndex! / 29) * 100}%` } as CSSProperties}
        >
          <span>{activeDate}</span>
          <strong>{compactNumber(activeDay[dataKey])}</strong>
          <small>{label}</small>
        </div>}
      </div>
      <div className="admin-chart-dates">
        {[0, 7, 14, 21, 29].map((index) => (
          <span key={index}>{new Date(`${chart.days[index].key}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onExit }: { user: AppUser; onExit: () => void }) {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [query, setQuery] = useState("");
  const [savingUser, setSavingUser] = useState("");
  const [savingContent, setSavingContent] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await adminRequest<AdminPayload>());
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Админ-панель недоступна");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.users ?? []).filter((entry) => {
      const matchesQuery = !normalized || [entry.display_name, entry.username, entry.email]
        .some((value) => String(value ?? "").toLowerCase().includes(normalized));
      return matchesQuery;
    });
  }, [data?.users, query]);

  const setBoardLimit = async (entry: AdminUser, boardLimit: number) => {
    const normalized = Math.max(0, Math.min(100, Math.round(boardLimit)));
    if (normalized === entry.board_limit) return;
    setSavingUser(entry.user_id);
    setData((current) => current ? {
      ...current,
      users: current.users.map((item) => item.user_id === entry.user_id ? { ...item, board_limit: normalized } : item),
    } : current);
    try {
      await adminRequest({
        method: "POST",
        body: JSON.stringify({ action: "set_board_limit", userId: entry.user_id, boardLimit: normalized }),
      });
      await load(true);
    } catch (nextError) {
      await load(true);
      setError(nextError instanceof Error ? nextError.message : "Не удалось изменить лимит досок");
    } finally {
      setSavingUser("");
    }
  };
  const moderate = async (kind: "task" | "variant", id: number, approved: boolean, difficulty?: string) => {
    const key = `${kind}-${id}`;
    setSavingContent(key);
    try {
      await adminRequest({ method: "POST", body: JSON.stringify({ action: `moderate_${kind}`, id, approved, difficulty }) });
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось изменить публикацию");
    } finally { setSavingContent(""); }
  };

  const nav: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "overview", label: "Обзор", icon: LayoutDashboard },
    { id: "users", label: "Пользователи", icon: UsersRound },
    { id: "sources", label: "Источники трафика", icon: TrendingUp },
    { id: "limits", label: "Лимиты досок", icon: Files },
    { id: "content", label: "Контент", icon: FileText },
    { id: "events", label: "События", icon: Activity },
  ];

  if (loading) return <div className="admin-state"><span>•••</span><p>Собираем данные админ-панели</p></div>;
  if (error && !data) return (
    <div className="admin-state is-error">
      <ShieldCheck />
      <h1>Админ-панель закрыта</h1>
      <p>{error}</p>
      <button onClick={onExit}>Вернуться в профиль</button>
    </div>
  );
  if (!data) return null;

  const totalViews = data.content.reduce((sum, item) => sum + Number(item.value), 0) || 1;
  const funnelItems = [
    { label: "Открыл сайт", value: Number(data.funnel.opened), icon: BarChart3 },
    { label: "Вошёл", value: Number(data.funnel.logged), icon: LogIn },
    { label: "Начал вариант", value: Number(data.funnel.started), icon: BookOpen },
    { label: "Завершил", value: Number(data.funnel.completed), icon: CheckCircle2 },
  ];
  const metrics = [
    { label: "Зарегистрировано", value: data.metrics.registered, icon: UserRound },
    { label: "Новых за 30 дней", value: data.metrics.newUsers, icon: TrendingUp },
    { label: "Уникальных посетителей сегодня", value: data.metrics.visitorsToday, icon: UsersRound },
  ];

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <button className="admin-brand" onClick={onExit} aria-label="Вернуться на сайт"><b>EGE</b>GE</button>
        <nav aria-label="Разделы админ-панели">
          {nav.map((item) => {
            const Icon = item.icon;
            return <button className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)} key={item.id}><Icon /><span>{item.label}</span></button>;
          })}
        </nav>
        <button className="admin-person" onClick={onExit}>
          <span>{(user.email ?? "A").charAt(0).toUpperCase()}</span>
          <div><strong>Администратор</strong><small>Вернуться на сайт</small></div>
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-heading">
          <div><h1>{nav.find((item) => item.id === tab)?.label}</h1><span><i /> {error ? "Обновление не удалось" : "Обновление каждые 30 секунд"}</span></div>
          {error && <p>{error}</p>}
        </header>

        {(tab === "overview" || tab === "users" || tab === "limits") && (
          <section className="admin-metrics" aria-label="Основные показатели">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return <article key={metric.label}><span><Icon /></span><div><small>{metric.label}</small><strong>{compactNumber(metric.value)}</strong></div></article>;
            })}
          </section>
        )}

        {(tab === "overview" || tab === "events") && (
          <>
          <section className="admin-charts-grid">
            <article className="admin-panel admin-activity-panel"><h2>Уникальные посетители</h2><p className="admin-data-note">Один пользователь учитывается один раз в день. Только при согласии на аналитику.</p><ActivityChart data={data.activity} dataKey="visits" label="Уникальные посетители" /></article>
            <article className="admin-panel admin-activity-panel"><h2>Регистрации</h2><p className="admin-data-note">Новые профили по дням. Время московское.</p><ActivityChart data={data.activity} dataKey="registrations" label="Регистрации" /></article>
          </section>
          <section className="admin-overview-grid is-funnel-only">
            <article className="admin-panel admin-funnel">
              <h2>Путь ученика за 30 дней</h2>
              <p className="admin-data-note">Только записанные сеансы аналитики. Прошлые посещения, которые не были записаны, восстановить нельзя.</p>
              <div>{funnelItems.map((item, index) => {
                const Icon = item.icon;
                const percent = data.funnel.opened ? Math.round((item.value / data.funnel.opened) * 1000) / 10 : 0;
                return <div className="admin-funnel-row" key={item.label}><span><Icon /></span><strong>{item.label}</strong><b>{compactNumber(item.value)}</b>{index > 0 && <em>{percent}%</em>}</div>;
              })}</div>
            </article>
          </section>
          </>
        )}
        {tab === "sources" && <article className="admin-panel admin-sources"><h2>Откуда приходят люди</h2><p className="admin-data-note">Детализация за 30 дней по площадке, каналу, кампании и конкретному размещению.</p><div className="admin-source-table"><header><span>Площадка</span><span>Канал</span><span>Кампания</span><span>Размещение</span><span>Посетители</span><span>Регистрации</span></header>{data.sources.map((item) => <div key={`${item.source}-${item.medium}-${item.campaign}-${item.content}`}><strong>{item.source === "direct" ? "Прямые / не определено" : item.source}</strong><small>{item.medium || "—"}</small><span>{item.campaign || "—"}</span><span>{item.content || item.referrer_host || "—"}</span><b>{compactNumber(item.visitors)}</b><em>{compactNumber(item.registrations)}</em></div>)}</div></article>}

        <section className="admin-bottom-grid">
          {tab === "content" && (
            <article className="admin-panel admin-moderation">
              <header><div><h2>Модерация</h2><p>Только одобренный контент виден всем посетителям.</p></div></header>
              <h3>Задания</h3>
              <div className="admin-moderation-list">{data.teacherTasks.map((task) => (
                <article key={task.id}><div className="admin-moderation-copy"><strong>ID {task.public_id} · {task.exam_number === 19 ? "№19–21" : `№${task.exam_number}`}</strong><small>{task.author} · {task.note || "Без примечания"}</small><div dangerouslySetInnerHTML={{ __html: task.statement_html }} /></div><select value={task.difficulty} onChange={(event) => void moderate("task", task.id, Boolean(task.approved), event.target.value)}><option>Базовый</option><option>Средний</option><option>Сложный</option></select><button className={`admin-switch ${task.approved ? "is-active" : ""}`} role="switch" aria-checked={Boolean(task.approved)} disabled={savingContent === `task-${task.id}`} onClick={() => void moderate("task", task.id, !task.approved, task.difficulty)}><span /></button></article>
              ))}</div>
              <h3>Варианты</h3>
              <div className="admin-moderation-list">{data.teacherVariants.map((variant) => (
                <article key={variant.id}><div className="admin-moderation-copy"><strong>КИМ {variant.kim} · {variant.title}</strong><small>{variant.author} · {variant.task_count} записей · {variant.complete ? "Полный 1–27" : "Неполный"}</small></div><button className={`admin-switch ${variant.approved ? "is-active" : ""}`} role="switch" aria-checked={Boolean(variant.approved)} disabled={!variant.complete || savingContent === `variant-${variant.id}`} title={variant.complete ? "" : "Нужен полный порядок 1–27"} onClick={() => void moderate("variant", variant.id, !variant.approved)}><span /></button></article>
              ))}</div>
            </article>
          )}
          {(tab === "overview" || tab === "users" || tab === "limits") && (
            <article className={`admin-panel admin-users ${tab === "limits" ? "is-limits" : "is-students"}`}>
              <header>
                <h2>{tab === "limits" ? "Лимиты досок" : "Ученики"} · {filteredUsers.length}</h2>
                <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, email или username" /></label>
              </header>
              {tab === "limits" && <p className="admin-data-note">Лимит ограничивает создание новых досок. Существующие доски при уменьшении лимита не удаляются.</p>}
              <div className="admin-user-table">
                <div className="admin-user-head"><span>Ученик</span>{tab !== "limits" && <><span>Источник</span><span>Активность</span><span>Марафон</span><span>Варианты</span><span>Средний балл</span></>}<span>Доски</span>{tab === "limits" && <span>Лимит</span>}</div>
                {filteredUsers.map((entry) => (
                  <div className="admin-user-row" key={entry.user_id}>
                    <div className="admin-user-name"><span className="admin-user-avatar"><AvatarVisual value={entry.avatar_emoji || "🙂"} /></span><div><strong>{entry.display_name}</strong><small>@{entry.username}{entry.email ? ` · ${entry.email}` : ""}</small></div></div>
                    {tab !== "limits" && <><span className="admin-user-source" data-label="Источник"><strong>{entry.acquisition_source ? (entry.acquisition_source === "direct" ? "Прямой" : entry.acquisition_source) : "Не определён"}</strong>{entry.acquisition_campaign && <small>{entry.acquisition_campaign}</small>}</span><span data-label="Активность">{timeAgo(Number(entry.last_seen_at))}</span><span className="admin-user-marathon" data-label="Марафон"><strong>{marathonTime(Number(entry.marathon_seconds))}</strong>{Boolean(entry.marathon_online) && <small>Сейчас в марафоне</small>}</span>
                    <span data-label="Варианты">{Number(entry.variants)}</span>
                    <span data-label="Средний балл">{entry.variants ? Number(entry.average_score) : "—"}</span></>}
                    <span data-label="Доски">{Number(entry.board_count)}</span>
                    {tab === "limits" && <div className="admin-board-limit" data-label="Лимит">
                      <button disabled={savingUser === entry.user_id || entry.board_limit <= 0} onClick={() => void setBoardLimit(entry, entry.board_limit - 1)} aria-label={`Уменьшить лимит для ${entry.display_name}`}>−</button>
                      <input key={`${entry.user_id}-${entry.board_limit}`} type="number" min="0" max="100" defaultValue={entry.board_limit} disabled={savingUser === entry.user_id} onBlur={(event) => void setBoardLimit(entry, Number(event.target.value))} aria-label={`Лимит досок для ${entry.display_name}`} />
                      <button disabled={savingUser === entry.user_id || entry.board_limit >= 100} onClick={() => void setBoardLimit(entry, entry.board_limit + 1)} aria-label={`Увеличить лимит для ${entry.display_name}`}>+</button>
                    </div>}
                  </div>
                ))}
                {!filteredUsers.length && <p className="admin-empty">По этому фильтру учеников пока нет.</p>}
              </div>
            </article>
          )}

          {(tab === "overview" || tab === "events") && (
            <aside className="admin-side-panels">
              {tab === "overview" && <article className="admin-panel admin-content"><h2>Что смотрят</h2>{data.content.slice(0, 4).map((item, index) => <div key={item.label}><span>{index + 1}</span><strong>{item.label}</strong><b>{compactNumber(Number(item.value))}</b><em>{Math.round((Number(item.value) / totalViews) * 100)}%</em></div>)}</article>}
              {(tab === "overview" || tab === "events") && <article className="admin-panel admin-actions"><h2>Последние действия</h2>{data.actions.length ? data.actions.map((action) => <div key={`${action.created_at}-${action.username}`}><span><Files /></span><p><strong>Лимит досок изменён</strong><small>{action.display_name || `@${action.username}`} · {timeAgo(Number(action.created_at))}</small></p></div>) : <p className="admin-empty">Действий пока нет.</p>}</article>}
            </aside>
          )}
        </section>
      </main>
    </div>
  );
}
