const BLOG_ASSET_BUCKET = "property-assets";
const BLOG_ASSET_PREFIX = "blog/";
const STORAGE_PUBLIC_PATH_MARKER = "/storage/v1/object/public/";

export function extractInlineBlogImageUrls(content) {
  const urls = [];
  const imagePattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match;

  while ((match = imagePattern.exec(String(content || "")))) {
    const url = match[1] || match[2] || match[3] || "";
    if (url) urls.push(url);
  }

  return urls;
}

export function getManagedBlogAssetPath(value) {
  if (!/^https?:\/\//i.test(String(value || "").trim())) return null;

  try {
    const parsed = new URL(String(value).trim());
    const markerIndex = parsed.pathname.indexOf(STORAGE_PUBLIC_PATH_MARKER);
    if (markerIndex < 0) return null;

    const objectPart = parsed.pathname.slice(markerIndex + STORAGE_PUBLIC_PATH_MARKER.length);
    const chunks = objectPart.split("/").filter(Boolean);
    const bucket = chunks.shift();
    if (bucket !== BLOG_ASSET_BUCKET) return null;

    const path = decodeURIComponent(chunks.join("/"));
    if (!path.startsWith(BLOG_ASSET_PREFIX)) return null;
    return path;
  } catch {
    return null;
  }
}

export function collectBlogAssetPaths(blog) {
  const urls = [
    blog?.cover_image,
    blog?.author_image_url,
    ...extractInlineBlogImageUrls(blog?.content),
  ];

  return Array.from(
    new Set(urls.map(getManagedBlogAssetPath).filter(Boolean))
  );
}

export async function removeBlogAssets(supabase, blog, { excludeBlogId = blog?.id } = {}) {
  const candidates = collectBlogAssetPaths(blog);
  if (!candidates.length) return { removed: 0, skipped: 0 };

  const { data: otherBlogs, error: lookupError } = await supabase
    .from("blogs")
    .select("id,content,cover_image,author_image_url");

  if (lookupError) {
    throw new Error(`Unable to verify blog image references: ${lookupError.message}`);
  }

  const protectedPaths = new Set();
  (otherBlogs || [])
    .filter((row) => !excludeBlogId || String(row.id) !== String(excludeBlogId))
    .forEach((row) => {
      collectBlogAssetPaths(row).forEach((path) => protectedPaths.add(path));
    });

  const removablePaths = candidates.filter((path) => !protectedPaths.has(path));
  if (!removablePaths.length) {
    return { removed: 0, skipped: candidates.length };
  }

  const { data, error: removeError } = await supabase.storage
    .from(BLOG_ASSET_BUCKET)
    .remove(removablePaths);

  if (removeError) {
    throw new Error(`Blog deleted, but image cleanup failed: ${removeError.message}`);
  }

  return {
    removed: Array.isArray(data) ? data.length : removablePaths.length,
    skipped: candidates.length - removablePaths.length,
  };
}
