import { communityDb } from "@/lib/community-server";
import { ensureTeacherSchema } from "@/lib/teacher-studio-server";

export async function GET() {
  await ensureTeacherSchema();
  const variants = await communityDb().prepare(`SELECT v.kim, v.title, COUNT(vt.position) AS task_count
    FROM teacher_variants v LEFT JOIN teacher_variant_tasks vt ON vt.variant_id = v.id
    GROUP BY v.id ORDER BY v.created_at DESC LIMIT 300`).all<{
      kim: string; title: string; task_count: number;
    }>();
  return Response.json({
    variants: variants.results.map((variant) => ({
      kim: variant.kim,
      title: variant.title,
      taskCount: variant.task_count,
      sourceUrl: "",
    })),
  });
}
