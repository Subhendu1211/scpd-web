import React, { useEffect, useRef, useState } from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { redirectToCaseManagementLogin } from "../../utils/externalNavigation";
import { RiUserAddFill } from "react-icons/ri";
import { FaUserFriends } from "react-icons/fa";
import { FaFacebook } from "react-icons/fa6";
import { FaTwitter } from "react-icons/fa";
import { FaInstagramSquare } from "react-icons/fa";
import { IoLogoYoutube } from "react-icons/io";
import { FaSearch } from "react-icons/fa";
import SiteSearch from "../SiteSearch";
import { api } from "../../services/api";
export default function HeaderBar() {
  const { t } = useTranslation();
  const [lang, setLang] = useState<"en" | "or">(() => {
    return (i18n.language === "or") ? "or" : "en";
  });
  const [size, setSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);
  const [invert, setInvert] = useState(false);
  const [desaturate, setDesaturate] = useState(false);
  const [textSpacing, setTextSpacing] = useState(false);
  const [tallerLines, setTallerLines] = useState(false);
  const [hideImages, setHideImages] = useState(false);
  const [bigCursor, setBigCursor] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showA11y, setShowA11y] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [showLangConfirm, setShowLangConfirm] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const closeA11y = () => setShowA11y(false);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  //screen reader
  const speakSections = (selectors: string[]) => {
    // If already reading, stop and return
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    const elements: HTMLElement[] = [];

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        elements.push(el as HTMLElement);
      });
    });

    if (elements.length === 0) return;

    setIsReading(true);

    const speakNext = (index: number) => {
      if (index >= elements.length) {
        setIsReading(false);
        return;
      }

      const el = elements[index];
      const text = el.innerText.trim();
      if (!text) {
        speakNext(index + 1);
        return;
      }

      // Add highlight
      el.classList.add("sr-highlight");

      // Scroll element into view
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Small delay to allow browser to repaint
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.lang = lang === "en" ? "en-US" : "or-IN";

        utterance.onend = () => {
          el.classList.remove("sr-highlight");
          speakNext(index + 1);
        };

        window.speechSynthesis.speak(utterance);
      }, 100); // 100ms delay ensures highlight is visible
    };

    speakNext(0);
  };

  // Lock scroll + focus trap when open
  useEffect(() => {
    const body = document.body;
    if (showA11y) {
      lastFocusRef.current = document.activeElement as HTMLElement | null;
      body.classList.add("modal-open");
      // focus first focusable
      requestAnimationFrame(() => {
        const dlg = dialogRef.current;
        if (!dlg) return;
        const focusables = dlg.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        (focusables[0] || dlg).focus();
      });
    } else {
      body.classList.remove("modal-open");
      lastFocusRef.current?.focus?.();
    }
    return () => body.classList.remove("modal-open");
  }, [showA11y]);

  // Key handling: Esc to close, Tab trap
  const onDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setShowA11y(false);
      return;
    }
    if (e.key === "Tab") {
      const dlg = dialogRef.current;
      if (!dlg) return;
      const focusables = Array.from(
        dlg.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!focusables.length) return;
      const first = focusables[0],
        last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    }
  };

  // Initialize from localStorage
  useEffect(() => {
    const getBool = (k: string) => localStorage.getItem(k) === "true";
    const s = Number(localStorage.getItem("a11y_fontSize") || "100");
    setSize(s);
    setHighContrast(getBool("a11y_contrast"));
    // keep compatibility with old key a11y_underline
    setHighlightLinks(
      getBool("a11y_highlightLinks") || getBool("a11y_underline")
    );
    setInvert(getBool("a11y_invert"));
    setDesaturate(getBool("a11y_desaturate"));
    setTextSpacing(getBool("a11y_textSpacing"));
    setTallerLines(getBool("a11y_lineHeight"));
    setHideImages(getBool("a11y_hideImages"));
    setBigCursor(getBool("a11y_bigCursor"));
  }, []);

  // Apply language and accessibility prefs
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "or";
    // update i18next language so `t()` returns the correct translations
    try {
      i18n.changeLanguage(lang);
    } catch (err) {
      // ignore if i18n not available for some reason
      console.warn("i18n changeLanguage failed", err);
    }
    window.localStorage.setItem("site_language", lang);
    window.dispatchEvent(
      new CustomEvent("cms-language-change", { detail: lang })
    );
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (size === 100) root.style.removeProperty("font-size");
    else root.style.fontSize = `${size}%`;
    localStorage.setItem("a11y_fontSize", String(size));
  }, [size]);

  useEffect(() => {
    document.body.classList.toggle("high-contrast", highContrast);
    localStorage.setItem("a11y_contrast", String(highContrast));
  }, [highContrast]);
  useEffect(() => {
    document.body.classList.toggle("a11y-highlight-links", highlightLinks);
    localStorage.setItem("a11y_highlightLinks", String(highlightLinks));
  }, [highlightLinks]);
  useEffect(() => {
    document.body.classList.toggle("a11y-invert", invert);
    localStorage.setItem("a11y_invert", String(invert));
  }, [invert]);
  useEffect(() => {
    document.body.classList.toggle("a11y-desaturate", desaturate);
    localStorage.setItem("a11y_desaturate", String(desaturate));
  }, [desaturate]);
  useEffect(() => {
    document.body.classList.toggle("a11y-text-spacing", textSpacing);
    localStorage.setItem("a11y_textSpacing", String(textSpacing));
  }, [textSpacing]);
  useEffect(() => {
    document.body.classList.toggle("a11y-line-height", tallerLines);
    localStorage.setItem("a11y_lineHeight", String(tallerLines));
  }, [tallerLines]);
  useEffect(() => {
    document.body.classList.toggle("a11y-hide-images", hideImages);
    localStorage.setItem("a11y_hideImages", String(hideImages));
  }, [hideImages]);
  useEffect(() => {
    document.body.classList.toggle("a11y-big-cursor", bigCursor);
    localStorage.setItem("a11y_bigCursor", String(bigCursor));
  }, [bigCursor]);

  // Allow other components to trigger the login modal
  useEffect(() => {
    const handler = () => {
      setAuthMode("login");
      setOpenModal(true);
    };
    window.addEventListener("open-user-login", handler as EventListener);
    return () => window.removeEventListener("open-user-login", handler as EventListener);
  }, []);

  const resetA11y = () => {
    setSize(100);
    setHighContrast(false);
    setHighlightLinks(false);
    setInvert(false);
    setDesaturate(false);
    setTextSpacing(false);
    setTallerLines(false);
    setHideImages(false);
    setBigCursor(false);

    [
      "a11y_fontSize",
      "a11y_contrast",
      "a11y_highlightLinks",
      "a11y_invert",
      "a11y_desaturate",
      "a11y_textSpacing",
      "a11y_lineHeight",
      "a11y_hideImages",
      "a11y_bigCursor",
    ].forEach((k) => localStorage.removeItem(k));
    document.documentElement.style.removeProperty("font-size");
  };

  const handleAuthChange = (key: keyof typeof authForm, val: string) => {
    setAuthForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleAuthSubmit = async () => {
    // Basic client-side checks to avoid empty submissions
    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthError("Please enter email and password.");
      return;
    }
    if (authMode === "signup" && !authForm.fullName.trim()) {
      setAuthError("Please enter your full name.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    const endpoint = `/auth/${authMode === "login" ? "login" : "signup"}`;
    const payload =
      authMode === "login"
        ? {
          email: authForm.email.trim(),
          password: authForm.password,
        }
        : {
          fullName: authForm.fullName.trim(),
          email: authForm.email.trim(),
          phone: authForm.phone.trim(),
          password: authForm.password,
        };

    try {
      const { data } = await api.post(endpoint, payload);

      if (data?.token) {
        localStorage.setItem("auth_token", data.token);
      }

      setAuthSuccess("Success! Redirecting...");
      setAuthError("");
      // Optionally close modal after a short delay
      setTimeout(() => setOpenModal(false), 500);
    } catch (err: any) {
      setAuthError(
        err?.response?.data?.error ||
        err?.message ||
        "Authentication failed. Check your details.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const asset = (p: string) => {
    const base = ((import.meta as any)?.env?.BASE_URL as string) || "/";
    return `${base.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
  };
  const logoUrl = asset("brand/logo.png");
  const commissionerUrl = asset("brand/MohanMajhi.jpeg");

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  // useEffect(() => {
  //   const handler = (e) => {
  //     if (menuRef.current && !menuRef.current.contains(e.target)) {
  //       setOpen(false);
  //     }
  //   };
  //   document.addEventListener("mousedown", handler);
  //   return () => document.removeEventListener("mousedown", handler);
  // }, []);

  return (
    <>
      <style>{`
        /* Only increase text sizes for utility controls and search label */
        .utility-bar .util-label { font-size: 1.05rem; font-weight: 700; }
        .utility-bar .util-icon-btn { font-size: 1.05rem; }
        .utility-bar .util-icon-btn svg { width: 20px; height: 20px; }
        .search-label { font-size: 1.05rem; font-weight: 700; }
      `}</style>
      {/* GIGW-compliant utility bar: semantic nav placed above the header */}
      <nav
        id="headerbar-section"
        className="utility-bar"
        aria-label="Utility navigation"
      >
        <div className="utility-bar__inner container-fluid">
          <ul className="utility-items utility-items--left" role="menubar">
            {/* Screen Reader Button with Toggle */}
            <li role="none">
              <button
                role="menuitem"
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md transition font-bold text-xs sm:text-sm ${isReading ? "bg-red-500 hover:bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                aria-label={isReading ? "Stop reading" : "Read whole page"}
                onClick={() =>
                  speakSections([
                    "#headerbar-section",
                    "#mainnav-section",
                    "#main-content",
                    "#main",
                    "footer",
                  ])
                }
              >
                {isReading ? t("header.stopReading") : t("header.screenReader")}
              </button>
            </li>

            {/* Skip to Content */}
            <li role="none" className="utility-skip">
              <Link
                to="/about"
                className="font-bold text-white cursor-pointer z-50 utility-skip-link hidden sm:inline"
                aria-label={t("header.skipToContent")}
              >
                {t("header.skipToContent")}
              </Link>
            </li>

            <li role="none">
              <button
                role="menuitem"
                className="util-icon-btn"
                aria-haspopup="dialog"
                aria-expanded={showA11y}
                aria-controls="a11y-dialog"
                aria-label={t("header.accessibility")}
                onClick={() => setShowA11y(true)}
              >
                <span className="util-label">{t("header.accessibility")}</span>
              </button>
            </li>

            {/* Language selector moved to the right side next to Sign in */}

            <li role="separator" aria-hidden="true" className="util-sep" />

            <li className="relative group">
              {/* MAIN ICON */}
              <button
                aria-label="Social Links"
                className="p-2 rounded cursor-pointer"
              >
                <FaUserFriends className="w-8 h-8 text-white" />
              </button>

              {/* DROPDOWN BELOW MAIN ICON */}
              <div
                className="
      absolute left-0 top-full
      hidden group-hover:flex group-focus-within:flex
      flex-col gap-3 
      bg-white p-3 rounded shadow-lg border
      z-50
    "
              >
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/scpdodisha/"
                  target="_blank"
                  className="w-6 h-6"
                >
                  <FaFacebook className="h-7 w-7 text-blue-600" />
                </a>

                {/* X */}
                <a
                  href="https://x.com/state_scpd"
                  target="_blank"
                  className="w-6 h-6"
                >
                  <FaTwitter className="h-7 w-7 text-blue-600" />
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/scpd_odisha/"
                  target="_blank"
                  className="w-6 h-6"
                >
                  <FaInstagramSquare className="h-7 w-7 text-red-600" />
                </a>

                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@scpdofficepersonswithdisab2386"
                  target="_blank"
                  className="w-6 h-6"
                >
                  <IoLogoYoutube className="h-7 w-7 text-red-600" />
                </a>
              </div>
            </li>
            <li role="none">
              <button
                role="menuitem"
                className="util-icon-btn"
                aria-expanded={showSearch}
                aria-controls="dock-search"
                aria-label={t("header.search")}
                onClick={() => setShowSearch((v) => !v)}
              >
                <FaSearch className="w-5 h-5 text-white" aria-hidden />
                <span
                  className="search-label text-white cursor-pointer z-50 hidden sm:inline"
                  aria-hidden="true"
                >
                  {t("header.search")}
                </span>
              </button>
            </li>
          </ul>
          {/* right side */}
          <div className="utility-actions flex items-center gap-2 sm:gap-4">
            {/* Sign In */}
            <div className="utility-login-wrap flex items-center gap-2 sm:gap-4">
              {/* Sign In */}
              <div
                className="relative"
                ref={menuRef}
                onMouseEnter={() => setOpen(true)}
              >

                {/* USER ICON BUTTON */}
                <button
                  onClick={() => setOpen(!open)}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg
                   bg-[#0b3a8c] text-white
                   text-xs sm:text-base font-semibold
                   hover:bg-[#0AA7B6]
                   focus:outline-none focus:ring-4 focus:ring-black
                   transition cursor-pointer whitespace-nowrap
             flex items-center justify-center gap-2"
                >
                  {t("header.login")}
                </button>


                {/* DROPDOWN MENU */}
                {/* DROPDOWN MENU */}
                {open && (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl 
                  bg-white border border-gray-200 z-50 overflow-hidden 
                  animate-fadeIn">

                    {/* Header */}
                    <div className="bg-linear-to-r from-[#0b3a8c] to-[#0f4fb5] px-5 py-4">
                      <h3 className="text-black text-2xl font-semibold">{t("header.loginAs")}</h3>
                      <p className="text-black/80 text-lg">
                        {t("header.chooseRole")}
                      </p>
                    </div>

                    <ul className="flex flex-col text-lg">

                      {/* ADMIN LOGIN */}
                      <Link to="/admin/login">
                        <li className="group">
                          <button
                            className="w-full px-5 py-4 flex items-center gap-4 
                       hover:bg-gray-100 transition-all duration-300"
                          >
                            <span className="p-2 rounded-full bg-blue-100 group-hover:bg-blue-200">
                              <RiUserAddFill className="w-5 h-5 text-blue-600" />
                            </span>
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-gray-800 text-2xl">{t("header.adminLogin")}</p>
                              <p className="text-lg text-gray-500">{t("header.adminDesc")}</p>
                            </div>
                          </button>
                        </li>
                      </Link>

                      {/* LEGAL OFFICER LOGIN */}
                      <li className="group">
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            window.location.assign("http://localhost:5173/login");
                          }}
                          className="w-full px-5 py-4 flex items-center gap-4 
                     hover:bg-gray-100 transition-all duration-300"
                        >
                          <span className="p-2 rounded-full bg-purple-100 group-hover:bg-purple-200">
                            <RiUserAddFill className="w-5 h-5 text-purple-600" />
                          </span>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-800 text-2xl">{t("header.legalOfficer")}</p>
                            <p className="text-lg text-gray-500">{t("header.legalDesc")}</p>
                          </div>
                        </button>
                      </li>

                      {/* USER LOGIN */}
                      <li className="group border-t">
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            setOpenModal(false);
                            redirectToCaseManagementLogin("CITIZEN");
                          }}
                          className="w-full px-5 py-4 flex items-center gap-4 
                     hover:bg-gray-100 transition-all duration-300"
                        >
                          <span className="p-2 rounded-full bg-green-100 group-hover:bg-green-200">
                            <RiUserAddFill className="w-5 h-5 text-green-600" />
                          </span>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-800 text-2xl">{t("header.userLogin")}</p>
                            <p className="text-lg text-gray-500">{t("header.userDesc")}</p>
                          </div>
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
                {openModal && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-md 
                  flex justify-center items-center z-50">

                    <div className="bg-white rounded-3xl shadow-2xl 
                    w-[95vw] md:w-[75vw] h-[90vh] md:h-[75vh] flex flex-col md:flex-row overflow-hidden 
                    animate-fadeIn">

                      {/* LEFT PANEL (Branding) */}
                      <div className="relative hidden md:block md:w-1/2 overflow-hidden bg-[#0b2f68] text-white">
                        {/* hero image */}
                        <img
                          src="/images/gallery2.jpg"
                          alt="Community"
                          className="absolute inset-0 w-full h-full object-cover opacity-35"
                          loading="lazy"
                        />
                        {/* gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0b3a8c]/95 via-[#0f4fb5]/80 to-[#0f75d8]/85" />

                        <div className="relative h-full p-6 lg:p-10 flex flex-col justify-between">
                          <div className="space-y-4">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-sm font-semibold">
                              <span className="w-2 h-2 rounded-full bg-emerald-300" aria-hidden />
                              Trusted Access
                            </span>
                            <h2 className="text-2xl lg:text-4xl font-bold leading-tight">
                              Welcome Back
                            </h2>
                            <p className="text-white/90 text-sm lg:text-lg max-w-md">
                              Access your account, services, and dashboard in one place.
                            </p>
                          </div>

                          <div className="space-y-2 text-white/85 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold">1</span>
                              Single sign-on for all portals
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold">2</span>
                              Secure, encrypted sessions
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold">3</span>
                              Get updates and notifications
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT PANEL (FORM) */}
                      <div className="w-full md:w-1/2 p-5 sm:p-6 md:p-10 relative bg-gradient-to-br from-white via-[#f6f9ff] to-[#eef3ff] border-l border-gray-100 shadow-inner overflow-y-auto">

                        {/* CLOSE */}
                        <button
                          onClick={() => setOpenModal(false)}
                          className="absolute top-4 right-4 md:top-6 md:right-6 text-2xl text-gray-500 hover:text-[#0b3a8c]"
                        >
                          &times;
                        </button>

                        {/* Badge / intro */}
                        <div className="flex items-center gap-3 mb-6 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-[#0b3a8c] font-semibold">
                            <span className="w-2 h-2 rounded-full bg-[#0f4fb5]" aria-hidden />
                            Secure Access
                          </span>
                          <span className="text-gray-500">Single place for login & signup</span>
                        </div>

                        {/* TOGGLE */}
                        <div className="flex mb-8 bg-white border border-gray-200 rounded-full p-1 w-full sm:w-fit shadow-sm">
                          <button
                            onClick={() => setAuthMode("login")}
                            className={`px-4 sm:px-6 py-2 rounded-full text-sm font-semibold transition
                      ${authMode === "login"
                                ? "bg-white shadow text-[#0b3a8c]"
                                : "text-gray-600"}`}
                          >
                            Login
                          </button>

                          <button
                            onClick={() => setAuthMode("signup")}
                            className={`px-4 sm:px-6 py-2 rounded-full text-sm font-semibold transition
                      ${authMode === "signup"
                                ? "bg-white shadow text-[#0b3a8c]"
                                : "text-gray-600"}`}
                          >
                            Sign Up
                          </button>
                        </div>

                        {/* FORM */}
                        <div className="space-y-5">

                          {authMode === "signup" && (
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={authForm.fullName}
                              onChange={(e) => handleAuthChange("fullName", e.target.value)}
                              spellCheck={false}
                              autoComplete="name"
                              className="w-full border rounded-xl px-4 py-3 text-base md:text-lg focus:ring-2 focus:ring-teal-500 bg-white text-gray-900 placeholder-gray-500"
                            />
                          )}

                          <input
                            type="email"
                            placeholder="Email Address"
                            value={authForm.email}
                            onChange={(e) => handleAuthChange("email", e.target.value)}
                            spellCheck={false}
                            autoComplete={authMode === "login" ? "email" : "new-email"}
                            className="w-full border rounded-xl px-4 py-3 text-base md:text-lg focus:ring-2 focus:ring-teal-500 bg-white text-gray-900 placeholder-gray-500"
                          />

                          {authMode === "signup" && (
                            <input
                              type="tel"
                              placeholder="Mobile Number"
                              value={authForm.phone}
                              onChange={(e) => handleAuthChange("phone", e.target.value)}
                              spellCheck={false}
                              autoComplete="tel"
                              className="w-full border rounded-xl px-4 py-3 text-base md:text-lg focus:ring-2 focus:ring-teal-500 bg-white text-gray-900 placeholder-gray-500"
                            />
                          )}

                          <input
                            type="password"
                            placeholder={authMode === "login" ? "Password" : "Create Password"}
                            value={authForm.password}
                            onChange={(e) => handleAuthChange("password", e.target.value)}
                            autoComplete={authMode === "login" ? "current-password" : "new-password"}
                            className="w-full border rounded-xl px-4 py-3 text-base md:text-lg focus:ring-2 focus:ring-teal-500 bg-white text-gray-900 placeholder-gray-500"
                          />
                        </div>

                        {/* ACTION BUTTON */}
                        <div className="mt-8">
                          <button
                            className="w-full bg-[#0b3a8c] text-white py-3 rounded-xl text-base md:text-lg font-semibold
                             hover:bg-[#0f4fb5] transition disabled:opacity-60"
                            onClick={handleAuthSubmit}
                            disabled={authLoading}
                          >
                            {authLoading
                              ? "Please wait..."
                              : authMode === "login"
                                ? "Login"
                                : "Create Account"}
                          </button>
                          {authError && (
                            <p className="text-center text-red-500 text-sm mt-3">{authError}</p>
                          )}
                          {authSuccess && (
                            <p className="text-center text-green-600 text-sm mt-3">{authSuccess}</p>
                          )}
                        </div>

                        {/* FOOTER */}
                        <p className="text-center text-gray-500 text-sm mt-6">
                          {authMode === "login"
                            ? "Don't have an account? Sign up now."
                            : "Already have an account? Login instead."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Screen Reader Button */}

            {/* Font Size Controls */}
            {/* Font Size Controls (No State) */}
            {/* Font Size Controls (Hover Dropdown, No State) */}
            <div className="relative inline-block group">
              {/* Main A button */}
              <button
                type="button"
                className="px-2 py-1 border rounded bg-white hover:bg-gray-100 text-sm text-black"
                onClick={() => setSize(100)}
                aria-label="Reset font size"
              >
                A
              </button>

              {/* Dropdown stays open when hovering A+ / A- */}
              <div
                className="
      absolute left-0 mt-2 
      bg-white border rounded shadow-md
      opacity-0 invisible 
      group-hover:opacity-100 group-hover:visible
      transition-all duration-150
      flex flex-col
    "
              >
                <button
                  type="button"
                  className="px-3 py-1 hover:bg-gray-100 text-sm text-black border-b"
                  onClick={() => setSize((s) => Math.min(170, s + 10))}
                >
                  A+
                </button>

                <button
                  type="button"
                  className="px-3 py-1 hover:bg-gray-100 text-sm text-black"
                  onClick={() => setSize((s) => Math.max(85, s - 10))}
                >
                  A-
                </button>
              </div>
            </div>

            {/* Language Switch */}
            <button
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg
  bg-[#236EB9] text-white
  text-xs sm:text-base font-semibold
  hover:bg-[#1d5ca0]
  focus:outline-none focus:ring-4 focus:ring-blue-300
  transition"
              onClick={() => setShowLangConfirm(true)}
              aria-label="Switch language"
            >
              <span className="hidden sm:inline">
                {lang === "en" ? "ENGLISH" : "\u0B13\u0B21\u0B3C\u0B3F\u0B06"}
              </span>
              <span className="sm:hidden">
                {lang === "en" ? "EN" : "OR"}
              </span>
            </button>

          </div>
        </div>
      </nav>

      {/* Search popover below the dock */}
      <div
        id="dock-search"
        className={`dock-popover ${showSearch ? "open" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-label="Search"
      >
        <div className="container-fluid flex items-center py-2">
          <div className="flex-grow">
            <SiteSearch />
          </div>
          <button
            type="button"
            className="btn util ml-2"
            onClick={() => setShowSearch(false)}
          >
            {t("header.close")}
          </button>
        </div>
      </div>

      {/* Identity header (kept) */}
      <header className="site-header container" role="banner">
        <div className="brand">
          <a href="/" aria-label="SCPD Home">
            <img src={logoUrl} alt="SCPD Odisha" />
          </a>

          <div className="brand-text flex flex-col leading-tight">
            <strong className="text-sm sm:text-lg md:text-3xl">
              {t("branding.title")}
            </strong>
            <strong className="text-xs sm:text-base md:text-3xl">
              {t("branding.titleOdia")}
            </strong>
          </div>

        </div>
        <div className="header-right">
          <div className="authority flex items-center gap-3 sm:gap-4 w-full sm:w-auto
                bg-white border-l-4 border-blue-500
                rounded-xl shadow-md
                px-3 sm:px-5 py-2 sm:py-3
                hover:shadow-lg hover:border-blue-600
                transition-all duration-200">


            {/* TEXT */}
            <div className="authority-text leading-snug">


              <strong className="block text-sm sm:text-base font-semibold text-gray-900">
                {t("cm.name")}
              </strong>

              <span className="block text-xs sm:text-sm text-gray-600">
                {t("cm.role")}
              </span>
            </div>

            {/* IMAGE */}
            <img
              src={commissionerUrl}
              alt="Hon'ble Chief Minister"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover
                 border-2 border-[#236EB9]"
              onError={(e) =>
                ((e.currentTarget as HTMLImageElement).style.display = "none")
              }
            />
          </div>
        </div>

      </header>

      {/* Accessibility overlay dialog (kept) */}
      <div
        className={`a11y-overlay ${showA11y ? "open" : ""}`}
        hidden={!showA11y}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeA11y();
        }}
      >
        <div className="a11y-backdrop" aria-hidden="true" />
        <div
          ref={dialogRef}
          id="a11y-dialog"
          className="a11y-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="a11y-heading"
          onKeyDown={onDialogKeyDown}
        >
          <button
            className="a11y-close"
            aria-label="Close accessibility tools"
            onClick={closeA11y}
          >
            &times;
          </button>

          <div className="a11y-panel">
            <header className="a11y-panel-header">
              <h3 id="a11y-heading">{t("header.accessibility")}</h3>
            </header>

            <section className="a11y-group">
              <h4>Color Contrast</h4>

              <button
                className={`a11y-tile a11y-tile--primary ${highContrast ? "is-active" : ""
                  }`}
                onClick={() => {
                  setHighContrast(true);
                  setInvert(false);
                  setDesaturate(false);
                }}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">{"\u{1F157}"}</span>
                <span className="tile-title">High Contrast</span>
              </button>

              <button
                className={`a11y-tile ${!highContrast && !invert && !desaturate ? "is-active" : ""
                  }`}
                onClick={() => {
                  setHighContrast(false);
                  setInvert(false);
                  setDesaturate(false);
                }}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">{"\u{1F15D}"}</span>
                <span className="tile-title">Normal Contrast</span>
              </button>

              <button
                className={`a11y-tile ${highlightLinks ? "is-active" : ""}`}
                onClick={() => setHighlightLinks((v) => !v)}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">{"\u{1F517}"}</span>
                <span className="tile-title">Highlight Links</span>
              </button>

              <button
                className={`a11y-tile ${invert ? "is-active" : ""}`}
                onClick={() => setInvert((v) => !v)}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">{"\u25D0"}</span>
                <span className="tile-title">Invert</span>
              </button>

              <button
                className={`a11y-tile ${desaturate ? "is-active" : ""}`}
                onClick={() => setDesaturate((v) => !v)}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">{"\u2B24"}</span>
                <span className="tile-title">Saturation</span>
              </button>
            </section>

            <section className="a11y-group">
              <h4>Text Size</h4>

              <button
                className="a11y-tile"
                onClick={() => setSize((s) => Math.min(170, s + 10))}
              >
                <span className="tile-icon">A+</span>
                <span className="tile-title">Font Size Increase</span>
              </button>

              <button
                className="a11y-tile"
                onClick={() => setSize((s) => Math.max(85, s - 10))}
              >
                <span className="tile-icon">{"A\u2212"}</span>
                <span className="tile-title">Font Size Decrease</span>
              </button>

              <button
                className={`a11y-tile ${size === 100 ? "is-active" : ""}`}
                onClick={() => setSize(100)}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">A</span>
                <span className="tile-title">Normal Font</span>
              </button>

              <button
                className={`a11y-tile ${textSpacing ? "is-active" : ""}`}
                onClick={() => setTextSpacing((v) => !v)}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">{"\u2194"}</span>
                <span className="tile-title">Text Spacing</span>
              </button>

              <button
                className={`a11y-tile ${tallerLines ? "is-active" : ""}`}
                onClick={() => setTallerLines((v) => !v)}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">{"\u2195"}</span>
                <span className="tile-title">Line Height</span>
              </button>
            </section>

            <section className="a11y-group">
              <h4>Other controls</h4>

              <button
                className={`a11y-tile ${hideImages ? "is-active" : ""}`}
                onClick={() => setHideImages((v) => !v)}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">{"\u{1F5BC}"}</span>
                <span className="tile-title">Hide Images</span>
              </button>

              <button
                className={`a11y-tile ${bigCursor ? "is-active" : ""}`}
                onClick={() => setBigCursor((v) => !v)}
              >
                <span className="check-badge" aria-hidden="true" />
                <span className="tile-icon">{"\u{1F5B1}"}</span>
                <span className="tile-title">Big Cursor</span>
              </button>

              <button
                className="a11y-tile a11y-tile--danger"
                onClick={resetA11y}
              >
                <span className="tile-icon">{"\u21BA"}</span>
                <span className="tile-title">Reset</span>
              </button>

              <Link to="/accessibility" className="a11y-link">
                Screen Reader Access
              </Link>
            </section>
          </div>
        </div>
      </div>
      {/* Language Change Confirmation Modal */}
      {showLangConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[100] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 transform transition-all">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {lang === "en" ? "Change Language?" : "\u0B2D\u0B3E\u0B37\u0B3E \u0B2A\u0B30\u0B3F\u0B2C\u0B30\u0B4D\u0B24\u0B4D\u0B24\u0B28 \u0B15\u0B30\u0B3F\u0B2C\u0B47?"}
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              {t("langConfirm.message")}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLangConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                {t("langConfirm.cancel")}
              </button>
              <button
                onClick={() => {
                  const nextLang = lang === "en" ? "or" : "en";
                  setLang(nextLang);
                  setShowLangConfirm(false);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-[#0b3a8c] text-white font-semibold hover:bg-[#0f4fb5] transition"
              >
                {t("langConfirm.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
