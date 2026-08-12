import { create } from "zustand";

export type MessageRole = "user" | "assistant";

export interface ActionPill {
  label: string;
  actionType: string;
  payload: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  actions?: ActionPill[];
  timestamp: Date;
}

interface AICopilotState {
  isOpen: boolean;
  messages: Message[];
  input: string;
  conversationId: string | null;
  isStreaming: boolean;
  
  setIsOpen: (isOpen: boolean) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setInput: (input: string) => void;
  setConversationId: (id: string | null) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  addMessage: (message: Message) => void;
  resetConversation: () => void;
}

export const useAICopilotStore = create<AICopilotState>((set) => ({
  isOpen: false,
  messages: [],
  input: "",
  conversationId: null,
  isStreaming: false,

  setIsOpen: (isOpen) => set({ isOpen }),
  setMessages: (messagesOrFn) => 
    set((state) => ({
      messages: typeof messagesOrFn === "function" ? messagesOrFn(state.messages) : messagesOrFn,
    })),
  setInput: (input) => set({ input }),
  setConversationId: (conversationId) => set({ conversationId }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  resetConversation: () => set({ messages: [], conversationId: null, input: "", isStreaming: false }),
}));
