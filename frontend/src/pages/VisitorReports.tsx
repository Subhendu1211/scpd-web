import React from "react";
import { Box, Typography, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function VisitorReports() {
  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: "2.2rem", md: "2.6rem" } }}>
        Visitor Reports
      </Typography>

      <Typography sx={{ mb: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        We publish periodic visitor reports summarising traffic to the website
        to improve transparency and inform service improvements.
      </Typography>

      <Typography sx={{ fontWeight: 600, mt: 2, fontSize: { xs: "1.3rem", md: "1.45rem" } }}>What these reports include</Typography>
      <ul style={{ fontSize: "1.2rem", lineHeight: 1.65 }}>
        <li>Number of visitors and sessions</li>
        <li>Most viewed pages and resources</li>
        <li>Geographic and device breakdown (aggregated)</li>
      </ul>

      <Typography sx={{ mt: 2, fontSize: { xs: "1.2rem", md: "1.3rem" } }}>
        Reports are published on a monthly or quarterly basis. To request a
        specific report or for enquiries about the data, please contact the
        Web Information Manager or use the <Link component={RouterLink} to="/feedback" sx={{ fontSize: { xs: "1.2rem", md: "1.3rem" } }}>Feedback</Link> page.
      </Typography>
    </Box>
  );
}
