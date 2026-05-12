import React, { useId, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  DatePicker,
  ErrorMessage,
  Form,
  FormFooter,
  FormHeader,
  FormSection,
  Heading,
  HelperMessage,
  Label,
  LoadingButton,
  RequiredAsterisk,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  TextArea,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { Controller, useForm, useWatch } from 'react-hook-form';

const NOTE_MAX = 500;

const App = () => {
  const context = useProductContext();
  const issueKey = context?.extension?.issue?.key;
  const formId = useId();

  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const { control, handleSubmit, reset, formState } = useForm({
    defaultValues: {
      note: '',
      reminderDate: '',
    },
    mode: 'onChange',
  });
  const { isSubmitting } = formState;

  /** `useWatch` = subscribe theo field (tương đương `watch('note')` trong react-hook-form). */
  const watchedNote = useWatch({ control, name: 'note' }) ?? '';
  const noteLength = String(watchedNote).length;

  const onSubmit = async (data) => {
    setSubmitError(null);
    if (!issueKey) {
      setSubmitError('Không có issue key trong context.');
      return;
    }
    try {
      await invoke('saveQuickNote', {
        issueKey,
        note: data.note.trim(),
        reminderDate: data.reminderDate?.trim()
          ? data.reminderDate.trim()
          : null,
      });
      setSuccess(true);
    } catch (e) {
      setSubmitError(e?.message || 'Lưu note thất bại.');
    }
  };

  const handleAddAnother = () => {
    reset({ note: '', reminderDate: '' });
    setSuccess(false);
    setSubmitError(null);
  };

  if (!context) {
    return <Spinner label="Đang tải…" />;
  }

  if (!issueKey) {
    return (
      <SectionMessage appearance="warning" title="Không có issue">
        <Text>Mở một issue trong Jira rồi chạy lại action này.</Text>
      </SectionMessage>
    );
  }

  if (success) {
    return (
      <Stack space="space.200">
        <SectionMessage appearance="success" title="Đã lưu note">
          <Text>
            Note đã được lưu (KVS key dạng note:accountId:issueKey).
          </Text>
        </SectionMessage>
        <Box>
          <Button appearance="primary" onClick={handleAddAnother}>
            Thêm note mới
          </Button>
        </Box>
      </Stack>
    );
  }

  const noteFieldId = `${formId}-note`;
  const reminderFieldId = `${formId}-reminder`;

  return (
    <Stack space="space.200">
      {submitError ? (
        <SectionMessage appearance="error" title="Lỗi">
          <Text>{submitError}</Text>
        </SectionMessage>
      ) : null}

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Text>Nhập nội dung note và (tuỳ chọn) ngày nhắc.</Text>

        <FormSection>
          <Stack space="space.100">
            <Label labelFor={noteFieldId}>
              Note <RequiredAsterisk />
            </Label>
            <Controller
              name="note"
              control={control}
              rules={{
                validate: (value) => {
                  const t = typeof value === 'string' ? value.trim() : '';
                  if (!t) {
                    return 'Note không được rỗng.';
                  }
                  if (t.length > NOTE_MAX) {
                    return `Tối đa ${NOTE_MAX} ký tự.`;
                  }
                  return true;
                },
              }}
              render={({ field, fieldState }) => {
                const { ref: _ref, ...fieldProps } = field;
                return (
                  <>
                    <TextArea
                      {...fieldProps}
                      id={noteFieldId}
                      isInvalid={fieldState.invalid}
                      maxLength={NOTE_MAX}
                    />
                    <Text>{`${Math.min(noteLength, NOTE_MAX)}/${NOTE_MAX}`}</Text>
                    {fieldState.error?.message ? (
                      <ErrorMessage>{fieldState.error.message}</ErrorMessage>
                    ) : (
                      <HelperMessage>
                        Bắt buộc, tối đa {NOTE_MAX} ký tự.
                      </HelperMessage>
                    )}
                  </>
                );
              }}
            />
          </Stack>
        </FormSection>

        <FormSection>
          <Stack space="space.100">
            <Label labelFor={reminderFieldId}>Reminder date</Label>
            <Controller
              name="reminderDate"
              control={control}
              render={({ field }) => {
                const { ref: _ref, value, onChange, onBlur } = field;
                return (
                  <DatePicker
                    id={reminderFieldId}
                    value={value ?? ''}
                    onChange={(dateStr) => {
                      onChange(dateStr || '');
                    }}
                    onBlur={onBlur}
                  />
                );
              }}
            />
            <HelperMessage>Tuỳ chọn.</HelperMessage>
          </Stack>
        </FormSection>

        <FormFooter>
          <LoadingButton
            type="submit"
            appearance="primary"
            isLoading={isSubmitting}
          >
            Lưu note
          </LoadingButton>
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
