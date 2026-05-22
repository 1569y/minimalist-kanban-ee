import { describe, test, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import { Platform } from "obsidian";
import Item from "../src/Item.svelte";
import { readFileSync } from "node:fs";

const defaultSettings = {
  showCheckboxes: false,
  prependCards: false,
  showArchive: false,
  listTitleSize: "large" as const,
  cardTitleSize: "normal" as const,
  listColorIntensity: "normal" as const,
  moveHashtagsToFooter: true,
};

const mockApp = {};
const mockFilePath = "test.md";

function makeItem(overrides = {}) {
  return {
    id: "item-1",
    title: "Test card",
    checked: false,
    hasCheckbox: false,
    ...overrides,
  };
}

function renderItem(itemOverrides = {}, settingsOverrides = {}) {
  return render(Item, {
    props: {
      item: makeItem(itemOverrides),
      settings: { ...defaultSettings, ...settingsOverrides },
      app: mockApp,
      viewComponent: null,
      filePath: mockFilePath,
    },
  });
}

describe("Item", () => {
  test("does not show B/I toolbar in normal card browsing state", () => {
    const { container } = renderItem();
    expect(container.querySelector(".kb-editor-toolbar")).toBeNull();
    expect(container.querySelector(".kb-item-edit")).toBeNull();
  });

  test("renders item title", () => {
    const { container } = renderItem();
    expect(container.querySelector(".kb-item-title")!.textContent).toBe(
      "Test card"
    );
  });

  test("task title and body CSS stays aligned between parent and subtask", () => {
    const css = readFileSync("styles.css", "utf8");
    expect(css).toContain(".kb-item-title,\n.kb-subtask-title {");
    expect(css).toContain("font-size: var(--mk-card-title-font-size,");
    expect(css).toContain("line-height: var(--mk-task-title-line-height, 1.45);");
    expect(css).toContain("font-size: var(--mk-task-body-font-size, 0.92em);");
    expect(css).toContain("line-height: var(--mk-task-body-line-height, 1.45);");
    expect(css).toContain(".kb-item-title p,");
    expect(css).toContain(".kb-item-body-note p,");
    expect(css).toContain(".kb-subtask-title p,");
    expect(css).toContain(".kb-subtask-body p {");
  });

  test("hashtag chips render at card footer when setting enabled", () => {
    const { container } = renderItem({
      title: "Test #daily card",
      body: "Body #note",
      subtasks: [
        {
          id: "s1",
          title: "Subtask #child",
          body: "Subtask body #foot",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    const tags = Array.from(container.querySelectorAll(".kb-card-tag")).map(
      (el) => el.textContent
    );
    expect(tags).toEqual(["#daily", "#note", "#child", "#foot"]);
    expect(container.querySelector(".kb-item-title")?.textContent).toBe("Test card");
    expect(container.querySelector(".kb-subtask-title")?.textContent).toBe("Subtask");
  });

  test("hashtags remain inline when setting disabled", () => {
    const { container } = renderItem(
      {
        title: "Test #daily card",
        body: "Body #note",
      },
      { moveHashtagsToFooter: false }
    );

    expect(container.querySelector(".kb-card-tags")).toBeNull();
    expect(container.querySelector(".kb-item-title")?.textContent).toContain("#daily");
    expect(container.querySelector(".kb-item-body-note")?.textContent).toContain("#note");
  });

  test("hashtag rendering does not mutate Markdown source", () => {
    const item = makeItem({
      title: "Test #daily card",
      body: "Body #note",
    });

    render(Item, {
      props: {
        item,
        settings: defaultSettings,
        app: mockApp,
        viewComponent: null,
        filePath: mockFilePath,
      },
    });

    expect(item.title).toBe("Test #daily card");
    expect(item.body).toBe("Body #note");
  });

  test("renders multi-line title with whitespace preserved", () => {
    const { container } = renderItem({ title: "Line 1\nLine 2" });
    const el = container.querySelector(".kb-item-title")!;
    expect(el.textContent).toBe("Line 1\nLine 2");
  });

  test("renders item.body", () => {
    const { container } = renderItem({ body: "Parent note" });
    expect(container.querySelector(".kb-item-body-note")?.textContent).toBe(
      "Parent note"
    );
  });

  test("renders subtask.body", () => {
    const { container } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          body: "Subtask note",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });
    expect(container.querySelector(".kb-subtask-body")?.textContent).toBe(
      "Subtask note"
    );
  });

  test("subtask.title renders Markdown bold", async () => {
    const { container } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "**Bold subtask**",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector(".kb-subtask-title strong")?.textContent).toBe(
      "Bold subtask"
    );
  });

  test("subtask.title renders Markdown italic", async () => {
    const { container } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "*Italic subtask*",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector(".kb-subtask-title em")?.textContent).toBe(
      "Italic subtask"
    );
  });

  test("subtask.body renders Markdown bold", async () => {
    const { container } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "Subtask",
          body: "**Bold note**",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector(".kb-subtask-body strong")?.textContent).toBe(
      "Bold note"
    );
  });

  test("subtask.body renders Markdown italic", async () => {
    const { container } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "Subtask",
          body: "*Italic note*",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector(".kb-subtask-body em")?.textContent).toBe(
      "Italic note"
    );
  });

  test("item.title and item.body Markdown rendering still works", async () => {
    const { container } = renderItem({
      title: "**Bold title**",
      body: "*Italic body*",
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector(".kb-item-title strong")?.textContent).toBe(
      "Bold title"
    );
    expect(container.querySelector(".kb-item-body-note em")?.textContent).toBe(
      "Italic body"
    );
  });

  test("renders subtask body inside the same subtask content container", () => {
    const { container } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          body: "Subtask note",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });
    const content = container.querySelector(".kb-subtask-content");
    const body = container.querySelector(".kb-subtask-body");
    expect(content).toBeTruthy();
    expect(body).toBeTruthy();
    expect(content?.contains(body!)).toBe(true);
  });

  test("clicking subtask checkbox toggles only subtask.checked", async () => {
    const { container, component } = renderItem({
      body: "Parent note",
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          body: "Subtask note",
          checked: false,
          hasCheckbox: true,
        },
        {
          id: "s2",
          title: "Subtask B",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.change(container.querySelector(".kb-subtask-checkbox")!);

    const detail = handler.mock.calls[0][0].detail;
    expect(detail.checked).toBe(false);
    expect(detail.subtasks).toMatchObject([
      { title: "Subtask A", body: "Subtask note", checked: true, hasCheckbox: true },
      { title: "Subtask B", checked: false, hasCheckbox: true },
    ]);
  });

  test("clicking subtask checkbox preserves item.body", async () => {
    const { container, component } = renderItem({
      body: "Parent note",
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          body: "Subtask note",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.change(container.querySelector(".kb-subtask-checkbox")!);

    expect(handler.mock.calls[0][0].detail.body).toBe("Parent note");
  });

  test("clicking subtask checkbox preserves subtask.body", async () => {
    const { container, component } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          body: "Subtask note",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.change(container.querySelector(".kb-subtask-checkbox")!);

    expect(handler.mock.calls[0][0].detail.subtasks[0].body).toBe("Subtask note");
  });

  test("shows checkbox when setting enabled and item has checkbox", () => {
    const { container } = renderItem(
      { hasCheckbox: true, checked: true },
      { showCheckboxes: true }
    );
    const checkbox = container.querySelector(
      ".kb-item-checkbox"
    ) as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBe(true);
  });

  test("clicking parent checkbox preserves item.body and subtasks bodies", async () => {
    const { container, component } = renderItem(
      {
        body: "Parent note",
        hasCheckbox: true,
        checked: false,
        subtasks: [
          {
            id: "s1",
            title: "Subtask A",
            body: "Subtask note",
            checked: false,
            hasCheckbox: true,
          },
        ],
      },
      { showCheckboxes: true }
    );
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.change(container.querySelector(".kb-item-checkbox")!);

    const detail = handler.mock.calls[0][0].detail;
    expect(detail.body).toBe("Parent note");
    expect(detail.subtasks[0].body).toBe("Subtask note");
  });

  test("clicking parent title/body enters edit mode but does not toggle checkbox", async () => {
    const { container, component } = renderItem(
      {
        body: "Parent note",
        hasCheckbox: true,
        checked: false,
      },
      { showCheckboxes: true }
    );
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-item-body-note")!);

    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
    expect((container.querySelector(".kb-item-checkbox") as HTMLInputElement).checked).toBe(false);
  });

  test("hides checkbox when setting disabled", () => {
    const { container } = renderItem(
      { hasCheckbox: true },
      { showCheckboxes: false }
    );
    expect(container.querySelector(".kb-item-checkbox")).toBeNull();
  });

  test("hides checkbox when item has no checkbox", () => {
    const { container } = renderItem(
      { hasCheckbox: false },
      { showCheckboxes: true }
    );
    expect(container.querySelector(".kb-item-checkbox")).toBeNull();
  });

  test("enters edit mode on title click", async () => {
    const { container } = renderItem();
    await fireEvent.click(container.querySelector(".kb-item-title")!);
    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
    expect(container.querySelector(".kb-editor-toolbar")).toBeTruthy();
  });

  test("clicking subtask title does not toggle subtask.checked", async () => {
    const { container, component } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-subtask-title")!);

    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
  });

  test("clicking subtask body does not toggle subtask.checked", async () => {
    const { container, component } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          body: "Subtask note",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-subtask-body")!);

    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
  });

  test("clicking subtask title enters edit mode", async () => {
    const { container } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    await fireEvent.click(container.querySelector(".kb-subtask-title")!);

    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
  });

  test("clicking subtask body enters edit mode", async () => {
    const { container } = renderItem({
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          body: "Subtask note",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    await fireEvent.click(container.querySelector(".kb-subtask-body")!);

    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
  });

  test("Shift+Enter still saves", async () => {
    const { container, component } = renderItem();
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: "Updated" } });
    await fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    await fireEvent.blur(textarea);

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.title).toBe("Updated");
    expect(container.querySelector(".kb-editor-toolbar")).toBeNull();
  });

  test("Enter still keeps newline behavior", async () => {
    const { container, component } = renderItem();
    const handler = vi.fn();
    component.$on("edit", handler);
    await fireEvent.click(container.querySelector(".kb-item-title")!);
    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;

    textarea.value = "Line 1\nLine 2";
    await fireEvent.input(textarea, { target: { value: "Line 1\nLine 2" } });
    await fireEvent.keyDown(textarea, { key: "Enter" });
    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
  });

  test("Ctrl+Shift+Enter inserts '- [ ] ' at cursor position", async () => {
    const { container, component } = renderItem({ title: "ParentTask" });
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    const insertAt = "Parent".length;
    textarea.setSelectionRange(insertAt, insertAt);
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      ctrlKey: true,
      shiftKey: true,
    });

    expect(textarea.value).toBe("Parent\n- [ ] Task");
    expect(textarea.selectionStart).toBe("Parent\n- [ ] ".length);
    expect(textarea.selectionEnd).toBe("Parent\n- [ ] ".length);
    expect(handler).not.toHaveBeenCalled();
  });

  test("Ctrl+Enter fallback still inserts '- [ ] ' if event reaches the handler", async () => {
    const { container } = renderItem({ title: "Parent" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "NumpadEnter",
      metaKey: true,
    });

    expect(textarea.value).toBe("Parent\n- [ ] ");
  });

  test("Ctrl/Cmd+B wraps selected text with '**'", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 5);
    await fireEvent.keyDown(textarea, { key: "b", ctrlKey: true });

    expect(textarea.value).toBe("**Hello** world");
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(7);
  });

  test("editing existing card toolbar B wraps selected text", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 5);

    const boldButton = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(boldButton);
    await fireEvent.click(boldButton);

    expect(textarea.value).toBe("**Hello** world");
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(7);
    expect(document.activeElement).toBe(textarea);
  });

  test("B toolbar wraps selected text in parent title at the correct selection position", async () => {
    const { container } = renderItem({ title: "Parent title" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, "Parent".length);
    await fireEvent.select(textarea);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value).toBe("**Parent** title");
    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(8);
  });

  test("editing existing card shows toolbar below textarea and menu outside edit layout", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const layout = container.querySelector(".kb-item-edit-layout");
    const textarea = container.querySelector(".kb-item-edit");
    const toolbar = container.querySelector(".kb-editor-toolbar");
    const menu = container.querySelector(".kb-item-menu-btn");

    expect(layout).toBeTruthy();
    expect(layout?.children[0]).toBe(textarea);
    expect(layout?.children[1]).toBe(toolbar);
    expect(layout?.contains(menu!)).toBe(false);
  });

  test("card menu keeps its own absolute-position class and does not live inside content flow", () => {
    const { container } = renderItem({
      title: "Hello world",
      body: "Body copy",
    });

    const menu = container.querySelector(".kb-item-menu-btn");
    const content = container.querySelector(".kb-item-main");
    expect(menu).toBeTruthy();
    expect(content?.contains(menu!)).toBe(false);
  });

  test("stripe renders as a real DOM element outside the card main content flow", () => {
    const { container } = renderItem({
      title: "Color card",
      body: "Has note",
      color: "happy",
      hasCheckbox: true,
    }, {
      showCheckboxes: true,
    });

    const stripe = container.querySelector(".kb-card-stripe");
    const main = container.querySelector(".kb-item-main");
    const leading = container.querySelector(".kb-item-leading");
    expect(stripe).toBeTruthy();
    expect(main?.contains(stripe!)).toBe(false);
    expect(leading?.contains(stripe!)).toBe(true);
  });

  test("prefix stripe lives inside the checkbox leading wrapper", () => {
    const { container } = renderItem(
      {
        title: "Color card",
        body: "Has note",
        color: "happy",
        hasCheckbox: true,
      },
      {
        showCheckboxes: true,
      }
    );

    const item = container.querySelector(".kb-item") as HTMLElement;
    const stripe = container.querySelector(".kb-card-stripe");
    const leading = container.querySelector(".kb-item-leading");
    const main = container.querySelector(".kb-item-main");

    expect(item.children[0]).toBe(leading);
    expect(item.children[1]).toBe(main);
    expect(leading?.contains(stripe!)).toBe(true);
  });

  test("prefix stripe still renders for title-only colored card", () => {
    const { container } = renderItem(
      {
        title: "Color card",
        color: "happy",
        hasCheckbox: true,
      },
      {
        showCheckboxes: true,
      }
    );

    const stripe = container.querySelector(".kb-card-stripe");
    const leading = container.querySelector(".kb-item-leading");
    expect(stripe).toBeTruthy();
    expect(leading).toBeTruthy();
    expect(leading?.contains(stripe!)).toBe(true);
  });

  test("card without color does not render stripe element", () => {
    const { container } = renderItem({
      title: "Plain card",
      hasCheckbox: true,
    }, {
      showCheckboxes: true,
    });

    expect(container.querySelector(".kb-card-stripe")).toBeNull();
  });

  test("soft color card does not render stripe element", () => {
    const { container } = renderItem(
      {
        title: "Soft color",
        color: "soft-color",
        hasCheckbox: true,
      },
      {
        showCheckboxes: true,
      }
    );

    expect(container.querySelector(".kb-card-stripe")).toBeNull();
  });

  test("soft color card renders stripe when the containing lane has a color", () => {
    const { container } = render(Item, {
      props: {
        item: makeItem({
          title: "Soft color",
          color: "soft-color",
          hasCheckbox: true,
        }),
        laneColor: "sad",
        settings: { ...defaultSettings, showCheckboxes: true },
        app: mockApp,
        viewComponent: null,
        filePath: mockFilePath,
      },
    });

    expect(container.querySelector(".kb-card-stripe")).toBeTruthy();
  });

  test("prefix stripe still renders when card has body content", () => {
    const { container } = renderItem(
      {
        title: "Title",
        body: "Has note",
        color: "happy",
        hasCheckbox: true,
      },
      {
        showCheckboxes: true,
      }
    );

    expect(container.querySelector(".kb-card-stripe")).toBeTruthy();
  });

  test("prefix stripe still renders when card has subtasks", () => {
    const { container } = renderItem(
      {
        title: "Title",
        color: "happy",
        hasCheckbox: true,
        subtasks: [
          {
            id: "s1",
            title: "Subtask A",
            checked: false,
            hasCheckbox: true,
          },
        ],
      },
      {
        showCheckboxes: true,
      }
    );

    expect(container.querySelector(".kb-card-stripe")).toBeTruthy();
  });

  test("prefix stripe can render without checkbox and stays outside main content flow", () => {
    const { container } = renderItem(
      {
        title: "Title only",
        color: "happy",
        hasCheckbox: false,
      },
      {
        showCheckboxes: false,
      }
    );

    const stripe = container.querySelector(".kb-card-stripe");
    const main = container.querySelector(".kb-item-main");
    const leading = container.querySelector(".kb-item-leading");
    expect(stripe).toBeTruthy();
    expect(leading?.contains(stripe!)).toBe(true);
    expect(main?.contains(stripe!)).toBe(false);
  });

  test("Ctrl/Cmd+I wraps selected text with '*'", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.setSelectionRange(6, 11);
    await fireEvent.keyDown(textarea, { key: "i", metaKey: true });

    expect(textarea.value).toBe("Hello *world*");
    expect(textarea.selectionStart).toBe(7);
    expect(textarea.selectionEnd).toBe(12);
  });

  test("editing existing card toolbar I wraps selected text", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(6, 11);

    const italicButton = container.querySelector(
      '.kb-format-btn[aria-label="Italic"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(italicButton);
    await fireEvent.click(italicButton);

    expect(textarea.value).toBe("Hello *world*");
    expect(textarea.selectionStart).toBe(7);
    expect(textarea.selectionEnd).toBe(12);
    expect(document.activeElement).toBe(textarea);
  });

  test("I toolbar wraps selected text in parent body at the correct selection position", async () => {
    const { container } = renderItem({
      title: "Parent title",
      body: "Parent body",
    });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    const start = textarea.value.indexOf("body");
    const end = start + "body".length;
    textarea.focus();
    textarea.setSelectionRange(start, end);
    await fireEvent.select(textarea);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Italic"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value).toBe("Parent title\nParent *body*");
    expect(textarea.value.startsWith("*Parent")).toBe(false);
  });

  test("toolbar B wraps selected text in subtask title at the correct selection position", async () => {
    const { container } = renderItem({
      title: "Parent",
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    const start = textarea.value.indexOf("Subtask");
    const end = start + "Subtask".length;
    textarea.focus();
    textarea.setSelectionRange(start, end);
    await fireEvent.select(textarea);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value).toBe("Parent\n- [ ] **Subtask** A");
    expect(textarea.value.startsWith("**Parent")).toBe(false);
  });

  test("toolbar I wraps selected text in subtask body at the correct selection position", async () => {
    const { container } = renderItem({
      title: "Parent",
      subtasks: [
        {
          id: "s1",
          title: "Subtask A",
          body: "Subtask note",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
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

  test("toolbar mousedown does not blur textarea or lose selection", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(6, 11);
    await fireEvent.select(textarea);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(button);

    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe(6);
    expect(textarea.selectionEnd).toBe(11);
  });

  test("toolbar pointerdown prevents default and stops propagation", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;

    const event = new Event("pointerdown", {
      bubbles: true,
      cancelable: true,
    });
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");
    const preventDefaultResult = button.dispatchEvent(event);

    expect(preventDefaultResult).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  test("toolbar click prevents default and stops propagation", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;

    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");
    const preventDefaultResult = button.dispatchEvent(event);

    expect(preventDefaultResult).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  test("clicking toolbar does not trigger card startEdit again", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    const button = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;

    textarea.focus();
    textarea.setSelectionRange(0, 5);
    await fireEvent.select(textarea);
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(container.querySelectorAll(".kb-item-edit")).toHaveLength(1);
    expect(document.activeElement).toBe(textarea);
  });

  test("when textarea is not active, toolbar uses last valid selection", async () => {
    const { container } = renderItem({ title: "Parent note" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(7, 11);
    await fireEvent.select(textarea);

    const button = container.querySelector(
      '.kb-format-btn[aria-label="Italic"]'
    )! as HTMLButtonElement;
    button.focus();
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value).toBe("Parent *note*");
  });

  test("repeated toolbar click must not accumulate markers at the beginning of parent title because of lost selection", async () => {
    const { container } = renderItem({
      title: "什么任务，不错",
      subtasks: [
        {
          id: "s1",
          title: "子任务",
          checked: false,
          hasCheckbox: true,
        },
      ],
    });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    const start = textarea.value.indexOf("子任务");
    const end = start + "子任务".length;
    const button = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;

    textarea.focus();
    textarea.setSelectionRange(start, end);
    await fireEvent.select(textarea);
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    const firstValue = textarea.value;
    expect(firstValue).toContain("**子任务**");
    expect(firstValue.startsWith("******什么任务，不错")).toBe(false);

    const secondStart = firstValue.indexOf("子任务");
    const secondEnd = secondStart + "子任务".length;
    textarea.focus();
    textarea.setSelectionRange(secondStart, secondEnd);
    await fireEvent.select(textarea);
    await fireEvent.mouseDown(button);
    await fireEvent.click(button);

    expect(textarea.value.startsWith("******什么任务，不错")).toBe(false);
  });

  test("toolbar B without selection inserts '****' and keeps cursor in the middle", async () => {
    const { container } = renderItem({ title: "Hello" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(5, 5);

    const boldButton = container.querySelector(
      '.kb-format-btn[aria-label="Bold"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(boldButton);
    await fireEvent.click(boldButton);

    expect(textarea.value).toBe("Hello****");
    expect(textarea.selectionStart).toBe(7);
    expect(textarea.selectionEnd).toBe(7);
    expect(document.activeElement).toBe(textarea);
  });

  test("toolbar I without selection inserts '**' and keeps cursor in the middle", async () => {
    const { container } = renderItem({ title: "Hello" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(5, 5);

    const italicButton = container.querySelector(
      '.kb-format-btn[aria-label="Italic"]'
    )! as HTMLButtonElement;
    await fireEvent.mouseDown(italicButton);
    await fireEvent.click(italicButton);

    expect(textarea.value).toBe("Hello**");
    expect(textarea.selectionStart).toBe(6);
    expect(textarea.selectionEnd).toBe(6);
    expect(document.activeElement).toBe(textarea);
  });

  test("Ctrl+Shift+I does not act as italic shortcut", async () => {
    const { container } = renderItem({ title: "Hello world" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.setSelectionRange(6, 11);
    await fireEvent.keyDown(textarea, { key: "I", ctrlKey: true, shiftKey: true });

    expect(textarea.value).toBe("Hello world");
  });

  test("event.isComposing true ignores shortcut handling", async () => {
    const { container } = renderItem({ title: "Parent" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      ctrlKey: true,
      isComposing: true,
    });

    expect(textarea.value).toBe("Parent");
  });

  test("Shift+Enter without Ctrl/Meta still saves", async () => {
    const { container, component } = renderItem();
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: "Saved with shift" } });
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });
    await fireEvent.blur(textarea);

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.title).toBe("Saved with shift");
  });

  test("Ctrl+Shift+Enter must not trigger save", async () => {
    const { container, component } = renderItem({ title: "Parent" });
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      ctrlKey: true,
      shiftKey: true,
    });

    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
    expect(textarea.value).toBe("Parent\n- [ ] ");
  });

  test("Enter after subtask line auto-inserts two-space subtask body indentation in editor", async () => {
    const { container } = renderItem({ title: "Parent" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    await fireEvent.input(textarea, {
      target: { value: "Parent\n- [ ] Subtask A" },
    });
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });

    expect(textarea.value).toBe("Parent\n- [ ] Subtask A\n  ");
  });

  test("Enter on subtask body line keeps two-space indentation in editor", async () => {
    const { container } = renderItem({ title: "Parent" });

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    await fireEvent.input(textarea, {
      target: { value: "Parent\n- [ ] Subtask A\n  Note line 1" },
    });
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });

    expect(textarea.value).toBe("Parent\n- [ ] Subtask A\n  Note line 1\n  ");
  });

  test("Esc still cancels", async () => {
    const { container, component } = renderItem();
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    const textarea = container.querySelector(".kb-item-edit")!;
    await fireEvent.keyDown(textarea, { key: "Escape" });

    expect(container.querySelector(".kb-item-edit")).toBeNull();
    expect(handler).not.toHaveBeenCalled();
    expect(container.querySelector(".kb-editor-toolbar")).toBeNull();
  });

  test("Enter keeps default newline behavior", async () => {
    const { container, component } = renderItem();
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;

    await fireEvent.input(textarea, { target: { value: "Line 1\nLine 2" } });
    await fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });
    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
  });

  test("renders menu button", () => {
    const { container } = renderItem();
    expect(container.querySelector(".kb-menu-btn")).toBeTruthy();
  });

  test("dispatches showmenu event on menu button click", async () => {
    const { container, component } = renderItem();
    const handler = vi.fn();
    component.$on("showmenu", handler);

    await fireEvent.click(container.querySelector(".kb-menu-btn")!);
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.itemId).toBe("item-1");
  });

  // ── Ctrl+Click link navigation ────────────────────────

  test("Ctrl+Click on card with wikilink opens link in new tab", async () => {
    const openLinkText = vi.fn();
    const { container } = render(Item, {
      props: {
        item: makeItem({ title: "Check [[My Note]]" }),
        settings: defaultSettings,
        app: { workspace: { openLinkText } },
        viewComponent: null,
        filePath: mockFilePath,
      },
    });

    // Wait for async renderMarkdown
    await new Promise((r) => setTimeout(r, 10));

    const link = container.querySelector("a.internal-link")!;
    expect(link).toBeTruthy();

    // Ctrl+Click on the link itself
    await fireEvent.click(link, { ctrlKey: true });

    expect(openLinkText).toHaveBeenCalledWith("My Note", mockFilePath, "tab");
  });

  test("plain click on link opens in same pane", async () => {
    const openLinkText = vi.fn();
    const { container } = render(Item, {
      props: {
        item: makeItem({ title: "Check [[My Note]]" }),
        settings: defaultSettings,
        app: { workspace: { openLinkText } },
        viewComponent: null,
        filePath: mockFilePath,
      },
    });

    await new Promise((r) => setTimeout(r, 10));

    const link = container.querySelector("a.internal-link")!;
    await fireEvent.click(link);

    expect(openLinkText).toHaveBeenCalledWith("My Note", mockFilePath, false);
  });

  test("Ctrl+Click on card without links enters edit mode", async () => {
    const { container } = renderItem({ title: "No links here" });
    await new Promise((r) => setTimeout(r, 10));

    await fireEvent.click(container.querySelector(".kb-item-title")!, { ctrlKey: true });
    expect(container.querySelector(".kb-item-edit")).toBeTruthy();
  });

  test("does not dispatch edit when title unchanged", async () => {
    const { container, component } = renderItem();
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.click(container.querySelector(".kb-item-title")!);
    const textarea = container.querySelector(".kb-item-edit")!;
    await fireEvent.blur(textarea);

    expect(handler).not.toHaveBeenCalled();
  });

  // ── Focus behavior on edit ────────────────────────────

  test("selects all text on desktop when entering edit mode", async () => {
    const { container } = renderItem({ title: "Hello world" });
    await fireEvent.click(container.querySelector(".kb-item-title")!);
    // Wait for setTimeout in startEdit
    await new Promise((r) => setTimeout(r, 10));

    const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe("Hello world".length);
  });

  // ── Checkbox toggle ───────────────────────────────────

  test("toggling checkbox dispatches edit with new checked state", async () => {
    const { container, component } = renderItem(
      { hasCheckbox: true, checked: false },
      { showCheckboxes: true }
    );
    const handler = vi.fn();
    component.$on("edit", handler);

    const checkbox = container.querySelector(".kb-item-checkbox")!;
    await fireEvent.change(checkbox);

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail).toMatchObject({
      itemId: "item-1",
      title: "Test card",
      checked: true,
    });
  });

  test("unchecking a checked item dispatches edit with checked=false", async () => {
    const { container, component } = renderItem(
      { hasCheckbox: true, checked: true },
      { showCheckboxes: true }
    );
    const handler = vi.fn();
    component.$on("edit", handler);

    await fireEvent.change(container.querySelector(".kb-item-checkbox")!);

    expect(handler.mock.calls[0][0].detail.checked).toBe(false);
  });

  test("places cursor at end on mobile when entering edit mode", async () => {
    Platform.isMobile = true;
    try {
      const { container } = renderItem({ title: "Hello world" });
      await fireEvent.click(container.querySelector(".kb-item-title")!);
      await new Promise((r) => setTimeout(r, 10));

      const textarea = container.querySelector(".kb-item-edit")! as HTMLTextAreaElement;
      expect(textarea.selectionStart).toBe("Hello world".length);
      expect(textarea.selectionEnd).toBe("Hello world".length);
    } finally {
      Platform.isMobile = false;
    }
  });
});
