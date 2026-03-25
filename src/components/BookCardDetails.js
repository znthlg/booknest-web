"use client";

function cleanStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function IconGift({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875a2.625 2.625 0 1 0-2.625 2.625H12m0-2.625V7.5m0-2.625a2.625 2.625 0 1 1 2.625 2.625H12m-8.25 3.75h16.5"
      />
    </svg>
  );
}

function IconLent({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
      />
    </svg>
  );
}

function IconSigned({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

const iconWrapBase =
  "inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-foreground/75 shadow-sm";

/** Hediye / ödünç / imza — yalnızca ilgili bayrak true ise. */
export function BookAttributeIcons({ book, compact = false }) {
  const iconWrap = `${iconWrapBase} ${compact ? "size-6" : "size-7"}`;
  const iconCls = compact ? "size-3 text-rose-200/85" : "size-3.5 text-rose-200/85";
  const giftHint = book.isGift === true ? (cleanStr(book.giftedBy) ? `Hediye — ${book.giftedBy}` : "Hediye") : null;
  const lentHint =
    book.isLent === true ? (cleanStr(book.lentTo) ? `Ödünç — ${book.lentTo}` : "Ödünçte") : null;
  const signedHint = book.isSigned === true ? "İmzalı" : null;
  if (!giftHint && !lentHint && !signedHint) return null;
  return (
    <div className="flex items-center gap-1">
      {giftHint ? (
        <span className={iconWrap} title={giftHint} aria-label={giftHint}>
          <IconGift className={iconCls} />
        </span>
      ) : null}
      {lentHint ? (
        <span className={iconWrap} title={lentHint} aria-label={lentHint}>
          <IconLent className={compact ? "size-3 text-sky-200/85" : "size-3.5 text-sky-200/85"} />
        </span>
      ) : null}
      {signedHint ? (
        <span className={iconWrap} title={signedHint} aria-label={signedHint}>
          <IconSigned className={compact ? "size-3 text-amber-200/85" : "size-3.5 text-amber-200/85"} />
        </span>
      ) : null}
    </div>
  );
}

/**
 * Kategori / dil pill’leri, konum, notlar.
 * `compact`: liste satırı — bilgiler tek satırda · ile birleşir.
 */
export default function BookCardDetails({
  book,
  categoryLabel,
  placementLabel,
  compact = false,
}) {
  const cat = cleanStr(categoryLabel);
  const lang = cleanStr(book.publicationLanguage || book.language);
  const publisher = cleanStr(book.publisher);
  const loc = cleanStr(placementLabel);
  const notes = cleanStr(book.notes);

  if (compact) {
    const metaParts = [
      cat,
      publisher,
      lang ? lang.toLowerCase() : null,
      loc,
    ].filter(Boolean);
    const metaLine = metaParts.join(" · ");

    if (!metaLine && !notes) return null;

    return (
      <div className="mt-1 min-w-0">
        {metaLine ? (
          <p className="truncate text-[11px] leading-snug text-foreground/50" title={metaLine}>
            {metaLine}
          </p>
        ) : null}
        {notes ? (
          <p className="mt-0.5 truncate text-[11px] italic text-foreground/40" title={notes}>
            {notes}
          </p>
        ) : null}
      </div>
    );
  }

  const showChips = cat || lang || publisher;

  return (
    <div className="mt-3 space-y-2.5">
      {showChips ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {cat ? (
            <span className="max-w-[85%] truncate rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-foreground/80">
              {cat}
            </span>
          ) : null}
          {publisher ? (
            <span
              className="max-w-[85%] truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-foreground/65"
              title={publisher}
            >
              {publisher}
            </span>
          ) : null}
          {lang ? (
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums tracking-wider text-foreground/55">
              {lang.toLowerCase()}
            </span>
          ) : null}
        </div>
      ) : null}

      {loc ? (
        <p className="text-[12px] leading-snug text-foreground/50 line-clamp-2">{loc}</p>
      ) : null}

      {notes ? (
        <p className="text-[12px] leading-relaxed text-foreground/55 line-clamp-2">{notes}</p>
      ) : null}
    </div>
  );
}
