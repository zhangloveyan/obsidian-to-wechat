import { TFile } from 'obsidian';
import type { SettingsManager } from '../features/settings/settings';

export interface ImageMetadata {
    fileName: string;
    url: string;
    media_id: string;
    uploadTime: number;
}

export interface DocumentMetadata {
    images: { [key: string]: ImageMetadata };
}

export function getOrCreateMetadata(
    settingsManager: SettingsManager,
    file: TFile,
): DocumentMetadata {
    const settings = settingsManager.getSettings();
    const allMetadata = settings.documentMetadata || {};
    const filePath = file.path;

    if (allMetadata[filePath]) {
        return allMetadata[filePath];
    }

    return { images: {} };
}

export async function updateMetadata(
    settingsManager: SettingsManager,
    file: TFile,
    metadata: DocumentMetadata,
): Promise<void> {
    const settings = settingsManager.getSettings();
    const allMetadata = settings.documentMetadata || {};
    allMetadata[file.path] = metadata;
    await settingsManager.updateSettings({ documentMetadata: allMetadata });
}

export function isImageUploaded(metadata: DocumentMetadata, fileName: string): ImageMetadata | null {
    return metadata.images[fileName] || null;
}

export function addImageMetadata(metadata: DocumentMetadata, fileName: string, imageData: ImageMetadata): void {
    metadata.images[fileName] = imageData;
}
