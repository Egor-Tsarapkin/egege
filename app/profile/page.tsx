import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Home from "../page";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const hasSupabaseSession = cookieStore.getAll().some(({ name }) =>
    /^sb-.+-auth-token(?:\.\d+)?$/.test(name),
  );
  if (!hasSupabaseSession) redirect("/?login=1");
  return <Home />;
}
