"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Circle,
  CheckCircle2,
  Columns3,
  List,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  addMonths,
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { sq } from "date-fns/locale";

type TodoStatus = "open" | "in_progress" | "on_hold" | "done";
type TodoPriority = "low" | "medium" | "high" | "urgent";
type TeamMember = { id: number; name: string; role: string };
type ClientOption = { id: number; name: string };

interface TodoTask {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  category: string | null;
  clientId: number | null;
  createdById: number | null;
  assignedToId: number | null;
  client: ClientOption | null;
  createdBy: { id: number; name: string } | null;
  assignedTo: { id: number; name: string } | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type TaskForm = {
  title: string;
  description: string;
  priority: TodoPriority;
  status: TodoStatus;
  clientId: string;
  assignedToId: string;
  dueDate: string;
  category: string;
};

const emptyForm: TaskForm = {
  title: "",
  description: "",
  priority: "medium",
  status: "open",
  clientId: "",
  assignedToId: "",
  dueDate: "",
  category: "",
};

const statuses: { value: TodoStatus; label: string; color: string }[] = [
  { value: "open", label: "Për t'u bërë", color: "bg-slate-100 text-slate-700" },
  { value: "in_progress", label: "Në progres", color: "bg-blue-100 text-blue-700" },
  { value: "on_hold", label: "Në pritje", color: "bg-amber-100 text-amber-800" },
  { value: "done", label: "Përfunduar", color: "bg-emerald-100 text-emerald-700" },
];

const priorities: { value: TodoPriority; label: string; color: string }[] = [
  { value: "low", label: "I ulët", color: "text-slate-500" },
  { value: "medium", label: "Mesatar", color: "text-blue-600" },
  { value: "high", label: "I lartë", color: "text-orange-600" },
  { value: "urgent", label: "Urgjent", color: "text-red-600" },
];

const statusInfo = (status: string) => statuses.find((item) => item.value === status) ?? statuses[0];
const priorityInfo = (priority: string) => priorities.find((item) => item.value === priority) ?? priorities[1];
const normalizeStatus = (value: string): TodoStatus =>
  statuses.some((item) => item.value === value) ? value as TodoStatus : "open";
const normalizePriority = (value: string): TodoPriority =>
  priorities.some((item) => item.value === value) ? value as TodoPriority : "medium";

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function TodosClient({
  initialTasks,
  clients,
  teamMembers,
  currentUserId,
  isAdmin,
}: {
  initialTasks: TodoTask[];
  clients: ClientOption[];
  teamMembers: TeamMember[];
  currentUserId: number;
  isAdmin: boolean;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"list" | "board" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [taskScope, setTaskScope] = useState<"all" | "mine">("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<TodoTask | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<"day" | "week" | "month">("month");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const today = startOfDay(new Date());
  const categories = useMemo(
    () => [...new Set(tasks.map((task) => task.category).filter((category): category is string => !!category))].sort(),
    [tasks]
  );
  const filtered = useMemo(() => tasks.filter((task) => {
    const query = search.trim().toLocaleLowerCase();
    const overdue = task.status !== "done" && !!task.dueDate && isBefore(startOfDay(new Date(task.dueDate)), today);
    return (!query || `${task.title} ${task.description ?? ""} ${task.client?.name ?? ""}`.toLocaleLowerCase().includes(query))
      && (statusFilter === "all" || task.status === statusFilter)
      && (priorityFilter === "all" || task.priority === priorityFilter)
      && (clientFilter === "all" || String(task.clientId ?? "") === clientFilter)
      && (assigneeFilter === "all" || String(task.assignedToId ?? "") === assigneeFilter)
      && (categoryFilter === "all" || task.category === categoryFilter)
      && (!taskScope || taskScope !== "mine" || task.assignedToId === currentUserId)
      && (!dueFrom || (!!task.dueDate && task.dueDate.slice(0, 10) >= dueFrom))
      && (!dueTo || (!!task.dueDate && task.dueDate.slice(0, 10) <= dueTo))
      && (!createdFrom || task.createdAt.slice(0, 10) >= createdFrom)
      && (!createdTo || task.createdAt.slice(0, 10) <= createdTo)
      && (!overdueOnly || overdue);
  }).sort((a, b) => {
    if (sortBy === "createdAt") return b.createdAt.localeCompare(a.createdAt);
    if (sortBy === "priority") return priorities.findIndex((item) => item.value === b.priority) - priorities.findIndex((item) => item.value === a.priority);
    if (sortBy === "status") return statuses.findIndex((item) => item.value === a.status) - statuses.findIndex((item) => item.value === b.status);
    return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
  }), [tasks, search, statusFilter, priorityFilter, clientFilter, assigneeFilter, categoryFilter, dueFrom, dueTo, createdFrom, createdTo, taskScope, currentUserId, overdueOnly, sortBy, today]);

  const totalCount = tasks.length;
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const overdueCount = tasks.filter((task) =>
    task.status !== "done" && !!task.dueDate && isBefore(startOfDay(new Date(task.dueDate)), today)
  ).length;
  const dueTodayCount = tasks.filter((task) =>
    task.status !== "done" && !!task.dueDate && isSameDay(new Date(task.dueDate), today)
  ).length;

  const openNew = (date?: Date) => {
    setEditTask(null);
    setForm({ ...emptyForm, assignedToId: String(currentUserId), dueDate: date ? localDate(date.toISOString()) : "" });
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const openEdit = (task: TodoTask) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: normalizePriority(task.priority),
      status: normalizeStatus(task.status),
      clientId: task.clientId ? String(task.clientId) : "",
      assignedToId: task.assignedToId ? String(task.assignedToId) : "",
      dueDate: localDate(task.dueDate),
      category: task.category ?? "",
    });
    setError("");
    setMessage("");
    setShowForm(true);
  };

  useEffect(() => {
    const taskId = Number(new URLSearchParams(window.location.search).get("task"));
    if (!Number.isSafeInteger(taskId) || taskId < 1) return;
    const task = initialTasks.find((item) => item.id === taskId);
    if (!task) return;
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: normalizePriority(task.priority),
      status: normalizeStatus(task.status),
      clientId: task.clientId ? String(task.clientId) : "",
      assignedToId: task.assignedToId ? String(task.assignedToId) : "",
      dueDate: localDate(task.dueDate),
      category: task.category ?? "",
    });
    setShowForm(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("task");
    window.history.replaceState({}, "", url);
  }, [initialTasks]);

