import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all chats for the authenticated user
    await prisma.chat.deleteMany({
      where: {
        user: {
          email: session.user.email,
        },
      },
    });

    return NextResponse.json({ message: "All chats deleted successfully" });
  } catch (error) {
    console.error("Error deleting chats:", error);
    return NextResponse.json(
      { error: "Failed to delete chats" },
      { status: 500 }
    );
  }
}
