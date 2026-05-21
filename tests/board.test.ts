import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import Board from "../src/Board.svelte";
import { Menu, Notice, Platform } from "obsidian";
import SortableMock from "./mocks/sortablejs";
import type { Board as BoardType } from "../src/types";
import { formatItemForEditing, serializeBoard } from "../src/parser";
import KanbanBoardPlugin from "../src/main";
import { readFileSync } from "node:fs";

const defaultSettings = {
  showCheckboxes: false,
  enterNewline: false,
  prependCards: false,
  showArchive: false,
  listTitleSize: "large" as const,
  cardTitleSize: "normal" as const,
  listColorIntensity: "normal" as const,
  cardStripeStyle: "checkpoint-prefix" as const,
  moveHashtagsToFooter: true,
};

function makeApp() {
  return {
    vault: {
      create: vi.fn().mockResolvedValue({ path: "New Note.md" }),
      getAbstractFileByPath: vi.fn().mockReturnValue(null),
    },
    workspace: {
      getLeaf: vi.fn().mockReturnValue({
        openFile: vi.fn().mockResolvedValue(undefined),
      }),
    },
    fileManager: {
      generateMarkdownLink: vi.fn().mockReturnValue("[[New Note]]"),
    },
  };
}

function makeBoard(overrides?: Partial<BoardType>): BoardType {
  return {
    lanes: [
      {
        id: "lane-1",
        title: "To Do",
        items: [
          { id: "i1", title: "Task A", checked: false, hasCheckbox: false },
          { id: "i2", title: "Task B", checked: false, hasCheckbox: false },
        ],
      },
      {
        id: "lane-2",
        title: "Done",
        items: [
          { id: "i3", title: "Task C", checked: false, hasCheckbox: false },
        ],
      },
    ],
    archive: [],
    ...overrides,
  };
}

function renderBoard(boardOverrides?: Partial<BoardType>, settingsOverrides = {}) {
  const onChange = vi.fn();
  const result = render(Board, {
    props: {
      board: makeBoard(boardOverrides),
      settings: { ...defaultSettings, ...settingsOverrides },
      app: makeApp(),
      viewComponent: null,
      filePath: "boards/test.md",
      onChange,
    },
  });
  return { ...result, onChange };
}

// ── Rendering ────────────────────────────────────────────

describe("Board rendering", () => {
  test("renders all lanes", () => {
    const { container } = renderBoard();
    expect(container.querySelectorAll(".kb-lane")).toHaveLength(2);
  });

  test("renders lane titles", () => {
    const { container } = renderBoard();
    const titles = container.querySelectorAll(".kb-lane-title");
    expect(titles[0].textContent).toBe("To Do");
    expect(titles[1].textContent).toBe("Done");
  });

  test("renders add-lane button", () => {
    const { container } = renderBoard();
    expect(container.querySelector(".kb-add-lane-btn")).toBeTruthy();
  });

  test("add lane button uses separated plus icon and text", () => {
    const { container } = renderBoard();
    expect(container.querySelector(".kb-add-lane-btn .kb-add-icon")?.textContent).toBe("+");
    expect(container.querySelector(".kb-add-lane-btn .kb-add-text")?.textContent).toBe(
      "Add List"
    );
  });

  test("add list button stays a lightweight ghost trigger", () => {
    const { container } = renderBoard();
    const button = container.querySelector(".kb-add-lane-btn");
    expect(button).toBeTruthy();
    expect(button?.classList.contains("kb-add-lane-btn")).toBe(true);
  });

  test("renders items in each lane", () => {
    const { container } = renderBoard();
    const lanes = container.querySelectorAll(".kb-lane");
    expect(lanes[0].querySelectorAll(".kb-item")).toHaveLength(2);
    expect(lanes[1].querySelectorAll(".kb-item")).toHaveLength(1);
  });

  test("lane receives data-lane-color attribute", () => {
    const { container } = renderBoard({
      lanes: [
        {
          id: "lane-1",
          title: "To Do",
          color: "sad",
          items: [{ id: "i1", title: "Task A", checked: false, hasCheckbox: false }],
        },
      ],
    });
    expect(container.querySelector('.kb-lane[data-lane-color="sad"]')).toBeTruthy();
  });

  test("default settings are applied to board data attributes", () => {
    const { container } = renderBoard();
    const board = container.querySelector(".kb-board");
    expect(board?.getAttribute("data-list-title-size")).toBe("large");
    expect(board?.getAttribute("data-card-title-size")).toBe("normal");
    expect(board?.getAttribute("data-list-color-intensity")).toBe("normal");
    expect(board?.getAttribute("data-card-stripe-style")).toBe("checkpoint-prefix");
    expect(board?.getAttribute("data-move-hashtags")).toBe("on");
  });

  test("list title size setting changes board data attribute", () => {
    const { container } = renderBoard(undefined, { listTitleSize: "small" });
    expect(container.querySelector(".kb-board")?.getAttribute("data-list-title-size")).toBe(
      "small"
    );
  });

  test("card title size setting changes board data attribute", () => {
    const { container } = renderBoard(undefined, { cardTitleSize: "large" });
    expect(container.querySelector(".kb-board")?.getAttribute("data-card-title-size")).toBe(
      "large"
    );
  });

  test("list color intensity setting changes board data attribute", () => {
    const { container } = renderBoard(undefined, { listColorIntensity: "strong" });
    expect(
      container.querySelector(".kb-board")?.getAttribute("data-list-color-intensity")
    ).toBe("strong");
  });

  test("moveHashtagsToFooter default is true", () => {
    expect(defaultSettings.moveHashtagsToFooter).toBe(true);
  });

  test("cardStripeStyle default is checkpoint-prefix", () => {
    expect(defaultSettings.cardStripeStyle).toBe("checkpoint-prefix");
  });

  test("board keeps checkpoint-prefix data attribute", () => {
    const { container } = renderBoard(undefined, { cardStripeStyle: "checkpoint-prefix" });
    expect(container.querySelector(".kb-board")?.getAttribute("data-card-stripe-style")).toBe(
      "checkpoint-prefix"
    );
  });

  test("legacy checkpoint-tail setting falls back to checkpoint-prefix", async () => {
    const plugin = new KanbanBoardPlugin();
    plugin.loadData = vi.fn().mockResolvedValue({ cardStripeStyle: "checkpoint-tail" });

    await plugin.loadSettings();

    expect(plugin.settings.cardStripeStyle).toBe("checkpoint-prefix");
  });

  test("legacy content-bar and checkbox-bar settings both normalize to checkpoint-prefix", async () => {
    const pluginA = new KanbanBoardPlugin();
    pluginA.loadData = vi.fn().mockResolvedValue({ cardStripeStyle: "content-bar" });
    await pluginA.loadSettings();

    const pluginB = new KanbanBoardPlugin();
    pluginB.loadData = vi.fn().mockResolvedValue({ cardStripeStyle: "checkbox-bar" });
    await pluginB.loadSettings();

    expect(pluginA.settings.cardStripeStyle).toBe("checkpoint-prefix");
    expect(pluginB.settings.cardStripeStyle).toBe("checkpoint-prefix");
  });

  test("card receives data-card-color attribute", () => {
    const { container } = renderBoard({
      lanes: [
        {
          id: "lane-1",
          title: "To Do",
          items: [
            {
              id: "i1",
              title: "Task A",
              color: "soft-color",
              checked: false,
              hasCheckbox: false,
            },
          ],
        },
      ],
    });
    expect(container.querySelector('.kb-item[data-card-color="soft-color"]')).toBeTruthy();
  });

  test("card color still uses data attribute while keeping default border semantics", () => {
    const { container } = renderBoard({
      lanes: [
        {
          id: "lane-1",
          title: "To Do",
          items: [
            {
              id: "i1",
              title: "Task A",
              color: "happy",
              checked: false,
              hasCheckbox: false,
            },
          ],
        },
      ],
    });
    const card = container.querySelector('.kb-item[data-card-color="happy"]');
    expect(card).toBeTruthy();
  });
});

