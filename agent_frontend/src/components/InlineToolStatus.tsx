import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface InlineToolStatusProps {
  toolName: string;
  operation?: string;
}

export function InlineToolStatus({ toolName, operation }: InlineToolStatusProps) {
  const display = operation ? `${toolName} → ${operation}` : toolName;

  return (
    <Box>
      <Text color="yellow">
        <Spinner type="dots" />
      </Text>
      <Text dimColor> {display}</Text>
    </Box>
  );
}
