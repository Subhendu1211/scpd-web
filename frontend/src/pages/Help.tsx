import React from "react";
import { Box, Typography, List, ListItem, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function Help() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
        Help & Getting Started
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.22rem", md: "1.34rem" } }}>
        Welcome — this page helps you find common resources and answers quickly.
      </Typography>

      <Typography variant="h6" sx={{ mt: 2, mb: 1, fontSize: { xs: "1.5rem", md: "1.72rem" } }}>
        Quick links
      </Typography>
      <List>
        <ListItem>
          <Link component={RouterLink} to="/accessibility" underline="hover" sx={{ fontSize: { xs: "1.15rem", md: "1.25rem" } }}>
            Accessibility Statement
          </Link>
        </ListItem>
        <ListItem>
          <Link component={RouterLink} to="/sitemap" underline="hover" sx={{ fontSize: { xs: "1.15rem", md: "1.25rem" } }}>
            Sitemap
          </Link>
        </ListItem>
        <ListItem>
          <Link component={RouterLink} to="/contact/office-contact" underline="hover" sx={{ fontSize: { xs: "1.15rem", md: "1.25rem" } }}>
            Contact Us (office details)
          </Link>
        </ListItem>
      </List>

      <Typography variant="h6" sx={{ mt: 2, mb: 1, fontSize: { xs: "1.5rem", md: "1.72rem" } }}>
        Frequently asked questions
      </Typography>
      <Typography sx={{ mb: 1, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        Q: How do I report website accessibility issues?
      </Typography>
      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        A: Use the Feedback link in the footer or email the Web Information
        Manager listed on the Governance section.
      </Typography>

      <Typography variant="h6" sx={{ mt: 2, mb: 1, fontSize: { xs: "1.5rem", md: "1.72rem" } }}>
        Need further help?
      </Typography>
      <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        If none of the above answers your question, please submit a request via
        the <Link component={RouterLink} to="/feedback" sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>Feedback</Link> page or
        contact the office directly from the Contact page.
      </Typography>
    </Box>
  );
}
