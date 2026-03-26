import React from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import AppShell from "./layout/AppShell";
import Register from "./pages/Register";
import Home from "@pages/Home/HomePage";
import Contact from "./pages/Contact";
import RegisterComplaint from "./pages/RegisterComplaint";
import SocialLinks from "./pages/SocialLinks";
import Login from "./pages/Login";
import LegalOfficerLogin from "./pages/Login/LegalOfficerLogin";
import UserLogin from "./pages/Login/UserLogin";
import Sitemap from "./pages/Sitemap";
import Feedback from "./pages/Feedback";
import Help from "./pages/Help";
import ErrorFallback from "./components/common/ErrorFallback";
import NotFound from "./pages/NotFound";
import CmsPage from "./pages/CmsPage";
import AboutCommission from "./pages/CMS/aboutUs/AboutCommission"; //add like this
import VisionMission from "@pages/CMS/aboutUs/VissionMission";
import Departments from "@pages/CMS/aboutUs/Departments";
import FormerCommision from "@pages/CMS/aboutUs/FormerCommision";
import OrganisationalChart from "@pages/CMS/aboutUs/OrganisationalChart";
import MainActivities from "@pages/CMS/aboutUs/MainActivities";
import TelePhoneDirectory from "@pages/CMS/aboutUs/TelePhoneDirectory";
import FunctionPage from "@pages/CMS/aboutUs/Function";
import DisabilitiesActs from "@pages/CMS/acts/DisabilitiesActs";
import DisabilitiesPolicies from "@pages/CMS/acts/DisabilitiesPolicies";
import DisabilitiesRulesRegulations from "@pages/CMS/acts/DisabilitiesRulesRegulations";
import DisabilitiesGuidelines from "@pages/CMS/acts/DisabilitiesGuidelines";
import HandBookConcern from "@pages/CMS/acts/HandBookConcern";
import EqualOpportunityPolicy from "@pages/CMS/acts/EqualOpportunityPolicy";
import MonthlyMagazines from "@pages/CMS/publications/MonthlyMagazines";
import AnnualReports from "@pages/CMS/publications/AnnualReports";
import Achievements from "@pages/CMS/publications/Achivements";
import Advertisements from "@pages/CMS/publications/Advertisements";
import SuccessStories from "@pages/CMS/publications/SuccessStories";
import Notifications from "@pages/CMS/Resources/Notifications";
import Tender from "@pages/CMS/Resources/Tender";
import RelatedWebsites from "@pages/CMS/Resources/RelatedWebsites";
import StateAdvisory from "@pages/CMS/Resources/StateAdvisory";
import Schemes from "@pages/CMS/Resources/Schemes";
import InternalComplain from "@pages/CMS/Resources/InternalComplain";
import Workshop from "@pages/CMS/Events/Workshop";
import CampCourt from "@pages/CMS/Events/CampCourt";
import QuizCompetitions from "@pages/CMS/Events/QuizCompetitions";
import SakhyamaAbility from "@pages/CMS/Events/SakhyamaAbility";
import DisabilityFrientlyCampaign from "@pages/CMS/Events/DisabilityFrientlyCampaign";
import Grievance from "@pages/CMS/Grivances/Grievance";
import ResisterComaplaint from "@pages/CMS/Grivances/ResisterComaplaint";
import FinalOrder from "@pages/CMS/Grivances/FinalOrder";
import InterimOrder from "@pages/CMS/Grivances/InterimOrder";
import CauseList from "@pages/CMS/Grivances/CauseList";
import PendencyStatus from "@pages/CMS/Grivances/pendencyStatus";
import SuoMotoCases from "@pages/CMS/Grivances/suoMotoCases";
import LandmarkCourt from "@pages/CMS/Grivances/LandmarkCourt";
import LeadingOrder from "@pages/CMS/Grivances/LeadingOrder";
import RTIActsRules from "@pages/CMS/Rti/RTIActsRules";
import PublicInformations from "@pages/CMS/Rti/PublicInformations";
import FirstAppllate from "@pages/CMS/Rti/FirstAppllate";
import PhotoGallery from "@pages/CMS/Gallery/PhotoGallery";
import VideoGallery from "@pages/CMS/Gallery/VideoGallery";
import NewsPaperClipping from "@pages/CMS/Gallery/NewsPaperClipping";
import AudioClipping from "@pages/CMS/Gallery/AudioClipping";
import OfficeContact from "@pages/CMS/contacts/OfficeContact";
import ListOfDistrict from "@pages/CMS/contacts/ListOfDistrict";
import ListOfGrievance from "@pages/CMS/contacts/ListOfGrievance";
import NewsArticlePage from "./pages/NewsArticlePage";
//admin pages
import VideoGalleryPage from "./pages/Media/VideoGalleryPage";
import NewspaperClippingPage from "./pages/Media/NewspaperClippingPage";

