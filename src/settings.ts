import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import ObsidianGitlabIntegration from "./main";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ObsidianGitlabWikiIntegrationSettings {
	gitlabUrl: string;
	repositories: string[];
}

export const DEFAULT_SETTINGS: ObsidianGitlabWikiIntegrationSettings = {
	gitlabUrl: "default",
	repositories: [],
};

export class SampleSettingTab extends PluginSettingTab {
	plugin: ObsidianGitlabIntegration;

	constructor(app: App, plugin: ObsidianGitlabIntegration) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {
			containerEl,
			plugin: { settings },
		} = this;

		containerEl.empty();

		if (settings.repositories.length === 0) {
			this.createGitlabUrlSetting("", 0);
		}

		settings.repositories.forEach((repoUrl, index) => {
			this.createGitlabUrlSetting(repoUrl, index);
		});

		containerEl
			.createEl("button", { text: "Add repository" })
			.onClickEvent(() => {
				settings.repositories.push("");
				this.plugin.saveSettings();
				this.display();
			});
	}

	createGitlabUrlSetting(repoUrl: string, index: number) {
		const {
			containerEl,
			plugin: { settings },
		} = this;

		new Setting(containerEl)
			.setName("Gitlab Repository URL")
			.setDesc("Enter the URL of your Gitlab repository")
			.addText((text) =>
				text
					.setPlaceholder("Enter your repository URL")
					.setValue(settings.repositories[index] || "")
					.onChange(async (value) => {
						settings.repositories[index] = value;
						await this.plugin.saveSettings();
					}),
			)
			.addButton((btn) => {
				btn.setIcon("lucide-trash-2")
					.setTooltip("Remove repository")
					.onClick(async () => {
						settings.repositories = settings.repositories.filter(
							(url, i) => i !== index,
						);
						await this.plugin.saveSettings();
						this.display();
					});
			})
			.addButton((btn) =>
				btn
					.setIcon("lucide-refresh-cw")
					.setTooltip("Sync repository")
					.onClick(async () => {
						this.syncRepository(index, "Gitlab_Repositories");
						new Notice("Syncing with Gitlab Wiki...");
					}),
			);
	}

	syncRepository = async (index: number, folder: string) => {
		const repoUrl = this.plugin.settings.repositories[index];

		if (!repoUrl) {
			new Notice("Repository URL is empty!");
			return;
		}

		// @ts-ignore
		const vaultPath = this.app.vault.adapter.basePath;
		const target = `${vaultPath.replace(/\\/g, "/")}/${folder}`;
		const urlParts = repoUrl.split("/");
		const repoName = urlParts[urlParts.length - 1]?.replace(".git", "");

		urlParts[urlParts.length - 1] =
			urlParts[urlParts.length - 1]?.replace(".git", "") + ".wiki.git";

		try {
			await execAsync(
				`git clone ${urlParts.join("/")} "${target}/${repoName}"`,
			);

			new Notice(`Repository ${repoName} synced successfully!`);
		} catch (err: any) {
			new Notice(`Failed to sync repository ${repoName}: ${err.message}`);
		}
	};
}
