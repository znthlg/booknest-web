import { NextResponse } from "next/server";

function normText(v) {
  return (v || "").toString().trim();
}

function uniqList(values) {
  return [...new Set((values || []).map((v) => normText(v)).filter(Boolean))];
}

function pickCover(volumeInfo) {
  const links = volumeInfo?.imageLinks || {};
  return (
    links.thumbnail ||
    links.smallThumbnail ||
    links.small ||
    links.medium ||
    links.large ||
    ""
  );
}

function pickIsbnFromGoogle(volumeInfo) {
  const ids = Array.isArray(volumeInfo?.industryIdentifiers)
    ? volumeInfo.industryIdentifiers
    : [];
  const isbn13 = ids.find((x) => x?.type === "ISBN_13")?.identifier;
  const isbn10 = ids.find((x) => x?.type === "ISBN_10")?.identifier;
  return normText(isbn13 || isbn10).replace(/[-\s]/g, "");
}

function publicationYearFromGoogle(volumeInfo) {
  const s = normText(volumeInfo?.publishedDate);
  if (!s) return "";
  const m = s.match(/\d{4}/);
  return m ? m[0] : "";
}

function publicationYearFromOpenLibrary(doc) {
  const first = doc?.first_publish_year;
  if (typeof first === "number" && Number.isFinite(first)) return String(first);
  const years = Array.isArray(doc?.publish_year) ? doc.publish_year : [];
  const y = years.find((v) => typeof v === "number" && Number.isFinite(v));
  return y ? String(y) : "";
}

function mapGoogleItem(item) {
  const v = item?.volumeInfo;
  if (!v?.title) return null;
  return {
    source: "Google Books",
    sourceKey: normText(item?.id),
    title: normText(v.title),
    authors: uniqList(v.authors),
    language: normText(v.language),
    publisher: normText(v.publisher),
    publicationYear: publicationYearFromGoogle(v),
    isbn: pickIsbnFromGoogle(v),
    coverImageUrl: normText(pickCover(v)),
  };
}

function mapOpenLibraryDoc(doc) {
  const title = normText(doc?.title);
  if (!title) return null;
  const isbn = uniqList(doc?.isbn);
  const coverI = doc?.cover_i;
  return {
    source: "OpenLibrary",
    sourceKey: normText(doc?.key || doc?.edition_key?.[0] || title),
    title,
    authors: uniqList(doc?.author_name),
    language: normText(Array.isArray(doc?.language) ? doc.language[0] : doc?.language),
    publisher: normText(Array.isArray(doc?.publisher) ? doc.publisher[0] : doc?.publisher),
    publicationYear: publicationYearFromOpenLibrary(doc),
    isbn: normText(isbn[0] || "").replace(/[-\s]/g, ""),
    coverImageUrl:
      typeof coverI === "number" && Number.isFinite(coverI)
        ? `https://covers.openlibrary.org/b/id/${coverI}-M.jpg`
        : "",
  };
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key =
      (item.isbn && `isbn:${item.isbn}`) ||
      `ta:${item.title.toLowerCase()}|${(item.authors[0] || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function searchGoogle(query) {
  const url =
    "https://www.googleapis.com/books/v1/volumes?q=" +
    encodeURIComponent(query) +
    "&maxResults=8&printType=books";
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) return [];
  const data = await r.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map(mapGoogleItem).filter(Boolean);
}

async function searchOpenLibrary(query) {
  const url =
    "https://openlibrary.org/search.json?q=" +
    encodeURIComponent(query) +
    "&limit=8";
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) return [];
  const data = await r.json();
  const docs = Array.isArray(data?.docs) ? data.docs : [];
  return docs.map(mapOpenLibraryDoc).filter(Boolean);
}

export async function GET(req) {
  try {
    const query = normText(new URL(req.url).searchParams.get("q"));
    if (query.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const [openResults, googleResults] = await Promise.all([
      searchOpenLibrary(query),
      searchGoogle(query),
    ]);

    return NextResponse.json({
      items: dedupe([...openResults, ...googleResults]).slice(0, 10),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Book search failed." },
      { status: 500 }
    );
  }
}
