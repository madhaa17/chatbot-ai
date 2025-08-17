import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { authOptions } from "@/lib/authOptions";
import crypto from "crypto";

interface MessageWithIv {
  id: string;
  content: string;
  role: string;
  createdAt: Date;
  chatId: string;
  iv: string;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Please sign in to access chat history" },
        { status: 401 }
      );
    }

    try {
      // First, get chat count and last message timestamp for ETag generation
      const chatSummary = await prisma.chat.findFirst({
        where: {
          user: {
            email: session.user.email,
          },
        },
        select: {
          id: true,
          updatedAt: true,
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (!chatSummary) {
        const response = NextResponse.json({ messages: [], chatId: null });
        // Set ETag for empty state
        response.headers.set("ETag", '"empty"');
        response.headers.set("Cache-Control", "private, max-age=300"); // 5 minutes
        return response;
      }

      // Generate ETag based on chat ID, update time, and message count
      const etagData = `${chatSummary.id}-${chatSummary.updatedAt.getTime()}-${
        chatSummary._count.messages
      }`;
      const etag = `"${crypto
        .createHash("md5")
        .update(etagData)
        .digest("hex")}"`;

      // Check If-None-Match header for conditional requests
      const ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch && ifNoneMatch === etag) {
        const response = new NextResponse(null, { status: 304 });
        response.headers.set("ETag", etag);
        response.headers.set("Cache-Control", "private, max-age=300");
        return response;
      }

      // If ETag doesn't match, fetch full data
      const chat = await prisma.chat.findFirst({
        where: {
          user: {
            email: session.user.email,
          },
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (!chat) {
        const response = NextResponse.json({ messages: [], chatId: null });
        response.headers.set("ETag", '"empty"');
        response.headers.set("Cache-Control", "private, max-age=300");
        return response;
      }

      const decryptedMessages = chat.messages.map((message: MessageWithIv) => {
        const msgWithIv = message as MessageWithIv;
        try {
          if (msgWithIv.iv === "legacy") {
            return {
              ...msgWithIv,
              content: msgWithIv.content,
            };
          }

          return {
            ...msgWithIv,
            content: decrypt(msgWithIv.content, msgWithIv.iv),
          };
        } catch (decryptError) {
          console.error("Error decrypting message:", decryptError);

          return {
            ...msgWithIv,
            content: "⚠️ Message could not be decrypted",
          };
        }
      });

      const response = NextResponse.json({
        chatId: chat.id,
        messages: decryptedMessages,
      });

      // Set caching headers
      response.headers.set("ETag", etag);
      response.headers.set("Cache-Control", "private, max-age=300"); // 5 minutes
      response.headers.set("Vary", "Authorization"); // Vary by auth since it's user-specific

      return response;
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch chat history from database" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
