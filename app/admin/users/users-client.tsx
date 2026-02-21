"use client";

import { useState } from "react";

type Role = "USER" | "JUNIOR_ADMIN" | "ADMIN";

export type AdminUserRow = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US");
}

export default function AdminUsersClient(props: {
  actorRole: Role;
  actorId: string;
  initialUsers: AdminUserRow[];
  showDeactivated: boolean;
  take: number;
  skip: number;
}) {
  const [users, setUsers] = useState<AdminUserRow[]>(props.initialUsers);
  const [message, setMessage] = useState<string | null>(null);
  const [issuedCodes, setIssuedCodes] = useState<Record<string, string>>({});

  async function refreshUsers() {
    const search = new URLSearchParams({
      take: String(props.take),
      skip: String(props.skip),
      showDeactivated: String(props.showDeactivated),
    });

    const response = await fetch(`/api/admin/users?${search.toString()}`);
    if (!response.ok) {
      setMessage("Failed to refresh users");
      return;
    }

    const data = await response.json() as { users: AdminUserRow[] };
    setUsers(data.users);
  }

  async function changeRole(userId: string, role: Role) {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(payload?.error ?? "Failed to change role");
      return;
    }

    setMessage("Role updated");
    await refreshUsers();
  }

  async function deactivate(userId: string) {
    const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
      method: "POST",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(payload?.error ?? "Failed to deactivate user");
      return;
    }

    setMessage("User deactivated");
    await refreshUsers();
  }

  async function issueResetCode(userId: string) {
    const response = await fetch(`/api/admin/users/${userId}/reset-code`, {
      method: "POST",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(payload?.error ?? "Failed to issue reset code");
      return;
    }

    const payload = await response.json() as { code: string; expiresAt: string };
    setIssuedCodes((previous) => ({
      ...previous,
      [userId]: `${payload.code} (expires ${formatDate(payload.expiresAt)})`,
    }));
    setMessage("Reset code issued");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Admin / Users</h1>
          <a
            className="text-sm text-blue-600 underline"
            href={`/admin/users?showDeactivated=${props.showDeactivated ? "false" : "true"}`}
          >
            {props.showDeactivated ? "Hide deactivated" : "Show deactivated"}
          </a>
        </div>

        {message ? <p className="mb-4 text-sm text-gray-700">{message}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 border-b">Email</th>
                <th className="p-3 border-b">Role</th>
                <th className="p-3 border-b">Created</th>
                <th className="p-3 border-b">Last login</th>
                <th className="p-3 border-b">Status</th>
                <th className="p-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const canEditRole = props.actorRole === "ADMIN";
                const canDeactivate = props.actorRole === "ADMIN";
                const canIssueReset = props.actorRole === "ADMIN" || props.actorRole === "JUNIOR_ADMIN";
                const canResetTarget = props.actorRole === "ADMIN" || user.role === "USER";
                const isSelf = props.actorId === user.id;

                return (
                  <tr key={user.id} className="border-b">
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      {canEditRole ? (
                        <select
                          value={user.role}
                          disabled={user.deletedAt !== null}
                          onChange={(event) => {
                            void changeRole(user.id, event.target.value as Role);
                          }}
                          className="border rounded px-2 py-1"
                        >
                          <option value="USER">USER</option>
                          <option value="JUNIOR_ADMIN">JUNIOR_ADMIN</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <span>{user.role}</span>
                      )}
                    </td>
                    <td className="p-3">{formatDate(user.createdAt)}</td>
                    <td className="p-3">{formatDate(user.lastLoginAt)}</td>
                    <td className="p-3">{user.deletedAt ? "deactivated" : "active"}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-2">
                        {canDeactivate && !user.deletedAt && !isSelf ? (
                          <button
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                            onClick={() => {
                              void deactivate(user.id);
                            }}
                          >
                            Deactivate
                          </button>
                        ) : null}

                        {canIssueReset && canResetTarget && !user.deletedAt ? (
                          <button
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                            onClick={() => {
                              void issueResetCode(user.id);
                            }}
                          >
                            Issue reset code
                          </button>
                        ) : null}

                        {issuedCodes[user.id] ? (
                          <p className="text-xs text-gray-700">{issuedCodes[user.id]}</p>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