// ── Lane management ──────────────────────────────────────

describe("Board lane management", () => {
  test("adds a lane on button click", async () => {
    const { container, onChange } = renderBoard();
    await fireEvent.click(container.querySelector(".kb-add-lane-btn")!);

    expect(onChange).toHaveBeenCalled();
    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes).toHaveLength(3);
    expect(updatedBoard.lanes[2].title).toBe("New List");
  });

  test("deletes a lane via menu", async () => {
    const { container, onChange } = renderBoard();

    // Click the first lane's menu
    const menuBtns = container.querySelectorAll(".kb-lane-header .kb-menu-btn");
    await fireEvent.click(menuBtns[0]);

    const menu = Menu.instances[Menu.instances.length - 1];
    menu.findItem("Delete list")!._onClick!();

    expect(onChange).toHaveBeenCalled();
    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes).toHaveLength(1);
    expect(updatedBoard.lanes[0].title).toBe("Done");
  });

  test("choosing list color updates lane color", async () => {
    const { container, onChange } = renderBoard();
    const menuBtns = container.querySelectorAll(".kb-lane-header .kb-menu-btn");
    await fireEvent.click(menuBtns[0]);

    const menu = Menu.instances[Menu.instances.length - 1];
    menu.findItem("Dusty blue")!._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].color).toBe("sad");
  });

  test("clearing list color restores default", async () => {
    const { container, onChange } = renderBoard({
      lanes: [
        {
          id: "lane-1",
          title: "To Do",
          color: "sad",
          items: [{ id: "i1", title: "Task A", checked: false, hasCheckbox: false }],
        },
      ],
    });
    const menuBtns = container.querySelectorAll(".kb-lane-header .kb-menu-btn");
    await fireEvent.click(menuBtns[0]);

    const menu = Menu.instances[Menu.instances.length - 1];
    menu.findItem("Default")!._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].color).toBeUndefined();
  });

  test("list menu labels do not include prefix and still include all color options", async () => {
    const { container } = renderBoard();
    const menuBtns = container.querySelectorAll(".kb-lane-header .kb-menu-btn");
    await fireEvent.click(menuBtns[0]);

    const menu = Menu.instances[Menu.instances.length - 1];
    expect(menu.findItem("Default")).toBeTruthy();
    expect(menu.findItem("Muted ochre")).toBeTruthy();
    expect(menu.findItem("Dusty blue")).toBeTruthy();
    expect(menu.findItem("Terracotta")).toBeTruthy();
    expect(menu.findItem("Muted mauve")).toBeTruthy();
    expect(menu.findItem("Muted teal")).toBeTruthy();
    expect(menu.findItem("Blue gray")).toBeTruthy();
    expect(menu.findItem("Muted sage green")).toBeTruthy();
    expect(menu.findItem("List color: Default")).toBeUndefined();
    expect(menu.findItem("List color: Muted ochre")).toBeUndefined();
  });
});

// ── Item add with settings ───────────────────────────────

