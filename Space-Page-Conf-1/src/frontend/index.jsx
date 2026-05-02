import React from 'react';
import ForgeReconciler, { Text, useProductContext } from '@forge/react';

const App = () => {
  const context = useProductContext();
  const spaceKey = context?.extension?.space?.key;
  const spaceId = context?.extension?.space?.id;

  return (
    <>
      <Text>Xin chào từ Forge Space Page</Text>
      <Text>Space key: {spaceKey || 'Không lấy được'}</Text>
      <Text>Space id: {spaceId || 'Không lấy được'}</Text>
    </>
  );
};

ForgeReconciler.render(<App />);