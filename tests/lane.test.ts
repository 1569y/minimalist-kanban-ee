import { describe, test, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import Lane from "../src/Lane.svelte";
import { Menu } from "./mocks/obsidian";
import SortableMock from "./mocks/sortablejs";

const defaultSettings = {
  showCheckboxes: false,
  prependCards: false,
  showArchive: false,
  listTitleSize: "large" as const,
  cardTitleSize: "normal" as const,
  listColorIntensity: "normal" as const,
  moveHashtagsToFooter: true,
};

function makeLane(overrides = {}) {
  return {
    id: "lane-1",
    title: "To Do",
    items: [
      { id: "i1", title: "First", checked: false, hasCheckbox: false },
      { id: "i2", title: "Second", checked: false, hasCheckbox: false },
    ],
    ...overrides,
  };
}

function renderLane() {
  return render(Lane, {
    props: {
      lane: makeLane(),
      settings: defaultSettings,
      app: {},
      viewComponent: null,
      filePath: "test.md",
      laneIndex: 0,
      laneCount: 1,
    },
  });
}

async function openAddComposer(container: HTMLElement) {
  await fireEvent.click(container.querySelector(".kb-add-card-btn")!);
  const textarea = container.querySelector(
    ".kb-add-item-input"
  ) as HTMLTextAreaElement | null;
  expect(textarea).toBeTruthy();
  return textarea!;
}

describe("Lane", () => {
  test("renders lane title", () => {
    const { container } = renderLane();
    expect(container.querySelector(".kb-lane-title")!.textContent).toBe(
      "To Do"
    );
  });

  test("renders item count", () => {
    const { container } = renderLane();
    expect(container.querySelector(".kb-lane-count")!.textContent).toBe("2");
  });

  test("renders all items", () => {
    const { container } = renderLane();
    expect(container.querySelectorAll(".kb-item")).toHaveLength(2);
  });

  test("normal browsing state shows add-card button but no toolbar", () => {
    const { container } = renderLane();
    expect(container.querySelector(".kb-add-card-btn .kb-add-icon")?.textContent).toBe("+");
    expect(container.querySelector(".kb-add-card-btn .kb-add-text")?.textContent).toBe(
      "Add a card"
    );
    expect(container.querySelector(".kb-add-item-input")).toBeNull();
    expect(container.querySelector(".kb-editor-toolbar")).toBeNull();
  });

  test("add card button keeps separated plus icon and text structure for visual centering", () => {
    const { container } = renderLane();
    const button = container.querySelector(".kb-add-card-btn");
    expect(button?.querySelector(".kb-add-icon")?.textContent).toBe("+");
    expect(button?.querySelector(".kb-add-text")?.textContent).toBe("Add a card");
  });

  test("clicking add card shows textarea and toolbar below it", async () => {
    const { container } = renderLane();
    const textarea = await openAddComposer(container);
    const editor = container.querySelector(".kb-add-card-editor");
    const toolbar = container.querySelector(".kb-editor-toolbar");

    expect(editor).toBeTruthy();
    expect(toolbar).toBeTruthy();
    expect(editor?.children[0]).toBe(textarea);
    expect(editor?.children[1]).toBe(toolbar);
  });

  test("Shift+Enter creates card in add-card input", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, { target: { value: "New card" } });
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail).toEqual({
      laneId: "lane-1",
      title: "New card",
      body: undefined,
      checked: false,
      hasCheckbox: true,
      subtasks: undefined,
    });
  });

  test("creating card clears composer and hides toolbar", async () => {
    const { container, component } = renderLane();
    component.$on("itemadd", vi.fn());

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, { target: { value: "New card" } });
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(container.querySelector(".kb-add-item-input")).toBeNull();
    expect(container.querySelector(".kb-editor-toolbar")).toBeNull();
    expect(container.querySelector(".kb-add-card-btn")).toBeTruthy();
  });

  test("does not add empty items", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, { target: { value: "   " } });
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(container.querySelector(".kb-add-item-input")).toBeTruthy();
  });

  test("ignores Enter during IME composition in add-card input", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, { target: { value: "任务" } });
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
      isComposing: true,
    });

    expect(handler).not.toHaveBeenCalled();
  });

  test("Ctrl+Shift+Enter inserts '- [ ] ' and does not create card", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, { target: { value: "Task" } });
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      ctrlKey: true,
      shiftKey: true,
    });

    expect(textarea.value).toBe("Task\n- [ ] ");
    expect(textarea.selectionStart).toBe("Task\n- [ ] ".length);
    expect(textarea.selectionEnd).toBe("Task\n- [ ] ".length);
    expect(handler).not.toHaveBeenCalled();
  });

  test("Ctrl+Enter fallback inserts '- [ ] ' and does not create card", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, { target: { value: "Task" } });
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "NumpadEnter",
      metaKey: true,
    });

    expect(textarea.value).toBe("Task\n- [ ] ");
    expect(handler).not.toHaveBeenCalled();
  });

  test("Enter keeps newline behavior in add-card input", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, { target: { value: "Line 1\nLine 2" } });
    await fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });

    expect(textarea.value).toBe("Line 1\nLine 2");
    expect(handler).not.toHaveBeenCalled();
  });

  test("Ctrl+B and Ctrl+I wrap selected text in add-card input", async () => {
    const { container } = renderLane();
    const textarea = await openAddComposer(container);

    await fireEvent.input(textarea, { target: { value: "Hello world" } });
    textarea.setSelectionRange(0, 5);
    await fireEvent.keyDown(textarea, { key: "b", ctrlKey: true });
    expect(textarea.value).toBe("**Hello** world");

    textarea.setSelectionRange(10, 15);
    await fireEvent.keyDown(textarea, { key: "i", metaKey: true });
    expect(textarea.value).toBe("**Hello** *world*");
  });

  test("toolbar B wraps selected text in add-card input and keeps focus", async () => {
    const { container } = renderLane();
    const textarea = await openAddComposer(container);

    await fireEvent.input(textarea, { target: { value: "Hello world" } });
    textarea.focus();
    textarea.setSelectionRange(0, 5);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value).toBe("**Hello** world");
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(7);
    expect(document.activeElement).toBe(textarea);
  });

  test("toolbar I wraps selected text in add-card input and keeps focus", async () => {
    const { container } = renderLane();
    const textarea = await openAddComposer(container);

    await fireEvent.input(textarea, { target: { value: "Hello world" } });
    textarea.focus();
    textarea.setSelectionRange(6, 11);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Italic"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value).toBe("Hello *world*");
    expect(textarea.selectionStart).toBe(7);
    expect(textarea.selectionEnd).toBe(12);
    expect(document.activeElement).toBe(textarea);
  });

  test("new card toolbar does not lose selection before wrapping text", async () => {
    const { container } = renderLane();
    const textarea = await openAddComposer(container);

    await fireEvent.input(textarea, {
      target: { value: "Parent\n- [ ] Subtask note" },
    });
    const start = textarea.value.indexOf("note");
    const end = start + "note".length;
    textarea.focus();
    textarea.setSelectionRange(start, end);
    await fireEvent.select(textarea);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Italic"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value).toContain("Subtask *note*");
    expect(textarea.value.startsWith("*Parent")).toBe(false);
  });

  test("toolbar B without selection inserts '****' and keeps cursor in the middle", async () => {
    const { container } = renderLane();
    const textarea = await openAddComposer(container);

    await fireEvent.input(textarea, { target: { value: "Hello" } });
    textarea.focus();
    textarea.setSelectionRange(5, 5);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value).toBe("Hello****");
    expect(textarea.selectionStart).toBe(7);
    expect(textarea.selectionEnd).toBe(7);
    expect(document.activeElement).toBe(textarea);
  });

  test("toolbar I without selection inserts '**' and keeps cursor in the middle", async () => {
    const { container } = renderLane();
    const textarea = await openAddComposer(container);

    await fireEvent.input(textarea, { target: { value: "Hello" } });
    textarea.focus();
    textarea.setSelectionRange(5, 5);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Italic"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value).toBe("Hello**");
    expect(textarea.selectionStart).toBe(6);
    expect(textarea.selectionEnd).toBe(6);
    expect(document.activeElement).toBe(textarea);
  });

  test("Esc cancels new card input and hides toolbar", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, { target: { value: "Draft card" } });
    await fireEvent.keyDown(textarea, { key: "Escape" });

    expect(handler).not.toHaveBeenCalled();
    expect(container.querySelector(".kb-add-item-input")).toBeNull();
    expect(container.querySelector(".kb-editor-toolbar")).toBeNull();
    expect(container.querySelector(".kb-add-card-btn")).toBeTruthy();
  });

  test("new card content with subtask template is emitted intact", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, {
      target: { value: "Task\n- [ ] Subtask" },
    });
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          laneId: "lane-1",
          title: "Task",
          body: undefined,
          checked: false,
          hasCheckbox: true,
          subtasks: [
            {
              id: expect.any(String),
              title: "Subtask",
              checked: false,
              hasCheckbox: true,
            },
          ],
        },
      })
    );
  });

  test("new card draft creates structured item on first submit", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, {
      target: {
        value:
          "Parent\nParent note line 1\nParent note line 2\n- [ ] Subtask A\n  Subtask note line 1\n  Subtask note line 2",
      },
    });
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          laneId: "lane-1",
          title: "Parent",
          body: "Parent note line 1\nParent note line 2",
          checked: false,
          hasCheckbox: true,
          subtasks: [
            {
              id: expect.any(String),
              title: "Subtask A",
              body: "Subtask note line 1\nSubtask note line 2",
              checked: false,
              hasCheckbox: true,
            },
          ],
        },
      })
    );
  });

  test("Enter after subtask line auto-inserts two-space subtask body indentation", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemadd", handler);

    const textarea = await openAddComposer(container);
    await fireEvent.input(textarea, { target: { value: "- [ ] Subtask A" } });
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });

    expect(textarea.value).toBe("- [ ] Subtask A\n  ");
    expect(handler).not.toHaveBeenCalled();
  });

  test("Enter on subtask body line keeps two-space indentation", async () => {
    const { container } = renderLane();
    const textarea = await openAddComposer(container);

    await fireEvent.input(textarea, {
      target: { value: "- [ ] Subtask A\n  Note line 1" },
    });
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });

    expect(textarea.value).toBe("- [ ] Subtask A\n  Note line 1\n  ");
  });

  test("Enter on parent body line stays as normal newline without auto-indent", async () => {
    const { container } = renderLane();
    const textarea = await openAddComposer(container);

    await fireEvent.input(textarea, {
      target: { value: "Parent\nParent note" },
    });
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });

    expect(textarea.value).toBe("Parent\nParent note");
  });

  test("shows lane menu on triple-dot click", async () => {
    const { container } = renderLane();

    await fireEvent.click(
      container.querySelector(".kb-lane-header .kb-menu-btn")!
    );

    expect(Menu.instances).toHaveLength(1);
    const menu = Menu.instances[0];
    expect(menu.findItem("Edit list name")).toBeTruthy();
    expect(menu.findItem("Delete list")).toBeTruthy();
    expect(menu.showAtMouseEvent).toHaveBeenCalled();
  });

  test("Edit list name menu item triggers title editing", async () => {
    const { container } = renderLane();

    await fireEvent.click(
      container.querySelector(".kb-lane-header .kb-menu-btn")!
    );
    const menu = Menu.instances[0];
    menu.findItem("Edit list name")!._onClick!();

    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector(".kb-lane-title-input")).toBeTruthy();
  });

  test("Delete list menu item dispatches lanedelete", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("lanedelete", handler);

    await fireEvent.click(
      container.querySelector(".kb-lane-header .kb-menu-btn")!
    );
    Menu.instances[0].findItem("Delete list")!._onClick!();

    expect(handler).toHaveBeenCalled();
  });

  test("lane menu shows move options when multiple lanes exist", async () => {
    const { container } = render(Lane, {
      props: {
        lane: makeLane(),
        settings: defaultSettings,
        app: {},
        viewComponent: null,
        filePath: "test.md",
        laneIndex: 1,
        laneCount: 3,
      },
    });

    await fireEvent.click(
      container.querySelector(".kb-lane-header .kb-menu-btn")!
    );
    const menu = Menu.instances[0];
    expect(menu.findItem("Move list left")).toBeTruthy();
    expect(menu.findItem("Move list right")).toBeTruthy();
  });

  test("first lane has no Move left option", async () => {
    const { container } = render(Lane, {
      props: {
        lane: makeLane(),
        settings: defaultSettings,
        app: {},
        viewComponent: null,
        filePath: "test.md",
        laneIndex: 0,
        laneCount: 2,
      },
    });

    await fireEvent.click(
      container.querySelector(".kb-lane-header .kb-menu-btn")!
    );
    const menu = Menu.instances[0];
    expect(menu.findItem("Move list left")).toBeFalsy();
    expect(menu.findItem("Move list right")).toBeTruthy();
  });

  test("last lane has no Move right option", async () => {
    const { container } = render(Lane, {
      props: {
        lane: makeLane(),
        settings: defaultSettings,
        app: {},
        viewComponent: null,
        filePath: "test.md",
        laneIndex: 1,
        laneCount: 2,
      },
    });

    await fireEvent.click(
      container.querySelector(".kb-lane-header .kb-menu-btn")!
    );
    const menu = Menu.instances[0];
    expect(menu.findItem("Move list left")).toBeTruthy();
    expect(menu.findItem("Move list right")).toBeFalsy();
  });

  test("Move list left dispatches lanemove with direction -1", async () => {
    const { container, component } = render(Lane, {
      props: {
        lane: makeLane(),
        settings: defaultSettings,
        app: {},
        viewComponent: null,
        filePath: "test.md",
        laneIndex: 1,
        laneCount: 3,
      },
    });
    const handler = vi.fn();
    component.$on("lanemove", handler);

    await fireEvent.click(
      container.querySelector(".kb-lane-header .kb-menu-btn")!
    );
    Menu.instances[0].findItem("Move list left")!._onClick!();

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail).toEqual({
      laneId: "lane-1",
      direction: -1,
    });
  });

  test("Move list right dispatches lanemove with direction +1", async () => {
    const { container, component } = render(Lane, {
      props: {
        lane: makeLane(),
        settings: defaultSettings,
        app: {},
        viewComponent: null,
        filePath: "test.md",
        laneIndex: 0,
        laneCount: 3,
      },
    });
    const handler = vi.fn();
    component.$on("lanemove", handler);

    await fireEvent.click(
      container.querySelector(".kb-lane-header .kb-menu-btn")!
    );
    Menu.instances[0].findItem("Move list right")!._onClick!();

    expect(handler.mock.calls[0][0].detail).toEqual({
      laneId: "lane-1",
      direction: 1,
    });
  });

  test("single lane has no move options", async () => {
    const { container } = renderLane();

    await fireEvent.click(
      container.querySelector(".kb-lane-header .kb-menu-btn")!
    );
    const menu = Menu.instances[0];
    expect(menu.findItem("Move list left")).toBeFalsy();
    expect(menu.findItem("Move list right")).toBeFalsy();
  });

  test("creates SortableJS instance on mount", () => {
    const initialCount = SortableMock.instances.length;

    renderLane();

    expect(SortableMock.instances.length).toBeGreaterThan(initialCount);
    const instance = SortableMock.instances[SortableMock.instances.length - 1];
    expect(instance.options.group).toBe("kb-items");
    expect(instance.options.filter).toBe(".kb-menu-btn");
  });

  test("dispatches itemmove on SortableJS onEnd (same lane)", async () => {
    const { container, component } = renderLane();
    const handler = vi.fn();
    component.$on("itemmove", handler);

    const itemsEl = container.querySelector(".kb-lane-items")! as HTMLElement;
    const instance = SortableMock.instances[SortableMock.instances.length - 1];

    const children = Array.from(itemsEl.children) as HTMLElement[];
    const draggedItem = children[0];
    itemsEl.removeChild(draggedItem);
    itemsEl.appendChild(draggedItem);

    instance.options.onEnd({
      from: itemsEl,
      to: itemsEl,
      oldIndex: 0,
      newIndex: 1,
      item: draggedItem,
    });

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail).toEqual({
      fromLaneId: "lane-1",
      toLaneId: "lane-1",
      oldIndex: 0,
      newIndex: 1,
    });
  });
});
