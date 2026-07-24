import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ChatHeader } from '../ChatHeader';
import { MessageBubble } from '../MessageBubble';
import { TypingIndicator } from '../TypingIndicator';
import { MessageInput } from '../MessageInput';
import { SkeletonMessage } from '../SkeletonMessage';
import { EmptyState } from '../EmptyState';
import { DateSeparator } from './DateSeparator';
import { buildMessageTimeline } from '../../utils/messageGrouping';

const NEAR_BOTTOM_THRESHOLD_PX = 150;

export const ChatWindow = ({
  variant, // 'mobile' | 'desktop'
  conversation,
  onBack,
  messages,
  loadingMessages,
  user,
  displayName,
  onMessageLongPress,
  typingUsers,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  fileInputRef,
  error,
  onUploadSuccess,
  dragDrop, // { isDragging, onDragEnter, onDragLeave, onDragOver, onDrop } — desktop only
}) => {
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);

  // Switching conversations: jump to bottom instantly and reset scroll tracking.
  useEffect(() => {
    isNearBottomRef.current = true;
    setShowNewMessagesPill(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [conversation?._id]);

  // New message arrived: only auto-scroll if the user was already near the
  // bottom. Otherwise, let them keep reading history and surface a pill instead.
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowNewMessagesPill(true);
    }
  }, [messages]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) setShowNewMessagesPill(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessagesPill(false);
  };

  const timeline = buildMessageTimeline(messages);
  const isMobile = variant === 'mobile';

  return (
    <>
      <ChatHeader
        conversation={conversation}
        onBack={isMobile ? onBack : undefined}
        onClose={!isMobile ? onBack : undefined}
        user={user}
      />

      <div className="relative flex-1 flex flex-col min-h-0">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          onDragEnter={!isMobile ? dragDrop?.onDragEnter : undefined}
          onDragLeave={!isMobile ? dragDrop?.onDragLeave : undefined}
          onDragOver={!isMobile ? dragDrop?.onDragOver : undefined}
          onDrop={!isMobile ? dragDrop?.onDrop : undefined}
          className={`flex-1 overflow-y-auto bg-background flex flex-col ${isMobile ? 'p-3 space-y-2.5' : 'p-3 md:p-6 space-y-2.5 md:space-y-4'}`}
        >
          {!isMobile && dragDrop?.isDragging && (
            <div className="absolute inset-0 bg-accent/10 border-2 border-dashed border-accent rounded-2xl flex items-center justify-center z-40 pointer-events-none">
              <svg className="w-16 h-16 text-accent mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          )}

          {loadingMessages ? (
            <>
              <SkeletonMessage isCurrentUser={false} />
              <SkeletonMessage isCurrentUser={true} />
              <SkeletonMessage isCurrentUser={false} />
              <SkeletonMessage isCurrentUser={true} />
            </>
          ) : messages.length === 0 ? (
            <EmptyState type="noMessages" />
          ) : (
            <>
              {timeline.map(item => {
                if (item.type === 'date') {
                  return <DateSeparator key={item.key} label={item.label} />;
                }
                const message = item.message;
                const senderId = message.sender?._id || message.sender?.id;
                const isCurrentUser = String(senderId) === String(user?.id);
                return (
                  <MessageBubble
                    key={item.key}
                    message={message}
                    isCurrentUser={isCurrentUser}
                    displayName={displayName(message.sender)}
                    user={user}
                    onLongPress={onMessageLongPress}
                    isFirstInGroup={item.isFirstInGroup}
                    isLastInGroup={item.isLastInGroup}
                  />
                );
              })}
              {typingUsers.length > 0 && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {showNewMessagesPill && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-full shadow-lg hover:bg-accent-hover transition-colors animate-fade-in"
          >
            New messages <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <MessageInput
        value={messageInput}
        onChange={onMessageInputChange}
        onSubmit={onSendMessage}
        fileInputRef={fileInputRef}
        error={error}
        conversationId={conversation?._id}
        onUploadSuccess={onUploadSuccess}
      />
    </>
  );
};
