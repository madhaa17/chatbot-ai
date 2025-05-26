import Chat from "@/components/Chat";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  // Redirect to signin if no session exists
  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <main className="h-screen max-w-4xl mx-auto">
      <Chat />
    </main>
  );
}
