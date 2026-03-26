import React from "react";
import { Box, Typography, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function CopyrightPage() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
        Copyright Information
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        Copyright © {new Date().getFullYear()} SCPD Odisha. All rights reserved.
        The content on this website, including text, images, graphics and code,
        is protected under copyright law unless otherwise stated.
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        Permitted use: You may view, download, and print pages from this site
        for your personal, non-commercial use, provided you retain all
        copyright and other proprietary notices. Reuse or republication of
        material from this site requires prior written permission.
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        To request permission for reuse or to report copyright concerns, please
        use the <Link component={RouterLink} to="/feedback" sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>Feedback</Link>
        form or contact us via the <Link component={RouterLink} to="/contact/office-contact" sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>Contact</Link> page.
      </Typography>
    </Box>
  );
}
