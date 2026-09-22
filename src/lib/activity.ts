import 'server-only';
import { db } from '@/lib/db';

/** Records a dashboard activity feed entry. Fire-and-forget safe: logging must never break a request. */
export async function logActivity(userId: string, type: string, message: string): Promise<void> {
  try {
    await db.activity.create({ data: { userId, type, message: message.slice(0, 300) } });
    // Keep the feed bounded — retain the latest 100 entries per user.
    const count = await db.activity.count({ where: { userId } });
    if (count > 100) {
      const stale = await db.activity.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: count - 100,
        select: { id: true },
      });
      if (stale.length) {
        await db.activity.deleteMany({ where: { id: { in: stale.map((a) => a.id) } } });
      }
    }
  } catch (e) {
    console.error('[activity] failed to log activity:', e);
  }
}
