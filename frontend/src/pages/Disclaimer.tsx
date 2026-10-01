import React from "react";
import { Box, Typography } from "@mui/material";

export default function Disclaimer() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
        Disclaimer
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        The information provided on this website is intended for general
        information only. While we strive to keep the content accurate and up
        to date, we do not warrant or guarantee the completeness, accuracy, or
        suitability of the information for any purpose.
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        The website and its owners shall not be liable for any loss or damage
        arising from reliance on the information published here. External links
        are provided for convenience and do not imply endorsement.
      </Typography>
    </Box>
  );
}
