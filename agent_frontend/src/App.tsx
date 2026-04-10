import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { ChatDisplay } from './components/ChatDisplay.js';
import { InfoScreen } from './components/InfoScreen.js';
import { ModeTransitionDialog } from './components/ModeTransitionDialog.js';
import { CommandSuggestions } from './components/CommandSuggestions.js';
import { Banner } from './components/Banner.js';
import { TabBar } from './components/TabBar.js';
import { Footer } from './components/Footer.js';
import { ResourcesView } from './components/ResourcesView.js';
import { ExperimentsView } from './components/ExperimentsView.js';
import { ConfigView } from './components/ConfigView.js';
import { QuickPeek } from './components/QuickPeek.js';
import { AgentService } from './services/AgentService.js';
import { addResources } from './stores/resourceStore.js';
import { setLocalPlans } from './stores/planStore.js';
import type { Message, ModeState, ViewName } from './types.js';

const AVAILABLE_COMMANDS = [
  { name: 'help', description: 'Display available commands' },
  { name: 'info', description: 'Show LLM model info, AWS config, and session statistics' },
  { name: 'clear', description: 'Clear chat history' },
  { name: 'mode', description: 'Display current operation mode' },
  { name: 'quit', description: 'Exit the application' },
  { name: 'exit', description: 'Exit the application' },
  { name: 'chat', description: 'Switch to Chat view' },
  { name: 'resources', description: 'Switch to Resources view' },
  { name: 'experiments', description: 'Switch to Experiments view' },
  { name: 'config', description: 'Switch to Config view' },
];

const MAX_MESSAGES = 100;

