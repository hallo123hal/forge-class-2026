import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';

const resolver = new Resolver();

/**
 * Lưu quick note + reminder vào Forge KVS.
 * Key: note:{accountId}:{issueKey}
 */
resolver.define('saveQuickNote', async (req) => {
  const accountId =
    req.context?.accountId ?? req.context?.principal?.accountId;
  const issueKey =
    req.payload?.issueKey ??
    req.context?.extension?.issue?.key;

  const noteRaw =
    typeof req.payload?.note === 'string' ? req.payload.note : '';
  const note = noteRaw.trim();
  const reminderDate =
    req.payload?.reminderDate === undefined ||
    req.payload?.reminderDate === null ||
    req.payload?.reminderDate === ''
      ? null
      : String(req.payload.reminderDate);

  if (!accountId) {
    throw new Error('Không xác định được người dùng (accountId).');
  }
  if (!issueKey) {
    throw new Error('Không có issue key.');
  }
  if (!note) {
    throw new Error('Note không được rỗng.');
  }
  if (note.length > 500) {
    throw new Error('Note tối đa 500 ký tự.');
  }

  const key = `note:${accountId}:${issueKey}`;
  const value = {
    note,
    reminderDate,
    savedAt: new Date().toISOString(),
  };

  await kvs.set(key, value);

  return { success: true, key };
});

export const handler = resolver.getDefinitions();
