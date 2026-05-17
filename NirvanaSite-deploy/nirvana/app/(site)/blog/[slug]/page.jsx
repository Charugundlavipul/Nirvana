import BlogPost from "../../../../src/components/Blog/BlogPost";
import StructuredData from "../../../../src/components/StructuredData";
import { getBlogBySlug, getBlogSlugs } from "../../../../src/lib/serverContentApi";
import { buildMetadata } from "../../../../src/lib/seo";
import { absoluteUrl, SITE_NAME } from "../../../../src/lib/siteConfig";

export const revalidate = 1800;

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    return buildMetadata({
      title: "Blog Post Not Found",
      pathname: `/blog/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: `${post.title} | ${SITE_NAME} Journal`,
    description: post.excerpt || `Read ${post.title} on the ${SITE_NAME} luxury travel blog.`,
    pathname: `/blog/${slug}`,
    images: [post.cover_image || "/logo512.png"],
    type: "article",
    keywords: [
      post.title,
      post.category || "luxury travel",
      "Smoky Mountains travel guide",
      "vacation rental blog",
      "NirvanaLuxe journal",
    ].filter(Boolean),
  });
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  const articleJsonLd = post ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image ? [post.cover_image] : [],
    datePublished: post.created_at,
    author: [{
      "@type": "Organization",
      name: post.author_name || post.author || "NirvanaLuxe Team",
      url: absoluteUrl("/"),
    }],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl("/logo512.png") },
    },
    mainEntityOfPage: absoluteUrl(`/blog/${slug}`),
  } : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Journal", item: absoluteUrl("/blog") },
      { "@type": "ListItem", position: 3, name: post?.title || slug },
    ],
  };

  return (
    <>
      {articleJsonLd && <StructuredData data={articleJsonLd} />}
      <StructuredData data={breadcrumbJsonLd} />
      <BlogPost slug={slug} />
    </>
  );
}
