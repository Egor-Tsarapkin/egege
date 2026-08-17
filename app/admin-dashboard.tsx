"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Crown,
  FileText,
  LayoutDashboard,
  LogIn,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AdminUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  email: string;
  premium: number;
  last_seen_at: number;
  variants: number;
  average_score: number;
};

type AdminPayload = {
  metrics: { online: number; registered: number; newUsers: number; averageMinutes: number };
  users: AdminUser[];
  activity: Array<{ day: string; visits: number; registrations: number }>;
  funnel: { opened: number; logged: number; started: number; completed: number };
  content: Array<{ label: string; value: number }>;
  actions: Array<{ action: string; created_at: number; display_name: string; username: string }>;
  teacherTasks: Array<{ id: number; public_id: string; exam_number: number; note: string; statement_html: string; difficulty: string; approved: number; author: string }>;
  teacherVariants: Array<{ id: number; kim: string; title: string; description_html: string; task_count: number; approved: number; complete: boolean; author: string }>;
};

type AdminTab = "overview" | "users" | "premium" | "content" | "events";

async function adminRequest<T>(init?: RequestInit) {
  const client = await getSupabaseBrowserClient();
  const { data } = client ? await client.auth.getSession() : { data: { session: null } };
  const response = await fetch("/api/admin", {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(data.session?.access_token ? { authorization: `Bearer ${data.session.access_token}` } : {}),
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

function timeAgo(timestamp: number) {
  if (!timestamp) return "Ещё не входил";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

function ActivityChart({ data }: { data: AdminPayload["activity"] }) {
  const points = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - offset));
      const key = date.toISOString().slice(0, 10);
      const found = data.find((item) => item.day === key);
      return { key, visits: Number(found?.visits ?? 0), registrations: Number(found?.registrations ?? 0) };
    });
    const max = Math.max(4, ...days.flatMap((item) => [item.visits, item.registrations]));
    const build = (key: "visits" | "registrations") => days.map((item, index) => ({
      x: (index / 29) * 100,
      y: 94 - (item[key] / max) * 82,
    }));
    return { days, visits: build("visits"), registrations: build("registrations"), max };
  }, [data]);

  const path = (items: Array<{ x: number; y: number }>) =>
    items.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

  return (
    <div className="admin-chart">
      <div className="admin-chart-legend">
        <span><i /> Посещения</span>
        <span><i className="is-dotted" /> Регистрации</span>
      </div>
      <div className="admin-chart-canvas">
        <div className="admin-chart-scale"><span>{points.max}</span><span>{Math.round(points.max / 2)}</span><span>0</span></div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Активность сайта за 30 дней">
          <defs>
            <linearGradient id="admin-chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity=".23" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="admin-chart-area" d={`${path(points.visits)} L100,100 L0,100 Z`} />
          <path className="admin-chart-line" d={path(points.visits)} />
          <path className="admin-chart-line is-secondary" d={path(points.registrations)} />
        </svg>
      </div>
      <div className="admin-chart-dates">
        {[0, 7, 14, 21, 29].map((index) => (
          <span key={index}>{new Date(`${points.days[index].key}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onExit }: { user: User; onExit: () => void }) {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "premium" | "regular">("all");
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

  useEffect(() => {
    queueMicrotask(() => {
      if (tab === "premium") setFilter("premium");
      if (tab === "users") setFilter("all");
    });
  }, [tab]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.users ?? []).filter((entry) => {
      const matchesQuery = !normalized || [entry.display_name, entry.username, entry.email]
        .some((value) => String(value ?? "").toLowerCase().includes(normalized));
      const matchesFilter = filter === "all" || (filter === "premium" ? entry.premium : !entry.premium);
      return matchesQuery && matchesFilter;
    });
  }, [data?.users, filter, query]);

  const setPremium = async (entry: AdminUser, premium: boolean) => {
    setSavingUser(entry.user_id);
    setData((current) => current ? {
      ...current,
      users: current.users.map((item) => item.user_id === entry.user_id ? { ...item, premium: premium ? 1 : 0 } : item),
    } : current);
    try {
      await adminRequest({
        method: "POST",
        body: JSON.stringify({ action: "set_premium", userId: entry.user_id, premium }),
      });
      await load(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось изменить премиум");
      await load(true);
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
    { id: "premium", label: "Премиум", icon: Crown },
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
    { label: "Сейчас на сайте", value: data.metrics.online, icon: UsersRound },
    { label: "Зарегистрировано", value: data.metrics.registered, icon: UserRound },
    { label: "Новых за 7 дней", value: data.metrics.newUsers, icon: TrendingUp },
    { label: "Среднее время", value: `${data.metrics.averageMinutes} мин`, icon: Clock3, raw: true },
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
          <div><h1>Админ-панель</h1><span><i /> Данные обновляются</span></div>
          {error && <p>{error}</p>}
        </header>

        {(tab === "overview" || tab === "users" || tab === "premium") && (
          <section className="admin-metrics" aria-label="Основные показатели">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return <article key={metric.label}><span><Icon /></span><div><small>{metric.label}</small><strong>{metric.raw ? metric.value : compactNumber(Number(metric.value))}</strong></div></article>;
            })}
          </section>
        )}

        {(tab === "overview" || tab === "events") && (
          <section className="admin-overview-grid">
            <article className="admin-panel admin-activity-panel"><h2>Активность за 30 дней</h2><ActivityChart data={data.activity} /></article>
            <article className="admin-panel admin-funnel">
              <h2>Путь ученика</h2>
              <div>{funnelItems.map((item, index) => {
                const Icon = item.icon;
                const percent = data.funnel.opened ? Math.round((item.value / data.funnel.opened) * 1000) / 10 : 0;
                return <div className="admin-funnel-row" key={item.label}><span><Icon /></span><strong>{item.label}</strong><b>{compactNumber(item.value)}</b>{index > 0 && <em>{percent}%</em>}</div>;
              })}</div>
            </article>
          </section>
        )}

        <section className="admin-bottom-grid">
          {tab === "content" && (
            <article className="admin-panel admin-moderation">
              <header><div><h2>Модерация</h2><p>Только одобренный контент виден всем посетителям.</p></div></header>
              <h3>Задания</h3>
              <div className="admin-moderation-list">{data.teacherTasks.map((task) => (
                <article key={task.id}><div className="admin-moderation-copy"><strong>ID {task.public_id} · {task.exam_number === 19 ? "№19–21" : `№${task.exam_number}`}</strong><small>{task.author} · {task.note || "Без примечания"}</small><div dangerouslySetInnerHTML={{ __html: task.statement_html }} /></div><select value={task.difficulty} onChange={(event) => void moderate("task", task.id, Boolean(task.approved), event.target.value)}><option>Базовый</option><option>Средний</option><option>Сложный</option></select><button className={`admin-premium-toggle ${task.approved ? "is-active" : ""}`} role="switch" aria-checked={Boolean(task.approved)} disabled={savingContent === `task-${task.id}`} onClick={() => void moderate("task", task.id, !task.approved, task.difficulty)}><span /></button></article>
              ))}</div>
              <h3>Варианты</h3>
              <div className="admin-moderation-list">{data.teacherVariants.map((variant) => (
                <article key={variant.id}><div className="admin-moderation-copy"><strong>КИМ {variant.kim} · {variant.title}</strong><small>{variant.author} · {variant.task_count} записей · {variant.complete ? "Полный 1–27" : "Неполный"}</small></div><button className={`admin-premium-toggle ${variant.approved ? "is-active" : ""}`} role="switch" aria-checked={Boolean(variant.approved)} disabled={!variant.complete || savingContent === `variant-${variant.id}`} title={variant.complete ? "" : "Нужен полный порядок 1–27"} onClick={() => void moderate("variant", variant.id, !variant.approved)}><span /></button></article>
              ))}</div>
            </article>
          )}
          {(tab === "overview" || tab === "users" || tab === "premium") && (
            <article className="admin-panel admin-users">
              <header>
                <h2>Ученики</h2>
                <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя, email или username" /></label>
                <div className="admin-filters">
                  <button className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>Все</button>
                  <button className={filter === "premium" ? "is-active" : ""} onClick={() => setFilter("premium")}>С премиумом</button>
                  <button className={filter === "regular" ? "is-active" : ""} onClick={() => setFilter("regular")}>Без премиума</button>
                </div>
              </header>
              <div className="admin-user-table">
                <div className="admin-user-head"><span>Ученик</span><span>Последний вход</span><span>Варианты</span><span>Средний балл</span><span>Премиум</span></div>
                {filteredUsers.map((entry) => (
                  <div className="admin-user-row" key={entry.user_id}>
                    <div className="admin-user-name"><span>{entry.avatar_emoji || "🙂"}</span><div><strong>{entry.display_name}</strong><small>@{entry.username}{entry.email ? ` · ${entry.email}` : ""}</small></div></div>
                    <span data-label="Последний вход">{timeAgo(Number(entry.last_seen_at))}</span>
                    <span data-label="Варианты">{Number(entry.variants)}</span>
                    <span data-label="Средний балл">{Number(entry.average_score) || "—"}</span>
                    <button
                      className={`admin-premium-toggle ${entry.premium ? "is-active" : ""}`}
                      role="switch"
                      aria-checked={Boolean(entry.premium)}
                      disabled={savingUser === entry.user_id}
                      onClick={() => void setPremium(entry, !entry.premium)}
                    ><span>{entry.premium ? <Crown /> : null}</span></button>
                  </div>
                ))}
                {!filteredUsers.length && <p className="admin-empty">По этому фильтру учеников пока нет.</p>}
              </div>
            </article>
          )}

          {(tab === "overview" || tab === "events") && (
            <aside className="admin-side-panels">
              {tab === "overview" && <article className="admin-panel admin-content"><h2>Что смотрят</h2>{data.content.slice(0, 4).map((item, index) => <div key={item.label}><span>{index + 1}</span><strong>{item.label}</strong><b>{compactNumber(Number(item.value))}</b><em>{Math.round((Number(item.value) / totalViews) * 100)}%</em></div>)}</article>}
              {(tab === "overview" || tab === "events") && <article className="admin-panel admin-actions"><h2>Последние действия</h2>{data.actions.length ? data.actions.map((action) => <div key={`${action.created_at}-${action.username}`}><span><Crown /></span><p><strong>{action.action === "premium_granted" ? "Премиум выдан" : "Премиум отключён"}</strong><small>{action.display_name || `@${action.username}`} · {timeAgo(Number(action.created_at))}</small></p></div>) : <p className="admin-empty">Действий пока нет.</p>}</article>}
            </aside>
          )}
        </section>
      </main>
    </div>
  );
}
