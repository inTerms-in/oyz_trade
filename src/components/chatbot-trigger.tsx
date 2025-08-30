"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface ChatbotTriggerProps {
  onClick: () => void;
}

export function ChatbotTrigger({ onClick }: ChatbotTriggerProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50"
      size="icon"
    >
      <MessageSquare className="h-6 w-6" />
      <span className="sr-only">Open Chatbot</span>
    </Button>
  );
}