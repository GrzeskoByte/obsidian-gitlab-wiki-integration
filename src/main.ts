import { exec } from "child_process";
import { Plugin } from "obsidian";
import { promisify } from "util";
import {
	DEFAULT_SETTINGS,
	ObsidianGitlabWikiIntegrationSettings,
	SampleSettingTab,
} from "./settings";

const execAsync = promisify(exec);

export default class ObsidianGitlabWikiIntegration extends Plugin {
	settings: ObsidianGitlabWikiIntegrationSettings;
	changes: {
		modified: string[];
		created: string[];
		deleted: string[];
	} = {
		modified: [],
		created: [],
		deleted: [],
	};

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				this.iterateRepositores((repoName: string) => {
					if (repoName) this.checkGitFilesState(repoName);
				});
			}),
		);
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				this.iterateRepositores((repoName: string) => {
					if (repoName) this.checkGitFilesState(repoName);
				});
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				this.iterateRepositores((repoName: string) => {
					if (repoName) this.checkGitFilesState(repoName);
				});
			}),
		);

		this.registerEvent(
			this.app.vault.on("rename", (file) => {
				this.iterateRepositores((repoName: string) => {
					if (repoName) this.checkGitFilesState(repoName);
				});
			}),
		);

		this.iterateRepositores((repoName: string) => {
			if (repoName) this.checkGitFilesState(repoName);
		});

		this.app.workspace.onLayoutReady(() => {
			const explorer =
				this.app.workspace.getLeavesOfType("file-explorer")[0]?.view;
			if (!explorer) return;

			const navContainer = explorer.containerEl.querySelector(
				".nav-files-container",
			);

			if (navContainer) {
				const observer = new MutationObserver(() => {
					const navItems =
						navContainer.querySelectorAll(".tree-item-self");

					if (navItems) {
						navItems.forEach((item) => {
							console.log(item.getAttribute("data-path"));
						});
					}
				});
				observer.observe(navContainer, {
					childList: true,
					subtree: true,
				});
			}
		});
	}

	onunload() {}

	iterateRepositores = (callback: Function) => {
		if (this.settings.repositories) {
			this.settings.repositories.forEach((repo) => {
				const repoUrlSplitted = repo.split("/");
				const repoName = repoUrlSplitted[
					repoUrlSplitted.length - 1
				]?.replace(".git", "");

				if (repoName) callback(repoName);
			});
		}
	};

	checkGitFilesState = async (repoName: string) => {
		const changes: {
			modified: string[];
			created: string[];
			deleted: string[];
		} = {
			modified: [],
			created: [],
			deleted: [],
		};

		const repoPath =
			//@ts-ignore
			`${this.app.vault.adapter.basePath}/Gitlab_Repositories/${repoName}`.replace(
				/\\/g,
				"/",
			);
		const res = await execAsync(`git -C "${repoPath}" status --porcelain`);

		const lines = res.stdout.trim().split("\n");

		lines.forEach((line) => {
			const status = line.slice(0, 1).trim();
			const fileName = line.slice(2).trim();

			const filePath = `${repoPath}/${fileName}`;

			if (status === "M") {
				changes.modified.push(filePath);
			} else if (status === "A") {
				changes.created.push(filePath);
			} else if (status === "D") {
				changes.deleted.push(filePath);
			}
		});

		this.changes = changes;
	};

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
