import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { authOptions } from "@/lib/authOptions";

// Initialize the Google GenAI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, chatId } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage?.content) {
      return NextResponse.json(
        { error: "No message content provided" },
        { status: 400 }
      );
    }

    // Get or create chat
    let chat = chatId
      ? await prisma.chat.findUnique({
          where: { id: chatId },
          include: { user: true },
        })
      : await prisma.chat.create({
          data: {
            user: {
              connect: {
                email: session.user.email,
              },
            },
          },
          include: { user: true },
        });

    if (!chat || chat.user.email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Encrypt and save the user message
    const { encryptedData: encryptedContent, iv: userIv } = encrypt(
      lastMessage.content
    );
    await prisma.message.create({
      data: {
        content: encryptedContent,
        iv: userIv,
        role: "user",
        chatId: chat.id,
      },
    });

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Generate content stream
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: lastMessage.content }] }],
    });

    // Create a TransformStream to handle the streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Process the stream
    (async () => {
      try {
        let assistantMessage = "";

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            assistantMessage += text;
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  content: text,
                  role: "assistant",
                  chatId: chat.id,
                })}\n\n`
              )
            );
          }
        }

        // Encrypt and save the complete assistant message
        const { encryptedData: encryptedAssistantContent, iv: assistantIv } =
          encrypt(assistantMessage);
        await prisma.message.create({
          data: {
            content: encryptedAssistantContent,
            iv: assistantIv,
            role: "assistant",
            chatId: chat.id,
          },
        });
      } catch (error) {
        console.error("Streaming error:", error);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              error: "Error during streaming",
            })}\n\n`
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
