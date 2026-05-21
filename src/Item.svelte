<script>
  import { Platform } from "obsidian";
  import { createEventDispatcher } from "svelte";
  import { normalizeCardColorKey } from "./colors";
  import { LinkSuggest } from "./LinkSuggest";
  import { collectItemHashtags, stripHashtags } from "./hashtags";
  import MarkdownText from "./MarkdownText.svelte";
  import { formatItemForEditing, parseItemFromEditor } from "./parser";
  import {
    applyMarkdownFormat,
    continueSubtaskBodyOnEnter,
    insertAtSelection,
    isValidSelectionRange,
    shouldContinueSubtaskBodyOnEnter,
    wrapSelection as wrapSelectionInTextarea,
  } from "./editor-shortcuts";

  export let item;
  export let laneColor = undefined;
  export let settings;
  export let app;
  export let viewComponent;
  export let filePath;

  const dispatch = createEventDispatcher();

  let editing = false;
  let editValue = "";
  let editInput = null;
  let linkSuggest = null;
  let lastSelection = { start: 0, end: 0 };

  $: normalizedCardColor = normalizeCardColorKey(item.color) ?? item.color;
  $: softColorUsesLaneTint = normalizedCardColor === "soft-color" && Boolean(laneColor);
  $: shouldShowStripe =
    Boolean(normalizedCardColor) &&
    (normalizedCardColor !== "soft-color" || softColorUsesLaneTint);
  $: showLeadingCheckbox = settings.showCheckboxes && item.hasCheckbox;
  $: moveHashtagsToFooter = settings.moveHashtagsToFooter !== false;
  $: footerTags = moveHashtagsToFooter ? collectItemHashtags(item) : [];
  $: renderedTitle = moveHashtagsToFooter ? stripHashtags(item.title) : item.title;
  $: renderedBody = moveHashtagsToFooter ? stripHashtags(item.body) : item.body;

  function autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function syncSelection() {
    if (!editInput) return;
    lastSelection = {
      start: editInput.selectionStart ?? lastSelection.start,
      end: editInput.selectionEnd ?? lastSelection.end,
    };
  }

  function rememberSelection() {
    syncSelection();
  }

  function logSelectionEvent(eventName) {
    if (!editInput) return;
    console.debug("[MK-EE textarea-selection]", {
      eventType: eventName,
      selectionStart: editInput.selectionStart,
      selectionEnd: editInput.selectionEnd,
      activeElementMatches: document.activeElement === editInput,
      valueLength: editValue.length,
    });
  }

  function rememberSelectionEvent(event) {
    rememberSelection();
    logSelectionEvent(event?.type ?? "unknown");
  }

  function handleTitleClick(event) {
    if (event.ctrlKey || event.metaKey) {
      const wikiMatch = item.title.match(/\[\[([^\]|]+)/);
      if (wikiMatch) {
        event.preventDefault();
        app.workspace.openLinkText(wikiMatch[1], filePath, "tab");
        return;
      }
    }
    startEdit();
  }

  function startEdit() {
    editing = true;
    editValue = formatItemForEditing(item);

    setTimeout(() => {
      if (!editInput) return;
      autoResize(editInput);
      editInput.focus();

      if (Platform.isMobile) {
        const end = editInput.value.length;
        editInput.setSelectionRange(end, end);
        lastSelection = { start: end, end };
      } else {
        editInput.select();
        lastSelection = { start: 0, end: editInput.value.length };
      }

      linkSuggest = new LinkSuggest(app, filePath);
      linkSuggest.attach(editInput);

      if (Platform.isMobile) {
        const card = editInput.closest(".kb-item");
        setTimeout(() => card?.scrollIntoView({ block: "nearest" }), 500);
        setTimeout(() => card?.scrollIntoView({ block: "nearest" }), 1000);
      }
    }, 0);
  }

  function finishEdit() {
    if (!editing) return;

    editing = false;
    linkSuggest?.destroy();
    linkSuggest = null;

    const parsed = parseItemFromEditor(editValue, item.subtasks ?? []);
    if (
      parsed.title &&
      (parsed.title !== item.title ||
        parsed.body !== item.body ||
        JSON.stringify(parsed.subtasks ?? []) !==
          JSON.stringify(item.subtasks ?? []))
    ) {
      dispatch("edit", {
        itemId: item.id,
        title: parsed.title,
        body: parsed.body,
        subtasks: parsed.subtasks,
      });
    }
  }

  function handleEditBlur(event) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof HTMLElement && nextTarget.closest(".kb-editor-toolbar")) {
      return;
    }

    finishEdit();
  }

  async function insertSubtaskTemplate() {
    await insertAtSelection(
      editInput,
      editValue,
      (next) => {
        editValue = next;
      },
      "\n- [ ] ",
      lastSelection
    );
    autoResize(editInput);
    syncSelection();
  }

  async function wrapSelection(prefix, suffix = prefix) {
    await wrapSelectionInTextarea(
      editInput,
      editValue,
      (next) => {
        editValue = next;
      },
      prefix,
      suffix,
      lastSelection
    );
    autoResize(editInput);
    syncSelection();
  }

  async function applyFormat(format) {
    const active = document.activeElement === editInput;
    const start = editInput?.selectionStart ?? null;
    const end = editInput?.selectionEnd ?? null;
    const usedFallback =
      !active && isValidSelectionRange(lastSelection, editValue.length);
    const fallbackStart = usedFallback ? lastSelection.start : null;
    const fallbackEnd = usedFallback ? lastSelection.end : null;
    const previewStart = usedFallback ? fallbackStart : start;
    const previewEnd = usedFallback ? fallbackEnd : end;
    const selectedPreview =
      typeof previewStart === "number" &&
      typeof previewEnd === "number" &&
      previewStart >= 0 &&
      previewEnd >= previewStart
        ? editValue.slice(previewStart, previewEnd)
        : "";

    console.debug("[MK-EE toolbar-selection]", {
      action: format,
      textareaExists: !!editInput,
      activeElementMatches: active,
      selectionStart: start,
      selectionEnd: end,
      lastSelection,
      valueLength: editValue.length,
      selectedTextPreview: selectedPreview,
      eventType: "toolbar-click",
      eventTargetClassName: "kb-format-btn",
      usedFallbackSelection: usedFallback,
    });

    const result = await applyMarkdownFormat(
      editInput,
      editValue,
      (next) => {
        editValue = next;
      },
      format,
      lastSelection
    );

    console.debug("[MK-EE toolbar-selection]", {
      action: format,
      textareaExists: !!editInput,
      activeElementMatches: document.activeElement === editInput,
      selectionStart: editInput?.selectionStart ?? null,
      selectionEnd: editInput?.selectionEnd ?? null,
      lastSelection,
      valueLength: editValue.length,
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
    autoResize(editInput);
    syncSelection();
  }

  async function handleKeydown(event) {
    if (event.isComposing) return;

    const isEnterKey =
      event.key === "Enter" ||
      event.code === "Enter" ||
      event.code === "NumpadEnter";
    const hasPrimaryModifier = event.ctrlKey || event.metaKey;
    const lowerKey =
      typeof event.key === "string" ? event.key.toLowerCase() : "";

    if (hasPrimaryModifier && !event.shiftKey && lowerKey === "b") {
      event.preventDefault();
      event.stopPropagation();
      await wrapSelection("**");
      return;
    }

    if (hasPrimaryModifier && !event.shiftKey && lowerKey === "i") {
      event.preventDefault();
      event.stopPropagation();
      await wrapSelection("*");
      return;
    }

    if (isEnterKey && hasPrimaryModifier && event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      await insertSubtaskTemplate();
      return;
    }

    if (isEnterKey && hasPrimaryModifier && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      await insertSubtaskTemplate();
      return;
    }

    if (isEnterKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      editInput?.blur();
      return;
    }

    if (isEnterKey && !hasPrimaryModifier && !event.shiftKey) {
      if (shouldContinueSubtaskBodyOnEnter(editInput, editValue)) {
        event.preventDefault();
        await continueSubtaskBodyOnEnter(editInput, editValue, (next) => {
          editValue = next;
        });
        autoResize(editInput);
        syncSelection();
        return;
      }
    }

    if (event.key === "Escape") {
      linkSuggest?.destroy();
      linkSuggest = null;
      editing = false;
      return;
    }

    if (linkSuggest?.handleKeydown(event)) return;
  }

  function toggleChecked(event) {
    event.stopPropagation();
    dispatch("edit", {
      itemId: item.id,
      title: item.title,
      body: item.body,
      checked: !item.checked,
      subtasks: item.subtasks,
    });
  }

  function showMenu(event) {
    event.stopPropagation();
    dispatch("showmenu", { itemId: item.id, event });
  }

  function toggleSubtask(subtaskId, event) {
    event.stopPropagation();
    const subtasks = item.subtasks?.map((subtask) =>
      subtask.id === subtaskId
        ? { ...subtask, checked: !subtask.checked }
        : subtask
    );
    if (!subtasks) return;
    dispatch("edit", {
      itemId: item.id,
      title: item.title,
      body: item.body,
      checked: item.checked,
      subtasks,
    });
  }
</script>

<div
  class="kb-item"
  class:kb-item-has-color={!!item.color}
  class:kb-item-has-stripe={shouldShowStripe}
  class:kb-item-has-leading-checkbox={showLeadingCheckbox}
  data-id={item.id}
  data-card-color={normalizedCardColor || undefined}
>
  {#if showLeadingCheckbox || shouldShowStripe}
    <div class="kb-item-leading">
      {#if showLeadingCheckbox}
        <input
          type="checkbox"
          checked={item.checked}
          on:change={toggleChecked}
          class="kb-item-checkbox"
        />
      {/if}
      {#if shouldShowStripe}
        <div class="kb-card-stripe" aria-hidden="true"></div>
      {/if}
    </div>
  {/if}

  <div class="kb-item-main">
    {#if editing}
      <div class="kb-item-edit-layout">
        <textarea
          bind:this={editInput}
          bind:value={editValue}
          on:blur={handleEditBlur}
          on:keydown={handleKeydown}
          on:focus={rememberSelectionEvent}
          on:input={() => {
            autoResize(editInput);
            rememberSelection();
            logSelectionEvent("input");
          }}
          on:click={rememberSelectionEvent}
          on:mouseup={rememberSelectionEvent}
          on:keyup={rememberSelectionEvent}
          on:select={rememberSelectionEvent}
          class="kb-item-edit kb-item-edit-textarea"
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
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="kb-item-body">
        <MarkdownText
          tag="span"
          className="kb-item-title kb-markdown-inline"
          markdown={renderedTitle}
          {app}
          {filePath}
          {viewComponent}
          on:click={handleTitleClick}
        />
        {#if item.body}
          <MarkdownText
            tag="div"
            className="kb-item-body-note kb-markdown-inline"
            markdown={renderedBody}
            {app}
            {filePath}
            {viewComponent}
            on:click={startEdit}
          />
        {/if}
        {#if item.subtasks && item.subtasks.length > 0}
          <div class="kb-subtasks">
            {#each item.subtasks as subtask (subtask.id)}
              <div class="kb-subtask">
                <input
                  type="checkbox"
                  class="kb-subtask-checkbox"
                  checked={subtask.checked}
                  on:change={(event) => toggleSubtask(subtask.id, event)}
                  on:click|stopPropagation
                />
                <div class="kb-subtask-content" on:click={startEdit}>
                  <MarkdownText
                    tag="div"
                    className="kb-subtask-title kb-markdown-inline"
                    markdown={
                      moveHashtagsToFooter ? stripHashtags(subtask.title) : subtask.title
                    }
                    {app}
                    {filePath}
                    {viewComponent}
                  />
                  {#if subtask.body}
                    <MarkdownText
                      tag="div"
                      className="kb-subtask-body kb-markdown-inline"
                      markdown={
                        moveHashtagsToFooter ? stripHashtags(subtask.body) : subtask.body
                      }
                      {app}
                      {filePath}
                      {viewComponent}
                    />
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
        {#if footerTags.length > 0}
          <div class="kb-card-tags">
            {#each footerTags as tag}
              <span class="kb-card-tag">{tag}</span>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <button
    class="kb-menu-btn kb-item-menu-btn"
    on:click={showMenu}
    on:mousedown|stopPropagation
    on:touchstart|stopPropagation
    aria-label="Card menu"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  </button>
</div>
