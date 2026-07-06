export function isTaskAssignee(task, userId) {
  if (!task || !userId) return false;
  if (task.assigned_to_id === userId) return true;
  return (task.assignees || []).some((u) => u.id === userId);
}

export function getTaskAssignees(task) {
  if (!task) return [];
  if (task.assignees?.length) return task.assignees;
  return task.assigned_to ? [task.assigned_to] : [];
}

export function formatAssigneeNames(task) {
  return getTaskAssignees(task).map((u) => u.name).filter(Boolean).join(', ');
}
