import { Notice, Plugin } from "obsidian";
import {
	DEFAULT_SETTINGS,
	ObsidianGitlabWikiIntegrationSettings,
	SampleSettingTab,
} from "./settings";

export default class ObsidianGitlabWikiIntegration extends Plugin {
	settings: ObsidianGitlabWikiIntegrationSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("lucide-gitlab", "Gitlab Wiki Sync", () => {
			new Notice("Syncing with Gitlab Wiki...");
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ObsidianGitlabWikiIntegrationSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
