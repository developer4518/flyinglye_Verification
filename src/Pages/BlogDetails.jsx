import React from "react";
import { Link, useParams } from "react-router-dom";
import { blogs } from "../data/blogs";

const BlogDetails = () => {
  const { slug } = useParams();

  const blog = blogs.find((item) => item.slug === slug);

  if (!blog) {
    return (
      <main className="min-h-screen bg-(--bg-main) text-white flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-heading text-4xl text-(--gold-main) mb-4">
            Blog Not Found
          </h1>

          <Link
            to="/blogs"
            className="font-body text-(--gold-soft) hover:text-(--color-start)"
          >
            Back to Blogs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-(--bg-main) text-white">
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(248,222,130,0.12),transparent_35%)]" />

        <div className="relative max-w-5xl mx-auto px-4">
          <Link
            to="/blogs"
            className="font-body text-(--gold-soft) hover:text-(--color-start)"
          >
            ← Back to Blogs
          </Link>

          <div className="mt-8">
            <p className="font-body text-sm md:text-base tracking-[0.2em] uppercase text-(--gold-soft) mb-4">
              {blog.date} • {blog.author} • {blog.category}
            </p>

            <h1 className="font-heading text-4xl md:text-7xl text-(--gold-main) leading-tight">
              {blog.title}
            </h1>

            <p className="mt-6 max-w-3xl font-body text-xl leading-8 text-(--text-muted)">
              {blog.shortDescription}
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4">
        <div className="rounded-3xl overflow-hidden border border-(--border-soft) shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <img
            src={blog.image}
            alt={blog.title}
            className="w-full h-70 md:h-130 object-cover"
          />
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-14">
        <article className="bg-(--bg-card) border border-(--border-soft) rounded-3xl p-6 md:p-10">
          <div className="font-body text-lg md:text-xl leading-9 text-(--text-main) whitespace-pre-line">
            {blog.description}
          </div>
        </article>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-20">
        <Link
          to="/blogs"
          className="inline-flex items-center justify-center rounded-full px-8 py-3 font-body text-lg text-black bg-linear-to-r from-start to-end hover:scale-105 transition"
        >
          View More Blogs
        </Link>
      </section>
    </main>
  );
};

export default BlogDetails;
