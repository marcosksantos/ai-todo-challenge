# AI Todo Copilot 🚀

A smart task management application that uses Artificial Intelligence to refine your to-do list automatically. Built as a technical challenge solution, demonstrating modern architecture, real-time updates, and multi-channel integration (Web & WhatsApp).

## 🎥 Video Demo

[Link to Loom Video] (Add your link here)

## ✨ Key Features

### Core Functionality (Part 1)

- **⚡ Optimistic UI:** Tasks appear instantly before server confirmation.

- **🔐 Secure Auth:** Complete authentication flow using Supabase Auth.

- **💾 Persistence:** All data stored in Supabase PostgreSQL (Cloud).

- **📱 Responsive:** Mobile-first design using Tailwind CSS.

### AI & Automation (Part 2)

- **🤖 Auto-Enhancement:** When a task is created, N8N + OpenAI automatically refines the title and adds a detailed description in the background.

- **💬 AI Chatbot:** Integrated floating chatbot to discuss tasks and get productivity advice.

- **🔄 Real-time Sync:** The UI updates automatically via Supabase Realtime subscriptions when the AI finishes processing.

### Bonus Features 🌟

- **🟢 WhatsApp Integration:** Connect your phone number to manage tasks via WhatsApp (triggered by \`#to-do list\` messages).

- **🛡️ API-First Design:** Chat interactions are proxied through Next.js API routes for security.

## 🏗️ Architecture

The project follows a modern, event-driven architecture:

1.  **Frontend:** Next.js 16 (App Router) handles the UI.

2.  **Database:** Supabase provides the DB and Realtime channels.

3.  **Automation Engine (N8N):**

    * **Trigger:** Receives webhooks from the App.

    * **Process:** Calls OpenAI to analyze/enhance text.

    * **Action:** Updates the Supabase database directly.

4.  **Feedback Loop:** The Frontend listens to Supabase \`UPDATE\` events to show the AI's work without refreshing the page.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+

- Supabase Account

- N8N Instance (Self-hosted or Cloud)

### Environment Variables

Create a \`.env.local\` file:

\`\`\`bash

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url

NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

N8N_WEBHOOK_URL=your_n8n_task_webhook

N8N_CHAT_WEBHOOK_URL=your_n8n_chat_webhook

\`\`\`

## 📂 Project Structure

- \`/app\`: Next.js App Router pages and API routes.

- \`/components\`: React components (TodoList, Chatbot, WhatsAppButton).

- \`/lib\`: Supabase client and utility functions.

- \`/utils\`: Helper functions.

## 🧠 Decisions & Trade-offs

- **Supabase Realtime vs. Polling:** Chose Realtime subscriptions for a seamless "magic" experience when the AI updates tasks, rather than making the user refresh.

- **Next.js API Routes:** Used as a proxy for N8N webhooks to avoid CORS issues and hide the workflow URLs from the client-side code.

- **Optimistic Updates:** Implemented to ensure the app feels native and fast, even with network latency.

**Developed for Technical Assessment**
