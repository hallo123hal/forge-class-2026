import React from 'react';
import ForgeReconciler, {
  DynamicTable,
  Heading,
  Spinner,
  Text,
  useProductContext,
} from '@forge/react';

const App = () => {
  const context = useProductContext();

  if (!context) {
    return <Spinner />;
  }

  const rows = [
    {
      key: 'accountId',
      cells: [
        { key: 'f1', content: 'accountId' },
        { key: 'v1', content: context.accountId ?? '—' },
      ],
    },
    {
      key: 'cloudId',
      cells: [
        { key: 'f2', content: 'cloudId' },
        { key: 'v2', content: context.cloudId ?? '—' },
      ],
    },
    {
      key: 'locale',
      cells: [
        { key: 'f3', content: 'locale' },
        { key: 'v3', content: context.locale ?? '—' },
      ],
    },
    {
      key: 'timezone',
      cells: [
        { key: 'f4', content: 'timezone' },
        { key: 'v4', content: context.timezone ?? '—' },
      ],
    },
    {
      key: 'issue.key',
      cells: [
        { key: 'f5', content: 'extension.issue.key' },
        { key: 'v5', content: context.extension?.issue?.key ?? '—' },
      ],
    },
    {
      key: 'project.key',
      cells: [
        { key: 'f6', content: 'extension.project.key' },
        { key: 'v6', content: context.extension?.project?.key ?? '—' },
      ],
    },
  ];

  const head = {
    cells: [
      { key: 'field', content: 'Trường' },
      { key: 'value', content: 'Giá trị' },
    ],
  };

  return (
    <>
      <Heading as="h3">Debug Table Product Context</Heading>
      <Text>The table below is fetched from useProductContext() after the context has loaded.</Text>
      <DynamicTable head={head} rows={rows} />
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
