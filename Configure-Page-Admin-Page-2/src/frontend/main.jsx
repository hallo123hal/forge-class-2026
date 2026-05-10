import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Link, Spinner, Stack, Text } from '@forge/react';
import { invoke } from '@forge/bridge';

const MainAdminPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [configurePath, setConfigurePath] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const [savedConfig, configure] = await Promise.all([
          invoke('getApiKey'),
          invoke('getConfigurePath'),
        ]);
        setApiKey(savedConfig?.apiKey || '');
        setConfigurePath(typeof configure?.path === 'string' ? configure.path : '');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to read saved config.');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <Stack space="space.200">
      <Text>
        Liên kết dưới đây trỏ tới đúng URL Configure (appId + envId UUID). Nút Configure trong
        Manage apps cũng mở cùng địa chỉ; entry có useAsConfig không xuất hiện trong sidebar.
      </Text>
      {configurePath ? (
        <Text>
          <Link href={configurePath}>Mở trang Configure (API key)</Link>
        </Text>
      ) : null}
      <Text>Saved configuration:</Text>
      {errorMessage ? (
        <Text>{`Error: ${errorMessage}`}</Text>
      ) : (
        <Text>{apiKey ? apiKey : 'No API key configured yet.'}</Text>
      )}
    </Stack>
  );
};

ForgeReconciler.render(<MainAdminPage />);
