"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function CopyTaskId({ id, onNotify }: { id: string; onNotify?: (message: string) => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      onNotify?.("ID скопирован");
    } catch {
      onNotify?.("Не удалось скопировать ID");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  return <button type="button" className="task-id-copy" aria-label={`Копировать ID ${id}`} title="Копировать ID" onClick={copyId}>
    <span className="task-id">ID {id}</span>
    <span className="task-copy-button">{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</span>
  </button>;
}
