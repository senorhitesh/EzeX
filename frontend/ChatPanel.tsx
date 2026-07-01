"use client";

import {
  Bot,
  Bug,
  DivideCircleIcon,
  MessageCircle,
  Send,
  Sparkle,
  Trash,
  Wrench,
} from "lucide-react";
import { sendTaskMessage } from "next/dist/build/swc/generated-native";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "explain" | "refactor" | "bugs" | "chat";
}

interface ChatPanelProps {
  code: string;
  language: string;
  pendingPrompt?: string;
  onPendingPromptHandle?: () => void;
  onRefactorResult?: (result: string) => void;
  onBugResult?: (result: string) => void;
}
const typeConfig = {
  explain: { label: "explain", color: "#7c6af7", icon: Sparkle },
  refactor: { label: "refactor", color: "#f59e0b", icon: Wrench },
  bugs: { label: "bugs", color: "#ef4444", icon: Bug },
  chat: { label: "chat", color: "#888", icon: MessageCircle },
};

const ChatPanel = ({
  code,
  language,
  pendingPrompt,
  onPendingPromptHandle,
  onRefactorResult,
  onBugResult,
}: ChatPanelProps) => {
  const [message, setMessage] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastPromptIDRed = useRef<number>(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  const injectAssistantMessage = (
    content: string,
    type: "explain" | "refactor" | "bugs" | "chat",
  ) => {
    setMessage((prev) => {
      const updatedMessages = [...prev];
      if (
        updatedMessages.length > 0 &&
        updatedMessages[updatedMessages.length - 1].role === "assistant" &&
        updatedMessages[updatedMessages.length - 1].content ===
          "Scanning your code for bugs..."
      ) {
        updatedMessages[updatedMessages.length - 1] = {
          role: "assistant",
          content,
          type,
        };
        return updatedMessages;
      }
      return [...prev, { role: "assistant", content, type }];
    });
  };

  const sendTaskMessage = async (
    customPrompt: string = "",
    type: "explain" | "refactor" | "bugs" | "chat",
  ) => {
    const promptToSend = customPrompt || prompt;

    if (!promptToSend.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: promptToSend,
      type,
    };
    setMessage((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);

    if (type === "refactor" || type === "bugs") {
      setMessage((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            type == "bugs"
              ? "Analyzing your code for bugs..."
              : "Refactoring your code...",
          type,
        },
      ]);
    } else {
      setMessage((prev) => [
        ...prev,
        { role: "assistant", content: "Processsing your request....", type },
      ]);
    }

    let fullResponse = "";

    try {
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
          prompt: promptToSend,
          mode: type || "chat",
          messages: message.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("/n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed?.text) {
                fullResponse += parsed.text;
                if (type !== "bugs" && type !== "refactor") {
                  const token = parsed.text;
                  await new Promise<void>((resolve) =>
                    requestAnimationFrame(() => {
                      setMessage((prev) => {
                        const updatedMessages = [...prev];
                        const lastIndex = updatedMessages.length - 1;
                        const last = updatedMessages[lastIndex];

                        updatedMessages[lastIndex] = {
                          ...last,
                          content: (last?.content || "") + token,
                        };
                        return updatedMessages;
                      });
                      resolve(void 0);
                    }),
                  );
                }
              }
            } catch (e) {
              console.log(e);
            }
          }
        }
      }

      if (type === "refactor") {
        injectAssistantMessage(
          "Refactored version is ready - review the changes in the editor.",
          "refactor",
        );
        onRefactorResult?.(fullResponse);
      } else if (type === "bugs") {
        try {
          const match = fullResponse.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (!parsed?.has_bugs || parsed?.bugs.length === 0) {
              injectAssistantMessage("No bugs found in the code.", "bugs");
            } else {
              const bugList = parsed.bugs
                .map((bug: any) => `**Line ${bug.line}:** ${bug.description}`)
                .join("\n\n---\n\n");
              const finalMessage = `Found ${parsed.bugs.length} bug in the code:\n\n${bugList}`;
              injectAssistantMessage(finalMessage, "bugs");
            }
          }
        } catch (e) {
          console.error("Error parsing bug response:", e);
        }
        onBugResult?.(fullResponse);
      }
    } catch (error) {
      console.error("Error sending task message:", error);
    } finally {
      setLoading(false);
      textAreaRef.current?.focus();
    }
  };

  return (
    <div className="h-full min-w-70 shrink-0">
      <div className="flex items-center justify-between border-b border-[#1e1e1e] shrink-0">
        <div className="flex gap-1.5 py-2 px-2 items-center">
          <Sparkle size={14} className="text-[#7c6af7]" />
          <span className="text-[14px] font-semibold">EzeX</span>
        </div>
        {message.length > 0 && (
          <button onClick={() => setMessage([])}>
            <Trash size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2  overflow-y-auto h-full p-2">
        {message.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-[14px] text-center text-muted-foreground">
              Start a conversation by typing a message below.
            </p>
          </div>
        )}
        {message.map((msg, index) => {
          const config = typeConfig[msg.type || "chat"];
          const Icon = config.icon;
          const isUser = msg.role === "user";

          return (
            <div
              key={index}
              className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && <Bot size={14} />}
              <p className="text-[14px] leading-relaxed">{msg.content}</p>
            </div>
          );
        })}
      </div>

      <div>
        <div className="relative">
          <textarea
            ref={textAreaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key == "Enter" && !e.shiftKey) {
                e.preventDefault();
                // sendTaskMessage(undefined, "chat")
              }
            }}
            placeholder="Ask about your code"
            rows={2}
            className="flex-1 flex bg-transparent focus:outline-none border border-neutral-900 p-2 rounded-lg m-2 w-full resize-none text-[13px] leading-relaxed"
          ></textarea>
          <button
            style={{
              backgroundColor: prompt.trim() && !loading ? "#7c6af7" : "#555",
            }}
            onClick={() => {
              sendTaskMessage(undefined, "chat");
            }}
            disabled={loading || !prompt.trim()}
          >
            <Send
              className="absolute   bottom-10 right-2"
              size={14}
              color={prompt.trim() && !loading ? "#fff" : "#555"}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
