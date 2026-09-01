"use client";

import Link from "next/link";
import { Check, ChevronLeft, Copy, Share2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardAccess, BoardPermission } from "@/lib/boards/types";
import BoardSurface from "./board-surface";

type LoadState = "loading" | "ready" | "missing";

async function jsonRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Не удалось выполнить действие");
  return body;
}

export default function BoardShell({ boardId }: { boardId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [access, setAccess] = useState<BoardAccess | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePermission, setSharePermission] = useState<BoardPermission | "off">("off");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestReady, setGuestReady] = useState(true);
  const [titleDraft, setTitleDraft] = useState("");
  const titleRef = useRef<HTMLInputElement | null>(null);
  const shareToken = typeof window === "undefined" ? "" : new URL(window.location.href).searchParams.get("share") ?? "";

  const load = useCallback(async () => {
    try {
      const result = await jsonRequest<{ access: BoardAccess }>(`/api/boards/${boardId}${shareToken ? `?share=${encodeURIComponent(shareToken)}` : ""}`);
      setAccess(result.access);
      setTitleDraft(result.access.board.title);
      if (!result.access.owner && !result.access.userId) {
        const saved = window.localStorage.getItem("egege-board-guest-name") ?? "";
        setGuestName(saved);
        setGuestReady(Boolean(saved));
      }
      setState("ready");
    } catch { setState("missing"); }
  }, [boardId, shareToken]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  useEffect(() => {
    if (!shareOpen || !access?.owner) return;
    void jsonRequest<{ enabled: boolean; permission: BoardPermission | null }>(`/api/boards/${boardId}/share`)
      .then((result) => { setSharePermission(result.enabled && result.permission ? result.permission : "off"); setShareUrl(""); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось проверить доступ"));
  }, [access?.owner, boardId, shareOpen]);

  async function saveTitle(title: string) {
    if (!access?.owner) return;
    const nextTitle = title.trim();
    if (!nextTitle) { setTitleDraft(access.board.title); return; }
    if (nextTitle === access.board.title) { setTitleDraft(nextTitle); return; }
    try {
      const result = await jsonRequest<{ board: BoardAccess["board"] }>(`/api/boards/${boardId}`, {
        method: "PATCH", body: JSON.stringify({ title: title.trim() }),
      });
      setAccess((current) => current ? { ...current, board: result.board } : current);
      setTitleDraft(result.board.title);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось переименовать доску"); }
  }

  async function changeShare(permission: BoardPermission | "off") {
    setSharePermission(permission);
    try {
      const result = await jsonRequest<{ shareUrl: string | null }>(`/api/boards/${boardId}/share`, {
        method: "PATCH", body: JSON.stringify({ permission }),
      });
      setShareUrl(result.shareUrl ? new URL(result.shareUrl, window.location.origin).toString() : "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось изменить доступ"); }
  }

  async function changeBackground(backgroundType: BoardAccess["board"]["backgroundType"], backgroundColor: string) {
    if (!access?.owner) return;
    try {
      const result = await jsonRequest<{ board: BoardAccess["board"] }>(`/api/boards/${boardId}`, {
        method: "PATCH", body: JSON.stringify({ backgroundType, backgroundColor }),
      });
      setAccess((current) => current ? { ...current, board: result.board } : current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось изменить фон"); }
  }

  function receiveBackground(backgroundType: BoardAccess["board"]["backgroundType"], backgroundColor: string) {
    setAccess((current) => current ? { ...current, board: { ...current.board, backgroundType, backgroundColor } } : current);
  }

  function enterAsGuest() {
    const name = guestName.replace(/\s+/g, " ").trim().slice(0, 32);
    if (!name) return;
    window.localStorage.setItem("egege-board-guest-name", name);
    setGuestName(name); setGuestReady(true);
  }

  if (state === "loading") return <main className="board-screen-state"><span>•••</span><p>Открываем доску</p></main>;
  if (state === "missing" || !access) return <main className="board-screen-state is-error"><span>∅</span><h1>Доска не найдена</h1><p>Возможно, ссылка устарела или доска была удалена.</p><Link href="/boards">Вернуться к доскам</Link></main>;

  return (
    <main className="board-app" onPointerDownCapture={(event) => {
      if (titleRef.current && document.activeElement === titleRef.current && (event.target as Element).closest(".board-surface")) titleRef.current.blur();
    }}>
      <header className="board-topbar">
        <Link href="/boards" aria-label="К списку досок"><ChevronLeft /></Link>
        <input ref={titleRef} value={titleDraft} readOnly={!access.owner} onChange={(event) => setTitleDraft(event.target.value)} onBlur={(event) => void saveTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } else if (event.key === "Escape") { setTitleDraft(access.board.title); event.currentTarget.blur(); } }} aria-label="Название доски" />
        {!access.owner && <span className="board-owner-label">{access.board.ownerName ? `Доска пользователя ${access.board.ownerName}` : access.permission === "edit" ? "Можно редактировать" : "Только просмотр"}</span>}
        {access.owner && <button className="board-share-button" onClick={() => setShareOpen(true)}><Share2 />Поделиться</button>}
      </header>
      <BoardSurface board={access.board} permission={access.permission} owner={access.owner} shareToken={shareToken} participantName={guestName || "Участник"} onBackground={changeBackground} onRemoteBackground={receiveBackground} />
      {!guestReady && <div className="board-modal-layer"><form className="board-dialog" onSubmit={(event) => { event.preventDefault(); enterAsGuest(); }}><h2>Как вас зовут?</h2><p>Имя будет видно рядом с вашим курсором.</p><input autoFocus value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={32} placeholder="Например, Анна" /><button className="boards-primary" type="submit" disabled={!guestName.trim()}>Войти на доску</button></form></div>}
      {shareOpen && <div className="board-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && setShareOpen(false)}><section className="board-dialog board-share-dialog"><button className="board-dialog-close" onClick={() => setShareOpen(false)} aria-label="Закрыть"><X /></button><p className="boards-eyebrow">Доступ к доске</p><h2>Поделиться</h2><label><span>Все, у кого есть ссылка</span><select value={sharePermission} onChange={(event) => void changeShare(event.target.value as BoardPermission | "off")}><option value="off">Нет доступа</option><option value="view">Могут смотреть</option><option value="edit">Могут редактировать</option></select></label>{shareUrl ? <div className="board-share-copy"><input readOnly value={shareUrl} /><button onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check /> : <Copy />}{copied ? "Скопировано" : "Копировать"}</button></div> : sharePermission !== "off" && <button className="board-refresh-link" onClick={() => void changeShare(sharePermission)}>Создать новую ссылку</button>}<small>Новая ссылка отзывает предыдущую.</small></section></div>}
      {error && <div className="board-toast is-error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
    </main>
  );
}