  const saveTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(editTask ? `/api/todos/${editTask.id}` : "/api/todos", {
        method: editTask ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientId: form.clientId || null,
          assignedToId: form.assignedToId || null,
          dueDate: form.dueDate || null,
          category: form.category || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Detyra nuk u ruajt");
      const saved = payload as TodoTask;
      setTasks((current) => editTask
        ? current.map((task) => task.id === saved.id ? saved : task)
        : [saved, ...current]);
      setShowForm(false);
      setEditTask(null);
      setForm(emptyForm);
      setMessage(editTask ? "Detyra u përditësua." : "Detyra u krijua.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Gabim gjatë ruajtjes së detyrës");
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (task: TodoTask, changes: Partial<TaskForm>) => {
    setBusyTaskId(task.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/todos/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Detyra nuk u përditësua");
      setTasks((current) => current.map((item) => item.id === task.id ? payload as TodoTask : item));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Gabim gjatë përditësimit");
    } finally {
      setBusyTaskId(null);
    }
  };

  const deleteTask = async (task: TodoTask) => {
    if (!isAdmin || !window.confirm(`Të fshihet detyra "${task.title}"?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/todos/${task.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Detyra nuk u fshi");
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setSelectedIds((current) => current.filter((id) => id !== task.id));
      setMessage("Detyra u fshi.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gabim gjatë fshirjes");
    }
  };

  const applyBulkChange = async (changes: Partial<TaskForm>) => {
    const chosenTasks = tasks.filter((task) => selectedIds.includes(task.id));
    if (chosenTasks.length === 0) return;
    setError("");
    setMessage("");
    try {
      const outcomes = await Promise.all(chosenTasks.map(async (task) => {
        const response = await fetch(`/api/todos/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        });
        const payload = await response.json();
        return { response, task, payload };
      }));
      const failed = outcomes.filter(({ response }) => !response.ok);
      setTasks((current) => current.map((task) => {
        const updated = outcomes.find((outcome) => outcome.task.id === task.id);
        return updated && updated.response.ok ? updated.payload as TodoTask : task;
      }));
      setSelectedIds([]);
      if (failed.length) setError(`${failed.length} detyra nuk u përditësuan.`);
      else setMessage(`${chosenTasks.length} detyra u përditësuan.`);
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Gabim gjatë veprimit në grup");
    }
  };

  const deleteSelected = async () => {
    const chosenTasks = tasks.filter((task) => selectedIds.includes(task.id));
    if (!isAdmin || chosenTasks.length === 0 || !window.confirm(`Të fshihen ${chosenTasks.length} detyra të zgjedhura?`)) return;
    setError("");
    setMessage("");
    try {
      const results = await Promise.all(chosenTasks.map(async (task) => ({
        task,
        response: await fetch(`/api/todos/${task.id}`, { method: "DELETE" }),
      })));
      const failed = results.filter(({ response }) => !response.ok);
      const deletedIds = results.filter(({ response }) => response.ok).map(({ task }) => task.id);
      setTasks((current) => current.filter((task) => !deletedIds.includes(task.id)));
      setSelectedIds([]);
      if (failed.length) setError(`${deletedIds.length} detyra u fshinë; ${failed.length} nuk u fshinë.`);
      else setMessage(`${deletedIds.length} detyra u fshinë.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gabim gjatë fshirjes së detyrave");
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const days = calendarMode === "day"
    ? [startOfDay(calendarDate)]
    : calendarMode === "week"
      ? eachDayOfInterval({
          start: startOfWeek(calendarDate, { weekStartsOn: 1 }),
          end: endOfWeek(calendarDate, { weekStartsOn: 1 }),
        })
      : eachDayOfInterval({
          start: startOfWeek(startOfMonth(calendarDate), { weekStartsOn: 1 }),
          end: endOfWeek(endOfMonth(calendarDate), { weekStartsOn: 1 }),
        });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">AXEmedia · Organizim</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">TO DO / Menaxhimi i Detyrave</h1>
          <p className="mt-1 text-sm text-slate-500">Organizo detyrat, afatet dhe punën e ekipit.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Printer className="h-4 w-4" /> Printo
          </button>
          <button onClick={() => openNew()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Detyrë e Re
          </button>
        </div>
      </header>

      <section aria-label="Statistikat e detyrave" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          ["Gjithsej detyra", totalCount, "text-slate-900"],
          ["Të papërfunduara", totalCount - doneCount, "text-indigo-700"],
          ["Në progres", inProgressCount, "text-blue-700"],
          ["Përfunduar", doneCount, "text-emerald-700"],
          ["Të vonuara", overdueCount, "text-red-700"],
          ["Për sot", dueTodayCount, "text-amber-700"],
        ].map(([label, value, color]) => (
          <article key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative md:col-span-2 xl:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input aria-label="Kërko detyra" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kërko detyra..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </label>
          <select aria-label="Filtro sipas statusit" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="all">Të gjitha statuset</option>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <select aria-label="Filtro sipas prioritetit" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="all">Të gjitha prioritetet</option>
            {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
          </select>
          <select aria-label="Filtro sipas klientit" value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="all">Të gjithë klientët</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <select aria-label="Filtro sipas kategorisë" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
            <option value="all">Të gjitha kategoritë</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          {isAdmin && (
            <select aria-label="Filtro sipas anëtarit" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="all">I gjithë ekipi</option>
              <option value="">Pa caktuar</option>
              {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setOverdueOnly((value) => !value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${overdueOnly ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              Vetëm të vonuarat
            </button>
            <button onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); setClientFilter("all"); setAssigneeFilter("all"); setCategoryFilter("all"); setDueFrom(""); setDueTo(""); setCreatedFrom(""); setCreatedTo(""); setSortBy("dueDate"); setTaskScope("all"); setOverdueOnly(false); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              Pastro filtrat
            </button>
          </div>
          <div className="flex rounded-xl border border-slate-200 p-1" role="group" aria-label="Pamja e detyrave">
            <button aria-label="Pamja listë" aria-pressed={view === "list"} onClick={() => setView("list")} className={`rounded-lg p-2 ${view === "list" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}><List className="h-4 w-4" /></button>
            <button aria-label="Pamja Kanban" aria-pressed={view === "board"} onClick={() => setView("board")} className={`rounded-lg p-2 ${view === "board" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}><Columns3 className="h-4 w-4" /></button>
            <button aria-label="Pamja kalendar" aria-pressed={view === "calendar"} onClick={() => setView("calendar")} className={`rounded-lg p-2 ${view === "calendar" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}><CalendarDays className="h-4 w-4" /></button>
          </div>
        </div>
        <details className="rounded-xl bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">Filtra dhe rendit më shumë</summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {isAdmin && <label className="text-xs font-semibold text-slate-600">Detyrat<select value={taskScope} onChange={(event) => setTaskScope(event.target.value as "all" | "mine")} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="all">Ekipi im</option><option value="mine">Detyrat e mia</option></select></label>}
            <label className="text-xs font-semibold text-slate-600">Afati nga<input type="date" value={dueFrom} onChange={(event) => setDueFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-slate-600">Afati deri<input type="date" value={dueTo} onChange={(event) => setDueTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-slate-600">Krijuar nga<input type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-slate-600">Krijuar deri<input type="date" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-semibold text-slate-600">Rendit sipas<select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="dueDate">Afatit</option><option value="createdAt">Krijimit</option><option value="priority">Prioritetit</option><option value="status">Statusit</option></select></label>
          </div>
        </details>
      </section>

      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {selectedIds.length > 0 && (
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <span className="mr-2 text-sm font-semibold text-indigo-900">{selectedIds.length} të zgjedhura</span>
          <select aria-label="Ndrysho statusin e zgjedhur" defaultValue="" onChange={(event) => { if (event.target.value) void applyBulkChange({ status: event.target.value as TodoStatus }); }} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm">
            <option value="" disabled>Ndrysho statusin</option>
            {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select aria-label="Ndrysho prioritetin e zgjedhur" defaultValue="" onChange={(event) => { if (event.target.value) void applyBulkChange({ priority: event.target.value as TodoPriority }); }} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm">
            <option value="" disabled>Ndrysho prioritetin</option>
            {priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          {isAdmin && (
            <select aria-label="Ricakto detyrat e zgjedhura" defaultValue="" onChange={(event) => { if (event.target.value) void applyBulkChange({ assignedToId: event.target.value }); }} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm">
              <option value="" disabled>Ricakto te...</option>
              {teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          )}
          {isAdmin && <button onClick={() => void deleteSelected()} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Fshi të zgjedhurat</button>}
          <button onClick={() => setSelectedIds([])} className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">Anulo zgjedhjen</button>
        </section>
      )}

      {view === "list" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3"><input aria-label="Zgjidh të gjitha detyrat e filtruara" type="checkbox" checked={filtered.length > 0 && filtered.every((task) => selectedIds.includes(task.id))} onChange={(event) => setSelectedIds(event.target.checked ? filtered.map((task) => task.id) : [])} /></th>
                  <th className="px-4 py-3">Detyra</th><th className="px-4 py-3">Statusi</th><th className="px-4 py-3">Prioriteti</th><th className="px-4 py-3">Caktuar te</th><th className="px-4 py-3">Klienti</th><th className="px-4 py-3">Afati</th><th className="px-4 py-3">Krijuar nga</th><th className="px-4 py-3">Veprime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((task) => {
                  const overdue = task.status !== "done" && !!task.dueDate && isBefore(startOfDay(new Date(task.dueDate)), today);
                  return (
                    <tr key={task.id} className="group hover:bg-slate-50/70">
                      <td className="px-4 py-3"><input aria-label={`Zgjidh ${task.title}`} type="checkbox" checked={selectedIds.includes(task.id)} onChange={() => toggleSelected(task.id)} /></td>
                      <td className="max-w-[300px] px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <button disabled={busyTaskId === task.id} onClick={() => void updateTask(task, { status: task.status === "done" ? "open" : "done" })} aria-label={task.status === "done" ? "Rihap detyrën" : "Përfundo detyrën"} className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 disabled:opacity-50">
                            {task.status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4" />}
                          </button>
                          <div className="min-w-0">
                            <button onClick={() => openEdit(task)} className={`block truncate text-left text-sm font-semibold hover:text-indigo-700 ${task.status === "done" ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</button>
                            {task.category && <p className="mt-0.5 text-xs text-slate-400">{task.category}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo(task.status).color}`}>{statusInfo(task.status).label}</span></td>
                      <td className={`px-4 py-3 text-sm font-medium ${priorityInfo(task.priority).color}`}>{priorityInfo(task.priority).label}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{task.assignedTo?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{task.client?.name ?? "—"}</td>
                      <td className={`whitespace-nowrap px-4 py-3 text-sm ${overdue ? "font-semibold text-red-600" : "text-slate-600"}`}>{task.dueDate ? format(new Date(task.dueDate), "d MMM yyyy", { locale: sq }) : "Pa afat"}{overdue && <span className="ml-1 text-xs">· Vonesë</span>}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{task.createdBy?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(task)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">Hap</button>
                          {isAdmin && <button aria-label={`Fshi ${task.title}`} onClick={() => void deleteTask(task)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={9} className="px-6 py-16 text-center"><p className="font-semibold text-slate-700">{tasks.length ? "Nuk u gjet asnjë detyrë me këto filtra." : "Nuk ka detyra ende."}</p><p className="mt-1 text-sm text-slate-500">{tasks.length ? "Pastro filtrat ose provo një kërkim tjetër." : "Krijo detyrën e parë për të filluar organizimin."}</p>{!tasks.length && <button onClick={() => openNew()} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Krijo detyrë</button>}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "board" && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((status) => {
            const columnTasks = filtered.filter((task) => task.status === status.value);
            return (
              <div key={status.value} onDragOver={(event) => event.preventDefault()} onDrop={() => {
                const task = tasks.find((item) => item.id === dragTaskId);
                if (task && task.status !== status.value) void updateTask(task, { status: status.value });
                setDragTaskId(null);
              }} className="min-h-64 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-slate-800">{status.label}</h2><span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">{columnTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {columnTasks.map((task) => (
                    <article key={task.id} draggable onDragStart={() => setDragTaskId(task.id)} onDragEnd={() => setDragTaskId(null)} className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing">
                      <button onClick={() => openEdit(task)} className="w-full text-left text-sm font-semibold text-slate-900 hover:text-indigo-700">{task.title}</button>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`font-semibold ${priorityInfo(task.priority).color}`}>{priorityInfo(task.priority).label}</span>
                        {task.client && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{task.client.name}</span>}
                      </div>
                      <div className="mt-2 flex justify-between gap-2 text-xs text-slate-500"><span>{task.assignedTo?.name ?? "Pa caktuar"}</span><span className={task.dueDate && task.status !== "done" && isBefore(startOfDay(new Date(task.dueDate)), today) ? "font-semibold text-red-600" : ""}>{task.dueDate ? format(new Date(task.dueDate), "d MMM", { locale: sq }) : "Pa afat"}</span></div>
                    </article>
                  ))}
                  {columnTasks.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-xs text-slate-400">Tërhiq një detyrë këtu</p>}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {view === "calendar" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button aria-label="Periudha e kaluar" onClick={() => setCalendarDate((value) => calendarMode === "month" ? addMonths(value, -1) : addDays(value, calendarMode === "week" ? -7 : -1))} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
              <h2 className="min-w-44 text-center font-bold capitalize text-slate-900">
                {calendarMode === "month"
                  ? format(calendarDate, "MMMM yyyy", { locale: sq })
                  : calendarMode === "week"
                    ? `${format(days[0], "d MMM", { locale: sq })} – ${format(days[days.length - 1], "d MMM yyyy", { locale: sq })}`
                    : format(calendarDate, "EEEE, d MMMM yyyy", { locale: sq })}
              </h2>
              <button aria-label="Periudha tjetër" onClick={() => setCalendarDate((value) => calendarMode === "month" ? addMonths(value, 1) : addDays(value, calendarMode === "week" ? 7 : 1))} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="Periudha e kalendarit" className="flex rounded-lg border border-slate-200 p-1">
                {(["day", "week", "month"] as const).map((mode) => <button key={mode} aria-pressed={calendarMode === mode} onClick={() => setCalendarMode(mode)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize ${calendarMode === mode ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{mode === "day" ? "Ditë" : mode === "week" ? "Javë" : "Muaj"}</button>)}
              </div>
              <button onClick={() => setCalendarDate(new Date())} className="rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">Sot</button>
            </div>
          </div>
          <div className={`${calendarMode === "day" ? "grid-cols-1" : "grid-cols-7"} grid border-b border-slate-100 bg-slate-50 text-center text-xs font-semibold text-slate-500`}>
            {(calendarMode === "day" ? [format(calendarDate, "EEEE", { locale: sq })] : ["Hën", "Mar", "Mër", "Enj", "Pre", "Sht", "Die"]).map((day) => <div key={day} className="py-2">{day}</div>)}
          </div>
          <div className={calendarMode === "day" ? "grid grid-cols-1" : "grid grid-cols-7"}>
            {days.map((day) => {
              const dayTasks = filtered.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), day));
              return (
                <div key={day.toISOString()} className={`min-h-28 border-b border-r border-slate-100 p-1.5 sm:min-h-36 sm:p-2 ${calendarMode === "month" && !isSameMonth(day, calendarDate) ? "bg-slate-50/60" : ""}`}>
                  <button onClick={() => openNew(day)} aria-label={`Krijo detyrë më ${format(day, "d MMMM", { locale: sq })}`} className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${isToday(day) ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-indigo-50"}`}>{format(day, "d")}</button>
                  <div className="space-y-1">
                    {dayTasks.slice(0, calendarMode === "day" ? 100 : 3).map((task) => <button key={task.id} title={task.title} onClick={() => openEdit(task)} className={`block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium sm:text-xs ${task.status === "done" ? "bg-emerald-50 text-emerald-700" : task.priority === "urgent" ? "bg-red-50 text-red-700" : "bg-indigo-50 text-indigo-700"}`}>{task.title}</button>)}
                    {calendarMode !== "day" && dayTasks.length > 3 && <p className="px-1 text-[10px] text-slate-400">+{dayTasks.length - 3} të tjera</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="px-4 py-3 text-xs text-slate-500">Zgjidh një datë për të krijuar detyrë ose një detyrë ekzistuese për ta hapur.</p>
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowForm(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="todo-form-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div><h2 id="todo-form-title" className="text-lg font-bold text-slate-900">{editTask ? "Detajet e detyrës" : "Detyrë e Re"}</h2><p className="mt-1 text-sm text-slate-500">{editTask ? "Përditëso informacionin, caktimin ose afatin." : "Plotëso informacionin kryesor për detyrën."}</p></div>
              <button aria-label="Mbyll formularin" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <form onSubmit={saveTask} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Titulli *</span><input autoFocus required maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Statusi</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TodoStatus })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Prioriteti</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TodoPriority })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">{priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Afati</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm" /></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Klienti</span><select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"><option value="">Pa klient</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select>{editTask?.client && <a href={`/clients/${editTask.client.id}`} className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800">Hap klientin {editTask.client.name} →</a>}</label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Caktuar te</span><select disabled={!isAdmin} value={form.assignedToId} onChange={(event) => setForm({ ...form, assignedToId: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm disabled:bg-slate-100">{teamMembers.map((member) => <option key={member.id} value={member.id}>{member.name}{member.id === currentUserId ? " (Unë)" : ""}</option>)}</select></label>
              <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Kategoria</span><input maxLength={100} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="p.sh. Dizajn, Përmbajtje..." className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm" /></label>
              <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Përshkrimi</span><textarea rows={4} maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Shënime dhe udhëzime për detyrën..." className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
              {editTask && <div className="sm:col-span-2 border-t border-slate-100 pt-3 text-xs text-slate-500">Krijuar nga {editTask.createdBy?.name ?? "—"} · {format(new Date(editTask.createdAt), "d MMM yyyy, HH:mm", { locale: sq })}{editTask.completedAt && ` · Përfunduar ${format(new Date(editTask.completedAt), "d MMM yyyy", { locale: sq })}`}</div>}
              <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Anulo</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Duke ruajtur..." : editTask ? "Ruaj ndryshimet" : "Krijo detyrë"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
