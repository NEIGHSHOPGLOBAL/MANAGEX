const KEY = 'managex-recent';
const MAX = 5;

export function getRecentItems() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function trackRecent(item) {
  if (!item?.id || !item?.type) return;
  const entry = {
    id: item.id,
    type: item.type,
    title: item.title,
    path: item.path,
    at: Date.now(),
  };
  const list = getRecentItems().filter((r) => !(r.type === entry.type && r.id === entry.id));
  list.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function useRecentItems() {
  return getRecentItems();
}
