# 0.1.7

## 更新内容

- 新增公众号封面裁剪：选择文章图片或本地图片后，按固定 2.35:1 比例裁剪，支持拖动和缩放。
- 裁剪结果上传为独立 PNG，不修改原图或正文；最大 2350 × 1000 像素，不放大小图。
- 返回可保留选图状态；上传失败可重试，取消不会替换原有封面。
- 裁剪功能完全在本地运行，不依赖 CDN；保持现有的 10MB 图片限制。

## What's new

- Crop article or local images into a 2.35:1 WeChat cover with drag and zoom controls.
- Upload the crop as a separate PNG, up to 2350 × 1000 pixels without upscaling or changing the original image or note.
- Keep the selected image when going back, retry failed uploads, and preserve the previous cover when cancelling.
- Cropping runs locally without a CDN. The existing 10MB image limit is unchanged.
