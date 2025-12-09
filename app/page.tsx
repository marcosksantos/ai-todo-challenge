import TodoList from "@/app/components/TodoList";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-slate-950">
      <TodoList />
    </main>
  );
}
