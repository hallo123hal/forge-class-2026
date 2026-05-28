import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Badge,
  Box,
  Button,
  DynamicTable,
  Heading,
  Inline,
  Lozenge,
  Spinner,
  Stack,
  Tag,
  Text
} from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingPageId, setAddingPageId] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invoke('getSpaceHealth');
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to load space data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onAddReviewLabel = async (pageId) => {
    setAddingPageId(pageId);
    setError(null);
    try {
      await invoke('addReviewLabel', { pageId });
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to add review-needed label.');
    } finally {
      setAddingPageId(null);
    }
  };

  if (loading) {
    return (
      <Box>
        <Inline alignBlock="center" space="space.100">
          <Spinner size="small" />
          <Text>Loading space health report...</Text>
        </Inline>
      </Box>
    );
  }

  if (error) {
    return (
      <Stack space="space.200">
        <Lozenge appearance="removed">Error</Lozenge>
        <Text>{error}</Text>
        <Button appearance="primary" onClick={loadData}>
          Retry
        </Button>
      </Stack>
    );
  }

  const newestRows = (data?.newestPages ?? []).map((page, index) => ({
    key: page.id,
    cells: [
      { key: `index-${page.id}`, content: `${index + 1}` },
      { key: `title-${page.id}`, content: page.title },
      {
        key: `created-${page.id}`,
        content: page.createdAt ? new Date(page.createdAt).toLocaleString() : '-'
      },
      {
        key: `actions-${page.id}`,
        content: (
          <Button
            appearance="subtle"
            isDisabled={addingPageId === page.id}
            onClick={() => onAddReviewLabel(page.id)}
          >
            {addingPageId === page.id ? 'Adding...' : 'Them label review-needed'}
          </Button>
        )
      }
    ]
  }));

  const topLabels = (data?.labels ?? []).slice(0, 12);

  return (
    <Stack space="space.300">
      <Heading size="medium">Space Health Report</Heading>
      <Inline alignInline="start" space="space.100">
        <Text>Total pages:</Text>
        <Badge appearance="added">{data?.totalPages ?? 0}</Badge>
      </Inline>

      <Stack space="space.100">
        <Heading size="small">5 newest pages</Heading>
        <DynamicTable
          head={{
            cells: [
              { key: 'index', content: '#' },
              { key: 'title', content: 'Title' },
              { key: 'createdAt', content: 'Created at' },
              { key: 'action', content: 'Action' }
            ]
          }}
          rows={newestRows}
          rowsPerPage={5}
          defaultPage={1}
          isFixedSize
          emptyView={<Text>No page found in this space.</Text>}
        />
      </Stack>

      <Stack space="space.100">
        <Heading size="small">Top labels in space</Heading>
        <Inline shouldWrap space="space.100">
          {topLabels.length > 0 ? (
            topLabels.map((label) => (
              <Tag key={label.name} text={`${label.name} (${label.usageCount})`} />
            ))
          ) : (
            <Text>No labels found.</Text>
          )}
        </Inline>
      </Stack>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
