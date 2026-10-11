/**
 * 将 MinIO objectName 转换为可访问的存储对象地址
 *
 * 与 moyou-manage 中的同名工具保持一致：
 * - 已是完整 URL（http/https 开头）直接返回；
 * - 否则包装为公共存储访问接口 /api/storage/object。
 */
export function getStorageObjectUrl(
  objectName?: string
): string | undefined {
  if (!objectName) {
    return undefined;
  }

  if (
    objectName.startsWith("http://") ||
    objectName.startsWith("https://")
  ) {
    return objectName;
  }

  return `/api/storage/object?objectName=${encodeURIComponent(objectName)}`;
}
