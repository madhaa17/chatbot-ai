import Chat from "./components/Chat";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-0 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl h-[100dvh] sm:h-[95dvh] bg-white rounded-none sm:rounded-3xl shadow-xl overflow-hidden backdrop-blur-sm bg-opacity-95">
        <Chat />
      </div>
    </main>
  );
}
