import { Box, Text } from 'ink';
import type { ViewName, ModeState } from '../types.js';

interface TabBarProps {
  activeView: ViewName;
  mode: ModeState;
  region: string;
}

const TABS: { key: ViewName; label: string; shortcut: string }[] = [
  { key: 'chat', label: 'Chat', shortcut: '1' },
  { key: 'resources', label: 'Resources', shortcut: '2' },
  { key: 'experiments', label: 'Experiments', shortcut: '3' },
  { key: 'config', label: 'Config', shortcut: '4' },
];

export function TabBar({ activeView, mode, region }: TabBarProps) {
  return (
    <Box paddingX={1} justifyContent="space-between">
      <Box gap={2}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeView;
          return (
            <Text
              key={tab.key}
              bold={isActive}
              color={isActive ? 'cyan' : undefined}
              dimColor={!isActive}
            >
              {tab.shortcut}:{tab.label}
            </Text>
          );
        })}
      </Box>
      <Box gap={1}>
        <Text color={mode.color}>{mode.current}</Text>
        <Text dimColor>│</Text>
        <Text dimColor>{region || 'no region'}</Text>
      </Box>
    </Box>
  );
}
