"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    tasks: number;
  };
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const hasProjects = useMemo(() => projects.length > 0, [projects]);

  async function loadProjects() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/projects", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load projects");
    }

    setProjects(data.projects as Project[]);
    setLoading(false);
  }

  useEffect(() => {
    loadProjects().catch((loadError: unknown) => {
      const message = loadError instanceof Error ? loadError.message : "Failed to load projects";
      setError(message);
      setLoading(false);
    });
  }, []);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create project");
      }

      setName("");
      await loadProjects();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create project";
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Todo Tracker</h1>
        <p className="mt-2 text-sm text-slate-600">Create projects and open tasks stored in cloud PostgreSQL.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Create project</h2>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleCreateProject}>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-200 focus:ring"
            placeholder="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Projects</h2>

        {loading ? <p className="mt-4 text-sm text-slate-500">Loading...</p> : null}

        {!loading && !hasProjects ? (
          <p className="mt-4 text-sm text-slate-500">No projects yet.</p>
        ) : null}

        {!loading && hasProjects ? (
          <ul className="mt-4 space-y-3">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex flex-col gap-2 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-500">
                    Tasks: {project._count.tasks} • Created: {formatDate(project.createdAt)}
                  </p>
                </div>
                <Link
                  href={`/projects/${project.id}`}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Open tasks
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
