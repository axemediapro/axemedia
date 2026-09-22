import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// PUT /api/users/[id] — update user (admin only)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = Number(id);
    const { name, username, email, password, role, clientId, active } = await req.json();

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: "Përdoruesi nuk u gjet" }, { status: 404 });
    }

    const trimmedUsername = typeof username === "string" ? (username.trim() || null) : existingUser.username;
    const trimmedEmail = typeof email === "string" ? email.trim() : existingUser.email;

    // Check duplicate email
    if (trimmedEmail && trimmedEmail !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (emailConflict && emailConflict.id !== userId) {
        return NextResponse.json({ error: "Ky email përdoret tashmë nga një llogari tjetër" }, { status: 400 });
      }
    }

    // Check duplicate username
    if (trimmedUsername && trimmedUsername !== existingUser.username) {
      const usernameConflict = await prisma.user.findUnique({ where: { username: trimmedUsername } });
      if (usernameConflict && usernameConflict.id !== userId) {
        return NextResponse.json({ error: "Ky username përdoret tashmë nga një llogari tjetër" }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (username !== undefined) updateData.username = trimmedUsername;
    if (email !== undefined) updateData.email = trimmedEmail;
    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = Boolean(active);
    if (clientId !== undefined) updateData.clientId = clientId ? Number(clientId) : null;
    if (password && typeof password === "string" && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data:  updateData,
      select: { id: true, name: true, username: true, email: true, role: true, active: true, clientId: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "Dështoi përditësimi i përdoruesit" }, { status: 500 });
  }
}

// DELETE /api/users/[id] — delete user (admin only, cannot delete self)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Prevent deleting own account
    if (String(session.user.id) === id) {
      return NextResponse.json({ error: "Nuk mund të fshish llogarinë tënde" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

