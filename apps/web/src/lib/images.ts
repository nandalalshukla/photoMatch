/**
 * Cloudinary can resize images on the fly by adding a "transformation" to the URL.
 * We use it to load small thumbnails in grids instead of full-size originals,
 * which makes galleries load many times faster.
 *
 *   thumbnail(url, 400) → .../image/upload/c_fill,w_400,h_400,q_auto,f_auto/...
 */
export function thumbnail(url: string, size = 400, crop: 'fill' | 'limit' = 'fill') {
  if (!url.includes('/image/upload/')) return url; // not a Cloudinary URL
  const height = crop === 'fill' ? `,h_${size}` : '';
  return url.replace('/image/upload/', `/image/upload/c_${crop},w_${size}${height},q_auto,f_auto/`);
}
