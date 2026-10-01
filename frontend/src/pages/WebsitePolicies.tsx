import React from "react";
import { Box, Typography, List, ListItem, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function WebsitePolicies() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
        Website Policies
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.22rem", md: "1.34rem" } }}>
        This page brings together key policies that govern the use of this
        website.
      </Typography>

      <List>
        <ListItem>
          <Link component={RouterLink} to="/privacy" sx={{ fontSize: { xs: "1.15rem", md: "1.25rem" } }}>Privacy Policy</Link>
        </ListItem>
        <ListItem>
          <Link component={RouterLink} to="/terms" sx={{ fontSize: { xs: "1.15rem", md: "1.25rem" } }}>Terms and Conditions</Link>
        </ListItem>
        <ListItem>
          <Link component={RouterLink} to="/copyright" sx={{ fontSize: { xs: "1.15rem", md: "1.25rem" } }}>Copyright</Link>
        </ListItem>
        <ListItem>
          <Link component={RouterLink} to="/disclaimer" sx={{ fontSize: { xs: "1.15rem", md: "1.25rem" } }}>Disclaimer</Link>
        </ListItem>
        <ListItem>
          <Link component={RouterLink} to="/accessibility" sx={{ fontSize: { xs: "1.15rem", md: "1.25rem" } }}>Accessibility Statement</Link>
        </ListItem>
      </List>
    </Box>
  );
}
