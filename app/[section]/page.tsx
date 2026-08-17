import { notFound } from "next/navigation";
import Home from "../page";

const VALID_SECTIONS = new Set([
  "tasks",
  "variants",
  "theory",
  "game",
  "trainer",
  "dashboard",
  "profile",
  "admin",
]);

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!VALID_SECTIONS.has(section)) notFound();
  return <Home />;
}
