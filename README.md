对，你记得的是 **README 前置目录 / Table of Contents**。GitHub README 里可以手写目录链接，例如 `[Features](#features)`；也可以用相对链接连接另一个 Markdown 文件，例如 `[中文](README.zh-CN.md)`。GitHub 官方也建议仓库内文档尽量用 relative links，因为克隆到本地后也更稳定。([GitHub Docs][1])

我建议你这样放：

```text
README.md              # 英文主 README
README.zh-CN.md        # 中文 README
LICENSE                # 保留原 MIT License
```

`README.md` 顶部放：

```markdown
[中文说明](README.zh-CN.md) | English
```

`README.zh-CN.md` 顶部放：

```markdown
中文 | [English](README.md)
```

---

## README.md 英文版

````markdown
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

````

---

## README.zh-CN.md 中文版

```markdown
# Minimalist Kanban EE

中文 | [English](README.md)

Minimalist Kanban EE 是一个用于 [Obsidian](https://obsidian.md) 的轻量看板插件。看板数据仍然保存为普通 Markdown 文件，不使用专有格式，也不使用 JSON 数据块，因此内容可以直接阅读、编辑和迁移。

本仓库是基于原版 Minimalist Kanban 的修改版 fork。它保留原项目“轻量、Markdown 优先”的设计，同时增加了结构化子任务、父任务备注、子任务备注、Markdown 格式工具栏、卡片/列表颜色以及若干界面细节优化。

本仓库不是原项目的官方版本。

## 目录

- [项目概览](#项目概览)
- [Markdown 看板格式](#markdown-看板格式)
- [创建看板](#创建看板)
- [功能介绍](#功能介绍)
  - [继承自原版的核心功能](#继承自原版的核心功能)
  - [本 fork 新增功能](#本-fork-新增功能)
- [子任务和备注的 Markdown 结构](#子任务和备注的-markdown-结构)
- [从 Kanban 插件迁移](#从-kanban-插件迁移)
- [设置项](#设置项)
- [通过 BRAT 安装](#通过-brat-安装)
- [从源码构建](#从源码构建)
- [归属说明](#归属说明)
- [许可证](#许可证)

## 项目概览

Minimalist Kanban EE 的目标是保持一个简单、小型、Markdown 优先的 Kanban 插件。它关注核心工作流：列表、卡片、拖拽、Markdown 存储和轻量任务组织。

与原版相比，本 fork 增强了 card 的表达能力，但仍然保持 Markdown 文件可读、可编辑、可迁移。

## Markdown 看板格式

一个 board 文件仍然只是普通 Markdown：使用 `##` 标题表示列表，使用 `- [ ]` 表示 card。

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

插件会将这个文件渲染为可拖拽的 Kanban board。所有修改都会写回同一个 Markdown 文件。

## 创建看板

打开命令面板（`Ctrl/Cmd + P`），运行 **Create new Kanban board**。插件会创建一个带有必要 frontmatter 和 starter lists 的 Markdown 文件。

也可以手动创建 board。任何带有以下 frontmatter 的 `.md` 文件都会被识别为 Kanban board：

```yaml
---
kanban-plugin: board
---
```

## 功能介绍

### 继承自原版的核心功能

* **普通 Markdown 存储**：看板仍然是标准 Markdown 文件。
* **拖拽排序**：支持在列表之间拖拽 card，也支持拖拽列表排序。
* **行内编辑**：点击 card 即可编辑内容。
* **多行 card**：编辑时使用 `Enter` 换行。
* **链接渲染**：支持 Wikilinks 和 Markdown links。
* **Ctrl/Cmd + Click**：在新标签页中打开 card 内链接。
* **切换视图**：可在 Kanban board 和原始 Markdown 编辑器之间切换。
* **Card 右键菜单**：支持复制、移动、归档、删除、修改颜色等操作。
* **从 card 创建笔记**：可将 card 转换为链接笔记。
* **Archive 归档**：将 card 移出当前看板但不直接删除。
* **Checkbox 语法**：使用 `- [ ]` / `- [x]` 存储，兼容 Obsidian Tasks 和 Dataview。
* **移动端支持**：保留触控友好的拖拽和菜单操作。

### 本 fork 新增功能

* **结构化子任务**

  * 支持在一张 card 内添加一层子任务。
  * 子任务会作为独立结构解析，而不是混入父任务标题。
  * 子任务勾选状态会正确保存回 Markdown。

* **父任务备注与子任务备注**

  * 父任务可以拥有独立备注。
  * 每个子任务也可以拥有自己的备注。
  * 勾选、编辑和保存时不会丢失备注内容。

