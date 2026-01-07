export type Decision = "SEARCH" | "DIRECT";

export type SourceItem = {
  title: string;
  excerpt: string;
};

export type ChatRecord = {
  chat_id: string;
  user_id: string;
  query: string;
  decision: Decision;
  answer: string;
  sources?: SourceItem[];
  created_at: string;
};

export type ChatPreview = {
  chat_id: string;
  query: string;
  decision: Decision;
  preview: string;
  created_at: string;
};

export type UserProfile = {
  user_id: string;
  name: string;
  email: string;
  joined_at: string;
};

export type DbShape = {
  users: Record<string, UserProfile>;
  chats: ChatRecord[];
};

export type HttpError = Error & { statusCode?: number };

export type LlmModel = {
  generateContent: (prompt: string) => Promise<{
    response: {
      text: () => string;
    };
  }>;
};