import AdminApp from "./admin/AdminApp";
import AdminLayout from "./admin/components/AdminLayout";
import ProtectedRoute from "./admin/components/ProtectedRoute";
import AdminLogin from "./admin/pages/AdminLogin";
import Dashboard from "./admin/pages/Dashboard";
import MenuManager from "./admin/pages/MenuManager";
import OrgChartBuilder from "./admin/pages/OrgChartBuilder";
import PagesManager from "./admin/pages/PagesManager";
import MediaManager from "./admin/pages/MediaManager";

import UserManager from "./admin/pages/UserManager";
import AdminForgotPassword from "./admin/pages/AdminForgotPassword";
import AdminLogViewer from "./admin/pages/AdminLogViewer";
import DatabaseTableBuilder from "./admin/pages/DatabaseTableBuilder";
import NewsManager from "./admin/pages/NewsManager";
import EventsManager from "./admin/pages/EventsManager";
import FeedbackManager from "./admin/pages/FeedbackManager";

import {
  ADMIN_ONLY_ROLES,
  CONTENT_ADMIN_ROLES,
  MENU_ADMIN_ROLES,
} from "./admin/rbac";

import "./styles/global.css";
import "./styles/theme.css"; // ensure this import exists

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./i18n/en.json";
import or from "./i18n/or.json";
import Faqs from "@pages/CMS/Grivances/Faqs";
const savedLang =
  typeof window !== "undefined"
    ? window.localStorage.getItem("site_language")
    : null;
