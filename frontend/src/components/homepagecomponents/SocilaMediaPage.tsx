import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import instagramPreviewImage from "../../assets/hero/Screenshot_11.png";

type Platform = "twitter" | "instagram" | "facebook" | "youtube";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load?: (element?: Element) => void;
        createTimeline?: (
          dataSource: { sourceType: "profile"; screenName: string },
          target: Element,
          options?: { theme?: "light" | "dark"; height?: number; dnt?: boolean }
        ) => Promise<Element>;
      };
      events?: {
        bind?: (eventName: "rendered", callback: (event: { target?: Element }) => void) => void;
        unbind?: (eventName: "rendered", callback: (event: { target?: Element }) => void) => void;
      };
    };
    instgrm?: {
      Embeds?: {
        process?: () => void;
      };
    };
  }
}

const loadScriptOnce = (id: string, src: string): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const scriptReady =
      src.includes("platform.twitter.com")
        ? Boolean(window.twttr?.widgets)
        : src.includes("instagram.com")
          ? Boolean(window.instgrm?.Embeds)
          : false;

    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true" || scriptReady) {
        existing.dataset.loaded = "true";
        resolve();
        return;
      }

      const timeoutId = window.setTimeout(() => {
        reject(new Error(`Timed out loading ${src}`));
      }, 6000);

      const onLoad = () => {
        window.clearTimeout(timeoutId);
        existing.dataset.loaded = "true";
        resolve();
      };
      const onError = () => {
        window.clearTimeout(timeoutId);
        reject(new Error(`Failed to load ${src}`));
      };
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", onError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    if (src.includes("platform.twitter.com")) {
      script.charset = "utf-8";
    }
    script.async = true;
    script.defer = true;
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Timed out loading ${src}`));
    }, 6000);
    script.addEventListener(
      "load",
      () => {
        window.clearTimeout(timeoutId);
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        window.clearTimeout(timeoutId);
        reject(new Error(`Failed to load ${src}`));
      },
      {
        once: true,
      }
    );
    document.body.appendChild(script);
  });
};

const getInstagramPostEmbedUrl = (urlValue: string) => {
  try {
    const url = new URL(urlValue);
    const [kind, code] = url.pathname.split("/").filter(Boolean);
    const isSupportedKind = kind === "p" || kind === "reel" || kind === "tv";

    if (!isSupportedKind || !code) {
      return null;
    }

    return `https://www.instagram.com/${kind}/${code}/embed`;
  } catch {
    return null;
  }
};

const getInstagramUsername = (profileUrl: string) => {
  try {
    const url = new URL(profileUrl);
    const [firstSegment] = url.pathname.split("/").filter(Boolean);
    return firstSegment || "scpd_odisha";
  } catch {
    return "scpd_odisha";
  }
};

const getInstagramProfileUrl = (profileUrl: string) => {
  const username = getInstagramUsername(profileUrl);
  return `https://www.instagram.com/${username}/`;
};

const TWITTER_RATE_LIMIT_KEY = "twitter_timeline_rate_limited_until";
const TWITTER_RATE_LIMIT_COOLDOWN_MS = 30 * 60 * 1000;
const TWITTER_LAST_ATTEMPT_KEY = "twitter_timeline_last_attempted_at";
const TWITTER_ATTEMPT_THROTTLE_MS = 15 * 1000;
const FACEBOOK_PLUGIN_MAX_WIDTH = 500;
const FACEBOOK_PLUGIN_HEIGHT = 560;

const isTwitterRateLimitCooldownActive = () => {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(TWITTER_RATE_LIMIT_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
};

const setTwitterRateLimitCooldown = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    TWITTER_RATE_LIMIT_KEY,
    String(Date.now() + TWITTER_RATE_LIMIT_COOLDOWN_MS)
  );
};

const clearTwitterRateLimitCooldown = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TWITTER_RATE_LIMIT_KEY);
};

const hasRecentTwitterAttempt = () => {
  if (typeof window === "undefined") return false;
  const raw = window.sessionStorage.getItem(TWITTER_LAST_ATTEMPT_KEY);
  if (!raw) return false;
  const lastAttempt = Number(raw);
  if (!Number.isFinite(lastAttempt)) return false;
  return Date.now() - lastAttempt < TWITTER_ATTEMPT_THROTTLE_MS;
};

const markTwitterAttempt = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TWITTER_LAST_ATTEMPT_KEY, String(Date.now()));
};

