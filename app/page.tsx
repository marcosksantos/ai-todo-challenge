import TodoList from "@/app/components/TodoList";
import Chatbot from "@/app/components/Chatbot";
import AuthGuard from "@/app/components/AuthGuard";

export default function Home() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#030712] text-slate-200 flex flex-col items-center py-8 px-4 md:py-20">
        {/* Header Area */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-3">
            AI Todo Copilot
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
            Automated task refinement powered by N8N & OpenAI.
          </p>
        </div>

        {/* Main Card */}
        <TodoList />

        {/* Floating Chat */}
        <Chatbot />
      </main>
    </AuthGuard>
  );
}
