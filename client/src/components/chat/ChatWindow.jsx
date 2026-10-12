import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
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
  onRetryMessage,
  typingUsers,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  fileInputRef,
  onUploadSuccess,
  onOpenInfo,
  hasMore = false,
  loadingOlder = false,
  onLoadOlder,
  dragDrop, // { isDragging, onDragEnter, onDragLeave, onDragOver, onDrop } — desktop only
}) => {
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isNearBottomRef = useRef(true);
  // Set while older history is being inserted above, so we can keep the reader's
  // place instead of jumping (or announcing "new messages").
  const prependAnchorRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);

  // Switching conversations: jump to bottom instantly and reset scroll tracking.
  useEffect(() => {
    isNearBottomRef.current = true;
    lastMessageIdRef.current = null;
    setShowNewMessagesPill(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [conversation?._id]);

  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (prependAnchorRef.current && el) {
      el.scrollTop = el.scrollHeight - prependAnchorRef.current;
      prependAnchorRef.current = null;
      return;
    }

    // Only a new message at the *end* counts; status changes (ticks) don't.
    const lastId = messages[messages.length - 1]?._id;
    if (lastId === lastMessageIdRef.current) return;
    // null after switching chats, undefined while the list was still empty.
    const firstLoad = lastMessageIdRef.current == null;
    lastMessageIdRef.current = lastId;

    if (firstLoad || isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: firstLoad ? 'auto' : 'smooth' });
    } else {
      setShowNewMessagesPill(true);
    }
  }, [messages]);

  const loadOlder = () => {
    const el = messagesContainerRef.current;
    if (el) prependAnchorRef.current = el.scrollHeight - el.scrollTop;
    onLoadOlder?.();
  };

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
        isTyping={typingUsers.length > 0}
        displayName={displayName}
        onOpenInfo={onOpenInfo}
      />

      <div className="relative flex-1 flex flex-col min-h-0">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          onDragEnter={!isMobile ? dragDrop?.onDragEnter : undefined}
          onDragLeave={!isMobile ? dragDrop?.onDragLeave : undefined}
          onDragOver={!isMobile ? dragDrop?.onDragOver : undefined}
          onDrop={!isMobile ? dragDrop?.onDrop : undefined}
          className="flex-1 overflow-y-auto bg-bg"
        >
          {!isMobile && dragDrop?.isDragging && (
            <div className="absolute inset-3 z-40 pointer-events-none rounded-2xl border-2 border-dashed border-accent-strong bg-surface-accent/70 backdrop-blur-sm flex flex-col items-center justify-center gap-sm animate-fade-in">
              <span className="w-14 h-14 rounded-2xl bg-surface shadow-md flex items-center justify-center">
                <Icon name="upload" className="text-primary text-[30px]" />
              </span>
              <p className="text-title-md text-content">Drop to share</p>
            </div>
          )}

          {/* Spacing between messages is owned by MessageBubble's grouping margins,
              so the container adds none — that is what keeps runs tight. */}
          <div className="max-w-reading mx-auto w-full px-sm md:px-lg py-md min-h-full flex flex-col">
            {loadingMessages ? (
              <div className="space-y-3 pt-sm">
                <SkeletonMessage isCurrentUser={false} />
                <SkeletonMessage isCurrentUser={true} />
                <SkeletonMessage isCurrentUser={false} />
                <SkeletonMessage isCurrentUser={true} />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState type="noMessages" />
            ) : (
              <div className="mt-auto">
                {hasMore && (
                  <div className="flex justify-center pb-sm">
                    <button
                      type="button"
                      onClick={loadOlder}
                      disabled={loadingOlder}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-caption font-semibold text-content-secondary shadow-xs
                        transition-colors duration-fast hover:bg-surface-sunken disabled:opacity-60"
                    >
                      <Icon name={loadingOlder ? 'progress_activity' : 'history'} className={`text-[16px] ${loadingOlder ? 'animate-spin' : ''}`} />
                      {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                    </button>
                  </div>
                )}
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
                      onRetry={onRetryMessage}
                      isFirstInGroup={item.isFirstInGroup}
                      isLastInGroup={item.isLastInGroup}
                    />
                  );
                })}
                {typingUsers.length > 0 && <TypingIndicator />}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {showNewMessagesPill && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-md left-1/2 -translate-x-1/2 flex items-center gap-1.5 pl-3.5 pr-2.5 py-2 bg-primary text-content-on-primary text-caption font-semibold rounded-full shadow-lg hover:bg-primary-hover transition-all active:scale-95 animate-fade-in-up"
          >
            New messages <Icon name="arrow_downward" className="text-[16px]" />
          </button>
        )}
      </div>

      <MessageInput
        value={messageInput}
        onChange={onMessageInputChange}
        onSubmit={onSendMessage}
        fileInputRef={fileInputRef}
        conversationId={conversation?._id}
        onUploadSuccess={onUploadSuccess}
      />
    </>
  );
};
