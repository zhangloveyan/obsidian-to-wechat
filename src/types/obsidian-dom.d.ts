export {};

declare global {
    // Obsidian exposes its DOM factories on each window; the pinned SDK only declares globals.
    interface Window {
        createEl: typeof createEl;
        createDiv: typeof createDiv;
        createSpan: typeof createSpan;
    }
}
