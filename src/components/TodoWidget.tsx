"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Circle, Plus, X } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { sq } from "date-fns/locale";

type ClientOption = { id: number; name: string };
type TodoTask = {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  clientId: number | null;
  client: ClientOption | null;
  dueDate: string | null;
  assignedTo: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

const priorityLabel: Record<string, string> = {
  low: "I ulët",
  medium: "Mesatar",
  high: "I lartë",
  urgent: "Urgjent",
};

export default function TodoWidget({
  initialTasks,
  clients,
  totalToday,
  completedToday,
  onTaskStatusChange,
  onTaskCreated,
}: {
  initialTasks: TodoTask[];
  clients: ClientOption[];
  totalToday: number;
  completedToday: number;
  onTaskStatusChange: (wasDone: boolean, isDone: boolean) => void;
  onTaskCreated: () => void;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [total, setTotal] = useState(totalToday);
  const [completed, setCompleted] = useState(completedToday);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const toggleTask = async (task: TodoTask) => {
    setBusyId(task.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/todos/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: task.status === "done" ? "open" : "done" }),
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || "Detyra nuk u përditësua");
      setTasks((current) => current.map((item) => item.id === task.id ? updated as TodoTask : item));
      onTaskStatusChange(task.status === "done", updated.status === "done");
      if (task.dueDate && format(new Date(task.dueDate), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")) {
        setCompleted((value) => Math.max(0, value + (task.status === "done" ? -1 : 1)));
      }
      setNotice(task.status === "done" ? "Detyra u rihap." : "Detyra u përfundua.");
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Gabim gjatë përditësimit");
    } finally {
      setBusyId(null);
    }
  };

  const createTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Titulli është i detyrueshëm.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, clientId: clientId || null, dueDate: dueDate || null, priority, status: "open" }),
      });
      const created = await response.json();
      if (!response.ok) throw new Error(created.error || "Detyra nuk u krijua");
      const task = created as TodoTask;
      setTasks((current) => [task, ...current]);
      onTaskCreated();
      if (dueDate === format(new Date(), "yyyy-MM-dd")) setTotal((value) => value + 1);
      setTitle("");
      setClientId("");
      setDueDate(format(new Date(), "yyyy-MM-dd"));
      setPriority("medium");
      setShowForm(false);
      setNotice("Detyra u krijua me sukses.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gabim gjatë krijimit");
    } finally {
      setSaving(false);
    }
  };

  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const today = startOfDay(new Date());

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-900">TO DO — Detyrat e Mia</h2>
          <p className="mt-0.5 text-xs capitalize text-slate-500">{format(new Date(), "EEEE, d MMMM yyyy", { locale: sq })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setError(""); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Detyrë e Re</button>
          <Link href="/todos" className="whitespace-nowrap text-xs font-semibold text-indigo-600 hover:text-indigo-800">Shiko të gjitha →</Link>
        </div>
      </header>

      <div className="px-5 py-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <span className="whitespace-nowrap text-xs font-semibold text-slate-600">{completed}/{total} për sot</span>
        </div>

        {notice && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center">
            <CalendarDays className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Nuk ka detyra të planifikuara për sot.</p>
            <p className="mt-1 text-xs text-slate-500">Krijo një detyrë të re për të filluar.</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Krijo detyrën e parë</button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const overdue = task.status !== "done" && !!task.dueDate && isBefore(startOfDay(new Date(task.dueDate)), today);
              const dueLabel = !task.dueDate ? "Pa afat" : overdue ? `Vonesë · ${format(new Date(task.dueDate), "d MMM", { locale: sq })}` : "Sot";
              return (
                <li key={task.id} className="flex items-start gap-3 py-3">
                  <button disabled={busyId === task.id} onClick={() => void toggleTask(task)} aria-label={task.status === "done" ? "Rihap detyrën" : "Përfundo detyrën"} className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 disabled:opacity-50">
                    {task.status === "done" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <Link href={`/todos?task=${task.id}`} className={`block truncate text-sm font-semibold hover:text-indigo-700 ${task.status === "done" ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      {task.client && <span>Klienti: {task.client.name}</span>}
                      <span className={task.priority === "urgent" || task.priority === "high" ? "font-semibold text-orange-700" : ""}>Prioriteti: {priorityLabel[task.priority] ?? "Mesatar"}</span>
                      <span className={overdue ? "font-semibold text-red-600" : ""}>Afati: {dueLabel}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="dashboard-todo-title" className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="dashboard-todo-title" className="font-bold text-slate-900">Detyrë e Re</h3>
              <button aria-label="Mbyll" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <form onSubmit={createTask} className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Titulli *<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500" /></label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700">Klienti<select value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="">Pa klient</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
                <label className="text-sm font-semibold text-slate-700">Afati<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
                <label className="text-sm font-semibold text-slate-700">Prioriteti<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="low">I ulët</option><option value="medium">Mesatar</option><option value="high">I lartë</option><option value="urgent">Urgjent</option></select></label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Anulo</button>
                <button disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Duke ruajtur..." : "Krijo detyrë"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
