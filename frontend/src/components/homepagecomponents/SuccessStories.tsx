import React, { useEffect, useState } from "react";
import { Box, Grid, Typography, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { useCmsPage } from "../../hooks/useCmsPage";

const PAGE_PATH = "/publications/success-stories";

interface SuccessStoryItem {
  id: number;
  year: number;
  imageUrl: string;
  altText: string | null;
  createdAt?: string;
}

export default function SuccessStories() {
  const { t, i18n } = useTranslation();
  const { page, loading } = useCmsPage(PAGE_PATH);
  const [stories, setStories] = useState<SuccessStoryItem[]>([]);

  // Fetch latest success stories for homepage block
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/success-stories")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const data: SuccessStoryItem[] = Array.isArray(json.data) ? json.data : [];
        const latest = [...data]
          .sort((a, b) => {
            if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
            if (b.createdAt && a.createdAt) {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return (b.id || 0) - (a.id || 0);
          })
          .slice(0, 4);
        setStories(latest);
      })
      .catch(() => setStories([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const isOdia = i18n.language === "or";
  const title =
    (isOdia ? page?.titleOr : page?.titleEn) ||
    page?.title ||
    t("homepage.successStories");
  const summary =
    (isOdia ? page?.summaryOr : page?.summaryEn) ||
    page?.summary ||
    t("homepage.successStoriesSummary");

  const formatStoryDate = (value?: string) => {
    if (!value) return null;
    const dt = new Date(value);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <Box
      sx={{
        height:"17%",
        px: { xs: 2, md: 4 },
        py: 3,
        backgroundColor: "#e8eefc",
        transition: "200ms ease",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <Grid container justifyContent="space-between" alignItems="center">
        <Grid>
          <Box
            sx={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "22px",
                color: "#081c3d",
                display: "inline-block",
              }}
            >
              {title}
            </Typography>

            <Box
              sx={{
                width: "100%",
                height: "4px",
                background: "#0b3a8c",
                borderRadius: "4px",
                mt: "6px",
                mb: 3,
              }}
            />
          </Box>
        </Grid>
      </Grid>

      {/* LATEST 4 SUCCESS STORIES */}
      {stories.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
            mb: 2,
          }}
        >
          {stories.map((story) => (
            <Box
              key={story.id}
              sx={{
                borderRadius: "10px",
                background: "#e5eaf2",
                padding: 3,
                minHeight: "120px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                textAlign: "center",
                gap: 0.5,
                boxShadow: "0 6px 12px rgba(0, 0, 0, 0.06)",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "20px",
                  color: "#0b3a8c",
                }}
              >
                {story.year}
              </Typography>
              <Typography
                sx={{
                  fontSize: "14px",
                  color: "#44506b",
                }}
              >
                {story.altText || t("homepage.successStoryAlt") || "Success Story"}
              </Typography>
              {formatStoryDate(story.createdAt) ? (
                <Typography
                  sx={{
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  {formatStoryDate(story.createdAt)}
                </Typography>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}

      {/* TEXT */}
      <Typography
        sx={{
          fontSize: "16px",
          lineHeight: "1.7",
          color: "#333",
          mb: 2,
          flexGrow: 1,
          textAlign: "justify",
        }}
      >
        {loading ? "Loading…" : summary}
      </Typography>

      {/* VIEW MORE BUTTON */}
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          component={RouterLink}
          to="/publications/success-stories"
          sx={{
            background: "#0a3378",
            borderRadius: "40px",
            px: 4,
            py: 1.2,
            textTransform: "none",
            fontSize: "16px",
            "&:hover": { background: "#0a3378" },
          }}
        >
          {t("homepage.viewMore")}
        </Button>
      </Box>
    </Box>
  );
}
