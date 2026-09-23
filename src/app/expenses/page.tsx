import { prisma } from "@/lib/prisma";
import ExpensesClient from "./expenses-client";

export const dynamic = "force-dynamic";


const categories = [
  "Qira", "Utilities", "Software", "Marketing", "Pagat", "Transport",
  "Ushqim", "Pajisje", "Kontabilitet", "Ligjore", "Tjetër"
];

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  const initialExpenses = expenses.map((expense) => ({ ...expense, date: expense.date.toISOString() }));

  return <ExpensesClient initialExpenses={initialExpenses} categories={categories} />;
}
