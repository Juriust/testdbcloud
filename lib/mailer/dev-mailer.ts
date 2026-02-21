import { isLocalAppEnv } from "@/lib/env";
import { normalizeEmail } from "@/lib/security/email";

type DevResetCodeRecord = {
  code: string;
  createdAt: Date;
};

type DevMailboxStore = Map<string, DevResetCodeRecord>;

declare global {
  var __DEV_MAILBOX__: DevMailboxStore | undefined;
}

function getMailboxStore(): DevMailboxStore {
  if (!global.__DEV_MAILBOX__) {
    global.__DEV_MAILBOX__ = new Map<string, DevResetCodeRecord>();
  }
  return global.__DEV_MAILBOX__;
}

export async function deliverPasswordResetCodeByEmail(email: string, code: string): Promise<void> {
  if (!isLocalAppEnv()) {
    // SMTP integration can be plugged in later.
    return;
  }

  const key = normalizeEmail(email);
  getMailboxStore().set(key, {
    code,
    createdAt: new Date(),
  });
}

// Helper used by smoke tests in local mode.
export function consumeLatestDevResetCode(email: string): string | null {
  const key = normalizeEmail(email);
  const record = getMailboxStore().get(key);
  if (!record) {
    return null;
  }
  getMailboxStore().delete(key);
  return record.code;
}
