import TodoList from "@/app/components/TodoList";
import Chatbot from "@/app/components/Chatbot";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 py-20">
      <TodoList />
      <Chatbot />
    </main>
  );
}
