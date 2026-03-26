import React from "react";
import { Box, Button, Paper, Typography, Skeleton } from "@mui/material";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCmsPage } from "../../../hooks/useCmsPage";

export default function AboutScpd() {
  const { page, loading, error } = useCmsPage("/about");
  const { t } = useTranslation();

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ py: 1 }}>
          <Skeleton variant="text" sx={{ fontSize: "1rem", mb: 1, bgcolor: "rgba(11,58,140,0.05)" }} width="100%" />
          <Skeleton variant="text" sx={{ fontSize: "1rem", mb: 1, bgcolor: "rgba(11,58,140,0.05)" }} width="95%" />
          <Skeleton variant="text" sx={{ fontSize: "1rem", mb: 1, bgcolor: "rgba(11,58,140,0.05)" }} width="90%" />
          <Skeleton variant="text" sx={{ fontSize: "1rem", mb: 1, bgcolor: "rgba(11,58,140,0.05)" }} width="98%" />
          <Skeleton variant="text" sx={{ fontSize: "1rem", mb: 1, bgcolor: "rgba(11,58,140,0.05)" }} width="85%" />
        </Box>
      );
    }

    if (error || !page) {
      return (
        <>
          <Typography
            variant="body1"
            sx={{
              color: "#2c3e50",
              lineHeight: 1.95,
              fontSize: { xs: 16, md: 18 },
              textAlign: "justify",
            }}
          >
            {t("homepage.aboutScpdBody1")}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "#2c3e50",
              lineHeight: 1.95,
              mt: 2,
              fontSize: { xs: 16, md: 18 },
              textAlign: "justify",
            }}
          >
            {t("homepage.aboutScpdBody2")}
          </Typography>
        </>
      );
    }

    return (
      <Typography
        variant="body1"
        sx={{
          color: "#2c3e50",
          lineHeight: 1.8,
          fontSize: { xs: 16, md: 18 },
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 8,
          WebkitBoxOrient: "vertical",
          textAlign: "justify",
        }}
      >
        {page.summary || (page.body ? page.body.replace(/<[^>]*>?/gm, "") : "")}
      </Typography>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        background: "linear-gradient(135deg, #f7f9ff 0%, #ffffff 100%)",
        border: "1px solid #e3e8ff",
        boxShadow: "0 12px 32px rgba(0,0,0,0.05)",
        p: { xs: 3, md: 4 },
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: { xs: "320px", md: "360px" },
      }}
    >
      {/* SCPD MESSAGE TITLE */}
      <Typography
        variant="h6"
        sx={{
          color: "#0b3a8c",
          fontWeight: 900,
          textTransform: "none",
          letterSpacing: 1.2,
          mb: 2,
          fontSize: { xs: 16, md: 18 },
        }}
      >
        {t("homepage.scpdMessage")}
      </Typography>

      {renderContent()}

      {/* READ MORE BUTTON */}
      <Box sx={{ mt: "auto", pt: 3 }}>
        <Button
          variant="contained"
          component={Link}
          to="/about"
          sx={{
            alignSelf: "flex-start",
            backgroundColor: "#0b3a8c",
            fontWeight: 800,
            fontSize: { xs: 15, md: 16 },
            px: 3.5,
            py: 1.25,
            borderRadius: "12px",
            textTransform: "none",
            letterSpacing: 0.4,
            boxShadow: "0 12px 22px rgba(11, 58, 140, 0.35)",
            "&:hover": {
              backgroundColor: "#0f4fb5",
            },
          }}
        >
          {t("homepage.readMore")}
        </Button>
      </Box>
    </Paper>
  );
}