describe("Board item addition", () => {
  async function openFirstLaneComposer(container: HTMLElement) {
    const button = container.querySelectorAll(".kb-add-card-btn")[0] as HTMLButtonElement;
    await fireEvent.click(button);
    return container.querySelectorAll(".kb-add-item-input")[0] as HTMLTextAreaElement;
  }

  test("appends new item by default", async () => {
    const { container, onChange } = renderBoard();
    const firstLaneInput = await openFirstLaneComposer(container);

    await fireEvent.input(firstLaneInput, { target: { value: "New task" } });
    await fireEvent.keyDown(firstLaneInput, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(onChange).toHaveBeenCalled();
    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    const items = updatedBoard.lanes[0].items;
    expect(items[items.length - 1].title).toBe("New task");
  });

  test("prepends new item when prependCards is true", async () => {
    const { container, onChange } = renderBoard(undefined, {
      prependCards: true,
    });
    const firstLaneInput = await openFirstLaneComposer(container);

    await fireEvent.input(firstLaneInput, { target: { value: "Prepended" } });
    await fireEvent.keyDown(firstLaneInput, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(onChange).toHaveBeenCalled();
    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items[0].title).toBe("Prepended");
  });

  test("new card creates structured item on first save and edit text stays stable", async () => {
    const { container, onChange } = renderBoard();
    const firstLaneInput = await openFirstLaneComposer(container);

    await fireEvent.input(firstLaneInput, {
      target: {
        value:
          "Parent title\nParent note line 1\nParent note line 2\n- [ ] Subtask A\n  Subtask note line 1\n  Subtask note line 2",
      },
    });
    await fireEvent.keyDown(firstLaneInput, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(onChange).toHaveBeenCalled();
    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    const item = updatedBoard.lanes[0].items[updatedBoard.lanes[0].items.length - 1];
    expect(item).toMatchObject({
      title: "Parent title",
      body: "Parent note line 1\nParent note line 2",
      checked: false,
      hasCheckbox: true,
      subtasks: [
        {
          title: "Subtask A",
          body: "Subtask note line 1\nSubtask note line 2",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });
    expect(formatItemForEditing(item)).toBe(
      "Parent title\nParent note line 1\nParent note line 2\n- [ ] Subtask A\n  Subtask note line 1\n  Subtask note line 2"
    );
    expect(serializeBoard(updatedBoard)).toContain(
      "- [ ] Parent title\n  Parent note line 1\n  Parent note line 2\n  - [ ] Subtask A\n    Subtask note line 1\n    Subtask note line 2"
    );
  });
});

// ── Card context menu actions ────────────────────────────

describe("Board card menu", () => {
  async function openCardMenu(container: HTMLElement, itemIndex = 0) {
    const menuBtns = container.querySelectorAll(".kb-item .kb-menu-btn");
    const before = Menu.instances.length;
    await fireEvent.click(menuBtns[itemIndex]);
    return Menu.instances[before]; // main menu (submenu is created after)
  }

  test("shows card menu with all options", async () => {
    const { container } = renderBoard();
    const menu = await openCardMenu(container);

    expect(menu.findItem("Edit card")).toBeTruthy();
    expect(menu.findItem("New note from card")).toBeTruthy();
    expect(menu.findItem("Duplicate card")).toBeTruthy();
    expect(menu.findItem("Move to top")).toBeTruthy();
    expect(menu.findItem("Move to bottom")).toBeTruthy();
    expect(menu.findItem("Move to list")).toBeTruthy();
    expect(menu.findItem("Default")).toBeTruthy();
    expect(menu.findItem("Soft color")).toBeTruthy();
    expect(menu.findItem("Muted ochre")).toBeTruthy();
    expect(menu.findItem("Dusty blue")).toBeTruthy();
    expect(menu.findItem("Terracotta")).toBeTruthy();
    expect(menu.findItem("Muted mauve")).toBeTruthy();
    expect(menu.findItem("Muted teal")).toBeTruthy();
    expect(menu.findItem("Blue gray")).toBeTruthy();
    expect(menu.findItem("Muted sage green")).toBeTruthy();
    expect(menu.findItem("Card color: Default")).toBeUndefined();
    expect(menu.findItem("Card color: Soft color")).toBeUndefined();
    expect(menu.findItem("Archive card")).toBeTruthy();
    expect(menu.findItem("Delete card")).toBeTruthy();
  });

  test("choosing card color updates item color", async () => {
    const { container, onChange } = renderBoard();
    const menu = await openCardMenu(container, 0);
    menu.findItem("Soft color")!._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items[0].color).toBe("soft-color");
  });

  test("clearing card color restores default", async () => {
    const { container, onChange } = renderBoard({
      lanes: [
        {
          id: "lane-1",
          title: "To Do",
          items: [
            {
              id: "i1",
              title: "Task A",
              color: "happy",
              checked: false,
              hasCheckbox: false,
            },
          ],
        },
      ],
    });
    const menu = await openCardMenu(container, 0);
    menu.findItem("Default")!._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items[0].color).toBeUndefined();
  });

  test("soft color CSS uses lane-color overlay and keeps fallback when lane has no color", () => {
    const css = readFileSync("styles.css", "utf8");
    expect(css).toContain('.kb-lane[data-lane-color] .kb-item[data-card-color="soft-color"] {');
    expect(css).toContain("rgba(var(--mk-lane-color-rgb), 0.08)");
    expect(css).toContain("var(--background-primary)");
    expect(css).toContain('.kb-lane[data-lane-color] .kb-item[data-card-color="soft-color"] .kb-card-stripe {');
    expect(css).toContain("display: block;");
    expect(css).toContain("background-color: rgba(var(--mk-lane-color-rgb), 0.76);");
    expect(css).toContain('.kb-item[data-card-color="soft-color"] {');
    expect(css).toContain("background-color: var(--background-primary);");
  });

  test("duplicate card clones item after original", async () => {
    const { container, onChange } = renderBoard();
    const menu = await openCardMenu(container, 0);
    menu.findItem("Duplicate card")!._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items).toHaveLength(3);
    expect(updatedBoard.lanes[0].items[0].title).toBe("Task A");
    expect(updatedBoard.lanes[0].items[1].title).toBe("Task A"); // clone
    expect(updatedBoard.lanes[0].items[1].id).not.toBe("i1"); // new id
  });

  test("move to top moves item to first position", async () => {
    const { container, onChange } = renderBoard();
    // Click menu on second item (index 1 = "Task B")
    const menu = await openCardMenu(container, 1);
    menu.findItem("Move to top")!._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items[0].title).toBe("Task B");
    expect(updatedBoard.lanes[0].items[1].title).toBe("Task A");
  });

  test("move to bottom moves item to last position", async () => {
    const { container, onChange } = renderBoard();
    // Click menu on first item (index 0 = "Task A")
    const menu = await openCardMenu(container, 0);
    menu.findItem("Move to bottom")!._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items[0].title).toBe("Task B");
    expect(updatedBoard.lanes[0].items[1].title).toBe("Task A");
  });

  test("archive card moves item to archive", async () => {
    const { container, onChange } = renderBoard();
    const menu = await openCardMenu(container, 0);
    menu.findItem("Archive card")!._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items).toHaveLength(1);
    expect(updatedBoard.archive).toHaveLength(1);
    expect(updatedBoard.archive[0].title).toBe("Task A");
  });

  test("delete card removes item", async () => {
    const { container, onChange } = renderBoard();
    const menu = await openCardMenu(container, 0);
    menu.findItem("Delete card")!._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items).toHaveLength(1);
    expect(updatedBoard.lanes[0].items[0].title).toBe("Task B");
  });

  test("move to list submenu lists all lanes", async () => {
    const { container } = renderBoard();
    const menu = await openCardMenu(container, 0);
    const moveItem = menu.findItem("Move to list")!;
    expect(moveItem._submenu).toBeTruthy();

    const subItems = moveItem._submenu!.items.filter(
      (i): i is InstanceType<typeof import("./mocks/obsidian").MenuItem> =>
        "_title" in i
    );
    expect(subItems.map((i) => i._title)).toEqual(["To Do", "Done"]);
    // Current lane is checked
    expect(subItems[0]._checked).toBe(true);
    expect(subItems[1]._checked).toBe(false);
  });

  test("move to list transfers item between lanes", async () => {
    const { container, onChange } = renderBoard();
    const menu = await openCardMenu(container, 0);
    const moveItem = menu.findItem("Move to list")!;
    const subItems = moveItem._submenu!.items.filter(
      (i): i is InstanceType<typeof import("./mocks/obsidian").MenuItem> =>
        "_title" in i
    );
    // Click "Done" lane
    subItems[1]._onClick!();

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items).toHaveLength(1); // removed from To Do
    expect(updatedBoard.lanes[1].items).toHaveLength(2); // added to Done
    expect(updatedBoard.lanes[1].items[1].title).toBe("Task A");
  });

  test("new note from card creates file and updates title", async () => {
    const app = makeApp();
    const onChange = vi.fn();
    const { container } = render(Board, {
      props: {
        board: makeBoard(),
        settings: defaultSettings,
        app,
        viewComponent: null,
        filePath: "boards/test.md",
        onChange,
      },
    });

    const menu = await (async () => {
      const menuBtns = container.querySelectorAll(".kb-item .kb-menu-btn");
      const before = Menu.instances.length;
      await fireEvent.click(menuBtns[0]);
      return Menu.instances[before]; // main menu, not submenu
    })();

    await menu.findItem("New note from card")!._onClick!();
    // Wait for async operations
    await new Promise((r) => setTimeout(r, 10));

    expect(app.vault.create).toHaveBeenCalled();
    const createPath = app.vault.create.mock.calls[0][0] as string;
    expect(createPath).toMatch(/^boards\/Task A\.md$/);
    expect(app.workspace.getLeaf).toHaveBeenCalledWith("split");
  });

  test("checkbox toggling does not remove colors", async () => {
    const { container, onChange } = renderBoard({
      lanes: [
        {
          id: "lane-1",
          title: "To Do",
          color: "sad",
          items: [
            {
              id: "i1",
              title: "Task A",
              color: "happy",
              checked: false,
              hasCheckbox: true,
            },
          ],
        },
      ],
    }, {
      showCheckboxes: true,
    });

    const checkbox = container.querySelector(".kb-item-checkbox") as HTMLInputElement;
    await fireEvent.change(checkbox);

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].color).toBe("sad");
    expect(updatedBoard.lanes[0].items[0].color).toBe("happy");
  });
});

