import React from "react";
import { Box, Typography, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function Hyperlinking() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
        Hyperlinking Policy
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        Links to external websites are provided for convenience and information
        only. SCPD Odisha is not responsible for the content of external sites
        and does not necessarily endorse their content.
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        When linking to this site, please ensure that the content is not taken
        out of context and that the source is properly attributed. For
        permissions to republish content, contact us via the
        <Link component={RouterLink} to="/contact/office-contact" sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}> Contact</Link> page.
      </Typography>
    </Box>
  );
}
