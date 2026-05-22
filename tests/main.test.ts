import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import KanbanBoardPlugin from "../src/main";
import { KANBAN_VIEW_TYPE } from "../src/KanbanView";
import { MarkdownView, WorkspaceLeaf } from "obsidian";

type EventCallback = (...args: any[]) => void;
const originalSetViewState = WorkspaceLeaf.prototype.setViewState;

function createActionsEl() {
  const actionsEl = document.createElement("div");
  actionsEl.createEl = function (
    tag: string,
    options?: { cls?: string; attr?: Record<string, string> }
  ) {
    const el = document.createElement(tag);
    if (options?.cls) el.className = options.cls;
    for (const [key, value] of Object.entries(options?.attr ?? {})) {
      el.setAttribute(key, value);
    }
    this.appendChild(el);
    return el;
  };
  return actionsEl as HTMLElement & {
    createEl: (
      tag: string,
      options?: { cls?: string; attr?: Record<string, string> }
    ) => HTMLElement;
  };
}

function createMarkdownLeaf(path: string, isKanban = true) {
  const leaf = new WorkspaceLeaf() as WorkspaceLeaf & {
    view: MarkdownView & { actionsEl: HTMLElement };
  };
  const view = new MarkdownView() as MarkdownView & { actionsEl: HTMLElement };
  view.file = { path } as any;
  view.actionsEl = createActionsEl();
  leaf.view = view;
  return { leaf, view, isKanban };
}

function createNonMarkdownLeaf() {
  const leaf = new WorkspaceLeaf();
  leaf.view = { actionsEl: createActionsEl() };
  return leaf;
}

function makePlugin() {
  const plugin = new KanbanBoardPlugin();
  const workspaceEvents = new Map<string, EventCallback>();
  const leaves: WorkspaceLeaf[] = [];

  const app = {
    metadataCache: {
      getCache: vi.fn((path: string) =>
        path.includes("kanban")
          ? { frontmatter: { "kanban-plugin": "board" } }
          : undefined
      ),
    },
    vault: {
      getAbstractFileByPath: vi.fn(),
      cachedRead: vi.fn(),
      create: vi.fn(),
    },
    workspace: {
      on: vi.fn((event: string, callback: EventCallback) => {
        workspaceEvents.set(event, callback);
        return { event, callback };
      }),
      iterateAllLeaves: vi.fn((callback: (leaf: WorkspaceLeaf) => void) => {
        leaves.forEach((leaf) => callback(leaf));
      }),
      getLeavesOfType: vi.fn(() => []),
      getActiveViewOfType: vi.fn(() => null),
      getLeaf: vi.fn(),
    },
  };

  plugin.app = app as any;

  return { plugin, app, leaves, workspaceEvents };
}

