# Minimalist Kanban EE

[中文说明](README.zh-CN.md) | English

Minimalist Kanban EE is a lightweight Kanban board plugin for [Obsidian](https://obsidian.md). Boards are stored as plain Markdown files — no proprietary formats, no JSON blobs. Your data stays readable and editable as standard Markdown.

This repository is a modified fork of the original Minimalist Kanban project by 3rdLaw. It keeps the original Markdown-first, lightweight design, while adding structured subtasks, task notes, Markdown formatting tools, card/list colors, and several UI refinements.

This is not the official upstream version.

## Table of Contents

- [Overview](#overview)
- [What it looks like](#what-it-looks-like)
- [Creating a board](#creating-a-board)
- [Features](#features)
  - [Core features](#core-features)
  - [EE additions](#ee-additions)
- [Markdown structure for subtasks and notes](#markdown-structure-for-subtasks-and-notes)
- [Migrating from the Kanban plugin](#migrating-from-the-kanban-plugin)
- [Settings](#settings)
- [Installation with BRAT](#installation-with-brat)
- [Building from source](#building-from-source)
- [Attribution](#attribution)
- [License](#license)

## Overview

Minimalist Kanban EE aims to remain a simple, small alternative to heavier Kanban plugins. It focuses on the core workflow: lists, cards, drag-and-drop, Markdown storage, and lightweight task organization.

The main difference from the original version is that this fork adds a more expressive card structure while still keeping the file format readable as Markdown.

## What it looks like

A board file is still just Markdown with `##` headings as lists and `- [ ]` items as cards:

```markdown
---
kanban-plugin: board
---

## To Do
- [ ] Buy groceries
  Remember to check the fridge first
  - [ ] Milk
    Buy lactose-free if available
  - [ ] Eggs

## In Progress
- [ ] Build the thing

## Done
- [x] Set up project
````

The plugin renders this as a drag-and-drop board. Every change writes back to the same Markdown file.

## Creating a board

Open the command palette (`Ctrl/Cmd + P`) and run **Create new Kanban board**. This creates a new Markdown file with the required frontmatter and starter lists.

You can also create a board manually — any `.md` file with this frontmatter will be opened as a board:

```yaml
---
kanban-plugin: board
---
```

## Features

### Core features

* **Plain Markdown storage** — boards remain readable and editable as standard Markdown files.
* **Drag-and-drop** — move cards between lists and reorder lists by dragging.
* **Inline editing** — click a card to edit its content.
* **Multi-line cards** — use `Enter` to add line breaks while editing.
* **Wikilinks and Markdown links** — links render as clickable links in cards.
* **Ctrl/Cmd + Click** — open a link in a card in a new tab.
* **Toggle view** — switch between the Kanban board and the raw Markdown editor.
* **Card context menu** — duplicate, move, archive, delete, or change card color.
* **Create notes from cards** — turn a card into a linked note.
* **Archive** — move cards out of the board without deleting them.
* **Checkbox syntax** — cards are stored with `- [ ]` / `- [x]`, compatible with Obsidian Tasks and Dataview.
* **Mobile support** — touch-friendly drag-and-drop and visible menu buttons.

### EE additions

* **Structured subtasks**

  * Add one level of subtasks inside a card.
  * Subtasks are parsed as structured data instead of being merged into the parent card title.
  * Subtask checked states are saved back to Markdown.

* **Parent task notes and subtask notes**

  * Parent cards can have their own notes.
  * Each subtask can also have its own note.
  * Notes are preserved when editing, checking subtasks, and saving the board.

* **Markdown formatting support**

  * Parent task titles, parent task notes, subtask titles, and subtask notes support Markdown rendering.
  * Bold and italic formatting are supported.
  * A lightweight `B` / `I` toolbar is available in edit mode for quick Markdown insertion.

* **Consistent editing shortcuts**

  * `Enter`: new line
  * `Shift + Enter`: save / create card
  * `Ctrl/Cmd + Shift + Enter`: insert a subtask template
  * `Esc`: cancel editing

* **Card and list colors**

  * Lists can use soft Morandi-style background colors.
  * Cards can use independent colors or a soft color mode based on the current list color.
  * Checkpoint-prefix stripe markers use higher-contrast accent colors for better visibility.

* **Tag display refinement**

  * `#tags` can be visually separated from the main body and displayed near the bottom of the card.
  * This keeps the card body cleaner and makes categories easier to scan.

* **UI refinements**

  * Improved alignment between card text, subtasks, checkboxes, and notes.
  * Refined card menu, Add card, Add list, and color marker styling.
  * Keeps the plugin lightweight without adding recursive task trees or extra dependencies.

* **Runtime cleanup and optimization**

  * Removed obsolete settings and debug output.
  * Removed old stripe-style branches.
  * Optimized Markdown / Kanban toggle button injection to reduce unnecessary repeated scans.

## Markdown structure for subtasks and notes

Minimalist Kanban EE supports a lightweight two-level structure:

```markdown
- [ ] Parent task title
  Parent task note
  - [ ] Subtask A
    Subtask A note
  - [x] Subtask B
    Subtask B note
```

Design rule:

* Top-level list item = card
* Indented normal text under a card = parent task note
* Indented list item under a card = subtask
* Further indented normal text under a subtask = subtask note

This fork intentionally avoids infinite nested task trees. For deeper task structures, split work into separate cards.

## Migrating from the Kanban plugin

Minimalist Kanban EE reads the same `kanban-plugin: board` frontmatter and Markdown format as the [Kanban](https://github.com/mgmeyers/obsidian-kanban) plugin.

To migrate:

1. Disable the Kanban plugin.
2. Enable Minimalist Kanban EE.
3. Open your existing board files.

A few things to note:

* Old plugin metadata blocks (`%% kanban:settings %%`) are preserved in the file but ignored.
* Date/time card metadata and lane-level settings are not supported and may be dropped on save.
* Cards are stored with checkbox syntax (`- [ ]` / `- [x]`) for compatibility with Obsidian Tasks and Dataview.
* This fork adds one-level subtasks and notes, but does not implement full recursive task trees.

## Settings

| Setting           |                  Default | Description                                                         |
| ----------------- | -----------------------: | ------------------------------------------------------------------- |
| Show checkboxes   |                      Off | Display checkboxes on cards in the board UI                         |
| Prepend new cards |                      Off | Add new cards to the top of the list instead of the bottom          |
| Tag display       | Depends on configuration | Optionally separate `#tags` from the main card body                 |
| Visual options    | Depends on configuration | Configure lightweight color and display preferences where available |

## Installation with BRAT

This fork can be installed through BRAT as a beta plugin.

1. Install and enable BRAT in Obsidian.
2. Open BRAT settings.
3. Choose **Add Beta plugin**.
4. Enter this repository URL:

```text
https://github.com/1569y/minimalist-kanban-ee
```

For release-based installation, make sure the GitHub release contains:

```text
main.js
manifest.json
styles.css
```

The release tag should match the `version` field in `manifest.json`.

## Building from source

```bash
npm install
npm run build     # Production build → main.js
npm run dev       # Watch mode with source maps
npm test          # Run unit tests
npm run test:e2e  # Run e2e tests, if configured
```

## Attribution

This project is a modified fork of the original Minimalist Kanban project by 3rdLaw.

Original project:

* Minimalist Kanban by 3rdLaw

Local modifications include:

* Structured subtasks
* Parent and subtask notes
* Markdown formatting toolbar
* Card/list color support
* Soft color mode
* High-contrast checkpoint-prefix markers
* UI alignment refinements
* Runtime cleanup and optimization

This fork is not the official upstream version.

## License

[MIT](LICENSE)

The original project is licensed under the MIT License. This fork keeps the original license and copyright notice.
