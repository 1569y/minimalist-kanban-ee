import { describe, test, expect } from "vitest";
import {
  formatItemForEditing,
  parseBoard,
  parseItemFromEditor,
  serializeBoard,
} from "../src/parser";
import type { Board } from "../src/types";

describe("parseBoard", () => {
  test("parses empty board (frontmatter only)", () => {
    const board = parseBoard("---\nkanban-plugin: board\n---\n");
    expect(board.lanes).toHaveLength(0);
    expect(board.archive).toHaveLength(0);
  });

  test("parses lanes from ## headings", () => {
    const board = parseBoard(
      "---\nkanban-plugin: board\n---\n\n## To Do\n\n## In Progress\n\n## Done\n"
    );
    expect(board.lanes.map((l) => l.title)).toEqual([
      "To Do",
      "In Progress",
      "Done",
    ]);
  });

  test("parses item title/body", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## Col",
      "- [ ] Parent",
      "  Parent note line 1",
      "  Parent note line 2",
    ].join("\n");
    const item = parseBoard(md).lanes[0].items[0];
    expect(item.title).toBe("Parent");
    expect(item.body).toBe("Parent note line 1\nParent note line 2");
  });

  test("parses lane color comment", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## To Do",
      "<!-- mk-list-color: sad -->",
      "- [ ] Task",
    ].join("\n");
    expect(parseBoard(md).lanes[0].color).toBe("sad");
  });

  test("parses card color comment", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## To Do",
      "- [ ] Parent",
      "  <!-- mk-card-color: happy -->",
      "  Parent note",
    ].join("\n");
    expect(parseBoard(md).lanes[0].items[0].color).toBe("happy");
  });

  test("parses legacy soft-yellow card color comment as soft-color", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## To Do",
      "- [ ] Parent",
      "  <!-- mk-card-color: soft-yellow -->",
      "  Parent note",
    ].join("\n");
    expect(parseBoard(md).lanes[0].items[0].color).toBe("soft-color");
  });

  test("color comment does not enter item.body", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## To Do",
      "- [ ] Parent",
      "  <!-- mk-card-color: happy -->",
      "  Parent note",
    ].join("\n");
    expect(parseBoard(md).lanes[0].items[0].body).toBe("Parent note");
  });

  test("color comment does not enter subtask.body", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## To Do",
      "- [ ] Parent",
      "  - [ ] Child",
      "  <!-- mk-card-color: angry -->",
      "    Child note",
    ].join("\n");
    const item = parseBoard(md).lanes[0].items[0];
    expect(item.color).toBe("angry");
    expect(item.subtasks?.[0].body).toBe("Child note");
  });

  test("invalid color key is ignored", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## To Do",
      "<!-- mk-list-color: neon -->",
      "- [ ] Parent",
      "  <!-- mk-card-color: lava -->",
    ].join("\n");
    const board = parseBoard(md);
    expect(board.lanes[0].color).toBeUndefined();
    expect(board.lanes[0].items[0].color).toBeUndefined();
  });

  test("parses subtask title/body", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## Col",
      "- [ ] Parent",
      "  - [ ] Subtask A",
      "    Subtask note line 1",
      "    Subtask note line 2",
    ].join("\n");
    const subtask = parseBoard(md).lanes[0].items[0].subtasks?.[0];
    expect(subtask).toMatchObject({
      title: "Subtask A",
      body: "Subtask note line 1\nSubtask note line 2",
      checked: false,
      hasCheckbox: true,
    });
  });

  test("subtask body does not drift into item.body", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## Col",
      "- [ ] Parent",
      "  Parent note",
      "  - [ ] Subtask A",
      "    Subtask note",
    ].join("\n");
    const item = parseBoard(md).lanes[0].items[0];
    expect(item.body).toBe("Parent note");
    expect(item.subtasks?.[0].body).toBe("Subtask note");
  });

  test("parses one-tab nested subtasks into item.subtasks", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## To Do",
      "- [ ] Parent",
      "\t- [ ] Subtask A",
      "\t\tSubtask note",
      "\t- [x] Subtask B",
    ].join("\n");
    const item = parseBoard(md).lanes[0].items[0];
    expect(item.subtasks).toMatchObject([
      { title: "Subtask A", body: "Subtask note", checked: false, hasCheckbox: true },
      { title: "Subtask B", checked: true, hasCheckbox: true },
    ]);
  });

  test("parses archive section", () => {
    const md = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## Active",
      "- Task",
      "",
      "---",
      "",
      "## Archive",
      "- Old task",
      "- [x] Ancient",
    ].join("\n");
    const board = parseBoard(md);
    expect(board.lanes).toHaveLength(1);
    expect(board.archive).toHaveLength(2);
  });

  test("handles empty lanes", () => {
    const board = parseBoard(
      "---\nkanban-plugin: board\n---\n\n## Empty\n\n## Also Empty\n"
    );
    expect(board.lanes[0].items).toHaveLength(0);
    expect(board.lanes[1].items).toHaveLength(0);
  });
});

