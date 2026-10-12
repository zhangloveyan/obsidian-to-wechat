import { MarkdownView, type App, type TFile } from 'obsidian';

export interface ArticleSnapshot {
    file: TFile;
    sourcePath: string;
    markdown: string;
    title: string;
}

export async function readArticle(app: App, file: TFile): Promise<ArticleSnapshot> {
    const sourcePath = file.path;
    const title = file.basename;
    const active = app.workspace.getActiveViewOfType(MarkdownView);
    const view = active?.file === file ? active : app.workspace.getLeavesOfType('markdown')
        .map(leaf => leaf.view).find((candidate): candidate is MarkdownView => candidate instanceof MarkdownView && candidate.file === file);
    const markdown = view ? view.getViewData() : await app.vault.read(file);
    return { file, sourcePath, title, markdown };
}
