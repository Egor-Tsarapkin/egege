import Link from "next/link";
import type { ReactNode } from "react";
import {
  LEGAL_EFFECTIVE_DATE,
  OPERATOR_CITY,
  OPERATOR_EMAIL,
  OPERATOR_NAME,
  OPERATOR_STATUS,
} from "@/lib/legal";

export function LegalPage({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="legal-brand" href="/" aria-label="Вернуться на главную EGEGE">
          <span>Е</span><strong>EGEGE</strong>
        </Link>
        <Link href="/">На главную</Link>
      </header>
      <article className="legal-document">
        <p className="legal-kicker">Документы EGEGE · действует с {LEGAL_EFFECTIVE_DATE}</p>
        <h1>{title}</h1>
        <p className="legal-lead">{lead}</p>
        <div className="legal-operator">
          <span>Оператор</span>
          <strong>{OPERATOR_NAME}</strong>
          <p>{OPERATOR_STATUS}, {OPERATOR_CITY}</p>
          <a href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</a>
        </div>
        <div className="legal-sections">{children}</div>
      </article>
      <footer className="legal-footer">
        <Link href="/privacy">Политика</Link>
        <Link href="/consent">Согласие на обработку</Link>
        <Link href="/distribution-consent">Согласие для рейтинга</Link>
        <Link href="/terms">Соглашение</Link>
      </footer>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2>{children}</section>;
}
