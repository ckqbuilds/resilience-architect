import { memo } from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../types.js';
import { InlineToolStatus } from './InlineToolStatus.js';

interface ChatDisplayProps {
  messages: Message[];
  currentToolCall?: { toolName: string; operation?: string } | null;
}

export const ChatDisplay = memo(function ChatDisplay({ messages, currentToolCall }: ChatDisplayProps) {
  return (
    <Box flexDirection="column" paddingY={1}>
      {messages.map((message) => (
        <Box key={message.timestamp.getTime()} flexDirection="column" marginBottom={1}>
          {message.role === 'user' && (
            <Box>
              <Text bold color="cyan">
                You:
              </Text>
              <Text> {message.content}</Text>
            </Box>
          )}
          {message.role === 'assistant' && (
            <Box flexDirection="column">
              <Text bold color="green">
                Assistant:
              </Text>
              <Text>{message.content}</Text>
            </Box>
          )}
          {message.role === 'system' && (
            <Text color="gray" dimColor>
              {message.content}
            </Text>
          )}
        </Box>
      ))}

      {/* Inline tool status — shows while agent is working */}
      {currentToolCall && (
        <InlineToolStatus
          toolName={currentToolCall.toolName}
          operation={currentToolCall.operation}
        />
      )}
    </Box>
  );
});
