import { prisma } from "@/lib/prisma";
import CalendarClient from "./calendar-client";

export default async function CalendarPage() {
  const [posts, clients] = await Promise.all([
    prisma.post.findMany({ orderBy: { scheduledAt: "asc" }, include: { client: { select: { id: true, name: true } } } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const initialPosts = posts.map((post) => ({
    ...post,
    scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : undefined,
    client: post.client ? { id: post.client.id, name: post.client.name } : null,
  }));

  return <CalendarClient initialPosts={initialPosts} initialClients={clients} />;
}
