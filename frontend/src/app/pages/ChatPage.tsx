import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useChatStore } from '../../store/chat.store';
import { useModelStore } from '../../store/model.store';
import { ChatThread } from '../components/ChatThread';
import { InputArea } from '../components/InputArea';
import { EmptyState } from '../components/EmptyState';

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { chats, setActiveChat, sendMessage, isStreaming, createChat } = useChatStore();
  const { activeModelId, settings } = useModelStore();

  const chat = id ? chats.find(c => c.id === id) : null;

  useEffect(() => {
    if (id) {
      setActiveChat(id);
    } else {
      setActiveChat(null);
    }
  }, [id, setActiveChat]);

  useEffect(() => {
    if (id && chats.length > 0 && !chat) navigate('/');
  }, [id, chat, chats.length, navigate]);

  const handleSuggestionClick = useCallback(
    async (text: string) => {
      const newChatId = await createChat(activeModelId);
      navigate(`/chat/${newChatId}`);
      setTimeout(() => {
        sendMessage(text, activeModelId, {
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          contextLimit: settings.contextLimit,
          systemPrompt: settings.systemPrompt,
          topP: settings.topP,
          topK: settings.topK,
        });
      }, 50);
    },
    [createChat, navigate, sendMessage, activeModelId, settings]
  );

  const showEmpty = !chat || chat.messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {showEmpty ? (
          <EmptyState onSuggestionClick={handleSuggestionClick} />
        ) : (
          <ChatThread chat={chat} />
        )}
      </div>
      <InputArea />
    </div>
  );
}
