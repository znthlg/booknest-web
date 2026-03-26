import Link from "next/link";

export const metadata = {
  title: "Support | BookNest",
  description: "BookNest support and app information.",
};

const features = [
  "Scan books instantly using barcode (ISBN)",
  "Automatically fetch book details and cover images",
  "Search online by book title or author name and auto-fill new book details for quick adding",
  "Organize books by rooms, shelves, and positions with your own naming system",
  "Track reading status: read, reading, or not started",
  "Manage borrowed and lent books",
  "Mark and track gifted books",
  "Mark and track signed books by authors",
  "Search and filter by title, author, or category",
  "Clean and minimal interface focused on usability",
  "Well-designed main page with useful information",
];

export default function SupportPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">BookNest Support</h1>
        <p className="mt-3 text-sm leading-7 text-foreground/80">
          Build your own book space and always know what you own, read, signed and gifted books,
          or lend. BookNest helps you organize and manage your personal book collection in a
          simple and intelligent way.
        </p>

        <section className="mt-6">
          <h2 className="text-base font-semibold text-foreground">Features</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-foreground/85">
            {features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6 space-y-3 text-sm leading-7 text-foreground/85">
          <p>
            BookNest gives you full flexibility to customize your own system. You can create,
            edit, and expand your category structure, or build on the default categories in the
            app. In the same way, you can design your physical library exactly as it exists in
            real life.
          </p>
          <p>
            Organize books across multiple locations such as home, office, or summer house. Define
            rooms, shelves, and positions as you prefer. Your entire structure is personal and
            fully adaptable.
          </p>
          <p>
            BookNest is designed for readers who want full control over their physical library
            with a modern and intuitive experience. We continuously improve the app based on user
            feedback.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
          <h2 className="text-sm font-semibold text-foreground">Contact Support</h2>
          <p className="mt-2 text-sm text-foreground/80">
            You can always reach us through the app. We respond quickly to requests, feedback, and
            help needs.
          </p>
          <p className="mt-2 text-sm">
            <a className="underline hover:no-underline" href="mailto:info@zenithalig.com">
              Contact us
            </a>
          </p>
        </section>

        <div className="mt-8 border-t border-white/10 pt-4 text-sm text-foreground/70">
          <Link href="/privacy-policy" className="underline hover:no-underline">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
