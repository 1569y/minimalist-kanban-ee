<script>
  import Item from "./Item.svelte";
  import { getSortable } from "./sortable";
  const Sortable = getSortable();
  import { Menu } from "obsidian";
  import { createEventDispatcher, onMount, tick } from "svelte";
  import { LANE_COLOR_OPTIONS } from "./colors";
  import { LinkSuggest } from "./LinkSuggest";
  import { parseItemFromEditor } from "./parser";
  import {
    applyMarkdownFormat,
    continueSubtaskBodyOnEnter,
    insertAtSelection,
    isValidSelectionRange,
    shouldContinueSubtaskBodyOnEnter,
    wrapSelection,
  } from "./editor-shortcuts";

  export let lane;
  export let settings;
  export let app;
  export let viewComponent;
  export let filePath;
  export let laneIndex;
  export let laneCount;

  const dispatch = createEventDispatcher();

  let itemsEl;
  let sortableInstance;
  let editingTitle = false;
  let titleDraft = "";
  let titleInput;
  let isAddingCard = false;
  let newItemTitle = "";
  let addCardInput = null;
  let linkSuggest = null;
  let lastSelection = { start: 0, end: 0 };

  onMount(() => {
    sortableInstance = new Sortable(itemsEl, {
      group: "kb-items",
      animation: 150,
      draggable: ".kb-item",
      filter: ".kb-menu-btn",
      preventOnFilter: false,
      delay: 150,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      onEnd(evt) {
        const { from, to, oldIndex, newIndex, item: el } = evt;

        // Undo SortableJS DOM manipulation so Svelte stays in control
        if (from !== to) {
          to.removeChild(el);
          from.insertBefore(el, from.children[oldIndex] || null);
        } else if (oldIndex !== newIndex) {
          if (oldIndex < newIndex) {
            from.insertBefore(el, from.children[oldIndex]);
          } else {
            from.insertBefore(el, from.children[oldIndex + 1]);
          }
        }

        dispatch("itemmove", {
          fromLaneId: from.dataset.laneId,
          toLaneId: to.dataset.laneId,
          oldIndex,
          newIndex,
        });
      },
    });

    linkSuggest = new LinkSuggest(app, filePath);

    return () => {
      sortableInstance?.destroy();
      linkSuggest?.destroy();
    };
  });

  function startEditTitle() {
    titleDraft = lane.title;
    editingTitle = true;
    setTimeout(() => titleInput?.focus(), 0);
  }

  function finishEditTitle() {
    if (!editingTitle) return;
    editingTitle = false;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== lane.title) {
      dispatch("lanerename", { laneId: lane.id, title: trimmed });
    }
  }

  function handleTitleKeydown(e) {
    if (e.key === "Enter") titleInput?.blur();
    else if (e.key === "Escape") editingTitle = false;
  }

  function deleteLane() {
    dispatch("lanedelete", { laneId: lane.id });
  }

  function showLaneMenu(e) {
    const menu = new Menu();
    menu.addItem((i) =>
      i
        .setTitle("Edit list name")
        .setIcon("pencil")
        .onClick(() => startEditTitle())
    );
    if (laneCount > 1) {
      menu.addSeparator();
      if (laneIndex > 0) {
        menu.addItem((i) =>
          i
            .setTitle("Move list left")
            .setIcon("arrow-left")
            .onClick(() => dispatch("lanemove", { laneId: lane.id, direction: -1 }))
        );
      }
      if (laneIndex < laneCount - 1) {
        menu.addItem((i) =>
          i
            .setTitle("Move list right")
            .setIcon("arrow-right")
            .onClick(() => dispatch("lanemove", { laneId: lane.id, direction: 1 }))
        );
      }
    }
    menu.addSeparator();
    menu.addItem((i) =>
      i
        .setTitle("Default")
        .setChecked(!lane.color)
        .onClick(() => dispatch("lanecolor", { laneId: lane.id, color: null }))
    );
    for (const option of LANE_COLOR_OPTIONS) {
      menu.addItem((i) =>
        i
          .setTitle(option.label)
          .setChecked(lane.color === option.key)
          .onClick(() =>
            dispatch("lanecolor", { laneId: lane.id, color: option.key })
          )
      );
    }
    menu.addSeparator();
    menu.addItem((i) =>
      i
        .setTitle("Delete list")
        .setIcon("trash-2")
        .onClick(() => deleteLane())
    );
    menu.showAtMouseEvent(e);
  }

  function submitNewItem() {
    const trimmed = newItemTitle.trim();
    if (!trimmed) return;
    const parsed = parseItemFromEditor(trimmed);
    dispatch("itemadd", {
      laneId: lane.id,
      title: parsed.title,
      body: parsed.body,
      subtasks: parsed.subtasks,
      checked: false,
      hasCheckbox: true,
    });
    newItemTitle = "";
    isAddingCard = false;
    linkSuggest?.detach();
    if (!settings.prependCards) {
      tick().then(() => {
        itemsEl.scrollTop = itemsEl.scrollHeight;
      });
    }
  }

  function startAddCard() {
    isAddingCard = true;
    tick().then(() => {
      if (!addCardInput) return;
      linkSuggest?.attach(addCardInput);
      addCardInput.focus();
      const end = addCardInput.value.length;
      addCardInput.setSelectionRange(end, end);
      lastSelection = { start: end, end };
    });
  }

  function cancelAddCard() {
    newItemTitle = "";
    isAddingCard = false;
    linkSuggest?.detach();
  }

  function handleAddBlur() {
    if (!isAddingCard) return;
    cancelAddCard();
  }

  function rememberSelection() {
    if (!addCardInput) return;
    lastSelection = {
      start: addCardInput.selectionStart ?? lastSelection.start,
      end: addCardInput.selectionEnd ?? lastSelection.end,
    };
  }

  function logSelectionEvent(eventName) {
    if (!addCardInput) return;
    console.debug("[MK-EE textarea-selection]", {
      eventType: eventName,
      selectionStart: addCardInput.selectionStart,
      selectionEnd: addCardInput.selectionEnd,
      activeElementMatches: document.activeElement === addCardInput,
      valueLength: newItemTitle.length,
    });
  }

  function rememberSelectionEvent(event) {
    rememberSelection();
    logSelectionEvent(event?.type ?? "unknown");
  }

  function handleAddKeydown(e) {
    if (e.isComposing) return;
    const isEnter =
      e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter";
    const hasPrimaryModifier = e.ctrlKey || e.metaKey;
    const lowerKey = typeof e.key === "string" ? e.key.toLowerCase() : "";

    if (hasPrimaryModifier && !e.shiftKey && lowerKey === "b") {
      e.preventDefault();
      e.stopPropagation();
      void wrapSelection(addCardInput, newItemTitle, (next) => {
        newItemTitle = next;
      }, "**", "**", lastSelection).then(() => {
        rememberSelection();
      });
      return;
    }

    if (hasPrimaryModifier && !e.shiftKey && lowerKey === "i") {
      e.preventDefault();
      e.stopPropagation();
      void wrapSelection(addCardInput, newItemTitle, (next) => {
        newItemTitle = next;
      }, "*", "*", lastSelection).then(() => {
        rememberSelection();
      });
      return;
    }

    if (isEnter && hasPrimaryModifier && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      void insertAtSelection(addCardInput, newItemTitle, (next) => {
        newItemTitle = next;
      }, "\n- [ ] ", lastSelection).then(() => {
        rememberSelection();
      });
      return;
    }

    if (isEnter && hasPrimaryModifier && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      void insertAtSelection(addCardInput, newItemTitle, (next) => {
        newItemTitle = next;
      }, "\n- [ ] ", lastSelection).then(() => {
        rememberSelection();
      });
      return;
    }

    if (isEnter && e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      submitNewItem();
      return;
    }

    if (isEnter && !hasPrimaryModifier && !e.shiftKey) {
      if (shouldContinueSubtaskBodyOnEnter(addCardInput, newItemTitle)) {
        e.preventDefault();
        void continueSubtaskBodyOnEnter(addCardInput, newItemTitle, (next) => {
          newItemTitle = next;
        });
        return;
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelAddCard();
      return;
    }

    if (linkSuggest?.handleKeydown(e)) return;
  }

  async function applyFormat(format) {
    const active = document.activeElement === addCardInput;
    const start = addCardInput?.selectionStart ?? null;
    const end = addCardInput?.selectionEnd ?? null;
    const usedFallback =
      !active && isValidSelectionRange(lastSelection, newItemTitle.length);
    const fallbackStart = usedFallback ? lastSelection.start : null;
    const fallbackEnd = usedFallback ? lastSelection.end : null;
    const previewStart = usedFallback ? fallbackStart : start;
    const previewEnd = usedFallback ? fallbackEnd : end;
    const selectedPreview =
      typeof previewStart === "number" &&
      typeof previewEnd === "number" &&
      previewStart >= 0 &&
      previewEnd >= previewStart
        ? newItemTitle.slice(previewStart, previewEnd)
        : "";

    console.debug("[MK-EE toolbar-selection]", {
      action: format,
      textareaExists: !!addCardInput,
      activeElementMatches: active,
      selectionStart: start,
      selectionEnd: end,
      lastSelection,
      valueLength: newItemTitle.length,
      selectedTextPreview: selectedPreview,
      eventType: "toolbar-click",
      eventTargetClassName: "kb-format-btn",
      usedFallbackSelection: usedFallback,
    });

    const result = await applyMarkdownFormat(addCardInput, newItemTitle, (next) => {
      newItemTitle = next;
    }, format, lastSelection);

    console.debug("[MK-EE toolbar-selection]", {
      action: format,
      textareaExists: !!addCardInput,
      activeElementMatches: document.activeElement === addCardInput,
      selectionStart: addCardInput?.selectionStart ?? null,
      selectionEnd: addCardInput?.selectionEnd ?? null,
      lastSelection,
      valueLength: newItemTitle.length,
      selectedTextPreview: result?.selectedText ?? selectedPreview,
      eventType: "toolbar-click-result",
      eventTargetClassName: "kb-format-btn",
      usedFallbackSelection: result?.usedFallback ?? usedFallback,
      finalInsertStart: result?.start ?? null,
      finalInsertEnd: result?.end ?? null,
      finalSelectionStart: result?.finalStart ?? null,
      finalSelectionEnd: result?.finalEnd ?? null,
      applied: result?.applied ?? false,
      reason: result?.reason ?? null,
    });

    if (!result?.applied) return;
    rememberSelection();
  }

  function handleItemDelete(e) {
    dispatch("itemdelete", { laneId: lane.id, itemId: e.detail.itemId });
  }

  function handleItemEdit(e) {
    dispatch("itemedit", { laneId: lane.id, ...e.detail });
  }

  function handleItemShowMenu(e) {
    dispatch("itemshowmenu", { laneId: lane.id, ...e.detail });
  }
</script>

<div class="kb-lane" data-lane-color={lane.color || undefined}>
  <div class="kb-lane-header">
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="kb-lane-drag-handle" on:mousedown|stopPropagation on:touchstart|stopPropagation>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
    </div>
    {#if editingTitle}
      <input
        bind:this={titleInput}
        bind:value={titleDraft}
        on:blur={finishEditTitle}
        on:keydown={handleTitleKeydown}
        class="kb-lane-title-input"
      />
    {:else}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <h3 class="kb-lane-title" on:click={startEditTitle}>{lane.title}</h3>
    {/if}
    <span class="kb-lane-count">{lane.items.length}</span>
    <button class="kb-menu-btn" on:click={showLaneMenu} aria-label="List menu">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
    </button>
  </div>

  <div class="kb-lane-items" data-lane-id={lane.id} bind:this={itemsEl}>
    {#each lane.items as item (item.id)}
      <Item
        {item}
        laneColor={lane.color}
        {settings}
        {app}
        {viewComponent}
        {filePath}
        on:delete={handleItemDelete}
        on:edit={handleItemEdit}
        on:showmenu={handleItemShowMenu}
      />
    {/each}
  </div>

  <div class="kb-lane-footer">
    {#if isAddingCard}
      <div class="kb-add-card-editor">
        <textarea
          bind:this={addCardInput}
          bind:value={newItemTitle}
          on:blur={handleAddBlur}
          on:focus={rememberSelectionEvent}
          on:input={rememberSelectionEvent}
          on:click={rememberSelectionEvent}
          on:mouseup={rememberSelectionEvent}
          on:keydown={handleAddKeydown}
          on:keyup={rememberSelectionEvent}
          on:select={rememberSelectionEvent}
          placeholder="Add a card"
          class="kb-add-item-input kb-add-card-textarea"
          rows="1"
        ></textarea>
        <div class="kb-editor-toolbar">
          <button
            type="button"
            class="kb-format-btn"
            aria-label="Bold"
            on:pointerdown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            on:mousedown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            on:click={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void applyFormat("bold");
            }}
          >
            B
          </button>
          <button
            type="button"
            class="kb-format-btn"
            aria-label="Italic"
            on:pointerdown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            on:mousedown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            on:click={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void applyFormat("italic");
            }}
          >
            I
          </button>
        </div>
      </div>
    {:else}
      <button
        type="button"
        class="kb-add-card-btn"
        on:click={startAddCard}
      >
        <span class="kb-add-icon" aria-hidden="true">+</span>
        <span class="kb-add-text">Add a card</span>
      </button>
    {/if}
  </div>
</div>
