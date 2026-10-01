import React from "react";
import { Box, Typography, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function WebInformationManager() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
        Web Information Manager
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        The Web Information Manager (WIM) is responsible for maintaining the
        website content, ensuring accessibility compliance and acting as the
        primary point of contact for website-related queries.
      </Typography>

      <Typography sx={{ fontWeight: 600, mt: 2, fontSize: { xs: "1.3rem", md: "1.45rem" } }}>Responsibilities</Typography>
      <ul style={{ fontSize: "1.2rem", lineHeight: 1.65 }}>
        <li>Maintain and publish official content.</li>
        <li>Coordinate with departments to update pages.</li>
        <li>Ensure accessibility and usability of the website.</li>
      </ul>

      <Typography sx={{ mt: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        For matters related to content updates or technical issues, please use
        the <Link component={RouterLink} to="/feedback" sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>Feedback</Link> page or
        contact the office via the Contact page.
      </Typography>
    </Box>
  );
}