* **Markdown 格式支持**

  * 父任务标题、父任务备注、子任务标题、子任务备注均支持 Markdown 渲染。
  * 支持粗体和斜体。
  * 编辑态提供轻量 `B` / `I` 工具栏，便于快速插入 Markdown 标记。

* **统一的编辑快捷键**

  * `Enter`：换行
  * `Shift + Enter`：保存 / 创建 card
  * `Ctrl/Cmd + Shift + Enter`：插入子任务模板
  * `Esc`：取消编辑

* **颜色与视觉标记**

  * 支持 list color 和 card color。
  * 支持 Soft color：card 可以使用当前 list color 的低透明度版本作为柔和背景。
  * checkpoint-prefix 小色条使用更高对比度的提示色，使任务标记更清楚。

* **标签显示优化**

  * 支持将 `#tag` 从正文中分离并显示在 card 底部。
  * 让正文更干净，也方便快速浏览任务分类。

* **界面细节优化**

  * 优化 card、subtask、checkbox、备注文本之间的对齐关系。
  * 调整 card menu、Add card、Add list 和颜色标记样式。
  * 保持轻量，不引入无限层级任务树或额外依赖。

* **运行时轻量化**

  * 清理废弃设置项和 debug 输出。
  * 移除旧的 stripe style 分支。
  * 优化 Markdown / Kanban 切换按钮注入逻辑，减少不必要的重复扫描。

## 子任务和备注的 Markdown 结构

```markdown
- [ ] 父任务标题
  父任务备注
  - [ ] 子任务 A
    子任务 A 备注
  - [x] 子任务 B
    子任务 B 备注
```

设计规则：

* 顶层 list item = card
* card 下方缩进普通文本 = 父任务备注
* card 下方缩进 list item = 子任务
* 子任务下方进一步缩进普通文本 = 子任务备注

本 fork 只支持“父 card + 一层子任务 + 各自备注”，不实现无限嵌套任务树。更深层级的任务建议拆分为新的 card。

## 从 Kanban 插件迁移

Minimalist Kanban EE 读取与 [Kanban](https://github.com/mgmeyers/obsidian-kanban) 插件相同的 `kanban-plugin: board` frontmatter 和 Markdown 格式。

迁移步骤：

1. 禁用原 Kanban 插件。
2. 启用 Minimalist Kanban EE。
3. 打开已有 board 文件。

注意事项：

* 旧插件 metadata blocks（`%% kanban:settings %%`）会保留在文件中，但会被忽略。
* 日期、时间等 card metadata 和 lane-level settings 不受支持，保存时可能会被移除。
* Card 使用 `- [ ]` / `- [x]` 语法保存，以兼容 Obsidian Tasks 和 Dataview。
* 本 fork 支持一层子任务和备注，但不实现完整递归任务树。

## 设置项

| 设置项               |   默认值 | 说明                           |
| ----------------- | ----: | ---------------------------- |
| Show checkboxes   |   Off | 在 board UI 中显示 card checkbox |
| Prepend new cards |   Off | 将新 card 添加到列表顶部，而不是底部        |
| Tag display       | 取决于配置 | 可将 `#tag` 从 card 正文中分离显示     |
| Visual options    | 取决于配置 | 配置轻量颜色和显示选项                  |

## 通过 BRAT 安装

本 fork 可以通过 BRAT 作为 beta plugin 安装。

1. 在 Obsidian 中安装并启用 BRAT。
2. 打开 BRAT 设置。
3. 选择 **Add Beta plugin**。
4. 输入仓库地址：

```text
https://github.com/1569y/minimalist-kanban-ee
```

Release 中应包含：

```text
main.js
manifest.json
styles.css
```

并且 release tag 应与 `manifest.json` 中的 `version` 保持一致。

## 从源码构建

```bash
npm install
npm run build     # Production build → main.js
npm run dev       # Watch mode with source maps
npm test          # Run unit tests
npm run test:e2e  # Run e2e tests, if configured
```

## 归属说明

本项目是基于原版 Minimalist Kanban 的修改版 fork。

原项目：

* Minimalist Kanban by 3rdLaw

本地修改包括：

* 结构化子任务
* 父任务和子任务备注
* Markdown 格式工具栏
* card/list 颜色支持
* Soft color 模式
* 高对比 checkpoint-prefix 小色条
* UI 对齐与样式细节优化
* 运行时清理与轻量化优化

本仓库不是原项目官方版本。

## 许可证

[MIT](LICENSE)

原项目采用 MIT License。本 fork 保留原始 license 和 copyright notice。

````
[1]: https://docs.github.com/github/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax?utm_source=chatgpt.com "Basic writing and formatting syntax"
