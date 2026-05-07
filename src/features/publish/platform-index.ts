import type WechatPublisherPlugin from '../../plugin';
import { PublishModal } from './publish-modal';
import { MarkdownView } from 'obsidian';

export function showPublishModal(this: WechatPublisherPlugin, markdownView: MarkdownView) {
    const modal = new PublishModal(this.app, this, markdownView);
    modal.open();
}
