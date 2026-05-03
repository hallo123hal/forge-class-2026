import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Strong, Spinner, useProductContext } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const [loading, setLoading] = useState(true);
  const [spaceData, setSpaceData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSpace = async () => {
      try {
        const spaceKey = context?.extension?.space?.key;
        const spaceId = context?.extension?.space?.id;
        if (!spaceKey) {
          setError('Không lấy được space key từ context.');
          setLoading(false);
          return;
        }

        const data = await invoke('getSpaceDetails', { spaceKey, spaceId });
        setSpaceData(data);
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : e && typeof e === 'object' && typeof e.message === 'string'
              ? e.message
              : typeof e === 'string'
                ? e
                : 'Có lỗi xảy ra';
        setError(msg || 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };

    if (context) {
      loadSpace();
    }
  }, [context]);

  if (!context || loading) return <Spinner />;
  if (error) return <Text>{error}</Text>;

  return (
    <>
      <Text>Xin chào từ Forge Space Page</Text>
      <Text>
        <Strong>Space:</Strong> {spaceData.name} ({spaceData.key})
      </Text>
      <Text>
        <Strong>Space id:</Strong> {spaceData.id || 'Không lấy được'}
      </Text>
      <Text>
        <Strong>Type:</Strong> {spaceData.type}
      </Text>
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
