<script>
  import { MarkdownRenderer } from "obsidian";
  import { afterUpdate, onDestroy, onMount } from "svelte";

  export let markdown = "";
  export let app;
  export let filePath;
  export let viewComponent;
  export let tag = "div";
  export let className = "";

  let el = null;
  let lastRendered = "";
  let renderToken = 0;
  let destroyed = false;

  function unwrapParagraphs(target) {
    const paragraphs = target.querySelectorAll("p");
    if (paragraphs.length === 0) return;

    const fragment = document.createDocumentFragment();
    paragraphs.forEach((paragraph, index) => {
      if (index > 0) fragment.appendChild(document.createElement("br"));
      fragment.append(...paragraph.childNodes);
    });
    target.replaceChildren(fragment);
  }

  function normalizeBreaks(target) {
    target.querySelectorAll("br").forEach((br) => {
      const next = br.nextSibling;
      if (next && next.nodeType === Node.TEXT_NODE && next.textContent) {
        next.textContent = next.textContent.replace(/^\n/, "");
      }
    });
  }

  function wireLinks(target) {
    target.querySelectorAll("a.internal-link").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        const href = link.getAttribute("data-href") || link.getAttribute("href");
        if (!href || !app?.workspace?.openLinkText) return;
        const newTab = event.ctrlKey || event.metaKey;
        app.workspace.openLinkText(href, filePath, newTab ? "tab" : false);
      });
    });

    target.querySelectorAll("a.external-link").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    });
  }

  async function renderMarkdown() {
    const target = el;
    if (!target || !app || destroyed) return;
    if (lastRendered === markdown) return;

    const token = ++renderToken;
    lastRendered = markdown;
    target.replaceChildren();
    await MarkdownRenderer.render(
      app,
      markdown,
      target,
      filePath,
      viewComponent
    );

    if (destroyed || token !== renderToken || target !== el) return;

    unwrapParagraphs(target);
    normalizeBreaks(target);
    wireLinks(target);
  }

  onMount(() => {
    renderMarkdown();
  });

  afterUpdate(() => {
    renderMarkdown();
  });

  onDestroy(() => {
    destroyed = true;
    renderToken += 1;
  });
</script>

<svelte:element
  this={tag}
  bind:this={el}
  class={className}
  role="presentation"
  on:click
></svelte:element>
