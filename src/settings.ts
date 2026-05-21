import { App, PluginSettingTab, Setting } from "obsidian";
import type KanbanBoardPlugin from "./main";

export interface KBSettings {
  showCheckboxes: boolean;
  enterNewline: boolean;
  prependCards: boolean;
  showArchive: boolean;
  listTitleSize: "small" | "normal" | "large";
  cardTitleSize: "small" | "normal" | "large";
  listColorIntensity: "subtle" | "normal" | "strong";
  cardStripeStyle: "checkpoint-prefix";
  moveHashtagsToFooter: boolean;
}

export const DEFAULT_SETTINGS: KBSettings = {
  showCheckboxes: false,
  enterNewline: false,
  prependCards: false,
  showArchive: false,
  listTitleSize: "large",
  cardTitleSize: "normal",
  listColorIntensity: "normal",
  cardStripeStyle: "checkpoint-prefix",
  moveHashtagsToFooter: true,
};

export class KBSettingTab extends PluginSettingTab {
  plugin: KanbanBoardPlugin;

  constructor(app: App, plugin: KanbanBoardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Show checkboxes")
      .setDesc(
        "Display checkboxes on cards that have them in Markdown."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showCheckboxes)
          .onChange(async (value) => {
            this.plugin.settings.showCheckboxes = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Enter key adds new line")
      .setDesc(
        "When enabled, Enter adds a new line in card text and Shift+Enter submits. " +
          "When disabled, Enter submits and Shift+Enter adds a new line."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enterNewline)
          .onChange(async (value) => {
            this.plugin.settings.enterNewline = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Prepend new cards")
      .setDesc(
        "Add new cards to the top of the list instead of the bottom."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.prependCards)
          .onChange(async (value) => {
            this.plugin.settings.prependCards = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Show archive list")
      .setDesc(
        "Display the archive list on boards that have archived cards."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showArchive)
          .onChange(async (value) => {
            this.plugin.settings.showArchive = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("List title size")
      .setDesc("Choose a preset size for list titles.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("small", "Small")
          .addOption("normal", "Normal")
          .addOption("large", "Large")
          .setValue(this.plugin.settings.listTitleSize)
          .onChange(async (value: KBSettings["listTitleSize"]) => {
            this.plugin.settings.listTitleSize = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Card title size")
      .setDesc("Choose a preset size for card titles.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("small", "Small")
          .addOption("normal", "Normal")
          .addOption("large", "Large")
          .setValue(this.plugin.settings.cardTitleSize)
          .onChange(async (value: KBSettings["cardTitleSize"]) => {
            this.plugin.settings.cardTitleSize = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("List color intensity")
      .setDesc("Control how strongly list background colors are tinted.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("subtle", "Subtle")
          .addOption("normal", "Normal")
          .addOption("strong", "Strong")
          .setValue(this.plugin.settings.listColorIntensity)
          .onChange(async (value: KBSettings["listColorIntensity"]) => {
            this.plugin.settings.listColorIntensity = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Move hashtags to card footer")
      .setDesc("Show hashtags as footer chips instead of inline card text.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.moveHashtagsToFooter)
          .onChange(async (value) => {
            this.plugin.settings.moveHashtagsToFooter = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
