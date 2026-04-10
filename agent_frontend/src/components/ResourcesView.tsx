import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { FilterBar } from './FilterBar.js';
import { getResources, filterResources, sortResources, parseFilter } from '../stores/resourceStore.js';
import type { Resource } from '../types.js';

interface ResourcesViewProps {
  onBack: () => void;
  onRefresh: () => void;
}

const COLUMNS: { key: keyof Resource; label: string; width: number }[] = [
  { key: 'service', label: 'SERVICE', width: 14 },
  { key: 'name', label: 'RESOURCE', width: 30 },
  { key: 'status', label: 'STATUS', width: 12 },
  { key: 'region', label: 'REGION', width: 14 },
];

const SORT_KEYS: (keyof Resource)[] = ['service', 'name', 'status', 'region'];

export function ResourcesView({ onBack, onRefresh }: ResourcesViewProps) {
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedRow, setSelectedRow] = useState(0);
  const [sortIndex, setSortIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  const query = parseFilter(filterText);
  const filtered = filterResources(query);
  const sorted = sortResources(filtered, SORT_KEYS[sortIndex] ?? 'service');

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
      onRefresh();
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

    if (key.return && sorted.length > 0) {
      setShowDetail(!showDetail);
    }
  });

  if (sorted.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <Text dimColor>
          No resources discovered. Switch to Chat and ask the agent to scan your infrastructure.
        </Text>
        <Box marginTop={1}>
          <Text dimColor>Press Esc to go back • r to refresh</Text>
        </Box>
      </Box>
    );
  }

  const selectedResource = sorted[selectedRow];

  if (showDetail && selectedResource) {
    return (
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <Text bold color="cyan">{selectedResource.name}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Service: <Text color="cyan">{selectedResource.service}</Text></Text>
          <Text>ID: <Text dimColor>{selectedResource.id}</Text></Text>
          <Text>Status: <Text color="green">{selectedResource.status}</Text></Text>
          <Text>Region: {selectedResource.region}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text bold>Tags:</Text>
            {Object.entries(selectedResource.tags).length > 0 ? (
              Object.entries(selectedResource.tags).map(([k, v]) => (
                <Text key={k} dimColor>  {k} = {v}</Text>
              ))
            ) : (
              <Text dimColor>  (no tags)</Text>
            )}
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Esc to go back</Text>
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
          const isSelected = idx === selectedRow;
          const tagStr = Object.entries(resource.tags).map(([k, v]) => `${k}=${v}`).join(', ');

          return (
            <Box key={`${resource.id}-${idx}`}>
              <Box width={COLUMNS[0]!.width}>
                <Text inverse={isSelected}>{resource.service}</Text>
              </Box>
              <Box width={COLUMNS[1]!.width}>
                <Text inverse={isSelected}>{resource.name.slice(0, COLUMNS[1]!.width - 2)}</Text>
              </Box>
              <Box width={COLUMNS[2]!.width}>
                <Text inverse={isSelected} color="green">{resource.status}</Text>
              </Box>
              <Box width={COLUMNS[3]!.width}>
                <Text inverse={isSelected}>{resource.region}</Text>
              </Box>
              <Text inverse={isSelected} dimColor>{tagStr.slice(0, 30)}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Help bar */}
      <Box paddingX={1}>
        <Text dimColor>↑↓ navigate • / filter • s sort • Enter details • r refresh • Esc back</Text>
      </Box>
    </Box>
  );
}