describe("formatItemForEditing / parseItemFromEditor", () => {
  test("formatItemForEditing outputs body ownership clearly", () => {
    const text = formatItemForEditing({
      id: "i1",
      title: "Parent",
      body: "Parent note",
      checked: false,
      hasCheckbox: true,
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
    expect(text).toBe("Parent\nParent note\n- [ ] Subtask A\n  Subtask note");
  });

  test("parseItemFromEditor splits title/body/subtasks/subtask.body", () => {
    const parsed = parseItemFromEditor(
      "Parent\nParent note\n- [ ] Subtask A\n  Subtask note\n- [x] Subtask B"
    );
    expect(parsed).toMatchObject({
      title: "Parent",
      body: "Parent note",
      subtasks: [
        { title: "Subtask A", body: "Subtask note", checked: false, hasCheckbox: true },
        { title: "Subtask B", checked: true, hasCheckbox: true },
      ],
    });
  });

  test("parseItemFromEditor treats unindented second line as item.body", () => {
    const parsed = parseItemFromEditor(
      "Another task\nParent note\n- [ ] Child"
    );
    expect(parsed.title).toBe("Another task");
    expect(parsed.body).toBe("Parent note");
    expect(parsed.subtasks).toMatchObject([
      { title: "Child", checked: false, hasCheckbox: true },
    ]);
  });

  test("parseItemFromEditor keeps plain text after subtask inside subtask.body", () => {
    const parsed = parseItemFromEditor(
      "Another task\nParent note\n- [ ] Child\n  Child note\n- [ ] Two\n- [ ] Three"
    );
    expect(parsed.body).toBe("Parent note");
    expect(parsed.subtasks).toMatchObject([
      { title: "Child", body: "Child note", checked: false, hasCheckbox: true },
      { title: "Two", checked: false, hasCheckbox: true },
      { title: "Three", checked: false, hasCheckbox: true },
    ]);
  });

  test("new card parse and format round-trip keeps editor text stable", () => {
    const draft = [
      "Parent",
      "Parent note line 1",
      "Parent note line 2",
      "- [ ] Subtask A",
      "  Subtask note line 1",
      "  Subtask note line 2",
    ].join("\n");
    const parsed = parseItemFromEditor(draft);
    const reformatted = formatItemForEditing({
      id: "i1",
      title: parsed.title,
      body: parsed.body,
      checked: false,
      hasCheckbox: true,
      subtasks: parsed.subtasks,
    });
    expect(reformatted).toBe(draft);
  });
});

describe("serializeBoard", () => {
  function makeBoard(overrides?: Partial<Board>): Board {
    return {
      lanes: [
        {
          id: "l1",
          title: "To Do",
          items: [
            { id: "i1", title: "Task A", checked: false, hasCheckbox: false },
            { id: "i2", title: "Task B", checked: false, hasCheckbox: false },
          ],
        },
      ],
      archive: [],
      ...overrides,
    };
  }

  test("serializes item body with two-space indentation", () => {
    const board = makeBoard({
      lanes: [
        {
          id: "l1",
          title: "Col",
          items: [
            {
              id: "i1",
              title: "Parent",
              body: "Parent note",
              checked: false,
              hasCheckbox: true,
            },
          ],
        },
      ],
    });
    const md = serializeBoard(board);
    expect(md).toContain("- [ ] Parent\n  Parent note");
  });

  test("serializes subtask body with four-space indentation", () => {
    const board = makeBoard({
      lanes: [
        {
          id: "l1",
          title: "Col",
          items: [
            {
              id: "i1",
              title: "Parent",
              checked: false,
              hasCheckbox: true,
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
          ],
        },
      ],
    });
    const md = serializeBoard(board);
    expect(md).toContain("- [ ] Parent\n  - [ ] Subtask A\n    Subtask note");
  });

  test("serializes archive section when present", () => {
    const board = makeBoard({
      archive: [
        { id: "a1", title: "Archived", checked: false, hasCheckbox: false },
      ],
    });
    const md = serializeBoard(board);
    expect(md).toContain("---\n\n## Archive\n- [ ] Archived");
  });

  test("serializes lane color comment", () => {
    const board = makeBoard({
      lanes: [
        {
          id: "l1",
          title: "Col",
          color: "sad",
          items: [],
        },
      ],
    });
    expect(serializeBoard(board)).toContain("## Col\n<!-- mk-list-color: sad -->");
  });

  test("serializes card color comment", () => {
    const board = makeBoard({
      lanes: [
        {
          id: "l1",
          title: "Col",
          items: [
            {
              id: "i1",
              title: "Parent",
              color: "happy",
              checked: false,
              hasCheckbox: true,
            },
          ],
        },
      ],
    });
    expect(serializeBoard(board)).toContain(
      "- [ ] Parent\n  <!-- mk-card-color: happy -->"
    );
  });

  test("serializes soft-color card color comment with new key", () => {
    const board = makeBoard({
      lanes: [
        {
          id: "l1",
          title: "Col",
          items: [
            {
              id: "i1",
              title: "Parent",
              color: "soft-color",
              checked: false,
              hasCheckbox: true,
            },
          ],
        },
      ],
    });
    expect(serializeBoard(board)).toContain(
      "- [ ] Parent\n  <!-- mk-card-color: soft-color -->"
    );
  });

  test("serializes legacy soft-yellow item color using soft-color key", () => {
    const board = makeBoard({
      lanes: [
        {
          id: "l1",
          title: "Col",
          items: [
            {
              id: "i1",
              title: "Parent",
              color: "soft-yellow",
              checked: false,
              hasCheckbox: true,
            },
          ],
        },
      ],
    });
    expect(serializeBoard(board)).toContain(
      "- [ ] Parent\n  <!-- mk-card-color: soft-color -->"
    );
  });

  test("clear color removes color comment", () => {
    const board = makeBoard({
      lanes: [
        {
          id: "l1",
          title: "Col",
          items: [
            {
              id: "i1",
              title: "Parent",
              checked: false,
              hasCheckbox: true,
            },
          ],
        },
      ],
    });
    const md = serializeBoard(board);
    expect(md).not.toContain("mk-list-color");
    expect(md).not.toContain("mk-card-color");
  });
});

describe("round-trip (parse -> serialize -> parse)", () => {
  test("parse serialize parse round-trip keeps body ownership stable", () => {
    const original = [
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## To Do",
      "- [ ] Parent",
      "  Parent note",
      "  - [ ] Subtask A",
      "    Subtask note",
      "  - [x] Subtask B",
      "    Second note",
      "",
    ].join("\n");
    const reparsed = parseBoard(serializeBoard(parseBoard(original)));
    const item = reparsed.lanes[0].items[0];
    expect(item.title).toBe("Parent");
    expect(item.body).toBe("Parent note");
    expect(item.subtasks).toMatchObject([
      { title: "Subtask A", body: "Subtask note", checked: false, hasCheckbox: true },
      { title: "Subtask B", body: "Second note", checked: true, hasCheckbox: true },
    ]);
  });

  test("saving a card with inserted '- [ ] child' serializes as a nested subtask", () => {
    const parsed = parseItemFromEditor("Parent\nParent note\n- [ ] Child task\n  Child note");
    const board: Board = {
      lanes: [
        {
          id: "l1",
          title: "To Do",
          items: [
            {
              id: "i1",
              title: parsed.title,
              body: parsed.body,
              checked: false,
              hasCheckbox: true,
              subtasks: parsed.subtasks,
            },
          ],
        },
      ],
      archive: [],
    };
    const md = serializeBoard(board);
    expect(md).toContain("- [ ] Parent\n  Parent note\n  - [ ] Child task\n    Child note");
  });

  test("new card parsed from editor serializes parent body, subtask, and subtask body on first save", () => {
    const parsed = parseItemFromEditor(
      "Parent\nParent note line 1\nParent note line 2\n- [ ] Subtask A\n  Subtask note line 1\n  Subtask note line 2"
    );
    const board: Board = {
      lanes: [
        {
          id: "l1",
          title: "To Do",
          items: [
            {
              id: "i1",
              title: parsed.title,
              body: parsed.body,
              checked: false,
              hasCheckbox: true,
              subtasks: parsed.subtasks,
            },
          ],
        },
      ],
      archive: [],
    };
    const md = serializeBoard(board);
    expect(md).toContain(
      "- [ ] Parent\n  Parent note line 1\n  Parent note line 2\n  - [ ] Subtask A\n    Subtask note line 1\n    Subtask note line 2"
    );
  });

  test("serialize after subtask checked update keeps item.body and subtask.body", () => {
    const board = parseBoard([
      "---",
      "kanban-plugin: board",
      "---",
      "",
      "## To Do",
      "- [ ] Parent",
      "  Parent note",
      "  - [ ] Child",
      "    Child note",
      "",
    ].join("\n"));
    const item = board.lanes[0].items[0];
    item.subtasks![0].checked = true;

    const md = serializeBoard(board);
    expect(md).toContain("- [ ] Parent\n  Parent note\n  - [x] Child\n    Child note");
  });
});
