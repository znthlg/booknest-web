import { NextResponse } from "next/server";

function normalizeIsbn(isbn) {
  return (isbn || "").toString().trim().replace(/[-\s]/g, "");
}

function looksLikeIsbn(isbn) {
  // Accept ISBN-10 and ISBN-13 with optional X check digit.
  return /^[0-9]{9}[0-9Xx]$/.test(isbn) || /^[0-9]{13}$/.test(isbn);
}

async function tryGoogle(isbn) {
  const googleUrl =
    "https://www.googleapis.com/books/v1/volumes?q=" +
    encodeURIComponent(`isbn:${isbn}`) +
    "&maxResults=1";

  const r = await fetch(googleUrl, { method: "GET" });
  if (!r.ok) return null;

  const data = await r.json();
  const item = data?.items?.[0];
  const volumeInfo = item?.volumeInfo;
  if (!volumeInfo?.title) return null;

  const title = volumeInfo.title;
  const authors = Array.isArray(volumeInfo.authors) ? volumeInfo.authors : [];
  const language = volumeInfo.language || "";
  const publisher =
    typeof volumeInfo.publisher === "string" ? volumeInfo.publisher.trim() : "";

  const imageLinks = volumeInfo.imageLinks || {};
  const coverImageUrl =
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail ||
    imageLinks.small ||
    imageLinks.medium ||
    imageLinks.large ||
    "";

  return {
    title,
    authors,
    language,
    publisher: publisher || null,
    coverImageUrl: coverImageUrl || null,
  };
}

function publisherFromOpenLibraryDoc(doc) {
  const p = doc?.publisher;
  if (Array.isArray(p) && p.length) {
    const parts = [...new Set(p.map((x) => String(x || "").trim()).filter(Boolean))];
    return parts.length ? parts.join(", ") : "";
  }
  if (typeof p === "string" && p.trim()) return p.trim();
  return "";
}

async function tryOpenLibrary(isbn) {
  // Open Library Search API by ISBN.
  // Docs: https://openlibrary.org/developers/api#search
  const url =
    "https://openlibrary.org/search.json?isbn=" + encodeURIComponent(isbn) + "&limit=1";

  const r = await fetch(url, { method: "GET" });
  if (!r.ok) return null;

  const data = await r.json();
  const doc = data?.docs?.[0];
  if (!doc?.title) return null;

  const title = doc.title;
  const authors = Array.isArray(doc.author_name) ? doc.author_name : [];
  const language = Array.isArray(doc.language) ? doc.language[0] || "" : (doc.language || "");
  const publisher = publisherFromOpenLibraryDoc(doc);

  const coverI = doc.cover_i;
  const coverImageUrl =
    coverI && typeof coverI === "number"
      ? `https://covers.openlibrary.org/b/id/${coverI}-M.jpg`
      : null;

  return {
    title,
    authors,
    language,
    publisher: publisher || null,
    coverImageUrl,
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const isbn = normalizeIsbn(body?.isbn);

    if (!isbn || !looksLikeIsbn(isbn)) {
      return NextResponse.json(
        { error: "Invalid ISBN. Provide a valid ISBN-10 or ISBN-13." },
        { status: 400 }
      );
    }

    // Prefer Google, but fall back to Open Library and also use it for covers
    // when Google doesn't return an image.
    const google = await tryGoogle(isbn);
    let open = null;

    if (!google || !google.title) {
      open = await tryOpenLibrary(isbn);
    } else if (!google.coverImageUrl) {
      // Try to improve just the cover using Open Library.
      open = await tryOpenLibrary(isbn);
    }

    const merged = {
      title: google?.title || open?.title || "",
      authors: (google?.authors && google.authors.length ? google.authors : open?.authors) || [],
      language: google?.language || open?.language || "",
      publisher:
        (google?.publisher && String(google.publisher).trim()) ||
        (open?.publisher && String(open.publisher).trim()) ||
        "",
      coverImageUrl: google?.coverImageUrl || open?.coverImageUrl || null,
    };

    if (!merged.title) {
      return NextResponse.json(
        { error: "No book found for this ISBN." },
        { status: 404 }
      );
    }

    return NextResponse.json(merged);
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "ISBN lookup error." },
      { status: 500 }
    );
  }
}

