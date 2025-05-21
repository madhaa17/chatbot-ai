import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google GenAI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage?.content) {
      return NextResponse.json(
        { error: 'No message content provided' },
        { status: 400 }
      );
    }

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Generate content stream
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: lastMessage.content }] }],
    });

    // Create a TransformStream to handle the streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Process the stream
    (async () => {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({
              content: text,
              role: 'assistant',
            })}\n\n`));
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          error: 'Error during streaming',
        })}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}