"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type TaskStatus = "OPEN" | "DONE";
type TaskFilter = "all" | "open" | "done";

type Project = {
  id: string;
  name: string;
};

type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

async function parseApiResponse(response: Response): Promise<{ error?: string }> {
  const raw = await response.text();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as { error?: string };
  } catch {
    return {};
  }
}

function formatDueDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString();
}

export default function ProjectTasksPage() {
  const params = useParams<{ id: string }>();
  const projectIdParam = params?.id;
  const projectId = Array.isArray(projectIdParam) ? projectIdParam[0] : projectIdParam;

  const [projectName, setProjectName] = useState<string>("Project");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskFilter>("all");
  const [query, setQuery] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<number>(2);
  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasTasks = useMemo(() => tasks.length > 0, [tasks]);

  const loadProjectMeta = useCallback(async () => {
    if (!projectId) {
      return;
    }

    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load project info");
    }

    const match = (data.projects as Project[]).find((project) => project.id === projectId);
    if (match) {
      setProjectName(match.name);
    }
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("status", statusFilter);
    if (query.trim()) {
      params.set("q", query.trim());
    }

    const response = await fetch(`/api/projects/${projectId}/tasks?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load tasks");
    }

    setTasks(data.tasks as Task[]);
    setLoading(false);
  }, [projectId, query, statusFilter]);

  useEffect(() => {
    setError(null);
    setLoading(true);

    Promise.all([loadProjectMeta(), loadTasks()]).catch((loadError: unknown) => {
      const message = loadError instanceof Error ? loadError.message : "Failed to load project data";
      setError(message);
      setLoading(false);
    });
  }, [loadProjectMeta, loadTasks]);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) {
      setError("Project id is missing");
      return;
    }

    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create task");
      }

      setTitle("");
      setDescription("");
      setPriority(2);
      setDueDate("");
      await loadTasks();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create task";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTask(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}/toggle`, {
      method: "PATCH",
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to toggle task");
    }

    await loadTasks();
  }

  async function deleteTask(taskId: string) {
    setDeletingTaskId(taskId);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const data = await parseApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete task");
      }
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      throw error;
    } finally {
      setDeletingTaskId(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{projectName}</h1>
            <p className="mt-1 text-sm text-slate-600">Manage and test tasks in cloud PostgreSQL.</p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Back to projects
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Add task</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateTask}>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-200 focus:ring sm:col-span-2"
            placeholder="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-200 focus:ring sm:col-span-2"
            placeholder="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-200 focus:ring"
            value={priority}
            onChange={(event) => setPriority(Number(event.target.value))}
          >
            <option value={1}>Priority 1</option>
            <option value={2}>Priority 2</option>
            <option value={3}>Priority 3</option>
          </select>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-200 focus:ring"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
          >
            {submitting ? "Adding..." : "Add task"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${statusFilter === "open" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}
              onClick={() => setStatusFilter("open")}
            >
              Open
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${statusFilter === "done" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"}`}
              onClick={() => setStatusFilter("done")}
            >
              Done
            </button>
          </div>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-200 focus:ring sm:w-72"
            placeholder="Search by title"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {loading ? <p className="mt-4 text-sm text-slate-500">Loading...</p> : null}

        {!loading && !hasTasks ? <p className="mt-4 text-sm text-slate-500">No tasks found.</p> : null}

        {!loading && hasTasks ? (
          <ul className="mt-4 space-y-3">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === "DONE"}
                    onChange={() => {
                      setError(null);
                      toggleTask(task.id).catch((toggleError: unknown) => {
                        const message =
                          toggleError instanceof Error ? toggleError.message : "Failed to toggle task";
                        setError(message);
                      });
                    }}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-slate-400" : "text-slate-900"}`}>
                      {task.title}
                    </p>
                    {task.description ? <p className="text-xs text-slate-500">{task.description}</p> : null}
                    <p className="mt-1 text-xs text-slate-500">
                      Priority: {task.priority} • Due: {formatDueDate(task.dueDate)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={deletingTaskId === task.id}
                  onClick={() => {
                    setError(null);
                    deleteTask(task.id).catch((deleteError: unknown) => {
                      const message =
                        deleteError instanceof Error ? deleteError.message : "Failed to delete task";
                      setError(message);
                    });
                  }}
                  className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingTaskId === task.id ? "Deleting..." : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