// ── New note from card: filename sanitization ──────────

describe("newNoteFromCard filename sanitization", () => {
  async function triggerNewNote(cardTitle: string, filePath = "Kanban.md") {
    const app = makeApp();
    const onChange = vi.fn();
    const { container } = render(Board, {
      props: {
        board: {
          lanes: [
            {
              id: "lane-1",
              title: "L",
              items: [{ id: "i1", title: cardTitle, checked: false, hasCheckbox: false }],
            },
          ],
          archive: [],
        },
        settings: defaultSettings,
        app,
        viewComponent: null,
        filePath,
        onChange,
      },
    });

    const menuBtns = container.querySelectorAll(".kb-item .kb-menu-btn");
    const before = Menu.instances.length;
    await fireEvent.click(menuBtns[0]);
    const menu = Menu.instances[before];
    await menu.findItem("New note from card")!._onClick!();
    await new Promise((r) => setTimeout(r, 10));
    return app;
  }

  test("uses only the first line of a multi-line title", async () => {
    const app = await triggerNewNote("First line\nSecond line");
    expect(app.vault.create.mock.calls[0][0]).toBe("First line.md");
  });

  test("extracts text from wikilinks", async () => {
    const app = await triggerNewNote("See [[My Note]]");
    expect(app.vault.create.mock.calls[0][0]).toBe("See My Note.md");
  });

  test("uses display text from piped wikilinks", async () => {
    const app = await triggerNewNote("Ref [[target|Display Name]]");
    // Sanitization strips everything between [[ and | (keeping only the target)
    expect(app.vault.create.mock.calls[0][0]).toBe("Ref target.md");
  });

  test("extracts text from embeds", async () => {
    const app = await triggerNewNote("![[Embedded]]");
    expect(app.vault.create.mock.calls[0][0]).toBe("Embedded.md");
  });

  test("extracts text from markdown links", async () => {
    const app = await triggerNewNote("Check [this link](https://example.com)");
    expect(app.vault.create.mock.calls[0][0]).toBe("Check this link.md");
  });

  test("strips # from hashtags", async () => {
    const app = await triggerNewNote("Task with #urgent tag");
    expect(app.vault.create.mock.calls[0][0]).toBe("Task with urgent tag.md");
  });

  test("removes filesystem-illegal characters", async () => {
    const app = await triggerNewNote('Bad: chars / and \\ and * "quoted" <x>|');
    const path = app.vault.create.mock.calls[0][0] as string;
    expect(path).not.toMatch(/[\\/:*?"<>|]/);
    expect(path).toContain("Bad chars");
  });

  test("collapses whitespace", async () => {
    const app = await triggerNewNote("Too    many     spaces");
    expect(app.vault.create.mock.calls[0][0]).toBe("Too many spaces.md");
  });

  test("falls back to 'Untitled' for empty sanitized titles", async () => {
    const app = await triggerNewNote("///***");
    expect(app.vault.create.mock.calls[0][0]).toBe("Untitled.md");
  });

  test("places note in same folder as kanban file", async () => {
    const app = await triggerNewNote("My Card", "deep/folder/Kanban.md");
    expect(app.vault.create.mock.calls[0][0]).toBe("deep/folder/My Card.md");
  });

  test("appends counter when filename already exists", async () => {
    const app = makeApp();
    // First lookup returns a truthy value (collision), second returns null
    let callCount = 0;
    app.vault.getAbstractFileByPath = vi.fn(() => {
      callCount++;
      return callCount === 1 ? ({ path: "Existing.md" } as any) : null;
    });

    const { container } = render(Board, {
      props: {
        board: {
          lanes: [
            {
              id: "lane-1",
              title: "L",
              items: [{ id: "i1", title: "Existing", checked: false, hasCheckbox: false }],
            },
          ],
          archive: [],
        },
        settings: defaultSettings,
        app,
        viewComponent: null,
        filePath: "Kanban.md",
        onChange: vi.fn(),
      },
    });

    const menuBtns = container.querySelectorAll(".kb-item .kb-menu-btn");
    await fireEvent.click(menuBtns[0]);
    const menu = Menu.instances[Menu.instances.length - 1];
    await menu.findItem("New note from card")!._onClick!();
    await new Promise((r) => setTimeout(r, 10));

    expect(app.vault.create).toHaveBeenCalledWith("Existing 1.md", "");
  });
});

// ── Mobile behavior ──────────────────────────────────────

describe("Board mobile behavior", () => {
  test("flattens Move to list on mobile (Platform.isPhone)", async () => {
    Platform.isPhone = true;
    const { container } = renderBoard();

    const menuBtns = container.querySelectorAll(".kb-item .kb-menu-btn");
    await fireEvent.click(menuBtns[0]);
    const menu = Menu.instances[Menu.instances.length - 1];

    // On phone, "Move to list" should NOT create a submenu
    const moveItem = menu.findItem("Move to list")!;
    expect(moveItem._submenu).toBeNull();

    // Lane titles should be added directly to the main menu
    const mainItems = menu.items.filter(
      (i): i is InstanceType<typeof import("./mocks/obsidian").MenuItem> =>
        "_title" in i
    );
    const laneItems = mainItems.filter(
      (i) => i._title === "To Do" || i._title === "Done"
    );
    expect(laneItems).toHaveLength(2);

    Platform.isPhone = false; // reset
  });
});

// ── Drag and drop ────────────────────────────────────────

describe("Board drag and drop", () => {
  test("reorders items within a lane via SortableJS", async () => {
    const { container, onChange } = renderBoard();

    const laneItemsEl = container.querySelectorAll(".kb-lane-items")[0];
    const sortable = SortableMock.instances.find(
      (s) => s.el === laneItemsEl
    )!;
    expect(sortable).toBeTruthy();

    // Simulate SortableJS having reordered: moved item at 0 to 1
    const children = Array.from(laneItemsEl.children) as HTMLElement[];
    const draggedItem = children[0];
    laneItemsEl.removeChild(draggedItem);
    laneItemsEl.appendChild(draggedItem);

    sortable.options.onEnd({
      from: laneItemsEl,
      to: laneItemsEl,
      oldIndex: 0,
      newIndex: 1,
      item: draggedItem,
    });

    expect(onChange).toHaveBeenCalled();
    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items.map((i) => i.title)).toEqual([
      "Task B",
      "Task A",
    ]);
  });

  test("drag/drop does not remove colors", async () => {
    const { container, onChange } = renderBoard({
      lanes: [
        {
          id: "lane-1",
          title: "To Do",
          color: "sad",
          items: [
            { id: "i1", title: "Task A", color: "happy", checked: false, hasCheckbox: false },
            { id: "i2", title: "Task B", color: "fear", checked: false, hasCheckbox: false },
          ],
        },
        {
          id: "lane-2",
          title: "Done",
          color: "envy",
          items: [
            { id: "i3", title: "Task C", color: "soft-color", checked: false, hasCheckbox: false },
          ],
        },
      ],
    });

    const laneItemsEls = container.querySelectorAll(".kb-lane-items");
    const fromEl = laneItemsEls[0];
    const toEl = laneItemsEls[1];
    const sortable = SortableMock.instances.find((s) => s.el === fromEl)!;
    const draggedItem = fromEl.children[0] as HTMLElement;
    fromEl.removeChild(draggedItem);
    toEl.insertBefore(draggedItem, toEl.children[0]);

    sortable.options.onEnd({
      from: fromEl,
      to: toEl,
      oldIndex: 0,
      newIndex: 0,
      item: draggedItem,
    });

    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].color).toBe("sad");
    expect(updatedBoard.lanes[1].color).toBe("envy");
    expect(updatedBoard.lanes[1].items[0].color).toBe("happy");
    expect(updatedBoard.lanes[1].items[1].color).toBe("soft-color");
  });

  test("moves item between lanes via SortableJS", async () => {
    const { container, onChange } = renderBoard();

    const laneItemsEls = container.querySelectorAll(".kb-lane-items");
    const fromEl = laneItemsEls[0];
    const toEl = laneItemsEls[1];
    const sortable = SortableMock.instances.find((s) => s.el === fromEl)!;

    // Simulate SortableJS moving first item from lane-1 to lane-2 at position 0
    const draggedItem = fromEl.children[0] as HTMLElement;
    fromEl.removeChild(draggedItem);
    toEl.insertBefore(draggedItem, toEl.children[0]);

    sortable.options.onEnd({
      from: fromEl,
      to: toEl,
      oldIndex: 0,
      newIndex: 0,
      item: draggedItem,
    });

    expect(onChange).toHaveBeenCalled();
    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes[0].items.map((i) => i.title)).toEqual([
      "Task B",
    ]);
    expect(updatedBoard.lanes[1].items.map((i) => i.title)).toEqual([
      "Task A",
      "Task C",
    ]);
  });

  test("reorders lanes via board-level SortableJS", async () => {
    const { container, onChange } = renderBoard();

    const boardEl = container.querySelector(".kb-board")!;
    const boardSortable = SortableMock.instances.find(
      (s) => s.el === boardEl
    )!;
    expect(boardSortable).toBeTruthy();
    expect(boardSortable.options.handle).toBe(".kb-lane-drag-handle");

    // Simulate moving lane at index 0 to index 1
    const lanes = Array.from(boardEl.querySelectorAll(".kb-lane"));
    const draggedLane = lanes[0];
    boardEl.removeChild(draggedLane);
    boardEl.insertBefore(draggedLane, boardEl.querySelector(".kb-add-lane"));

    boardSortable.options.onEnd({
      oldIndex: 0,
      newIndex: 1,
      item: draggedLane,
    });

    expect(onChange).toHaveBeenCalled();
    const updatedBoard = onChange.mock.calls[0][0] as BoardType;
    expect(updatedBoard.lanes.map((l) => l.title)).toEqual(["Done", "To Do"]);
  });

  test("SortableJS filter prevents drag on menu buttons", () => {
    renderBoard();

    const itemSortables = SortableMock.instances.filter(
      (s) => s.options.group === "kb-items"
    );
    expect(itemSortables.length).toBeGreaterThan(0);
    itemSortables.forEach((s) => {
      expect(s.options.filter).toBe(".kb-menu-btn");
      expect(s.options.preventOnFilter).toBe(false);
    });
  });

  test("SortableJS has touch delay for mobile", () => {
    renderBoard();

    const itemSortables = SortableMock.instances.filter(
      (s) => s.options.group === "kb-items"
    );
    itemSortables.forEach((s) => {
      expect(s.options.delay).toBe(150);
      expect(s.options.delayOnTouchOnly).toBe(true);
    });
  });
});