const limitMessages = (messages: Message[]) => {
  if (messages.length > MAX_MESSAGES) {
    return messages.slice(-MAX_MESSAGES);
  }
  return messages;
};

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [activeView, setActiveView] = useState<ViewName>('chat');
  const [modeState, setModeState] = useState<ModeState>({
    current: 'Planning',
    color: 'yellow',
    description: 'Planning chaos experiments',
  });
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [pendingModeTransition, setPendingModeTransition] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [inputKey, setInputKey] = useState(0);
  const [currentToolCall, setCurrentToolCall] = useState<{ toolName: string; operation?: string } | null>(null);
  const [showQuickPeek, setShowQuickPeek] = useState(false);
  const [awsRegion, setAwsRegion] = useState('');

  const { exit } = useApp();
  const agentService = useMemo(() => new AgentService(), []);

  // Load initial region
  useEffect(() => {
    agentService.getInfo().then((info) => {
      setAwsRegion(info.aws.region);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setShowBanner(false);
    }
  }, [messages]);

  useEffect(() => {
    if (!showModeDialog && !isLoading && !showInfo && activeView === 'chat') {
      setInputKey((prev) => prev + 1);
    }
  }, [showModeDialog, isLoading, showInfo, activeView]);

  const switchView = useCallback((view: ViewName) => {
    setActiveView(view);
    if (view === 'chat') {
      setInputKey((prev) => prev + 1);
    }
  }, []);

  const handleSlashCommand = async (command: string) => {
    const parts = command.slice(1).split(' ');
    const cmd = parts[0]?.toLowerCase() || '';

    switch (cmd) {
      case 'help':
        setMessages((prev) => limitMessages([
          ...prev,
          {
            role: 'system',
            content:
              'Available commands:\n' +
              '/help - Show this help message\n' +
              '/info - Show LLM and AWS information\n' +
              '/clear - Clear chat history\n' +
              '/quit - Exit the application\n' +
              '/mode - Show current operation mode\n' +
              '/chat - Switch to Chat view (or press 1)\n' +
              '/resources - Switch to Resources view (or press 2)\n' +
              '/experiments - Switch to Experiments view (or press 3)\n' +
              '/config - Switch to Config view (or press 4)',
            timestamp: new Date(),
          },
        ]));
        break;
      case 'info':
        setShowInfo(true);
        break;
      case 'clear':
        setMessages([{ role: 'system', content: 'Chat cleared.', timestamp: new Date() }]);
        break;
      case 'quit':
      case 'exit':
        exit();
        break;
      case 'mode':
        setMessages((prev) => limitMessages([
          ...prev,
          { role: 'system', content: `Current Mode: ${modeState.current} - ${modeState.description}`, timestamp: new Date() },
        ]));
        break;
      case 'chat':
        switchView('chat');
        break;
      case 'resources':
        switchView('resources');
        break;
      case 'experiments':
        switchView('experiments');
        break;
      case 'config':
        switchView('config');
        break;
      default:
        setMessages((prev) => limitMessages([
          ...prev,
          { role: 'system', content: `Unknown command: /${cmd}. Type /help for available commands.`, timestamp: new Date() },
        ]));
    }
  };

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;

    if (value.startsWith('/')) {
      await handleSlashCommand(value);
      setInput('');
      return;
    }

    const userMessage: Message = { role: 'user', content: value, timestamp: new Date() };
    setMessages((prev) => limitMessages([...prev, userMessage]));
    setInput('');
    setIsLoading(true);
    setCurrentToolCall({ toolName: 'thinking', operation: 'processing request...' });

    try {
      const response = await agentService.sendMessage(value);

      setCurrentToolCall(null);

      if (response.interrupt) {
        setPendingModeTransition(response.interrupt);
        setShowModeDialog(true);
        setIsLoading(false);
        return;
      }

      // Push structured data from backend into stores
      if (response.resources && response.resources.length > 0) {
        addResources(response.resources);
      }
      if (response.experiments && response.experiments.length > 0) {
        setLocalPlans(response.experiments);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        events: response.events,
      };
      setMessages((prev) => limitMessages([...prev, assistantMessage]));
    } catch (error) {
      setCurrentToolCall(null);
      const errorMessage: Message = {
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => limitMessages([...prev, errorMessage]));
    } finally {
      setIsLoading(false);
      setCurrentToolCall(null);
    }
  };

  const handleModeApproval = async (approved: boolean) => {
    setShowModeDialog(false);

    if (approved && pendingModeTransition) {
      setModeState({
        current: pendingModeTransition.requiredMode,
        color: pendingModeTransition.color || 'yellow',
        description: pendingModeTransition.description || '',
      });

      setMessages((prev) => limitMessages([
        ...prev,
        { role: 'system', content: `Mode transition to ${pendingModeTransition.requiredMode} approved.`, timestamp: new Date() },
      ]));

      try {
        const response = await agentService.respondToInterrupt(pendingModeTransition.id, approved);

        if (response.resources && response.resources.length > 0) {
          addResources(response.resources);
        }
        if (response.experiments && response.experiments.length > 0) {
          setLocalPlans(response.experiments);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          events: response.events,
        };
        setMessages((prev) => limitMessages([...prev, assistantMessage]));
      } catch (error) {
        const errorMessage: Message = {
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => limitMessages([...prev, errorMessage]));
      }
    } else {
      setMessages((prev) => limitMessages([
        ...prev,
        { role: 'system', content: `Mode transition to ${pendingModeTransition?.requiredMode} rejected.`, timestamp: new Date() },
      ]));
    }

    setPendingModeTransition(null);
  };

  const handleRefreshResources = () => {
    switchView('chat');
    handleSubmit('Discover and list all AWS resources in the current region.');
  };

  const handleRefreshExperiments = () => {
    switchView('chat');
    handleSubmit('List all saved experiment plans and any running FIS experiments.');
  };

  // Global key handlers
  useInput((_input, key) => {
    if (key.escape && showInfo) {
      setShowInfo(false);
      return;
    }

    // Quick-peek: Tab key
    if (key.tab && activeView === 'chat' && !isLoading && !showModeDialog && !showInfo) {
      setShowQuickPeek((prev) => !prev);
      return;
    }

    // View switching with number keys (only when not typing in input)
    if (activeView !== 'chat' || (!isLoading && !showModeDialog && !showInfo && !input)) {
      if (_input === '1') { switchView('chat'); return; }
      if (_input === '2') { switchView('resources'); return; }
      if (_input === '3') { switchView('experiments'); return; }
      if (_input === '4') { switchView('config'); return; }
    }
  });

  // Mode transition dialog takes over the screen
  if (showModeDialog && pendingModeTransition) {
    return (
      <ModeTransitionDialog
        currentMode={modeState.current}
        requiredMode={pendingModeTransition.requiredMode}
        toolName={pendingModeTransition.toolName}
        reason={pendingModeTransition.reason}
        onApprove={() => handleModeApproval(true)}
        onReject={() => handleModeApproval(false)}
      />
    );
  }

  if (showInfo) {
    return (
      <InfoScreen
        modeState={modeState}
        onClose={() => setShowInfo(false)}
      />
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <TabBar activeView={activeView} mode={modeState} region={awsRegion} />

      {/* View content */}
      {activeView === 'chat' && (
        <>
          <Box flexGrow={1} flexDirection="column" paddingX={1}>
            {showBanner && <Banner />}
            <ChatDisplay messages={messages} currentToolCall={currentToolCall} />
          </Box>

          {/* Quick-peek overlay */}
          {showQuickPeek && (
            <QuickPeek onDismiss={() => setShowQuickPeek(false)} />
          )}

          <Box
            flexDirection="column"
            borderStyle="single"
            borderTop={true}
            paddingX={1}
            paddingY={0}
          >
            <CommandSuggestions input={input} commands={AVAILABLE_COMMANDS} />
            <Box>
              <Text color="cyan">› </Text>
              {isLoading ? (
                <Box>
                  <Spinner type="dots" />
                  <Text> Processing...</Text>
                </Box>
              ) : (
                <TextInput
                  key={inputKey}
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSubmit}
                  placeholder="Type your message... (Press Enter to send, /help for commands)"
                />
              )}
            </Box>
          </Box>
        </>
      )}

      {activeView === 'resources' && (
        <ResourcesView
          onBack={() => switchView('chat')}
          onRefresh={handleRefreshResources}
        />
      )}

      {activeView === 'experiments' && (
        <ExperimentsView
          onBack={() => switchView('chat')}
          onRefresh={handleRefreshExperiments}
        />
      )}

      {activeView === 'config' && (
        <ConfigView
          agentService={agentService}
          mode={modeState}
          onBack={() => switchView('chat')}
        />
      )}

      <Footer mode={modeState} />
    </Box>
  );
}
