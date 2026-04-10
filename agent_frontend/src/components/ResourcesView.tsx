import { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { FilterBar } from './FilterBar.js';
import {
  getResources,
  addResources,
  clearResources,
  filterResources,
  sortResources,
  parseFilter,
  toggleResourceSelection,
  getSelectedResources,
} from '../stores/resourceStore.js';
import { AgentService } from '../services/AgentService.js';
import type { Resource } from '../types.js';

interface ResourcesViewProps {
  onBack: () => void;
  onRefresh: () => void;
  agentService: AgentService;
}

const COLUMNS: { key: keyof Resource; label: string; width: number }[] = [
  { key: 'service', label: 'SERVICE', width: 14 },
  { key: 'name', label: 'RESOURCE', width: 30 },
  { key: 'status', label: 'STATUS', width: 12 },
  { key: 'region', label: 'REGION', width: 14 },
];

const SORT_KEYS: (keyof Resource)[] = ['service', 'name', 'status', 'region'];

export function ResourcesView({ onBack, onRefresh, agentService }: ResourcesViewProps) {
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedRow, setSelectedRow] = useState(0);
  const [sortIndex, setSortIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState('');
  const [tick, setTick] = useState(0);

  // Auto-discover on mount if no resources cached
  useEffect(() => {
    if (getResources().length === 0) {
      runDiscovery();
    }
  }, []);

  const runDiscovery = async (query: string = '*') => {
    setIsDiscovering(true);
    setDiscoverError('');
    try {
      const result = await agentService.discoverResources(query);
      clearResources();
      addResources(result.resources);
      setTick((prev) => prev + 1);
    } catch (error) {
      setDiscoverError(error instanceof Error ? error.message : 'Discovery failed');
    } finally {
      setIsDiscovering(false);
    }
  };

  const query = parseFilter(filterText);
  const filtered = filterResources(query);
  const sorted = sortResources(filtered, SORT_KEYS[sortIndex] ?? 'service');
  const selectedCount = getSelectedResources().length;

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

    if (input === '/') {
      setShowFilter(true);
      return;
    }

    if (input === 'r') {
      runDiscovery();
      return;
    }

    if (input === 's') {
      setSortIndex((prev) => (prev + 1) % SORT_KEYS.length);
      return;
    }

    if (key.upArrow) {
      setSelectedRow((prev) => Math.max(0, prev - 1));
    }

    if (key.downArrow) {
      setSelectedRow((prev) => Math.min(sorted.length - 1, prev + 1));
    }

    // Space to toggle selection
    if (input === ' ' && sorted.length > 0 && !showDetail) {
      const resource = sorted[selectedRow];
      if (resource) {
        toggleResourceSelection(resource.id);
        setTick((prev) => prev + 1);
      }
      return;
    }

    if (key.return && sorted.length > 0) {
      setShowDetail(!showDetail);
    }
  });

  if (isDiscovering) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <Box>
          <Spinner type="dots" />
          <Text> Discovering resources via AWS Resource Explorer...</Text>
        </Box>
      </Box>
    );
  }

  if (discoverError) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <Text color="red">Discovery error: {discoverError}</Text>
        <Box marginTop={1}>
          <Text dimColor>r to retry • Esc to go back</Text>
        </Box>
      </Box>
    );
  }

  if (sorted.length === 0 && getResources().length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <Text dimColor>
          No resources discovered. Press r to scan, or switch to Chat and ask the agent.
        </Text>
        <Box marginTop={1}>
          <Text dimColor>r to discover • / to filter • Esc to go back</Text>
        </Box>
      </Box>
    );
  }

  const currentResource = sorted[selectedRow];

  if (showDetail && currentResource) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <Box>
          <Text bold color="cyan">{currentResource.name}</Text>
          <Text> </Text>
          <Text color={currentResource.selected ? 'green' : 'gray'}>
            {currentResource.selected ? '[SELECTED]' : '[not selected]'}
          </Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text>Service: <Text color="cyan">{currentResource.service}</Text></Text>
          <Text>ID: <Text dimColor>{currentResource.id}</Text></Text>
          <Text>Status: <Text color="green">{currentResource.status}</Text></Text>
          <Text>Region: {currentResource.region}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text bold>Tags:</Text>
            {Object.entries(currentResource.tags).length > 0 ? (
              Object.entries(currentResource.tags).map(([k, v]) => (
                <Text key={k} dimColor>  {k} = {v}</Text>
              ))
            ) : (
              <Text dimColor>  (no tags)</Text>
            )}
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Space to toggle selection • Esc to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Info bar */}
      <Box paddingX={1} gap={2}>
        <Text dimColor>{sorted.length} resources</Text>
        <Text dimColor>│</Text>
        <Text color="green">{selectedCount} selected</Text>
        <Text dimColor>│</Text>
        <Text dimColor>Sort: <Text color="cyan">{SORT_KEYS[sortIndex]}</Text></Text>
      </Box>

      {/* Filter bar */}
      {showFilter && (
        <FilterBar
          value={filterText}
          onChange={setFilterText}
          onSubmit={() => setShowFilter(false)}
        />
      )}

      {/* Column headers */}
      <Box paddingX={1} marginTop={1}>
        <Box width={3}>
          <Text bold color="blue"> </Text>
        </Box>
        {COLUMNS.map((col) => (
          <Box key={col.key} width={col.width}>
            <Text bold color="blue">{col.label}</Text>
          </Box>
        ))}
        <Text bold color="blue">TAGS</Text>
      </Box>

      {/* Rows */}
      <Box flexDirection="column" paddingX={1} flexGrow={1}>
        {sorted.map((resource, idx) => {
          const isCursor = idx === selectedRow;
          const tagStr = Object.entries(resource.tags).map(([k, v]) => `${k}=${v}`).join(', ');

          return (
            <Box key={`${resource.id}-${idx}`}>
              <Box width={3}>
                <Text color={resource.selected ? 'green' : 'gray'}>
                  {resource.selected ? '◉ ' : '○ '}
                </Text>
              </Box>
              <Box width={COLUMNS[0]!.width}>
                <Text inverse={isCursor}>{resource.service}</Text>
              </Box>
              <Box width={COLUMNS[1]!.width}>
                <Text inverse={isCursor}>{resource.name.slice(0, COLUMNS[1]!.width - 2)}</Text>
              </Box>
              <Box width={COLUMNS[2]!.width}>
                <Text inverse={isCursor} color="green">{resource.status}</Text>
              </Box>
              <Box width={COLUMNS[3]!.width}>
                <Text inverse={isCursor}>{resource.region}</Text>
              </Box>
              <Text dimColor>{tagStr.slice(0, 30)}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Help bar */}
      <Box paddingX={1}>
        <Text dimColor>↑↓ navigate • Space select • / filter • s sort • Enter details • r rediscover • Esc back</Text>
      </Box>
    </Box>
  );
}