function TwitterEmbed({ profileUrl }: { profileUrl: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [timelineUnavailable, setTimelineUnavailable] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.replaceChildren();

    let cancelled = false;
    let watchdogId: number | undefined;
    let onRendered: ((event: { target?: Element }) => void) | undefined;
    setTimelineUnavailable(false);

    const anchor = document.createElement("a");
    anchor.className = "twitter-timeline";
    anchor.href = profileUrl;
    anchor.textContent = "Tweets by state_scpd";
    container.appendChild(anchor);

    const onScriptError = (event: Event) => {
      const target = event.target;
      if (
        target instanceof HTMLScriptElement &&
        target.src.includes("platform.twitter.com/widgets.js")
      ) {
        setTimelineUnavailable(true);
        setTwitterRateLimitCooldown();
      }
    };

    const onResourceError = (event: Event) => {
      const target = event.target;
      if (
        target instanceof HTMLIFrameElement &&
        target.src.includes("syndication.twitter.com") &&
        container.contains(target)
      ) {
        setTimelineUnavailable(true);
        setTwitterRateLimitCooldown();
      }
    };

    window.addEventListener("error", onScriptError, true);
    window.addEventListener("error", onResourceError, true);

    if (isTwitterRateLimitCooldownActive()) {
      setTimelineUnavailable(true);
      return () => {
        cancelled = true;
        window.removeEventListener("error", onScriptError, true);
        window.removeEventListener("error", onResourceError, true);
        container.replaceChildren();
      };
    }

    if (retryTick === 0 && hasRecentTwitterAttempt()) {
      setTimelineUnavailable(true);
      return () => {
        cancelled = true;
        window.removeEventListener("error", onScriptError, true);
        window.removeEventListener("error", onResourceError, true);
        container.replaceChildren();
      };
    }

    const loadTimeline = async () => {
      try {
        markTwitterAttempt();
        await loadScriptOnce("twitter-wjs", "https://platform.twitter.com/widgets.js");
        if (cancelled) return;

        onRendered = (event: { target?: Element }) => {
          if (!event.target || cancelled) return;
          if (container.contains(event.target)) {
            clearTwitterRateLimitCooldown();
            setTimelineUnavailable(false);
          }
        };
        window.twttr?.events?.bind?.("rendered", onRendered);

        window.twttr?.widgets?.load?.(container);
        watchdogId = window.setTimeout(() => {
          const hasTwitterIframe = container.querySelector("iframe[src*='twitter.com']") !== null;
          if (!hasTwitterIframe) {
            setTimelineUnavailable(true);
            setTwitterRateLimitCooldown();
          }
        }, 6000);
      } catch {
        if (!cancelled) {
          setTimelineUnavailable(true);
          setTwitterRateLimitCooldown();
        }
      }
    };

    void loadTimeline();

    return () => {
      cancelled = true;
      window.removeEventListener("error", onScriptError, true);
      window.removeEventListener("error", onResourceError, true);
      if (watchdogId) {
        window.clearTimeout(watchdogId);
      }
      if (onRendered) {
        window.twttr?.events?.unbind?.("rendered", onRendered);
      }
      container.replaceChildren();
    };
  }, [profileUrl, retryTick]);

  return (
    <div className="relative h-full bg-white px-2 py-3">
      <div ref={containerRef} className="h-full overflow-auto" />
      {timelineUnavailable && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white px-4 text-center">
          <p className="text-slate-700 font-medium">
            Twitter timeline is temporarily unavailable (rate-limited by X).
          </p>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-800 underline underline-offset-2 break-all"
          >
            {profileUrl}
          </a>
          <button
            type="button"
            onClick={() => setRetryTick((prev) => prev + 1)}
            className="mt-1 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Retry timeline
          </button>
        </div>
      )}
    </div>
  );
}

