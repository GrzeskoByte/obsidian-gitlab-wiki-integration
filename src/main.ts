import { exec } from "child_process";
import { Notice, Plugin, setIcon } from "obsidian";
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
			line = line.trim();
			const status = line.split(" ")[0];
			const filePath = `/${repoName}/${line.slice(2).trim()}`
				.toLowerCase()
				// @ts-ignore
				.replaceAll('"', "");

			if (status === "M") {
				changes.modified.push(filePath);
			} else if (status === "A" || status === "??") {
				changes.created.push(filePath);
			} else if (status === "D" || status === "R") {
				changes.deleted.push(filePath);
			}
		});

		this.changes = changes;
		this.updateLeftSidebarElements(this.changes);
	};

	updateLeftSidebarElements(changes: typeof this.changes) {
		const explorer =
			this.app.workspace.getLeavesOfType("file-explorer")[0]?.view;
		if (!explorer) return;

		const navContainer = explorer.containerEl.querySelector(
			".nav-files-container",
		);

		if (navContainer) {
			const navItems = navContainer.querySelectorAll(".tree-item-self");

			if (navItems) {
				navItems.forEach((item) => {
					if (item.getAttribute("data-path")?.includes(".md")) {
						const mdFilePath = item
							.getAttribute("data-path")
							?.split("Gitlab_Repositories")[1]
							?.toLowerCase();

						if (mdFilePath) {
							const isModified =
								changes.modified.includes(mdFilePath);
							const isCreated =
								changes.created.includes(mdFilePath);
							const isDeleted =
								changes.deleted.includes(mdFilePath);

							if (isModified) {
								const statusElement =
									this.createStatusHTMLElement("M");

								if (!item.querySelector(".custom-status")) {
									item.appendChild(statusElement);
								}
							}

							if (isCreated) {
								const statusElement =
									this.createStatusHTMLElement("C");

								if (!item.querySelector(".custom-status")) {
									item.appendChild(statusElement);
								}
							}

							if (isDeleted) {
								const statusElement =
									this.createStatusHTMLElement("D");

								if (!item.querySelector(".custom-status")) {
									item.appendChild(statusElement);
								}
							}

							if (!isModified && !isCreated && !isDeleted) {
								//@ts-ignore
								item.style.backgroundColor = ""; // Reset background for unchanged files

								if (item.querySelector(".custom-status")) {
									item.querySelector(
										".custom-status",
									)?.remove();
								}
							}
						}
					} else {
						const repositoriesName = this.settings.repositories.map(
							(repo) =>
								repo.split("/").pop()?.replace(".git", ""),
						);
						const repoName = item
							.getAttribute("data-path")
							?.split("/")
							.pop();

						if (repositoriesName.includes(repoName)) {
							const statusEl =
								this.createStatusHTMLElement("Repo");

							//@ts-ignore
							item.style.display = "flex";
							//@ts-ignore
							item.style.alignItems = "center";

							if (!item.querySelector(".custom-status")) {
								item.prepend(statusEl);
							}

							if (!item.querySelector(".sync-button")) {
								const syncButton = this.createSyncButton();
								item.appendChild(syncButton);

								syncButton.addEventListener("click", (e) => {
									e.stopPropagation();
									e.preventDefault();
									this.syncRepository(repoName!);
								});
							}
						}
					}
				});
			}
		}
	}

	async syncRepository(repoName: string) {
		try {
			const repoPath =
				//@ts-ignore
				`${this.app.vault.adapter.basePath}/Gitlab_Repositories/${repoName}`.replace(
					/\\/g,
					"/",
				);
			const numberOfChanges = Object.entries(this.changes)
				.map(([key, value]) => value)
				.flat().length;

			if (numberOfChanges === 0) {
				new Notice(
					`Pulling latest changes for repository ${repoName}...`,
					3000,
				);
				await execAsync(`git -C "${repoPath}" pull`);
				this.checkGitFilesState(repoName);
				return;
			}

			new Notice(`Syncing repository ${repoName}...`, 3000);

			await execAsync(`git -C "${repoPath}" add .`);
			(await execAsync(
				`git -C "${repoPath}" commit -m "update wiki for ${repoName}"`,
			),
				await execAsync(`git -C "${repoPath}" push`));
			await this.checkGitFilesState(repoName);
		} finally {
			new Notice(`Repository ${repoName} synced successfully!`, 3000);
		}
	}

	createStatusHTMLElement(status: "M" | "C" | "D" | "Repo") {
		const statusElement = document.createElement("span");
		statusElement.textContent = ` (${status})`;
		statusElement.style.marginLeft = "5px";

		switch (status) {
			case "M":
				statusElement.style.color = "orange";
				break;
			case "C":
				statusElement.style.color = "green";
				break;
			case "D":
				statusElement.style.color = "red";
				break;
			case "Repo":
				statusElement.style.marginRight = "5px";
				setIcon(statusElement, "folder-git-2");
				break;
		}

		statusElement.className = "custom-status";

		return statusElement;
	}

	createSyncButton() {
		const button = document.createElement("div");

		button.style.borderRadius = "5px";
		button.style.backgroundColor = "transparent";
		button.style.cursor = "pointer";
		button.style.marginLeft = "auto";
		button.style.padding = "1px";
		button.style.zIndex = "1000";
		button.className = "sync-button";

		setIcon(button, "refresh-ccw");
		return button;
	}

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