describe("KanbanBoardPlugin toggle button injection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    WorkspaceLeaf.prototype.setViewState = originalSetViewState;
  });

  test("kanban markdown leaf gets one toggle button", () => {
    const { plugin, leaves } = makePlugin();
    const { leaf, view } = createMarkdownLeaf("boards/kanban.md");
    leaves.push(leaf);

    (plugin as any).injectToggleButtons();

    const buttons = view.actionsEl.querySelectorAll("[data-kb-toggle]");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute("aria-label", "Switch to kanban view");
    expect(buttons[0]).toHaveAttribute("data-icon", "columns-3");
  });

  test("calling injectToggleButtons twice does not duplicate buttons", () => {
    const { plugin, leaves } = makePlugin();
    const { leaf, view } = createMarkdownLeaf("boards/kanban.md");
    leaves.push(leaf);

    (plugin as any).injectToggleButtons();
    (plugin as any).injectToggleButtons();

    expect(view.actionsEl.querySelectorAll("[data-kb-toggle]")).toHaveLength(1);
  });

  test("non-kanban markdown leaf does not get a toggle button", () => {
    const { plugin, leaves } = makePlugin();
    const { leaf, view } = createMarkdownLeaf("notes/plain.md", false);
    leaves.push(leaf);

    (plugin as any).injectToggleButtons();

    expect(view.actionsEl.querySelector("[data-kb-toggle]")).toBeNull();
  });

  test("non-kanban markdown leaf removes a stale toggle button", () => {
    const { plugin } = makePlugin();
    const { leaf, view } = createMarkdownLeaf("notes/plain.md", false);
    const stale = view.actionsEl.createEl("a", {
      cls: "view-action",
      attr: { "data-kb-toggle": "1" },
    });
    expect(stale).toBeTruthy();

    (plugin as any).syncToggleButtonForLeaf(leaf);

    expect(view.actionsEl.querySelector("[data-kb-toggle]")).toBeNull();
  });

  test("clicking injected button still calls toggleView for that leaf", async () => {
    const { plugin, leaves } = makePlugin();
    const { leaf, view } = createMarkdownLeaf("boards/kanban.md");
    leaves.push(leaf);
    const toggleSpy = vi.spyOn(plugin as any, "toggleView").mockResolvedValue(undefined);

    (plugin as any).injectToggleButtons();
    const button = view.actionsEl.querySelector("[data-kb-toggle]") as HTMLAnchorElement;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(toggleSpy).toHaveBeenCalledWith(leaf);
  });

  test("scheduleInjectToggleButtons coalesces repeated scheduling", () => {
    const { plugin } = makePlugin();
    const injectSpy = vi.spyOn(plugin as any, "injectToggleButtons").mockImplementation(() => {});

    (plugin as any).scheduleInjectToggleButtons();
    (plugin as any).scheduleInjectToggleButtons();
    (plugin as any).scheduleInjectToggleButtons();

    expect(injectSpy).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(injectSpy).toHaveBeenCalledTimes(1);
  });

  test("onload registers scheduled layout-change and active-leaf-change handlers", async () => {
    const { plugin, workspaceEvents } = makePlugin();
    const scheduleSpy = vi
      .spyOn(plugin as any, "scheduleInjectToggleButtons")
      .mockImplementation(() => {});
    const syncSpy = vi
      .spyOn(plugin as any, "syncToggleButtonForLeaf")
      .mockImplementation(() => {});

    await plugin.onload();

    expect(workspaceEvents.has("layout-change")).toBe(true);
    expect(workspaceEvents.has("active-leaf-change")).toBe(true);

    const leaf = createMarkdownLeaf("boards/kanban.md").leaf;
    workspaceEvents.get("layout-change")?.();
    workspaceEvents.get("active-leaf-change")?.(leaf);

    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    expect(syncSpy).toHaveBeenCalledWith(leaf);
  });

  test("cleanupToggleButtons removes injected buttons from leaves", () => {
    const { plugin, leaves } = makePlugin();
    const { leaf, view } = createMarkdownLeaf("boards/kanban.md");
    const nonMarkdownLeaf = createNonMarkdownLeaf();

    view.actionsEl.createEl("a", {
      cls: "view-action",
      attr: { "data-kb-toggle": "1" },
    });
    leaves.push(leaf, nonMarkdownLeaf);

    (plugin as any).cleanupToggleButtons();

    expect(view.actionsEl.querySelector("[data-kb-toggle]")).toBeNull();
  });

  test("toggle-kanban-view command still toggles markdown kanban files", async () => {
    const { plugin, app } = makePlugin();
    const mdLeaf = new WorkspaceLeaf() as WorkspaceLeaf & { view: MarkdownView };
    const mdView = new MarkdownView();
    mdView.file = { path: "boards/kanban.md" } as any;
    mdLeaf.view = mdView;
    (mdView as any).leaf = mdLeaf;
    app.workspace.getActiveViewOfType = vi.fn((type: unknown) => {
      if (type === MarkdownView) return mdView;
      return null;
    });

    await plugin.onload();

    const addCommandMock = plugin.addCommand as unknown as ReturnType<typeof vi.fn>;
    const toggleCommand = addCommandMock.mock.calls.find(
      ([command]) => command.id === "toggle-kanban-view"
    )?.[0];
    expect(toggleCommand).toBeTruthy();

    const toggleSpy = vi.spyOn(plugin as any, "toggleView").mockResolvedValue(undefined);
    expect(toggleCommand.checkCallback(true)).toBe(true);
    expect(toggleSpy).not.toHaveBeenCalled();

    expect(toggleCommand.checkCallback(false)).toBe(true);
    expect(toggleSpy).toHaveBeenCalledWith(mdLeaf);
  });

  test("patched setViewState still redirects kanban markdown to kanban view", async () => {
    const { plugin } = makePlugin();
    await plugin.onload();

    const leaf = new WorkspaceLeaf() as WorkspaceLeaf & { view: MarkdownView };
    leaf.view = new MarkdownView();
    leaf.view.file = { path: "notes/other.md" } as any;

    await leaf.setViewState({
      type: "markdown",
      state: { file: "boards/kanban.md" },
    });

    const calls = (leaf as any)._setViewStateCalls;
    expect(calls).toHaveLength(1);
    expect(calls[0].type).toBe(KANBAN_VIEW_TYPE);
    expect(calls[0].state.file).toBe("boards/kanban.md");
  });
});
