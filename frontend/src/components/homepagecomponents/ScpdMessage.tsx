import React from "react";
import { Box, Typography, Button } from "@mui/material";

export default function ScpdMessage() {
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #fff9f2 0%, #fffefc 100%)",
        borderRadius: "14px",
        border: "1px solid #ffe2c4",
        boxShadow: "0 12px 32px rgba(0,0,0,0.04)",
        p: { xs: 3, md: 4 },
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Typography
        variant="h5"
        component="h2"
        sx={{ fontWeight: 800, color: "#c65600", mb: 2, fontSize: { xs: 24, md: 28 } }}
      >
        SCPD's message
      </Typography>

      <Typography
        sx={{
          color: "#2c3e50",
          lineHeight: 1.95,
          fontSize: { xs: 16, md: 18 },
          textAlign: "justify"
        }}
      >
        The Office of the State Commissioner for Persons with Disabilities (SCPD),
        Odisha, safeguards the rights and entitlements of persons with disabilities,
        monitors implementation of the RPwD Act, 2016, and facilitates accessibility,
        awareness, and grievance redressal across departments.
      </Typography>

      <Typography
        sx={{
          color: "#2c3e50",
          lineHeight: 1.95,
          mt: 2,
          fontSize: { xs: 16, md: 18 },
          textAlign: "justify"
        }}
      >
        The Commissioner inquires into complaints, issues recommendations for
        corrective action, and promotes an inclusive, barrier-free environment in
        built infrastructure, ICT, transport, and services.
      </Typography>

      <Box sx={{ mt: 3 }}>
      <Button
  variant="contained"
  sx={{
    px: 3,
    py: 1.2,
    fontWeight: 700,
    fontSize: { xs: 15, md: 16 },
    backgroundColor: "#0b3a8c",
    boxShadow: "0 12px 22px rgba(11, 58, 140, 0.35)",
    textTransform: "none",
    borderRadius: "10px",
    "&:hover": {
      backgroundColor: "#0f4fb5"
    },
  }}
>
  Read More
</Button>
      </Box>
    </Box>
  );
}