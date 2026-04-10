import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface FilterBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
}

export function FilterBar({ value, onChange, onSubmit, placeholder }: FilterBarProps) {
  return (
    <Box paddingX={1} paddingY={0}>
      <Text color="yellow">Filter: </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder || 'service:ecs tag:env=prod status:active or free text'}
      />
    </Box>
  );
}
