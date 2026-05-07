export class ClipboardExporter {
    private static async inlineImages(container: HTMLElement): Promise<void> {
        const images = container.querySelectorAll('img');
        for (const img of Array.from(images)) {
            try {
                const response = await fetch((img as HTMLImageElement).src);
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise<void>((resolve, reject) => {
                    reader.onload = () => {
                        (img as HTMLImageElement).src = reader.result as string;
                        resolve();
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('Image conversion failed:', error);
            }
        }
    }

    static async copyHtml(html: string, plainText: string): Promise<void> {
        const container = document.createElement('div');
        container.innerHTML = html;
        await this.inlineImages(container);

        const finalHtml = container.innerHTML;
        const clipData = new ClipboardItem({
            'text/html': new Blob([finalHtml], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
        });

        await navigator.clipboard.write([clipData]);
    }
}

