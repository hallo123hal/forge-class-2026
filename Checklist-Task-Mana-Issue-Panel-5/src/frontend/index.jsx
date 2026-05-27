import React, { useCallback, useEffect, useId, useState } from 'react';
import ForgeReconciler, {
  Button,
  ButtonGroup,
  Checkbox,
  EmptyState,
  Form,
  FormFooter,
  FormHeader,
  FormSection,
  Inline,
  Label,
  List,
  ListItem,
  LoadingButton,
  Lozenge,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Text,
  TextArea,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const PRIORITY_OPTIONS = [
  { label: '1 — Thấp', value: 1 },
  { label: '2 — Trung bình', value: 2 },
  { label: '3 — Cao', value: 3 },
];

const priorityLabel = (priority) => {
  const option = PRIORITY_OPTIONS.find((item) => item.value === priority);
  return option?.label ?? String(priority);
};

const priorityAppearance = (priority) => {
  if (priority >= 3) return 'removed';
  if (priority === 2) return 'moved';
  return 'success';
};

const parseTextAreaValue = (value) => {
  if (typeof value === 'string') return value;
  if (value?.target?.value !== undefined) return String(value.target.value);
  return String(value ?? '');
};

const App = () => {
  const context = useProductContext();
  const issueKey = context?.extension?.issue?.key;
  const formId = useId();

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(2);

  const applyListResult = useCallback((result) => {
    setItems(result?.items ?? []);
    setDone(result?.done ?? 0);
    setTotal(result?.total ?? 0);
  }, []);

  const loadItems = useCallback(async () => {
    if (!issueKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await invoke('getChecklistItems', { issueKey });
      applyListResult(result);
    } catch (e) {
      setError(e?.message || 'Không tải được checklist.');
      setItems([]);
      setDone(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [issueKey, applyListResult]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAdd = async () => {
    if (!issueKey) return;

    setAdding(true);
    setError(null);
    try {
      const result = await invoke('addChecklistItem', {
        issueKey,
        title: title.trim(),
        priority,
      });
      applyListResult(result);
      setTitle('');
      setPriority(2);
    } catch (e) {
      setError(e?.message || 'Thêm item thất bại.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (key) => {
    if (!issueKey) return;

    setBusyKey(key);
    setError(null);
    try {
      const result = await invoke('toggleChecklistItem', { issueKey, key });
      applyListResult(result);
    } catch (e) {
      setError(e?.message || 'Cập nhật trạng thái thất bại.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDelete = async (key) => {
    if (!issueKey) return;

    setBusyKey(key);
    setError(null);
    try {
      const result = await invoke('deleteChecklistItem', { issueKey, key });
      applyListResult(result);
    } catch (e) {
      setError(e?.message || 'Xóa item thất bại.');
    } finally {
      setBusyKey(null);
    }
  };

  if (!context || loading) {
    return <Spinner label="Đang tải checklist…" />;
  }

  if (!issueKey) {
    return (
      <SectionMessage appearance="warning" title="Thiếu issue key">
        <Text>Không lấy được issue key từ context.</Text>
      </SectionMessage>
    );
  }

  const titleFieldId = `${formId}-title`;
  const priorityFieldId = `${formId}-priority`;
  const selectedPriority =
    PRIORITY_OPTIONS.find((option) => option.value === priority) ?? null;

  return (
    <Stack space="space.200">
      <Inline space="space.100" alignBlock="center">
        <Text>Tiến độ:</Text>
        <Lozenge appearance={done === total && total > 0 ? 'success' : 'default'}>
          {`${done}/${total} hoàn thành`}
        </Lozenge>
      </Inline>

      {error ? (
        <SectionMessage appearance="error" title="Lỗi">
          <Text>{error}</Text>
        </SectionMessage>
      ) : null}

      <Form onSubmit={handleAdd}>
        <FormHeader title="Thêm checklist item" />
        <FormSection>
          <Stack space="space.150">
            <Label labelFor={titleFieldId}>Tiêu đề</Label>
            <TextArea
              id={titleFieldId}
              value={title}
              onChange={(value) => setTitle(parseTextAreaValue(value))}
              placeholder="Nhập nội dung công việc…"
            />

            <Label labelFor={priorityFieldId}>Priority</Label>
            <Select
              inputId={priorityFieldId}
              options={PRIORITY_OPTIONS}
              value={selectedPriority}
              onChange={(option) => setPriority(option?.value ?? 2)}
              placeholder="Chọn priority"
            />
          </Stack>
        </FormSection>
        <FormFooter>
          <LoadingButton
            appearance="primary"
            type="submit"
            isLoading={adding}
            isDisabled={!title.trim()}
          >
            Thêm item
          </LoadingButton>
        </FormFooter>
      </Form>

      {items.length === 0 ? (
        <EmptyState
          header="Chưa có item nào"
          description="Thêm item đầu tiên cho issue này."
        />
      ) : (
        <List>
          {items.map((item) => (
            <ListItem key={item.key}>
              <Stack space="space.100">
                <Inline space="space.100" alignBlock="center">
                  <Checkbox
                    id={`${formId}-${item.key}`}
                    label={item.title}
                    isChecked={item.isDone}
                    isDisabled={busyKey === item.key}
                    onChange={() => handleToggle(item.key)}
                  />
                  <Lozenge appearance={priorityAppearance(item.priority)}>
                    {priorityLabel(item.priority)}
                  </Lozenge>
                </Inline>
                <ButtonGroup>
                  <Button
                    appearance="subtle"
                    onClick={() => handleDelete(item.key)}
                    isDisabled={busyKey === item.key}
                  >
                    Xóa
                  </Button>
                </ButtonGroup>
              </Stack>
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
