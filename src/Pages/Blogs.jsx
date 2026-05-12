import React from "react";
import { Link } from "react-router-dom";
import { blogs } from "../data/blogs";

const Blogs = () => {
  return (
    <main className="min-h-screen bg-[var(--bg-main)] text-white py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="font-body text-sm md:text-base tracking-[0.3em] uppercase text-[var(--gold-soft)]">
            FlyingLyte Blogs
          </p>

          <h1 className="mt-4 font-heading text-5xl md:text-7xl text-[var(--gold-main)]">
            Travel Stories & Tips
          </h1>

          <p className="mt-5 max-w-2xl mx-auto font-body text-lg text-[var(--text-muted)]">
            Helpful hotel guides, booking tips, festival updates, destination
            ideas and travel planning advice.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
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

                <h2 className="font-heading text-2xl text-white leading-snug mb-4 group-hover:text-[var(--gold-main)] transition">
                  {blog.title}
                </h2>

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
      </div>
    </main>
  );
};

export default Blogs;
