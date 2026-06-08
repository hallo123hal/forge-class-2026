import React, { useCallback, useEffect, useId, useState } from 'react';
import ForgeReconciler, {
  Button,
  ButtonGroup,
  Checkbox,
  Form,
  FormFooter,
  FormHeader,
  FormSection,
  Label,
  LoadingButton,
  Lozenge,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Text,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const THEME_OPTIONS = [
  { label: 'Sáng', value: 'light' },
  { label: 'Tối', value: 'dark' },
];

const LOCALE_OPTIONS = [
  { label: 'Tiếng Việt', value: 'vi' },
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
];

const DEFAULT_FORM = {
  theme: 'light',
  showAvatar: true,
  locale: 'vi',
  notifications: true,
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

const App = () => {
  const formId = useId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [schemaVersion, setSchemaVersion] = useState(null);
  const [migratedFromV1, setMigratedFromV1] = useState(false);

  const [theme, setTheme] = useState(DEFAULT_FORM.theme);
  const [showAvatar, setShowAvatar] = useState(DEFAULT_FORM.showAvatar);
  const [locale, setLocale] = useState(DEFAULT_FORM.locale);
  const [notifications, setNotifications] = useState(DEFAULT_FORM.notifications);

  const applyPrefsToForm = useCallback((prefs) => {
    setTheme(prefs?.theme ?? DEFAULT_FORM.theme);
    setShowAvatar(
      typeof prefs?.showAvatar === 'boolean'
        ? prefs.showAvatar
        : DEFAULT_FORM.showAvatar
    );
    setLocale(prefs?.locale ?? DEFAULT_FORM.locale);
    setNotifications(
      typeof prefs?.notifications === 'boolean'
        ? prefs.notifications
        : DEFAULT_FORM.notifications
    );
    setSchemaVersion(prefs?.version ?? null);
  }, []);

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke('getUserPrefs');
      applyPrefsToForm(result?.prefs);
      setSavedAt(result?.savedAt ?? null);
      setMigratedFromV1(Boolean(result?.migratedFromV1));
    } catch (e) {
      setError(e?.message || 'Không tải được cài đặt.');
    } finally {
      setLoading(false);
    }
  }, [applyPrefsToForm]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const result = await invoke('saveUserPrefs', {
        theme,
        showAvatar,
        locale,
        notifications,
      });
      const at = result?.savedAt ?? new Date().toISOString();
      setSavedAt(at);
      setSchemaVersion(result?.version ?? 2);
      setMigratedFromV1(false);
      setSaveMessage(`Đã lưu v2 lúc ${formatSavedAt(at)}`);
    } catch (e) {
      setError(e?.message || 'Lưu cài đặt thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedV1 = async () => {
    setSeeding(true);
    setError(null);
    setSaveMessage(null);
    try {
      await invoke('seedV1UserPrefs', { theme: 'dark', showAvatar: true });
      await loadPrefs();
      setSaveMessage(
        'Đã seed v1: { theme: "dark", showAvatar: true } — reload để xem migration.'
      );
    } catch (e) {
      setError(e?.message || 'Seed v1 thất bại.');
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);
    setSaveMessage(null);
    try {
      await invoke('deleteUserPrefs');
      applyPrefsToForm(DEFAULT_FORM);
      setSavedAt(null);
      setSchemaVersion(null);
      setMigratedFromV1(false);
      setSaveMessage('Đã xóa storage và reset về mặc định.');
    } catch (e) {
      setError(e?.message || 'Reset thất bại.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <Spinner label="Đang tải cài đặt…" />;
  }

  const themeFieldId = `${formId}-theme`;
  const avatarFieldId = `${formId}-avatar`;
  const localeFieldId = `${formId}-locale`;
  const notificationsFieldId = `${formId}-notifications`;

  const selectedTheme =
    THEME_OPTIONS.find((o) => o.value === theme) ?? null;
  const selectedLocale =
    LOCALE_OPTIONS.find((o) => o.value === locale) ?? null;

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

      {migratedFromV1 ? (
        <SectionMessage appearance="warning" title="Migration v1 → v2">
          <Text>
            Đọc được dữ liệu v1 cũ. Đã bổ sung locale=&quot;vi&quot;,
            notifications=true, version=2. Lưu để ghi v2 vào storage.
          </Text>
        </SectionMessage>
      ) : null}

      {savedAtLabel ? (
        <SectionMessage appearance="success" title="Trạng thái lưu">
          <Text>
            {savedAtLabel}
            {schemaVersion != null ? (
              <>
                {' '}
                <Lozenge appearance="success">schema v{schemaVersion}</Lozenge>
              </>
            ) : null}
          </Text>
        </SectionMessage>
      ) : null}

      <Form onSubmit={handleSave}>
        <FormHeader title="Cài đặt Cá nhân">
          <Text>
            Schema migration: v1 chỉ có theme/showAvatar; v2 thêm locale,
            notifications, version. Key KVS: user-prefs:accountId.
          </Text>
        </FormHeader>

        <FormSection>
          <Stack space="space.150">
            <Label labelFor={themeFieldId}>Giao diện (theme)</Label>
            <Select
              inputId={themeFieldId}
              options={THEME_OPTIONS}
              value={selectedTheme}
              onChange={(option) =>
                setTheme(option?.value ?? DEFAULT_FORM.theme)
              }
              placeholder="Chọn theme"
            />

            <Checkbox
              id={avatarFieldId}
              label="Hiển thị avatar (showAvatar)"
              isChecked={showAvatar}
              onChange={(event) => {
                const checked =
                  typeof event === 'boolean'
                    ? event
                    : event?.target?.checked ?? false;
                setShowAvatar(checked);
              }}
            />

            <Label labelFor={localeFieldId}>Ngôn ngữ (locale)</Label>
            <Select
              inputId={localeFieldId}
              options={LOCALE_OPTIONS}
              value={selectedLocale}
              onChange={(option) =>
                setLocale(option?.value ?? DEFAULT_FORM.locale)
              }
              placeholder="Chọn locale"
            />

            <Checkbox
              id={notificationsFieldId}
              label="Bật thông báo (notifications)"
              isChecked={notifications}
              onChange={(event) => {
                const checked =
                  typeof event === 'boolean'
                    ? event
                    : event?.target?.checked ?? false;
                setNotifications(checked);
              }}
            />
          </Stack>
        </FormSection>

        <FormFooter>
          <ButtonGroup>
            <LoadingButton
              appearance="primary"
              type="submit"
              isLoading={saving}
              isDisabled={resetting || seeding}
            >
              Lưu (v2)
            </LoadingButton>
            <Button
              appearance="default"
              onClick={handleSeedV1}
              isDisabled={saving || resetting || seeding}
            >
              {seeding ? 'Đang seed v1…' : 'Seed v1 test data'}
            </Button>
            <Button
              appearance="subtle"
              onClick={handleReset}
              isDisabled={saving || resetting || seeding}
            >
              {resetting ? 'Đang reset…' : 'Xóa storage'}
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
