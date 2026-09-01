import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Home from "../page";
import { AUTH_SESSION_COOKIE } from "@/lib/local-auth-server";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  if (!cookieStore.has(AUTH_SESSION_COOKIE)) redirect("/?login=1");
  return <Home />;
}