// ── Archive lane ────────────────────────────────────────

describe("Archive lane", () => {
  const archivedItems = [
    { id: "a1", title: "Archived A", checked: false, hasCheckbox: false },
    { id: "a2", title: "Archived B", checked: false, hasCheckbox: false },
  ];

  function openArchiveMenu(container: HTMLElement, index = 0) {
    const archiveLane = container.querySelector(".kb-archive-lane")!;
    const menuBtns = archiveLane.querySelectorAll(".kb-menu-btn");
    const before = Menu.instances.length;
    fireEvent.click(menuBtns[index]);
    return Menu.instances[before];
  }

  test("hidden when showArchive is false", () => {
    const { container } = renderBoard({ archive: archivedItems });
    expect(container.querySelector(".kb-archive-lane")).toBeNull();
  });

  test("hidden when archive is empty", () => {
    const { container } = renderBoard({ archive: [] }, { showArchive: true });
    expect(container.querySelector(".kb-archive-lane")).toBeNull();
  });

  test("visible when showArchive is true and archive has items", () => {
    const { container } = renderBoard(
      { archive: archivedItems },
      { showArchive: true }
    );
    const lane = container.querySelector(".kb-archive-lane");
    expect(lane).toBeTruthy();
    expect(lane!.querySelectorAll(".kb-item")).toHaveLength(2);
  });

  test("shows item count badge", () => {
    const { container } = renderBoard(
      { archive: archivedItems },
      { showArchive: true }
    );
    const count = container.querySelector(".kb-archive-lane .kb-lane-count");
    expect(count!.textContent).toBe("2");
  });

  test("restore card moves item to last lane (append)", async () => {
    const { container, onChange } = renderBoard(
      { archive: [...archivedItems] },
      { showArchive: true }
    );
    const menu = await openArchiveMenu(container);
    menu.findItem("Restore card")!._onClick!();

    const updated = onChange.mock.calls[0][0] as BoardType;
    expect(updated.archive).toHaveLength(1);
    const lastLane = updated.lanes[updated.lanes.length - 1];
    expect(lastLane.items[lastLane.items.length - 1].title).toBe("Archived A");
  });

  test("restore card respects prependCards setting", async () => {
    const { container, onChange } = renderBoard(
      { archive: [...archivedItems] },
      { showArchive: true, prependCards: true }
    );
    const menu = await openArchiveMenu(container);
    menu.findItem("Restore card")!._onClick!();

    const updated = onChange.mock.calls[0][0] as BoardType;
    const lastLane = updated.lanes[updated.lanes.length - 1];
    expect(lastLane.items[0].title).toBe("Archived A");
  });

  test("restore to list moves item to chosen lane", async () => {
    const { container, onChange } = renderBoard(
      { archive: [...archivedItems] },
      { showArchive: true }
    );
    const menu = await openArchiveMenu(container);
    const restoreToList = menu.findItem("Restore to list")!;
    const subItems = restoreToList._submenu!.items.filter(
      (i): i is InstanceType<typeof import("./mocks/obsidian").MenuItem> =>
        "_title" in i
    );
    // Restore to first lane ("To Do")
    subItems[0]._onClick!();

    const updated = onChange.mock.calls[0][0] as BoardType;
    expect(updated.archive).toHaveLength(1);
    expect(updated.lanes[0].items[updated.lanes[0].items.length - 1].title).toBe("Archived A");
  });

  test("restore to list respects prependCards setting", async () => {
    const { container, onChange } = renderBoard(
      { archive: [...archivedItems] },
      { showArchive: true, prependCards: true }
    );
    const menu = await openArchiveMenu(container);
    const restoreToList = menu.findItem("Restore to list")!;
    const subItems = restoreToList._submenu!.items.filter(
      (i): i is InstanceType<typeof import("./mocks/obsidian").MenuItem> =>
        "_title" in i
    );
    subItems[0]._onClick!();

    const updated = onChange.mock.calls[0][0] as BoardType;
    expect(updated.lanes[0].items[0].title).toBe("Archived A");
  });

  test("delete from archive removes item permanently", async () => {
    const { container, onChange } = renderBoard(
      { archive: [...archivedItems] },
      { showArchive: true }
    );
    const menu = await openArchiveMenu(container);
    menu.findItem("Delete card")!._onClick!();

    const updated = onChange.mock.calls[0][0] as BoardType;
    expect(updated.archive).toHaveLength(1);
    expect(updated.archive[0].title).toBe("Archived B");
  });

  test("no restore options when board has zero lanes", async () => {
    const { container } = renderBoard(
      { lanes: [], archive: [...archivedItems] },
      { showArchive: true }
    );
    const menu = await openArchiveMenu(container);
    expect(menu.findItem("Restore card")).toBeUndefined();
    expect(menu.findItem("Restore to list")).toBeUndefined();
    // Delete should still be available
    expect(menu.findItem("Delete card")).toBeTruthy();
  });

  test("no restore-to-list when board has only one lane", async () => {
    const { container } = renderBoard(
      {
        lanes: [{ id: "lane-1", title: "Only", items: [] }],
        archive: [...archivedItems],
      },
      { showArchive: true }
    );
    const menu = await openArchiveMenu(container);
    expect(menu.findItem("Restore card")).toBeTruthy();
    expect(menu.findItem("Restore to list")).toBeUndefined();
  });

  test("archive card from lane menu moves item to archive", async () => {
    const { container, onChange } = renderBoard();
    const menuBtns = container.querySelectorAll(".kb-item .kb-menu-btn");
    const before = Menu.instances.length;
    await fireEvent.click(menuBtns[0]);
    const menu = Menu.instances[before];
    menu.findItem("Archive card")!._onClick!();

    const updated = onChange.mock.calls[0][0] as BoardType;
    expect(updated.lanes[0].items).toHaveLength(1);
    expect(updated.archive).toHaveLength(1);
    expect(updated.archive[0].title).toBe("Task A");
  });

  test("mobile flattens restore-to-list submenu", async () => {
    Platform.isPhone = true;
    const { container } = renderBoard(
      { archive: [...archivedItems] },
      { showArchive: true }
    );
    const menu = await openArchiveMenu(container);
    const restoreItem = menu.findItem("Restore to list")!;
    expect(restoreItem._submenu).toBeNull();

    // Lane titles added directly to main menu
    const mainItems = menu.items.filter(
      (i): i is InstanceType<typeof import("./mocks/obsidian").MenuItem> =>
        "_title" in i
    );
    const laneItems = mainItems.filter(
      (i) => i._title === "To Do" || i._title === "Done"
    );
    expect(laneItems).toHaveLength(2);
    Platform.isPhone = false;
  });
});

