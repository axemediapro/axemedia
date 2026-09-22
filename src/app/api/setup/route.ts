import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * GET /api/setup
 * Creates the first admin user if none exist.
 * Call this once on first run: http://localhost:3000/api/setup
 */
export async function GET() {
  try {
    const password = await bcrypt.hash("Barc0d3r#26", 10);
    
    // Check if axemedia user exists, if not create or update
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: "axemedia" },
          { email: "axemedia@axemedia.al" },
          { email: "admin@axemedia.al" },
        ],
      },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name:     "Administrator",
          username: "axemedia",
          password,
          role:     "admin",
          active:   true,
        },
      });

      return NextResponse.json({
        message:         "Admin user (axemedia) updated successfully!",
        username:        "axemedia",
        email:           existing.email,
        role:            "admin",
      });
    }

    const user = await prisma.user.create({
      data: {
        name:     "Administrator",
        username: "axemedia",
        email:    "axemedia@axemedia.al",
        password,
        role:     "admin",
        active:   true,
      },
    });

    return NextResponse.json({
      message:         "Admin user created successfully!",
      username:        user.username,
      email:           user.email,
      role:            user.role,
    });
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

