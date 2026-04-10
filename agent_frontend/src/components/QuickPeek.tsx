import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { getResources } from '../stores/resourceStore.js';
import { getAllExperiments } from '../stores/planStore.js';
import type { ExperimentStatus } from '../types.js';

type PeekPanel = 'resources' | 'experiments';

const STATUS_COLORS: Record<ExperimentStatus, string> = {
  draft: 'yellow',
  ready: 'green',
  running: 'red',
  completed: 'gray',
  failed: 'red',
};

interface QuickPeekProps {
  onDismiss: () => void;
}

export function QuickPeek({ onDismiss }: QuickPeekProps) {
  const [panel, setPanel] = useState<PeekPanel>('resources');

  useInput((_input, key) => {
    if (key.leftArrow) setPanel('resources');
    if (key.rightArrow) setPanel('experiments');
  });

  const resources = getResources();
  const experiments = getAllExperiments();

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="blue"
      paddingX={1}
      paddingY={0}
      width="60%"
      marginLeft={10}
    >
      {/* Panel tabs */}
      <Box gap={2} marginBottom={1}>
        <Text bold={panel === 'resources'} color={panel === 'resources' ? 'cyan' : undefined} dimColor={panel !== 'resources'}>
          Resources ({resources.length})
        </Text>
        <Text bold={panel === 'experiments'} color={panel === 'experiments' ? 'cyan' : undefined} dimColor={panel !== 'experiments'}>
          Experiments ({experiments.length})
        </Text>
      </Box>

      {/* Content */}
      {panel === 'resources' ? (
        resources.length === 0 ? (
          <Text dimColor>No resources discovered yet.</Text>
        ) : (
          <Box flexDirection="column">
            {resources.slice(0, 8).map((r, idx) => (
              <Box key={`${r.id}-${idx}`} gap={1}>
                <Box width={12}><Text>{r.service}</Text></Box>
                <Box width={24}><Text>{r.name.slice(0, 22)}</Text></Box>
                <Text color="green">{r.status}</Text>
              </Box>
            ))}
            {resources.length > 8 && (
              <Text dimColor>... and {resources.length - 8} more</Text>
            )}
          </Box>
        )
      ) : (
        experiments.length === 0 ? (
          <Text dimColor>No experiments yet.</Text>
        ) : (
          <Box flexDirection="column">
            {experiments.slice(0, 8).map((e, idx) => (
              <Box key={`${e.id}-${idx}`} gap={1}>
                <Box width={8}><Text dimColor>{e.source}</Text></Box>
                <Box width={24}><Text>{e.name.slice(0, 22)}</Text></Box>
                <Text color={STATUS_COLORS[e.status]}>{e.status}</Text>
              </Box>
            ))}
            {experiments.length > 8 && (
              <Text dimColor>... and {experiments.length - 8} more</Text>
            )}
          </Box>
        )
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>← → switch panels • Release Tab to dismiss</Text>
      </Box>
    </Box>
  );
}