// ── Lane title editing ──────────────────────────────────

describe("Lane title editing", () => {
  test("clicking lane title enters edit mode", async () => {
    const { container } = renderBoard();
    const title = container.querySelector(".kb-lane-title")!;
    await fireEvent.click(title);

    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector(".kb-lane-title-input")).toBeTruthy();
  });

  test("Enter key finishes lane title edit", async () => {
    const { container, onChange } = renderBoard();
    const title = container.querySelector(".kb-lane-title")!;
    await fireEvent.click(title);
    await new Promise((r) => setTimeout(r, 10));

    const input = container.querySelector(".kb-lane-title-input")! as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Renamed" } });
    await fireEvent.keyDown(input, { key: "Enter" });
    await fireEvent.blur(input);

    expect(onChange).toHaveBeenCalled();
    const updated = onChange.mock.calls[0][0] as BoardType;
    expect(updated.lanes[0].title).toBe("Renamed");
  });

  test("Escape key cancels lane title edit", async () => {
    const { container, onChange } = renderBoard();
    const title = container.querySelector(".kb-lane-title")!;
    await fireEvent.click(title);
    await new Promise((r) => setTimeout(r, 10));

    const input = container.querySelector(".kb-lane-title-input")!;
    await fireEvent.keyDown(input, { key: "Escape" });

    // Should exit edit mode without saving
    expect(container.querySelector(".kb-lane-title-input")).toBeNull();
  });

  test("Escape after typing does not mutate lane.title", async () => {
    const board = makeBoard();
    const originalTitle = board.lanes[0].title;
    const onChange = vi.fn();
    const { container } = render(Board, {
      props: {
        board,
        settings: defaultSettings,
        app: makeApp(),
        viewComponent: null,
        filePath: "boards/test.md",
        onChange,
      },
    });

    await fireEvent.click(container.querySelector(".kb-lane-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const input = container.querySelector(".kb-lane-title-input")! as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Garbage typed input" } });
    await fireEvent.keyDown(input, { key: "Escape" });

    // Original title preserved in board state
    expect(board.lanes[0].title).toBe(originalTitle);
    // No save fired
    expect(onChange).not.toHaveBeenCalled();
    // Display reflects original title, not the typed draft
    await new Promise((r) => setTimeout(r, 10));
    const titleEl = container.querySelector(".kb-lane-title");
    expect(titleEl?.textContent).toBe(originalTitle);
  });
});

