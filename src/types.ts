export interface Subtask {
  id: string;
  title: string;
  body?: string;
  checked: boolean;
  hasCheckbox: boolean;
}

export interface Item {
  id: string;
  title: string;
  body?: string;
  checked: boolean;
  hasCheckbox: boolean;
  color?: string;
  subtasks?: Subtask[];
}

export interface Lane {
  id: string;
  title: string;
  color?: string;
  items: Item[];
}

export interface Board {
  lanes: Lane[];
  archive: Item[];
}

let counter = 0;
export function generateId(): string {
  return `kb-${Date.now().toString(36)}-${(counter++).toString(36)}`;
}
