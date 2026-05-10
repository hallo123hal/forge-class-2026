import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Button, Stack, Text, Textfield } from '@forge/react';
import { invoke } from '@forge/bridge';

const ConfigurePage = () => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await invoke('getApiKey');
        setApiKey(savedConfig?.apiKey || '');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to load saved config.');
      }
    };

    loadConfig();
  }, []);

  const saveConfig = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      await invoke('saveApiKey', { apiKey });
      setMessage('API key saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save API key.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack space="space.200">
      <Text>Configure API key for this app:</Text>
      <Textfield
        value={apiKey}
        onChange={(event) => setApiKey(event.target.value)}
        placeholder="Enter API key"
      />
      <Button onClick={saveConfig} isDisabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
      {message ? <Text>{message}</Text> : null}
    </Stack>
  );
};

ForgeReconciler.render(<ConfigurePage />);