// ── Undo toast ──────────────────────────────────────────

describe("Undo toast", () => {
  async function openCardMenu(container: HTMLElement, itemIndex = 0) {
    const menuBtns = container.querySelectorAll(".kb-item .kb-menu-btn");
    const before = Menu.instances.length;
    await fireEvent.click(menuBtns[itemIndex]);
    return Menu.instances[before];
  }

  function latestNotice() {
    return Notice.instances[Notice.instances.length - 1];
  }

  test("delete card shows undo toast with Undo button", async () => {
    const { container } = renderBoard();
    const menu = await openCardMenu(container, 0);
    menu.findItem("Delete card")!._onClick!();

    const notice = latestNotice();
    expect(notice).toBeTruthy();
    expect(notice.noticeEl.textContent).toContain("Card deleted");
    expect(notice.noticeEl.querySelector(".kb-undo-btn")).toBeTruthy();
  });

  test("clicking Undo restores the deleted card", async () => {
    const { container, onChange } = renderBoard();
    const menu = await openCardMenu(container, 0);
    menu.findItem("Delete card")!._onClick!();

    // The board reflects the deletion
    let updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as BoardType;
    expect(updated.lanes[0].items).toHaveLength(1);

    // Click Undo
    const btn = latestNotice().noticeEl.querySelector(".kb-undo-btn") as HTMLButtonElement;
    btn.click();

    // Board is restored
    updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as BoardType;
    expect(updated.lanes[0].items).toHaveLength(2);
    expect(updated.lanes[0].items.map((i) => i.title)).toEqual(["Task A", "Task B"]);
  });

  test("delete lane shows undo toast and restores on click", async () => {
    const { container, onChange } = renderBoard();
    const menuBtns = container.querySelectorAll(".kb-lane-header .kb-menu-btn");
    await fireEvent.click(menuBtns[0]);
    Menu.instances[Menu.instances.length - 1].findItem("Delete list")!._onClick!();

    const notice = latestNotice();
    expect(notice.noticeEl.textContent).toContain('"To Do" deleted');

    let updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as BoardType;
    expect(updated.lanes).toHaveLength(1);

    (notice.noticeEl.querySelector(".kb-undo-btn") as HTMLButtonElement).click();

    updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as BoardType;
    expect(updated.lanes).toHaveLength(2);
    expect(updated.lanes[0].title).toBe("To Do");
    expect(updated.lanes[0].items).toHaveLength(2);
  });

  test("archive card shows undo toast and restores on click", async () => {
    const { container, onChange } = renderBoard();
    const menu = await openCardMenu(container, 0);
    menu.findItem("Archive card")!._onClick!();

    const notice = latestNotice();
    expect(notice.noticeEl.textContent).toContain("Card archived");

    let updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as BoardType;
    expect(updated.archive).toHaveLength(1);

    (notice.noticeEl.querySelector(".kb-undo-btn") as HTMLButtonElement).click();

    updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as BoardType;
    expect(updated.archive).toHaveLength(0);
    expect(updated.lanes[0].items).toHaveLength(2);
  });

  test("delete from archive shows undo toast and restores on click", async () => {
    const archivedItems = [
      { id: "a1", title: "Archived A", checked: false, hasCheckbox: false },
    ];
    const { container, onChange } = renderBoard(
      { archive: archivedItems },
      { showArchive: true }
    );
    const archiveBtn = container.querySelector(".kb-archive-lane .kb-menu-btn") as HTMLElement;
    const before = Menu.instances.length;
    await fireEvent.click(archiveBtn);
    const menu = Menu.instances[before];
    menu.findItem("Delete card")!._onClick!();

    const notice = latestNotice();
    expect(notice.noticeEl.textContent).toContain("Card deleted");

    let updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as BoardType;
    expect(updated.archive).toHaveLength(0);

    (notice.noticeEl.querySelector(".kb-undo-btn") as HTMLButtonElement).click();

    updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as BoardType;
    expect(updated.archive).toHaveLength(1);
    expect(updated.archive[0].title).toBe("Archived A");
  });

  test("a second destructive action hides the prior toast", async () => {
    const { container } = renderBoard();
    const menu1 = await openCardMenu(container, 0);
    menu1.findItem("Delete card")!._onClick!();
    const first = latestNotice();
    expect(first.hidden).toBe(false);

    await new Promise((r) => setTimeout(r, 10));
    const menu2 = await openCardMenu(container, 0); // Task B is now index 0
    menu2.findItem("Delete card")!._onClick!();

    expect(first.hidden).toBe(true);
    expect(latestNotice()).not.toBe(first);
  });
});
