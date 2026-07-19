export interface DependencyActivity {
  id: string;
  activityKind?: "work" | "break" | "meal";
  predecessorTaskIds?: string[];
}

export interface DependencyIssue {
  taskId: string;
  code: "UNKNOWN_PREDECESSOR" | "NON_WORK_PREDECESSOR" | "SELF_DEPENDENCY" | "CIRCULAR_DEPENDENCY";
}

export function validateDependencyGraph(tasks: readonly DependencyActivity[]): DependencyIssue[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const issues: DependencyIssue[] = [];

  for (const task of tasks) {
    for (const predecessorId of task.predecessorTaskIds ?? []) {
      const predecessor = byId.get(predecessorId);
      if (!predecessor) issues.push({ taskId: task.id, code: "UNKNOWN_PREDECESSOR" });
      else if (predecessorId === task.id) issues.push({ taskId: task.id, code: "SELF_DEPENDENCY" });
      else if ((predecessor.activityKind ?? "work") !== "work") issues.push({ taskId: task.id, code: "NON_WORK_PREDECESSOR" });
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycleMembers = new Set<string>();
  function visit(id: string, path: string[]): void {
    if (visiting.has(id)) {
      const cycleStart = path.indexOf(id);
      for (const member of path.slice(cycleStart)) cycleMembers.add(member);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const task = byId.get(id);
    for (const predecessorId of task?.predecessorTaskIds ?? []) {
      if (byId.has(predecessorId)) visit(predecessorId, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const task of tasks) visit(task.id, []);
  for (const taskId of [...cycleMembers].sort()) issues.push({ taskId, code: "CIRCULAR_DEPENDENCY" });
  return issues;
}