function InstagramEmbed({ profileUrl }: { profileUrl: string }) {
  const postEmbedUrl = useMemo(() => getInstagramPostEmbedUrl(profileUrl), [profileUrl]);
  const normalizedProfileUrl = useMemo(() => getInstagramProfileUrl(profileUrl), [profileUrl]);
  const instagramPosterImage = instagramPreviewImage;

  if (postEmbedUrl) {
    return (
      <div className="h-full bg-white px-2 py-3">
        <iframe
          title="Instagram post embed"
          src={postEmbedUrl}
          className="h-full w-full"
          style={{ border: "none" }}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-white p-3">
      <a
        href={normalizedProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:opacity-95"
        aria-label="Open Instagram profile"
      >
        <img
          src={instagramPosterImage}
          alt="Instagram preview"
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </a>
    </div>
  );
}

export default function SocialMediaPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Platform>("facebook");
  const [twitterActivated, setTwitterActivated] = useState(false);
  const facebookContainerRef = useRef<HTMLDivElement | null>(null);
  const [facebookWidth, setFacebookWidth] = useState(500);
  const socialLinks: Record<Platform, string> = {
    twitter: "https://twitter.com/state_scpd?ref_src=twsrc%5Etfw",
    instagram: "https://www.instagram.com/scpdodisha/",
    facebook: "https://www.facebook.com/scpdodisha/",
    youtube: "https://www.youtube.com/@scpdofficepersonswithdisab2386",
  };
  // Paste your SnapWidget/Elfsight embed URL here to show multi-post Instagram feed.
  // Example: https://snapwidget.com/embed/123456
  const instagramFeedWidgetUrl = "";
  const activePlatformLabel = t(`homepage.${tab}`);
  const activePlatformLink = socialLinks[tab];
  const youtubeEmbedLink =
    "https://www.youtube.com/embed/0F7GyQWgD9g?si=Dkfc92GcmmLrZLK4";

  useEffect(() => {
    if (tab === "twitter" && !twitterActivated) {
      setTwitterActivated(true);
    }
  }, [tab, twitterActivated]);

  useEffect(() => {
    if (tab !== "facebook") return;
    const element = facebookContainerRef.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = Math.max(320, Math.floor(element.clientWidth));
      setFacebookWidth(nextWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [tab]);

  const facebookEmbedLink = useMemo(() => {
    const pageUrl = encodeURIComponent(socialLinks.facebook);
    const pluginWidth = Math.min(facebookWidth, FACEBOOK_PLUGIN_MAX_WIDTH);
    return `https://www.facebook.com/plugins/page.php?href=${pageUrl}&tabs=timeline&width=${pluginWidth}&height=${FACEBOOK_PLUGIN_HEIGHT}&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`;
  }, [socialLinks.facebook, facebookWidth]);
  const facebookPluginWidth = Math.min(facebookWidth, FACEBOOK_PLUGIN_MAX_WIDTH);
  const facebookScale = facebookWidth / facebookPluginWidth;
  const facebookInnerHeight = Math.max(420, Math.round(FACEBOOK_PLUGIN_HEIGHT / facebookScale));

  const tabClasses = (value: Platform) =>
    `px-4 py-2 rounded-md text-lg font-medium transition-all duration-200 ${tab === value
      ? "bg-slate-900 text-white shadow"
      : "text-slate-700 hover:bg-slate-200"
    }`;

  const renderEmbedContent = () => {
    return (
      <div className="h-full">
        <div className={tab === "twitter" ? "h-full" : "hidden"}>
          {twitterActivated && <TwitterEmbed profileUrl={socialLinks.twitter} />}
        </div>

        {tab === "instagram" && (
          instagramFeedWidgetUrl ? (
            <div className="h-full bg-white px-2 py-3">
              <iframe
                title="Instagram feed widget"
                src={instagramFeedWidgetUrl}
                className="h-full w-full"
                style={{ border: "none", overflow: "hidden" }}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <InstagramEmbed profileUrl={socialLinks.instagram} />
          )
        )}

        {tab === "facebook" && (
          <div ref={facebookContainerRef} className="h-full w-full overflow-hidden bg-white">
            <div
              style={{
                width: `${facebookPluginWidth}px`,
                height: `${facebookInnerHeight}px`,
                transform: `scale(${facebookScale})`,
                transformOrigin: "top left",
              }}
            >
              <iframe
                key={facebookEmbedLink}
                title="Facebook page feed"
                src={facebookEmbedLink}
                style={{
                  border: "none",
                  overflow: "hidden",
                  width: `${facebookPluginWidth}px`,
                  height: `${facebookInnerHeight}px`,
                  backgroundColor: "white",
                }}
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                loading="lazy"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {tab === "youtube" && (
          <iframe
            title="YouTube channel videos"
            src={youtubeEmbedLink}
            className="h-full w-full bg-white"
            style={{ border: "none" }}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
      </div>
    );
  };

  return (
    <section className="w-full px-6 md:px-12 py-8 bg-slate-100">
      {/* TITLE */}
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6 tracking-wide">
        {t("homepage.socialMediaTitle")}
      </h1>

      <div className="flex justify-center">
        <div className="w-full max-w-6xl">
            <div
  className="rounded-xl shadow-md min-h-[560px] md:h-[580px] p-6 flex flex-col border border-slate-200"
  style={{ backgroundColor: "#236EB9" }}
>
            {/* TABS */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg mb-5 justify-start items-start">
              <button className={tabClasses("facebook")} onClick={() => setTab("facebook")}>
                {t("homepage.facebook")}
              </button>
              <button className={tabClasses("instagram")} onClick={() => setTab("instagram")}>
                {t("homepage.instagram")}
              </button>
              <button className={tabClasses("twitter")} onClick={() => setTab("twitter")}>
                {t("homepage.twitter")}
              </button>
              <button className={tabClasses("youtube")} onClick={() => setTab("youtube")}>
                {t("homepage.youtube")}
              </button>
            </div>

            {/* CONTENT */}
            <div
  className="relative flex-1 min-h-0 rounded-lg overflow-hidden border border-slate-200"
  style={{ backgroundColor: "#236EB9" }}
>
              {renderEmbedContent()}
            </div>

            {/* BUTTON */}
            <a
              href={activePlatformLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 bg-slate-900 text-white px-10 py-3 rounded-md text-lg font-semibold hover:bg-slate-800 transition w-fit"
            >
              {t("homepage.visit")} {activePlatformLabel}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
