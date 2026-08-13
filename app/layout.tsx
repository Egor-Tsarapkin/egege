import type { Metadata } from "next";
import { headers } from "next/headers";
import "katex/dist/katex.min.css";
import "./globals.css";

const appearanceScript = `
(() => {
  const defaults = { theme: "dark", accent: "lime" };
  const themes = new Set(["dark", "light"]);
  const accents = new Set([
    "lime", "blue", "red", "pink", "beige", "orange", "purple", "cyan",
    "yellow", "mint", "coral", "indigo", "violet", "teal", "matcha"
  ]);

  try {
    const saved = JSON.parse(localStorage.getItem("egege-preferences-v1") || "{}");
    const theme = themes.has(saved.theme) ? saved.theme : defaults.theme;
    const accent = accents.has(saved.accent) ? saved.accent : defaults.accent;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = accent;
  } catch {
    document.documentElement.dataset.theme = defaults.theme;
    document.documentElement.dataset.accent = defaults.accent;
  }
})();
`;

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const imageUrl = host ? `${protocol}://${host}/og.png` : undefined;
  const title = "EGEGE — база заданий ЕГЭ по информатике";
  const description =
    "Задания, тренировочные варианты и локальный прогресс для подготовки к ЕГЭ по информатике.";

  return {
    title,
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ru_RU",
      images: imageUrl
        ? [{ url: imageUrl, width: 1731, height: 909, alt: "EGEGE by Tsarapkin" }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-theme="dark" data-accent="lime" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
