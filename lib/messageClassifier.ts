/**
 * Classifies user messages and extracts task data
 * Returns strict JSON without markdown blocks
 */

type ClassificationResult =
  | { action: "create"; title: string }
  | { action: "reply"; text: string };

export function classifyMessage(message: string): ClassificationResult {
  const normalized = message.trim().toLowerCase();

  // Patterns that indicate task creation
  const taskPatterns = [
    /^(?:remind me to|add task|create task|new task|todo|task:)\s*(.+)/i,
    /^(?:add|create|new|todo:)\s+(.+)/i,
    /^(.+?)\s+(?:as a task|to my list|to tasks)$/i,
  ];

  // Check if message matches task creation patterns
  for (const pattern of taskPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const title = cleanTitle(match[1] || match[0]);
      if (title.length > 0) {
        return { action: "create", title };
      }
    }
  }

  // Check for simple imperative sentences (likely task creation)
  if (
    normalized.length > 3 &&
    normalized.length < 100 &&
    !normalized.includes("?") &&
    !isGreeting(normalized) &&
    !isQuestion(normalized)
  ) {
    // If it's a short, direct statement, treat as task
    const title = cleanTitle(message);
    if (title.length > 0 && title.length < 200) {
      return { action: "create", title };
    }
  }

  // Default: treat as chat/reply
  return {
    action: "reply",
    text: "Hello! I can help you organize your tasks. Just tell me what you need to do, and I'll add it to your list.",
  };
}

function cleanTitle(title: string): string {
  return title
    .trim()
    .replace(/^(?:remind me to|add task|create task|new task|todo|task:)\s*/i, "")
    .replace(/\s+(?:as a task|to my list|to tasks)$/i, "")
    .trim()
    .replace(/\s+/g, " ");
}

function isGreeting(message: string): boolean {
  const greetings = [
    "hello",
    "hi",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
    "greetings",
    "howdy",
  ];
  return greetings.some((greeting) => message.startsWith(greeting));
}

function isQuestion(message: string): boolean {
  return (
    message.includes("?") ||
    message.startsWith("what") ||
    message.startsWith("how") ||
    message.startsWith("why") ||
    message.startsWith("when") ||
    message.startsWith("where") ||
    message.startsWith("who") ||
    message.startsWith("can you") ||
    message.startsWith("could you") ||
    message.startsWith("would you")
  );
}

