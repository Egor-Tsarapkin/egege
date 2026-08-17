import Link from "next/link";

export default function NotFound() {
  return (
    <main className="admin-page-shell">
      <div className="admin-state is-error">
        <h1>Страница не найдена</h1>
        <p>Проверьте адрес или вернитесь на главную страницу EGEGE.</p>
        <Link href="/">Вернуться на сайт</Link>
      </div>
    </main>
  );
}
