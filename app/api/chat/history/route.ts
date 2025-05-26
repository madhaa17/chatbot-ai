import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { authOptions } from "@/lib/authOptions";

interface MessageWithIv {
  id: string;
  content: string;
  role: string;
  createdAt: Date;
  chatId: string;
  iv: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Please sign in to access chat history" },
        { status: 401 }
      );
    }

    try {
      // Find the user's most recent chat with messages
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

      // If no chat exists, return empty array (not an error)
      if (!chat) {
        return NextResponse.json({ messages: [], chatId: null });
      }

      // Decrypt messages before sending to client
      const decryptedMessages = chat.messages.map((message: MessageWithIv) => {
        const msgWithIv = message as MessageWithIv;
        try {
          // For legacy messages, return content as is
          if (msgWithIv.iv === "legacy") {
            return {
              ...msgWithIv,
              content: msgWithIv.content,
            };
          }

          // For encrypted messages, decrypt them
          return {
            ...msgWithIv,
            content: decrypt(msgWithIv.content, msgWithIv.iv),
          };
        } catch (decryptError) {
          console.error("Error decrypting message:", decryptError);
          // Return placeholder for failed decryption
          return {
            ...msgWithIv,
            content: "⚠️ Message could not be decrypted",
          };
        }
      });

      return NextResponse.json({
        chatId: chat.id,
        messages: decryptedMessages,
      });
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
