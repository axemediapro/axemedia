import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/users — list all users (admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        name:      true,
        username:  true,
        email:     true,
        role:      true,
        active:    true,
        clientId:  true,
        client:    { select: { id: true, name: true } },
        createdAt: true,
      },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users — create user (admin only)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, username, email, password, role, clientId } = await req.json();

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json({ error: "Të gjitha fushat e detyrueshme duhet të plotësohen" }, { status: 400 });
    }

    const trimmedUsername = username?.trim() ? username.trim() : null;
    const trimmedEmail = email.trim();

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingEmail) {
      return NextResponse.json({ error: "Ky email ekziston tashmë" }, { status: 400 });
    }

    // Check if username already exists (if provided)
    if (trimmedUsername) {
      const existingUsername = await prisma.user.findUnique({ where: { username: trimmedUsername } });
      if (existingUsername) {
        return NextResponse.json({ error: "Ky username ekziston tashmë" }, { status: 400 });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name:     name.trim(),
        username: trimmedUsername,
        email:    trimmedEmail,
        password: hashed,
        role,
        clientId: clientId ? Number(clientId) : null,
        active:   true,
      },
      select: { id: true, name: true, username: true, email: true, role: true, active: true, clientId: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: "Dështoi krijimi i përdoruesit" }, { status: 500 });
  }
}

