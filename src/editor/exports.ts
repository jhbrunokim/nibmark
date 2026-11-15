import type { RenderedLabel } from '../renderer/render';
export function filename(project: string): string {
  return (
    project
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/^[.\-]+|[.\-]+$/g, '')
      .slice(0, 70) || 'project'
  );
}
export function markdown(project: string, file: string): string {
  const alt = `Software Facts for ${project}`
    .replace(/[\r\n]/g, ' ')
    .replace(/([\\\[\]])/g, '\\$1');
  return `![${alt}](./${file})`;
}
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function png(label: RenderedLabel, scale = 2): Promise<Blob> {
  const height = Math.ceil(label.height * scale);
  const width = label.width * scale;
  if (height > 16000 || height * width > 16_000_000)
    throw new Error('This label is too tall for PNG. Download SVG or shorten the label.');
  const url = URL.createObjectURL(new Blob([label.svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG export is unavailable in this browser. Try SVG.');
    context.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed. Try SVG.'))),
        'image/png',
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
