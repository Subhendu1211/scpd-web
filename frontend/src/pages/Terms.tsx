import React from "react";
import { Box, Typography } from "@mui/material";

export default function Terms() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
        Terms and Conditions
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.22rem", md: "1.34rem" } }}>
        These terms govern the use of this website. By accessing and using the
        site you agree to comply with these terms. Please read them carefully.
      </Typography>

      <Typography sx={{ fontWeight: 600, mt: 2, fontSize: { xs: "1.3rem", md: "1.45rem" } }}>Acceptable use</Typography>
      <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        Users must not use the site for unlawful activities or to post
        defamatory, obscene or abusive material.
      </Typography>

      <Typography sx={{ fontWeight: 600, mt: 2, fontSize: { xs: "1.3rem", md: "1.45rem" } }}>Intellectual property</Typography>
      <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        All site content is the property of the website unless stated
        otherwise. Reuse requires permission as described on the Copyright page.
      </Typography>

      <Typography sx={{ fontWeight: 600, mt: 2, fontSize: { xs: "1.3rem", md: "1.45rem" } }}>Changes to terms</Typography>
      <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        We may update these terms from time to time; changes will be posted on
        this page with the date of the latest revision.
      </Typography>
    </Box>
  );
}