const initialLang = savedLang === "en" || savedLang === "or" ? savedLang : "en";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, or: { translation: or } },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Dev-only: show runtime errors directly on-screen.
// This helps when the browser console isn’t easily accessible.
if (import.meta.env.DEV && typeof window !== "undefined") {
  const OVERLAY_ID = "scpd-dev-error-overlay";

  const ensureOverlay = () => {
    let el = document.getElementById(OVERLAY_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.style.position = "fixed";
    el.style.left = "12px";
    el.style.right = "12px";
    el.style.bottom = "12px";
    el.style.zIndex = "2147483647";
    el.style.maxHeight = "45vh";
    el.style.overflow = "auto";
    el.style.padding = "12px";
    el.style.borderRadius = "10px";
    el.style.background = "rgba(11,16,32,0.95)";
    el.style.color = "#e6edf3";
    el.style.fontFamily =
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    el.style.fontSize = "12px";
    el.style.whiteSpace = "pre-wrap";
    el.style.display = "none";
    el.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";

    const close = document.createElement("button");
    close.textContent = "Close";
    close.style.position = "sticky";
    close.style.top = "0";
    close.style.float = "right";
    close.style.marginBottom = "8px";
    close.style.background = "#1f6feb";
    close.style.color = "white";
    close.style.border = "0";
    close.style.padding = "6px 10px";
    close.style.borderRadius = "8px";
    close.style.cursor = "pointer";
    close.onclick = () => {
      el!.style.display = "none";
    };

    const header = document.createElement("div");
    header.textContent = "Runtime error";
    header.style.fontWeight = "700";
    header.style.marginBottom = "8px";
    header.style.color = "#ff7b72";

    const pre = document.createElement("div");
    pre.setAttribute("data-role", "details");

    el.appendChild(close);
    el.appendChild(header);
    el.appendChild(pre);
    document.body.appendChild(el);
    return el;
  };

  const showOverlay = (title: string, details: string) => {
    const el = ensureOverlay();
    const header = el.querySelector("div") as HTMLDivElement | null;
    const pre = el.querySelector(
      '[data-role="details"]',
    ) as HTMLDivElement | null;
    if (header) header.textContent = title;
    if (pre) pre.textContent = details;
    el.style.display = "block";
  };

  window.addEventListener("error", (event) => {
    const err = event.error as Error | undefined;
    const details = err?.stack || String(event.message || "Unknown error");
    showOverlay("Runtime error", details);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const details =
      reason instanceof Error
        ? reason.stack || reason.message
        : (() => {
            try {
              return JSON.stringify(reason, null, 2);
            } catch {
              return String(reason);
            }
          })();
    showOverlay("Unhandled promise rejection", details);
  });
}

const cmsPaths = [
  "about",
  "acts",
  "publications",
  "resources",
  "grievances",
  "rti",
  "media",
  "awards",
  "events",
  "notice-board",
  "e-library",
  "about/about-commission",
  "about/vision-mission",
  "about/departments",
  "about/organisation-chart",
  "about/former-state-commissioners",
  "about/telephone-directory",
  "about/main-activities",
  "acts/disability-acts",
  "acts/disability-policies",
  "acts/disability-rules-regulations",
  "acts/disability-guidelines",
  "acts/handbook-supreme-court",
  "acts/equal-opportunity-policy",
  "publications/monthly-magazines",
  "publications/annual-reports",
  "publications/success-stories",
  "publications/achievements",
  "publications/advertisement",
  "resources/notifications-resolutions-circulars-om",
  "resources/tenders",
  "resources/related-websites",
  "resources/state-advisory-board",
  "resources/icc",
  "resources/schemes-programmes",
  "grievances/how-to-register",
  "grievances/register",
  "grievances/final-orders",
  "grievances/interim-orders",
  "grievances/cause-list",
  "grievances/pendency-status",
  "grievances/suo-moto-cases",
  "grievances/landmark-court-judgments",
  "grievances/leading-orders",
  "grievances/faqs",
  "rti/acts-rules",
  "rti/public-information-officer",
  "rti/first-appellate-authority",
  "media/photo-gallery",
  "media/video-gallery",
  "media/newspaper-clipping",
  "media/audio-clipping",
  "awards/national-awards",
  "awards/state-awards",
  "events/workshops-awareness",
  "events/camp-courts",
  "events/quiz-competitions",
  "events/sakhyama-ability-talk",
  "events/disability-friendly-campaign",
  "contact/office-contact",
  "contact/dsso-list",
  "contact/gro-list",
  "e-library/audio",
  "e-library/video",
  "e-library/ebook",
];

// Filter out "about/about-commission" from generic CMS routes (will use dedicated component)
const cmsRoutes = cmsPaths
  .filter((path) => path !== "about/about-commission")
  .map((path) => ({ path, element: <CmsPage /> }));

const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminApp />,
    children: [
      { path: "login", element: <AdminLogin /> },
      { path: "forgot-password", element: <AdminForgotPassword /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <Dashboard /> },
              {
                element: <ProtectedRoute allowedRoles={MENU_ADMIN_ROLES} />,
                children: [
                  { path: "menu", element: <MenuManager /> },
                  { path: "org-chart", element: <OrgChartBuilder /> },
                ],
              },
              { path: "pages", element: <PagesManager /> },
              {
                element: <ProtectedRoute allowedRoles={CONTENT_ADMIN_ROLES} />,
                children: [
                  { path: "events", element: <EventsManager /> },
                  { path: "news", element: <NewsManager /> },
                  { path: "feedback", element: <FeedbackManager /> },
                  { path: "media", element: <MediaManager /> },
                ],
              },
              {
                element: <ProtectedRoute allowedRoles={ADMIN_ONLY_ROLES} />,
                children: [
                  { path: "schema", element: <DatabaseTableBuilder /> },
                  { path: "users", element: <UserManager /> },
                  { path: "logs", element: <AdminLogViewer /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "/",
    element: <AppShell />,
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <Home /> },
      // Dedicated page components (custom styling per page)
      { path: "about/about-commission", element: <AboutCommission /> },
      { path: "about/vision-mission", element: <VisionMission /> },
      { path: "about/departments", element: <Departments /> },
      { path: "about/function", element: <FunctionPage /> },
      {
        path: "about/former-state-commissioners",
        element: <FormerCommision />,
      },
      { path: "about/organisation-chart", element: <OrganisationalChart /> },
      { path: "about/telephone-directory", element: <TelePhoneDirectory /> },
      { path: "about/main-activities", element: <MainActivities /> },
      { path: "acts/disability-acts", element: <DisabilitiesActs /> },
      { path: "acts/disability-policies", element: <DisabilitiesPolicies /> },
      {
        path: "acts/disability-rules-regulations",
        element: <DisabilitiesRulesRegulations />,
      },
      {
        path: "acts/disability-guidelines",
        element: <DisabilitiesGuidelines />,
      },
      {
        path: "acts/handbook-supreme-court",
        element: <HandBookConcern />,
      },
      {
        path: "acts/equal-opportunity-policy",
        element: <EqualOpportunityPolicy />,
      },
      {
        path: "publications/monthly-magazines",
        element: <MonthlyMagazines />,
      },
      {
        path: "publications/annual-reports",
        element: <AnnualReports />,
      },
      {
        path: "publications/achievements",
        element: <Achievements />,
      },
      {
        path: "publications/advertisement",
        element: <Advertisements />,
      },
      {
        path: "publications/success-stories",
        element: <SuccessStories />,
      },
      {
        path: "resources/notifications-resolutions-circulars-om",
        element: <Notifications />,
      },
      {
        path: "resources/tenders",
        element: <Tender />,
      },
      {
        path: "resources/related-websites",
        element: <RelatedWebsites />,
      },
      {
        path: "resources/state-advisory-board",
        element: <StateAdvisory />,
      },
      {
        path: "resources/schemes-programmes",
        element: <Schemes />,
      },
      {
        path: "resources/icc",
        element: <InternalComplain />,
      },
      {
        path: "grievances/how-to-register",
        element: <Grievance />,
      },

      {
        path: "grievances/register",
        element: <ResisterComaplaint />,
      },
      {
        path: "grievances/final-orders",
        element: <FinalOrder />,
      },
      {
        path: "grievances/interim-orders",
        element: <InterimOrder />,
      },
      {
        path: "grievances/cause-list",
        element: <CauseList />,
      },
      {
        path: "grievances/pendency-status",
        element: <PendencyStatus />,
      },
      {
        path: "grievances/suo-moto-cases",
        element: <SuoMotoCases />,
      },
      {
        path: "grievances/landmark-court-judgments",
        element: <LandmarkCourt />,
      },
      {
        path: "grievances/leading-orders",
        element: <LeadingOrder />,
      },
      {
        path: "grievances/faqs",
        element: <Faqs />,
      },

      {
        path: "rti/acts-rules",
        element: <RTIActsRules />,
      },
      {
        path: "rti/public-information-officer",
        element: <PublicInformations />,
      },
      {
        path: "rti/first-appellate-authority",
        element: <FirstAppllate />,
      },
      {
        path: "events/workshops-awareness",
        element: <Workshop />,
      },
      {
        path: "media/photo-gallery",
        element: <PhotoGallery />,
      },
      {
        path: "media/video-gallery",
        element: <VideoGallery />,
      },
      {
        path: "media/newspaper-clipping",
        element: <NewsPaperClipping />,
      },
      {
        path: "media/audio-clipping",
        element: <AudioClipping />,
      },
      {
        path: "events/workshops-awareness",
        element: <Workshop />,
      },
      {
        path: "events/camp-courts",
        element: <CampCourt />,
      },
      {
        path: "events/quiz-competitions",
        element: <QuizCompetitions />,
      },
      {
        path: "events/sakhyama-ability-talk",
        element: <SakhyamaAbility />,
      },
      {
        path: "events/disability-friendly-campaign",
        element: <DisabilityFrientlyCampaign />,
      },
      {
        path: "contact/office-contact",
        element: <OfficeContact />,
      },
      {
        path: "contact/dsso-list",
        element: <ListOfDistrict />,
      },
      {
        path: "contact/gro-list",
        element: <ListOfGrievance />,
      },
      // Generic CMS pages (fallback for all other paths)
      ...cmsRoutes,
      { path: "news/:id", element: <NewsArticlePage /> },
      // { path: "media/photo-gallery", element: <PhotoGalleryPage /> },
      { path: "media/video-gallery", element: <VideoGalleryPage /> },
      { path: "media/newspaper-clipping", element: <NewspaperClippingPage /> },
      { path: "contact", element: <Contact /> },
      { path: "help", element: <Help /> },
      { path: "feedback", element: <Feedback /> },
      { path: "register", element: <Register /> },
      { path: "register-complaint", element: <RegisterComplaint /> },
      { path: "grievances/register", element: <RegisterComplaint /> },
      { path: "social", element: <SocialLinks /> },
      { path: "login", element: <Login /> },
      { path: "legal-officer/login", element: <LegalOfficerLogin /> },
      { path: "login/citizen", element: <UserLogin /> },
      { path: "user/login", element: <UserLogin /> },
      { path: "sitemap", element: <Sitemap /> },
      { path: "*", element: <CmsPage /> },
    ],
  },
]);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
