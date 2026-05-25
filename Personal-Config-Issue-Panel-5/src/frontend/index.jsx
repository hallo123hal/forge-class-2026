import React, { useCallback, useEffect, useId, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Form,
  FormFooter,
  FormHeader,
  FormSection,
  Label,
  LoadingButton,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Text,
  Textfield,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const LANGUAGE_OPTIONS = [
  { label: 'Tiếng Việt', value: 'vi' },
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
];

const DEFAULT_FORM = {
  preferredLanguage: 'vi',
  showAvatar: true,
  itemsPerPage: '25',
};

const formatSavedAt = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const parseTextfieldValue = (value) => {
  if (typeof value === 'string') return value;
  if (value?.target?.value !== undefined) return String(value.target.value);
  return String(value ?? '');
};

const App = () => {
  const formId = useId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);

  const [preferredLanguage, setPreferredLanguage] = useState(
    DEFAULT_FORM.preferredLanguage
  );
  const [showAvatar, setShowAvatar] = useState(DEFAULT_FORM.showAvatar);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_FORM.itemsPerPage);

  const applySettingsToForm = useCallback((settings) => {
    setPreferredLanguage(
      settings?.preferredLanguage ?? DEFAULT_FORM.preferredLanguage
    );
    setShowAvatar(
      typeof settings?.showAvatar === 'boolean'
        ? settings.showAvatar
        : DEFAULT_FORM.showAvatar
    );
    setItemsPerPage(
      settings?.itemsPerPage != null
        ? String(settings.itemsPerPage)
        : DEFAULT_FORM.itemsPerPage
    );
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke('getUserSettings');
      applySettingsToForm(result?.settings);
      setSavedAt(result?.savedAt ?? null);
    } catch (e) {
      setError(e?.message || 'Không tải được cài đặt.');
    } finally {
      setLoading(false);
    }
  }, [applySettingsToForm]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const result = await invoke('saveUserSettings', {
        preferredLanguage,
        showAvatar,
        itemsPerPage: Number(itemsPerPage),
      });
      const at = result?.savedAt ?? new Date().toISOString();
      setSavedAt(at);
      setSaveMessage(`Đã lưu lúc ${formatSavedAt(at)}`);
    } catch (e) {
      setError(e?.message || 'Lưu cài đặt thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);
    setSaveMessage(null);
    try {
      await invoke('deleteUserSettings');
      applySettingsToForm(DEFAULT_FORM);
      setSavedAt(null);
      setSaveMessage('Đã reset về mặc định.');
    } catch (e) {
      setError(e?.message || 'Reset thất bại.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <Spinner label="Đang tải cài đặt…" />;
  }

  const languageFieldId = `${formId}-language`;
  const avatarFieldId = `${formId}-avatar`;
  const itemsFieldId = `${formId}-items`;

  const selectedLanguage =
    LANGUAGE_OPTIONS.find((o) => o.value === preferredLanguage) ?? null;

  const savedAtLabel =
    saveMessage ||
    (savedAt ? `Đã lưu lúc ${formatSavedAt(savedAt)}` : null);

  return (
    <Stack space="space.200">
      {error ? (
        <SectionMessage appearance="error" title="Lỗi">
          <Text>{error}</Text>
        </SectionMessage>
      ) : null}

      {savedAtLabel ? (
        <SectionMessage appearance="success" title="Trạng thái lưu">
          <Text>{savedAtLabel}</Text>
        </SectionMessage>
      ) : null}

      <Form onSubmit={handleSave}>
        <FormHeader title="Cài đặt Cá nhân">
          <Text>
            Tùy chọn áp dụng cho toàn bộ Jira của bạn (KVS key: user-settings:accountId).
          </Text>
        </FormHeader>

        <FormSection>
          <Stack space="space.150">
            <Label labelFor={languageFieldId}>Ngôn ngữ ưa thích</Label>
            <Select
              inputId={languageFieldId}
              options={LANGUAGE_OPTIONS}
              value={selectedLanguage}
              onChange={(option) =>
                setPreferredLanguage(option?.value ?? DEFAULT_FORM.preferredLanguage)
              }
              placeholder="Chọn ngôn ngữ"
            />

            <Checkbox
              id={avatarFieldId}
              label="Hiển thị avatar"
              isChecked={showAvatar}
              onChange={(event) => {
                const checked =
                  typeof event === 'boolean'
                    ? event
                    : event?.target?.checked ?? false;
                setShowAvatar(checked);
              }}
            />

            <Label labelFor={itemsFieldId}>Số items / trang</Label>
            <Textfield
              id={itemsFieldId}
              type="number"
              value={itemsPerPage}
              onChange={(value) => setItemsPerPage(parseTextfieldValue(value))}
            />
          </Stack>
        </FormSection>

        <FormFooter>
          <ButtonGroup>
            <LoadingButton
              appearance="primary"
              type="submit"
              isLoading={saving}
              isDisabled={resetting}
            >
              Lưu
            </LoadingButton>
            <Button
              appearance="subtle"
              onClick={handleReset}
              isDisabled={saving || resetting}
            >
              {resetting ? 'Đang reset…' : 'Reset về mặc định'}
            </Button>
          </ButtonGroup>
        </FormFooter>
      </Form>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
