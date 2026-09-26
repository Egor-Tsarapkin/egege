"use client";

import Link from "next/link";
import { ArrowDownUp, Copy, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppUser } from "@/lib/app-user";
import type { BoardSummary } from "@/lib/boards/types";

type Props = { user: AppUser | null; onLogin: () => void };
type BoardDialog = { mode: "rename" | "delete"; board: BoardSummary; title: string } | null;
type BoardQuota = { used: number; limit: number };
type BoardSort = "created" | "title";
type SortDirection = "asc" | "desc";

async function boardRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Не удалось выполнить действие");
  return body;
}

export default function BoardList({ user, onLogin }: Props) {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [group, setGroup] = useState<"owned" | "invited">("owned");
  const [sort, setSort] = useState<BoardSort>("created");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [invitedBoards, setInvitedBoards] = useState<BoardSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(Boolean(user));
  const [busy, setBusy] = useState("");
  const [menu, setMenu] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<BoardDialog>(null);
  const [quota, setQuota] = useState<BoardQuota>({ used: 0, limit: 3 });
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await boardRequest<{ boards: BoardSummary[]; invitedBoards: BoardSummary[]; quota: BoardQuota }>("/api/boards");
      setBoards(result.boards);
      setInvitedBoards(result.invitedBoards);
      setQuota(result.quota);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить доски");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  useEffect(() => {
    if (!menu) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu("");
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu("");
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    const items = group === "owned" ? boards : invitedBoards;
    const filtered = query ? items.filter((board) => board.title.toLocaleLowerCase("ru").includes(query)) : items;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((first, second) => {
      if (sort === "title") return first.title.localeCompare(second.title, "ru", { numeric: true, sensitivity: "base" }) * direction;
      return (first.createdAt - second.createdAt) * direction;
    });
  }, [boards, group, invitedBoards, search, sort, sortDirection]);

  async function createBoard() {
    setBusy("create");
    try {
      const result = await boardRequest<{ board: BoardSummary }>("/api/boards", {
        method: "POST",
        body: JSON.stringify({ title: "Новая доска" }),
      });
      setQuota((current) => ({ ...current, used: current.used + 1 }));
      window.location.assign(`/boards/${result.board.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать доску");
    } finally {
      setBusy("");
    }
  }

  async function rename(board: BoardSummary, nextTitle: string) {
    const title = nextTitle.trim();
    if (!title || title === board.title) { setDialog(null); return; }
    setBusy(board.id);
    try {
      const result = await boardRequest<{ board: BoardSummary }>(`/api/boards/${board.id}`, {
        method: "PATCH", body: JSON.stringify({ title }),
      });
      setBoards((current) => current.map((item) => item.id === board.id ? result.board : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось переименовать доску");
    } finally { setBusy(""); setMenu(""); setDialog(null); }
  }

  async function duplicate(board: BoardSummary) {
    setBusy(board.id);
    try {
      const result = await boardRequest<{ board: BoardSummary }>(`/api/boards/${board.id}/duplicate`, { method: "POST" });
      setBoards((current) => [result.board, ...current]);
      setQuota((current) => ({ ...current, used: current.used + 1 }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось дублировать доску");
    } finally { setBusy(""); setMenu(""); }
  }

  async function remove(board: BoardSummary) {
    setBusy(board.id);
    try {
      await boardRequest<{ ok: true }>(`/api/boards/${board.id}`, { method: "DELETE" });
      setBoards((current) => current.filter((item) => item.id !== board.id));
      setQuota((current) => ({ ...current, used: Math.max(0, current.used - 1) }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить доску");
    } finally { setBusy(""); setMenu(""); setDialog(null); }
  }

  if (!user) {
    return (
      <section className="boards-gate">
        <span className="boards-gate-mark" aria-hidden="true">✶</span>
        <p className="boards-eyebrow">Совместные занятия</p>
        <h1>Доска, на которой удобно объяснять</h1>
        <p>Войдите, чтобы создавать доски и приглашать учеников. По ссылке ученик сможет зайти без регистрации.</p>
        <button className="boards-primary" onClick={onLogin}>Войти и создать доску</button>
      </section>
    );
  }

  return (
    <section className="boards-page">
      <header className="boards-heading">
        <div><h1>Доски</h1><span>Доступно · {quota.used} из {quota.limit}</span></div>
        <button className="boards-primary" onClick={() => void createBoard()} disabled={busy === "create" || quota.used >= quota.limit} title={quota.used >= quota.limit ? `Доступно досок: ${quota.limit}` : ""}>
          <Plus aria-hidden="true" /> {busy === "create" ? "Создаём…" : "Новая доска"}
        </button>
      </header>
      <div className="boards-groups" role="group" aria-label="Тип досок">
        <button aria-pressed={group === "owned"} onClick={() => { setGroup("owned"); setMenu(""); }}>Свои доски · {boards.length}</button>
        <button aria-pressed={group === "invited"} onClick={() => { setGroup("invited"); setMenu(""); }}>Приглашённые доски · {invitedBoards.length}</button>
      </div>
      <div className="boards-controls">
        <label className="boards-search"><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти доску" /></label>
        <div className="boards-sort" aria-label="Сортировка досок">
          <div role="group" aria-label="Поле сортировки">
            <button type="button" aria-pressed={sort === "created"} onClick={() => setSort("created")}>Дата создания</button>
            <button type="button" aria-pressed={sort === "title"} onClick={() => setSort("title")}>Название</button>
          </div>
          <button
            type="button"
            className="boards-sort-direction"
            onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")}
            aria-label="Изменить направление сортировки"
          >
            <ArrowDownUp aria-hidden="true" />
            {sort === "title" ? (sortDirection === "asc" ? "А → Я" : "Я → А") : (sortDirection === "asc" ? "Сначала старые" : "Сначала новые")}
          </button>
        </div>
      </div>
      {error && <div className="boards-error" role="alert">{error}<button onClick={() => setError("") }>Закрыть</button></div>}
      {loading ? <div className="boards-loading">Загружаем доски…</div> : visible.length ? (
        <div className="boards-grid">
          {visible.map((board) => (
            <article className={`board-card ${busy === board.id ? "is-busy" : ""} ${menu === board.id ? "is-menu-open" : ""}`} key={board.id}>
              <div className="board-card-info">
                <Link href={`/boards/${board.id}`} aria-label={`Открыть ${board.title}`}>
                  <strong>{board.title}</strong>
                  {group === "invited" && <span className="board-owner-name">{board.ownerName}</span>}
                </Link>
                {group === "owned" && <button className="board-menu-trigger" onClick={() => setMenu((value) => value === board.id ? "" : board.id)} aria-label="Действия с доской" aria-expanded={menu === board.id} aria-controls={`board-menu-${board.id}`}><MoreHorizontal /></button>}
                {menu === board.id && <div className="board-card-menu" id={`board-menu-${board.id}`} ref={menuRef}>
                  <button onClick={() => { setDialog({ mode: "rename", board, title: board.title }); setMenu(""); }}><Pencil />Переименовать</button>
                  <button onClick={() => void duplicate(board)} disabled={quota.used >= quota.limit}><Copy />Дублировать</button>
                  <button className="is-danger" onClick={() => { setDialog({ mode: "delete", board, title: board.title }); setMenu(""); }}><Trash2 />Удалить</button>
                </div>}
              </div>
            </article>
          ))}
        </div>
      ) : <div className="boards-empty"><span>◎</span><h2>{search ? "Ничего не найдено" : group === "owned" ? "Первая доска ещё не создана" : "Пока нет приглашённых досок"}</h2><p>{search ? "Проверьте запрос." : group === "owned" ? "Начните с пустого бесконечного полотна." : "Откройте ссылку на доску, войдя в аккаунт — она появится здесь."}</p></div>}
      {dialog && <div className="board-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}><form className="board-dialog" onSubmit={(event) => {
        event.preventDefault();
        if (dialog.mode === "rename") void rename(dialog.board, dialog.title);
        else void remove(dialog.board);
      }}>
        <h2>{dialog.mode === "rename" ? "Переименовать доску" : "Удалить доску?"}</h2>
        {dialog.mode === "rename" ? <input autoFocus value={dialog.title} maxLength={120} onChange={(event) => setDialog((current) => current ? { ...current, title: event.target.value } : current)} aria-label="Новое название" /> : <p>«{dialog.board.title}» и ссылки на неё перестанут работать.</p>}
        <div className="board-dialog-actions"><button type="button" onClick={() => setDialog(null)}>Отмена</button><button className={dialog.mode === "delete" ? "is-danger" : "is-primary"} type="submit" disabled={busy === dialog.board.id || (dialog.mode === "rename" && !dialog.title.trim())}>{busy === dialog.board.id ? "Подождите…" : dialog.mode === "rename" ? "Сохранить" : "Удалить"}</button></div>
      </form></div>}
    </section>
  );
}
