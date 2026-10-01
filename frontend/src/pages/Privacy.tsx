import React from "react";
import { Box, Typography, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function Privacy() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
        Privacy Policy
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.22rem", md: "1.34rem" } }}>
        We are committed to protecting your privacy. This policy explains how
        we collect and process personal data when you use this website.
      </Typography>

      <Typography sx={{ fontWeight: 600, mt: 2, fontSize: { xs: "1.3rem", md: "1.45rem" } }}>What we collect</Typography>
      <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        We may collect information you provide directly (for example, when you
        submit the Feedback form) and non-identifying technical information
        (such as browser and device data) to help improve the site.
      </Typography>

      <Typography sx={{ fontWeight: 600, mt: 2, fontSize: { xs: "1.3rem", md: "1.45rem" } }}>How we use data</Typography>
      <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        Personal data is used only for the purpose it was provided, such as to
        respond to enquiries. We do not sell personal data to third parties.
      </Typography>

      <Typography sx={{ fontWeight: 600, mt: 2, fontSize: { xs: "1.3rem", md: "1.45rem" } }}>Cookies</Typography>
      <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        We may use cookies and similar technologies to improve site
        functionality. You can control cookie settings in your browser.
      </Typography>

      <Typography sx={{ fontWeight: 600, mt: 2, fontSize: { xs: "1.3rem", md: "1.45rem" } }}>Contact</Typography>
      <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        For privacy concerns or to request access or deletion of your data,
        contact us via the <Link component={RouterLink} to="/contact/office-contact" sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>Contact</Link> page.
      </Typography>
    </Box>
  );
}
