import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchCmsMedia, CmsMediaItem } from "../../services/cms";

/* ---------------- LOCAL HERO IMAGE FALLBACK ---------------- */
const modules = import.meta.glob(
  "../../assets/hero/*.{jpg,jpeg,png,webp,avif}",
  {
    eager: true,
    import: "default",
  }
) as Record<string, string>;

type Slide = Pick<CmsMediaItem, "url" | "mimeType" | "altText" | "captionTextColor"> & {
  id?: number;
};

/* ---------------- FALLBACK CAPTIONS ---------------- */
const FALLBACK_CAPTIONS: string[] = [
  "Empowering persons with disabilities through inclusive governance.",
  "Ensuring equal opportunities and social justice for all.",
  "Building an accessible and barrier-free Odisha.",
  "Supporting dignity, rights, and independence for every citizen.",
  "Transforming lives through welfare and empowerment initiatives.",
];

function isVideoMimeType(mimeType: unknown): boolean {
  return typeof mimeType === "string" && mimeType.startsWith("video/");
}

function normalizeCaptionColor(value: unknown): string {
  if (typeof value !== "string") {
    return "#ffffff";
  }

  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }

  return "#ffffff";
}

export default function HeroSection() {
  const { t } = useTranslation();
  /* ---------------- CAPTIONS ---------------- */
  const [captions, setCaptions] = useState<string[]>([]);

  /* ---------------- CAROUSEL ---------------- */
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [i, setI] = useState(0);
  const timerRef = useRef<number | null>(null);

  /* ---------------- FETCH CAPTIONS ---------------- */
  useEffect(() => {
    fetch("/api/v1/success-stories-caption")
      .then((res) => res.json())
      .then((data) => {
        // Supports: { summaries: [] } OR { summary: "" }
        if (Array.isArray(data?.summaries) && data.summaries.length > 0) {
          setCaptions(data.summaries);
        } else if (typeof data?.summary === "string") {
          setCaptions([data.summary]);
        } else {
          setCaptions(FALLBACK_CAPTIONS);
        }
      })
      .catch(() => {
        setCaptions(FALLBACK_CAPTIONS);
      });
  }, []);

  /* ---------------- FALLBACK SLIDES ---------------- */
  const fallbackSlides = useMemo<Slide[]>(
    () =>
      Object.values(modules)
        .sort()
        .map((url, idx) => ({
          url,
          mimeType: "image/jpeg",
          altText: `Hero ${idx + 1}`,
        })),
    []
  );

  /* ---------------- FETCH CMS MEDIA ---------------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchCmsMedia("carousel");
        if (!cancelled && data?.length) {
          setSlides(
            data.map((item) => ({
              id: item.id,
              url: item.url,
              mimeType: item.mimeType,
              altText: item.altText || item.originalName || "",
              captionTextColor: item.captionTextColor ?? null,
            }))
          );
          setI(0);
          return;
        }
      } catch (err) {
        console.warn("Hero carousel fallback to static assets", err);
      }

      if (!cancelled) {
        setSlides([]);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const effectiveSlides = slides.length ? slides : fallbackSlides;
  const hasSlides = effectiveSlides.length > 0;
  const currentSlide = hasSlides ? effectiveSlides[i] : null;

  const activeSlide = hasSlides ? effectiveSlides[i % effectiveSlides.length] : null;
  const activeIsVideo = isVideoMimeType(activeSlide?.mimeType);

  const activeCaption =
    captions.length > 0 ? captions[i % captions.length] : "";
  const caption = currentSlide?.altText?.trim() || activeCaption.trim();
  const captionColor = normalizeCaptionColor(currentSlide?.captionTextColor);

  /* ---------------- AUTOPLAY ---------------- */
  useEffect(() => {
    if (!effectiveSlides.length) return;

    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setI((v) => (v + 1) % effectiveSlides.length);
      }, 5000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [effectiveSlides.length, isPlaying]);

  const prev = () => {
    if (!hasSlides) return;
    setI((v) => (v - 1 + effectiveSlides.length) % effectiveSlides.length);
  };

  const next = () => {
    if (!hasSlides) return;
    setI((v) => (v + 1) % effectiveSlides.length);
  };

  /* ---------------- PROFILE DATA ---------------- */
  const leaders = [
    {
      name: t("officials.ministerName"),
      role: t("officials.ministerRole"),
      img: "/brand/minister.jpeg",
    },
    {
      name: t("officials.secretaryName"),
      role: t("officials.secretaryRole"),
      img: "/brand/rsgopalan.png",
    },
    {
      name: t("officials.commissionerName"),
      role: t("officials.commissionerRole"),
      img: "/brand/commissioner.jpg",
    },
  ];

  const cardBackgrounds = ["bg-white", "bg-blue-50", "bg-indigo-50"]; // rotate subtle backgrounds per card

  return (
    <section className="w-full flex flex-col lg:flex-row overflow-hidden">
      {/* ---------------- LEFT : HERO CAROUSEL ---------------- */}
      <div className="w-full lg:w-2/3 relative bg-gray-100 overflow-hidden h-[320px] sm:h-[380px] md:h-[450px] lg:h-[520px]">
        {hasSlides && activeSlide ? (
          activeIsVideo ? (
            <video
              src={activeSlide.url}
              autoPlay
              loop
              muted
              className="w-full h-full object-cover block"
            />
          ) : (
            <img
              src={activeSlide.url}
              alt={activeSlide.altText ?? ""}
              className="w-full h-full object-cover block"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            No hero media available
          </div>
        )}

        {caption && (
          <div className="absolute inset-x-0 bottom-5 px-6 py-3 flex justify-center pointer-events-none">
            <p
              className="text-2xl md:text-3xl font-semibold text-center max-w-5xl 
                 drop-shadow-md bg-black/45 px-5 py-3 rounded-lg"
              style={{ color: captionColor }}
            >
              {caption}
            </p>
          </div>
        )}


        {/* ---------------- PREV / NEXT ---------------- */}
        <button
          type="button"
          onClick={prev}
          disabled={!hasSlides}
          aria-label="Previous slide"
          className="absolute left-5 top-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-white/90 text-[#0f2d50] text-5xl leading-none shadow-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &#8249;
        </button>

        <button
          type="button"
          onClick={next}
          disabled={!hasSlides}
          aria-label="Next slide"
          className="absolute right-5 top-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-white/90 text-[#0f2d50] text-5xl leading-none shadow-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &#8250;
        </button>

        {/* ---------------- PLAY / PAUSE ---------------- */}
        <div className="absolute left-5 bottom-5 z-20">
          <button
            type="button"
            onClick={() => setIsPlaying((v) => !v)}
            aria-label={isPlaying ? "Pause carousel" : "Play carousel"}
            className="w-12 h-12 rounded-sm bg-white/90 text-[#0f0f0f] text-2xl font-semibold leading-none shadow-md hover:bg-white"
          >
            {isPlaying ? "||" : ">"}
          </button>
        </div>
      </div>

      {/* ---------------- RIGHT : LEADERS PANEL ---------------- */}
      {/* RIGHT - PROFILE PANEL */}
    <div className="w-full lg:w-1/3 bg-[#236EB9] flex items-stretch justify-center p-8 m-0 h-[320px] sm:h-[380px] md:h-[450px] lg:h-[520px] overflow-y-auto">      <div className="flex flex-col gap-4 w-full h-full bg black">
          {leaders.map((l, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-6 ${cardBackgrounds[idx % cardBackgrounds.length]} rounded-2xl shadow-md p-6 hover:shadow-xl transition border border-black/10 min-h-[150px]`}
            >
              <img
                src={l.img}
                className="w-20 h-24 rounded-lg object-cover"
                alt={l.name}
              />

              <div className="leading-tight">
                <h3 className="font-bold text-xxl text-black">{l.name}</h3>
                <p className="text-lg text-black">
                  {(String(l.role) || "").split(/\r?\n/).map((line, li, arr) => (
                    <span key={li}>
                      {line}
                      {li < arr.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
