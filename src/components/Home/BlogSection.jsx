import React from "react";
import { Link } from "react-router-dom";
import { blogs } from "../../data/blogs";

const BlogSection = () => {
  return (
    <section className="relative py-20 bg-[var(--bg-main)] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(248,222,130,0.12),transparent_35%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="font-body text-sm md:text-base tracking-[0.3em] uppercase text-[var(--gold-soft)]">
            FlyingLyte Blogs
          </p>

          <h2 className="mt-4 font-heading text-4xl md:text-6xl text-[var(--gold-main)]">
            Latest Travel & Festival Guides
          </h2>

          <p className="mt-5 max-w-2xl mx-auto font-body text-lg text-[var(--text-muted)]">
            Read festival updates, hotel booking guides, travel tips and
            destination ideas for your next journey.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.slice(0, 3).map((blog) => (
            <article
              key={blog.id}
              className="group bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)] hover:-translate-y-2 transition-all duration-300"
            >
              <div className="relative h-60 overflow-hidden">
                <img
                  src={blog.image}
                  alt={blog.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <span className="absolute top-4 left-4 rounded-full bg-black/60 border border-[var(--border-soft)] px-4 py-1 font-body text-sm text-[var(--gold-soft)] backdrop-blur">
                  {blog.category}
                </span>
              </div>

              <div className="p-6">
                <p className="font-body text-sm text-[var(--text-muted)] mb-3">
                  {blog.date} • {blog.author}
                </p>

                <h3 className="font-heading text-2xl text-white leading-snug mb-4 group-hover:text-[var(--gold-main)] transition">
                  {blog.title}
                </h3>

                <p className="font-body text-base leading-7 text-[var(--text-muted)] mb-6">
                  {blog.shortDescription}
                </p>

                <Link
                  to={`/blogs/${blog.slug}`}
                  className="inline-flex items-center gap-2 font-body text-lg text-[var(--gold-soft)] hover:text-[var(--color-start)] transition"
                >
                  Read More
                  <span className="group-hover:translate-x-1 transition">
                    →
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-14">
          <Link
            to="/blogs"
            className="inline-flex items-center justify-center rounded-full px-8 py-3 font-body text-lg text-black bg-gradient-to-r from-[var(--color-start)] to-[var(--color-end)] shadow-[0_10px_30px_rgba(234,168,42,0.25)] hover:scale-105 transition"
          >
            View All Blogs
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
