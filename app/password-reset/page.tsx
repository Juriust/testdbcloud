"use client";

import { useState } from "react";

export default function PasswordResetPage() {
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    const response = await fetch("/api/auth/password/request-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      setRequestMessage("Unable to process request right now.");
      return;
    }

    setRequestMessage("If an account exists, a reset code has been sent.");
  }

  async function confirmCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const code = String(formData.get("code") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");

    const response = await fetch("/api/auth/password/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code, newPassword }),
    });

    if (!response.ok) {
      setConfirmMessage("Invalid or expired code.");
      return;
    }

    setConfirmMessage("Password updated. You can sign in with the new password.");
    event.currentTarget.reset();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <section className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Request Reset Code</h1>
          <form className="space-y-4" onSubmit={requestCode}>
            <input
              type="email"
              name="email"
              required
              placeholder="Email"
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Send code
            </button>
          </form>
          {requestMessage ? <p className="text-sm mt-3 text-gray-700">{requestMessage}</p> : null}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Confirm Reset</h2>
          <form className="space-y-4" onSubmit={confirmCode}>
            <input
              type="email"
              name="email"
              required
              placeholder="Email"
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="text"
              name="code"
              required
              placeholder="6-digit code"
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              placeholder="New password"
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Update password
            </button>
          </form>
          {confirmMessage ? <p className="text-sm mt-3 text-gray-700">{confirmMessage}</p> : null}
        </section>
      </div>
    </div>
  );
}
