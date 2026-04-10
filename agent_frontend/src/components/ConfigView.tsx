import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { AgentService } from '../services/AgentService.js';
import type { ModeState } from '../types.js';

interface ConfigViewProps {
  agentService: AgentService;
  mode: ModeState;
  onBack: () => void;
}

interface ConfigOption {
  label: string;
  value: string;
  options: string[];
  editable: boolean;
}

export function ConfigView({ agentService, mode, onBack }: ConfigViewProps) {
  const [selectedRow, setSelectedRow] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [configs, setConfigs] = useState<ConfigOption[]>([]);
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const [info, profiles, providers] = await Promise.all([
        agentService.getInfo(),
        agentService.listProfiles(),
        agentService.listModelProviders(),
      ]);

      const providerNames = Object.keys(providers.providers);
      const currentProvider = providers.current.provider;
      const currentModels = providers.providers[currentProvider]?.models.map((m: any) => m.id) || [];

      setConfigs([
        {
          label: 'LLM Provider',
          value: currentProvider,
          options: providerNames,
          editable: true,
        },
        {
          label: 'Model',
          value: providers.current.model_id,
          options: currentModels,
          editable: true,
        },
        {
          label: 'AWS Profile',
          value: profiles.current,
          options: profiles.profiles,
          editable: true,
        },
        {
          label: 'AWS Region',
          value: info.aws.region,
          options: [],
          editable: false,
        },
        {
          label: 'Operation Mode',
          value: mode.current,
          options: ['Planning', 'Action', 'Execution'],
          editable: false,
        },
      ]);
    } catch (error) {
      setMessage(`Error loading config: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const cycleValue = (direction: number) => {
    const config = configs[selectedRow];
    if (!config || !config.editable || config.options.length === 0) return;

    const currentValue = pendingValue ?? config.value;
    const currentIdx = config.options.indexOf(currentValue);
    const nextIdx = (currentIdx + direction + config.options.length) % config.options.length;
    const newValue = config.options[nextIdx] as string;
    if (!newValue) return;

    setPendingValue(newValue);
    setMessage('');
  };

  const applyValue = async () => {
    if (pendingValue === null) return;
    const config = configs[selectedRow];
    if (!config || !config.editable) return;

    setIsSaving(true);
    setMessage('');
    try {
      if (config.label === 'LLM Provider') {
        const providers = (await agentService.listModelProviders()).providers;
        const defaultModel = (providers as Record<string, any>)[pendingValue]?.default_model || '';
        await agentService.switchModel({ provider: pendingValue, model_id: defaultModel });
        await loadConfig();
      } else if (config.label === 'Model') {
        const provider = configs.find((c) => c.label === 'LLM Provider')?.value || 'anthropic';
        await agentService.switchModel({ provider, model_id: pendingValue });
        setConfigs((prev) => prev.map((c, i) => i === selectedRow ? { ...c, value: pendingValue! } : c));
      } else if (config.label === 'AWS Profile') {
        await agentService.switchProfile(pendingValue);
        setConfigs((prev) => prev.map((c, i) => i === selectedRow ? { ...c, value: pendingValue! } : c));
      }
      setMessage(`Updated ${config.label} to ${pendingValue}`);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsSaving(false);
      setPendingValue(null);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (pendingValue !== null) {
        setPendingValue(null);
        setMessage('');
      } else {
        onBack();
      }
      return;
    }

    if (key.return) {
      applyValue();
      return;
    }

    if (key.upArrow) {
      setPendingValue(null);
      setSelectedRow((prev) => Math.max(0, prev - 1));
    }

    if (key.downArrow) {
      setPendingValue(null);
      setSelectedRow((prev) => Math.min(configs.length - 1, prev + 1));
    }

    if (key.leftArrow) {
      cycleValue(-1);
    }

    if (key.rightArrow) {
      cycleValue(1);
    }
  });

  if (isLoading) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Spinner type="dots" />
        <Text> Loading configuration...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
      <Text bold color="cyan">Configuration</Text>

      <Box flexDirection="column" marginTop={1}>
        {configs.map((config, idx) => {
          const isSelected = idx === selectedRow;
          const displayValue = isSelected && pendingValue !== null ? pendingValue : config.value;
          const hasPending = isSelected && pendingValue !== null;
          return (
            <Box key={config.label} marginY={0}>
              <Box width={20}>
                <Text inverse={isSelected} bold={isSelected}>{config.label}</Text>
              </Box>
              <Text inverse={isSelected} color={hasPending ? 'yellow' : config.editable ? 'green' : 'gray'}>
                {displayValue}
              </Text>
              {config.editable && isSelected && !hasPending && (
                <Text dimColor> (← → to change)</Text>
              )}
              {hasPending && (
                <Text color="yellow"> ← Enter to confirm, Esc to cancel</Text>
              )}
            </Box>
          );
        })}
      </Box>

      {isSaving && (
        <Box marginTop={1}>
          <Spinner type="dots" />
          <Text> Saving...</Text>
        </Box>
      )}

      {message && (
        <Box marginTop={1}>
          <Text color={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate • ← → cycle value • Enter confirm • Esc back</Text>
      </Box>
    </Box>
  );
}
