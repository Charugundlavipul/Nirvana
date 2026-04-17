import BlogPost from "../../../../src/components/Blog/BlogPost";

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  return <BlogPost slug={slug} />;
}
