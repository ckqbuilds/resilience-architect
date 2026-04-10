import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { getAllExperiments, getLocalPlans, getAwsExperiments, filterExperiments } from '../stores/planStore.js';
import type { ExperimentRow, ExperimentSubTab, ExperimentStatus } from '../types.js';

interface ExperimentsViewProps {
  onBack: () => void;
  onRefresh: () => void;
}

const SUB_TABS: ExperimentSubTab[] = ['all', 'local', 'aws'];
const SUB_TAB_LABELS: Record<ExperimentSubTab, string> = {
  all: 'All',
  local: 'Local Plans',
  aws: 'AWS Experiments',
};

const STATUS_COLORS: Record<ExperimentStatus, string> = {
  draft: 'yellow',
  ready: 'green',
  running: 'red',
  completed: 'gray',
  failed: 'red',
};

export function ExperimentsView({ onBack, onRefresh }: ExperimentsViewProps) {
  const [subTab, setSubTab] = useState<ExperimentSubTab>('all');
  const [selectedRow, setSelectedRow] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const getListForTab = (): ExperimentRow[] => {
    switch (subTab) {
      case 'local': return getLocalPlans();
      case 'aws': return getAwsExperiments();
      default: return getAllExperiments();
    }
  };

  const experiments = filterExperiments(getListForTab(), filterText);

  useInput((input, key) => {
    if (showFilter) {
      if (key.escape) {
        setShowFilter(false);
        setFilterText('');
      }
      return;
    }

    if (key.escape) {
      if (showDetail) {
        setShowDetail(false);
      } else {
        onBack();
      }
      return;
    }

    if (key.tab) {
      const currentIdx = SUB_TABS.indexOf(subTab);
      setSubTab(SUB_TABS[(currentIdx + 1) % SUB_TABS.length] as typeof subTab);
      setSelectedRow(0);
      return;
    }

    if (input === 'f') {
      setShowFilter(true);
      return;
    }

    if (input === 'r') {
      onRefresh();
      return;
    }

    if (key.upArrow) {
      setSelectedRow((prev) => Math.max(0, prev - 1));
    }

    if (key.downArrow) {
      setSelectedRow((prev) => Math.min(experiments.length - 1, prev + 1));
    }

    if (key.return && experiments.length > 0) {
      setShowDetail(!showDetail);
    }
  });

  if (experiments.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <Box gap={2} marginBottom={1}>
          {SUB_TABS.map((tab) => (
            <Text key={tab} bold={tab === subTab} color={tab === subTab ? 'cyan' : undefined} dimColor={tab !== subTab}>
              {SUB_TAB_LABELS[tab]}
            </Text>
          ))}
        </Box>
        <Text dimColor>No experiments found. Use Chat to create experiment plans or run FIS experiments.</Text>
        <Box marginTop={1}>
          <Text dimColor>Tab switch tabs • r refresh • Esc back</Text>
        </Box>
      </Box>
    );
  }

  const selectedExperiment = experiments[selectedRow];

  if (showDetail && selectedExperiment) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <Text bold color="cyan">{selectedExperiment.name}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Source: <Text color="cyan">{selectedExperiment.source === 'local' ? 'Local Plan' : 'AWS FIS'}</Text></Text>
          <Text>Status: <Text color={STATUS_COLORS[selectedExperiment.status]}>{selectedExperiment.status}</Text></Text>
          <Text>Risk: <Text color={selectedExperiment.riskLevel === 'HIGH' ? 'red' : 'yellow'}>{selectedExperiment.riskLevel}</Text></Text>
          <Text>Targets: {selectedExperiment.targets}</Text>
          <Text>Duration: {selectedExperiment.duration}</Text>
          <Text>ID: <Text dimColor>{selectedExperiment.id}</Text></Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Esc to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Sub-tabs */}
      <Box paddingX={1} gap={2}>
        {SUB_TABS.map((tab) => (
          <Text key={tab} bold={tab === subTab} color={tab === subTab ? 'cyan' : undefined} dimColor={tab !== subTab}>
            {SUB_TAB_LABELS[tab]}
          </Text>
        ))}
        <Text dimColor>│</Text>
        <Text dimColor>{experiments.length} experiments</Text>
      </Box>

      {/* Column headers */}
      <Box paddingX={1} marginTop={1}>
        <Box width={8}><Text bold color="blue">SRC</Text></Box>
        <Box width={28}><Text bold color="blue">NAME</Text></Box>
        <Box width={12}><Text bold color="blue">STATUS</Text></Box>
        <Box width={10}><Text bold color="blue">RISK</Text></Box>
        <Box width={18}><Text bold color="blue">TARGETS</Text></Box>
        <Text bold color="blue">DURATION</Text>
      </Box>

      {/* Rows */}
      <Box flexDirection="column" paddingX={1} flexGrow={1}>
        {experiments.map((exp, idx) => {
          const isSelected = idx === selectedRow;
          return (
            <Box key={`${exp.id}-${idx}`}>
              <Text inverse={isSelected}>
                <Box width={8}><Text dimColor>{exp.source === 'local' ? 'Local' : 'AWS'}</Text></Box>
              </Text>
              <Text inverse={isSelected}>
                <Box width={28}><Text>{exp.name.slice(0, 26)}</Text></Box>
              </Text>
              <Text inverse={isSelected}>
                <Box width={12}><Text color={STATUS_COLORS[exp.status]}>{exp.status}</Text></Box>
              </Text>
              <Text inverse={isSelected}>
                <Box width={10}><Text color={exp.riskLevel === 'HIGH' ? 'red' : 'yellow'}>{exp.riskLevel}</Text></Box>
              </Text>
              <Text inverse={isSelected}>
                <Box width={18}><Text>{exp.targets.slice(0, 16)}</Text></Box>
              </Text>
              <Text inverse={isSelected} dimColor>{exp.duration}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Help bar */}
      <Box paddingX={1}>
        <Text dimColor>↑↓ navigate • Tab switch tabs • f filter • Enter details • r refresh • Esc back</Text>
      </Box>
    </Box>
  );
}
