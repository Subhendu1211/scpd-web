import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Grid, Typography, Link, IconButton } from "@mui/material";
import { Facebook, Twitter, YouTube, Instagram } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { fetchCmsFooterLinks, CmsFooterLink } from "../../services/cms";

export default function Footer() {
  const { t } = useTranslation();
  const footerLinkFont = { xs: "16px", md: "17px" };
  const footerBodyFont = { xs: "17px", md: "18px" };
  const footerHeadingFont = { xs: "1.35rem", md: "1.5rem" };

  const lastUpdated = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const address = t("footer.address");
  const latitude = 20.2815528;
  const longitude = 85.8491948;

  const mapHref = `https://www.google.com/maps?q=${latitude},${longitude}`;

  const mapEmbedSrc = `https://maps.google.com/maps?q=${latitude},${longitude}&z=17&output=embed`;
  const socialLinks = [
    {
      icon: Facebook, href: "https://www.facebook.com/scpdodisha/"
      ,
      label: "Facebook"
    },
    { icon: Twitter, href: "https://x.com/state_scpd", label: "X" },
    { icon: YouTube, href: "https://www.youtube.com/@scpdofficepersonswithdisab2386 ", label: "YouTube" },
    { icon: Instagram, href: "https://www.instagram.com/scpd_odisha/", label: "Instagram" },
  ];

  const [cmsFooterLinks, setCmsFooterLinks] = useState<CmsFooterLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCmsFooterLinks()
      .then((items) => {
        if (!cancelled) {
          setCmsFooterLinks(items || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCmsFooterLinks([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const staticContactLinks = useMemo(
    () => [
      { label: t("footer.contactUs"), to: "/contact/office-contact" },
      { label: t("footer.feedback"), to: "/feedback" },
      { label: t("footer.help"), to: "/help" },
    ],
    [t],
  );

  const staticPolicyLinks = useMemo(() => [], []);

  const staticGovernanceLinks = useMemo(() => [], []);

  const linksBySection = useMemo(() => {
    const grouped = {
      contact: [...staticContactLinks],
      policies: [...staticPolicyLinks],
      governance: [...staticGovernanceLinks],
    };

    const existingPathSet = {
      contact: new Set(grouped.contact.map((item) => item.to)),
      policies: new Set(grouped.policies.map((item) => item.to)),
      governance: new Set(grouped.governance.map((item) => item.to)),
    };

    const sortedCmsLinks = [...cmsFooterLinks].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );

    for (const link of sortedCmsLinks) {
      if (!link?.section || !link?.path || !grouped[link.section]) {
        continue;
      }
      if (existingPathSet[link.section].has(link.path)) {
        continue;
      }
      grouped[link.section].push({ label: link.label || link.path, to: link.path });
      existingPathSet[link.section].add(link.path);
    }

    return grouped;
  }, [cmsFooterLinks, staticContactLinks, staticGovernanceLinks, staticPolicyLinks]);

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: "#10104eff",
        color: "white",
        pt: 6,
        pb: 3,
      }}
    >
      <Box
        sx={{
          maxWidth: "1200px",
          mx: "auto",
          px: { xs: 3, lg: 6 },
          fontSize: { xs: "1.25rem", md: "1.35rem" },
        }}
      >
        <Grid container spacing={4}>
          {/* CONTACT / QUICK ITEMS */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", mb: 2, position: "relative", fontSize: footerHeadingFont }}
            >
              {t("footer.contactLinks")}
              <Box sx={{ width: 80, height: 3, mt: 1, bgcolor: "#facc15" }} />
            </Typography>

            <Box component="ul" sx={{ p: 0, m: 0, listStyle: "none" }}>
              {linksBySection.contact.map((item, i) => (
                <li key={i}>
                  <Link
                    component={RouterLink}
                    to={item.to}
                    underline="hover"
                    sx={{
                      color: "white",
                      textDecoration: "none",
                      display: "block",
                      fontSize: footerLinkFont,
                      py: 0.6,
                      "&:hover": {
                        color: "#facc15",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </Box>
            <Link
              component={RouterLink}
              to="/sitemap"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                color: "white",
                mb: 1.5,
                fontSize: footerLinkFont,
              }}
            >

              {t("footer.sitemap")}
            </Link>
            <Typography
              sx={{
                mt: 2,
                color: "gray.300",
                fontWeight: 600,
                fontSize: footerBodyFont,
              }}
            >
              {address}
            </Typography>


          </Grid>

          {/* POLICIES */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", mb: 2, position: "relative", fontSize: footerHeadingFont }}
            >
              {t("footer.policies")}
              <Box sx={{ width: 80, height: 3, mt: 1, bgcolor: "#facc15" }} />
            </Typography>

            <Box component="ul" sx={{ p: 0, m: 0, listStyle: "none" }}>
              {linksBySection.policies.map((item, i) => (
                <li key={i}>
                  <Link
                    component={RouterLink}
                    to={item.to}
                    underline="hover"
                    sx={{
                      color: "white",
                      textDecoration: "none",
                      display: "block",
                      fontSize: footerLinkFont,
                      py: 0.6,
                      "&:hover": {
                        color: "#facc15",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </Box>
          </Grid>

          {/* GOVERNANCE */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", mb: 2, position: "relative", fontSize: footerHeadingFont }}
            >
              {t("footer.governance")}
              <Box sx={{ width: 80, height: 3, mt: 1, bgcolor: "#facc15" }} />
            </Typography>

            <Box component="ul" sx={{ p: 0, m: 0, listStyle: "none" }}>
              {linksBySection.governance.map((item, i) => (
                <li key={i}>
                  <Link
                    component={RouterLink}
                    to={item.to}
                    underline="hover"
                    sx={{
                      color: "white",
                      textDecoration: "none",
                      display: "block",
                      fontSize: footerLinkFont,
                      py: 0.6,
                      "&:hover": {
                        color: "#facc15",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", mb: 2, position: "relative", fontSize: footerHeadingFont }}
            >
              {t("footer.ownership")}
              <Box sx={{ width: 80, height: 3, mt: 1, bgcolor: "#facc15" }} />
            </Typography>

        <Box
  sx={{
    mt: 1,
    fontSize: footerBodyFont,
    color: "white",
    fontWeight: 500,
  }}
>
  Powered by OCAC
</Box>
          </Grid>

          {/* OWNERSHIP */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h6" sx={{ mt: 1, fontWeight: "bold", fontSize: footerHeadingFont }}>
              {t("footer.followUs")}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {socialLinks.map(({ icon: Icon, href, label }, index) => (
                <IconButton
                  key={index}
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                    },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Box>
            <Link
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ display: "block", mt: 1, color: "#facc15", fontSize: footerLinkFont }}
            >
              {t("footer.viewOnMap")}
            </Link>

            <Box
              sx={{
                mt: 2,
                border: "1px solid #4b5563",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <iframe
                src={mapEmbedSrc}
                style={{ width: "100%", height: "160px" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={t("footer.mapTitle")}
              />
            </Box>
            <Typography
              sx={{
                mt: 1,
                color: "#d1d5db",
                fontSize: { xs: "14px", md: "15px" },
              }}
            >
              Latitude: {latitude}, Longitude: {longitude}
            </Typography>
          </Grid>
        </Grid>

        {/* BOTTOM BAR */}
        <Box
          sx={{
            borderTop: "1px solid #374151",
            mt: 6,
            pt: 2,
            textAlign: "center",
            color: "gray.400",
            fontSize: footerBodyFont,
          }}
        >
          © {new Date().getFullYear()} {t("footer.scpdOdisha")}
          <Box sx={{ mt: 0.5 }}>{t("footer.lastUpdated")} {lastUpdated}</Box>
        </Box>
      </Box>
    </Box>
  );
}
