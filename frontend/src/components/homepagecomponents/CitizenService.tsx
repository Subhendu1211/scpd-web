import React from "react";
import { useNavigate } from "react-router-dom";
import { Paper, Typography, List, ListItemButton, ListItemText } from "@mui/material";
import { useTranslation } from "react-i18next";
import { redirectToCaseManagementLogin } from "../../utils/externalNavigation";

type ServiceItem = {
  titleKey: string;
  href: string;
  requiresAuth?: boolean;
};

const CITIZEN_SERVICE: ServiceItem[] = [
  {
    titleKey: "nav.grievances.howTo",
    href: "/grievances/how-to-register",
  },
  {
    titleKey: "nav.grievances.register",
    href: "/grievances/register",
    requiresAuth: true,
  },
  { titleKey: "homepage.caseStatusCheck", href: "__CASE_MGMT_DASHBOARD__" },
];

export default function CitizenService() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleNavigate = (href: string, requiresAuth?: boolean) => {
    if (href === "__CASE_MGMT_DASHBOARD__" || requiresAuth) {
      redirectToCaseManagementLogin("CITIZEN");
      return;
    }

    navigate(href);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        background: "linear-gradient(135deg, #f7f9ff 0%, #ffffff 100%)",
        border: "1px solid #e3e8ff",
        boxShadow: "0 12px 32px rgba(0,0,0,0.05)",
        p: { xs: 3, md: 4 },
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: { xs: "320px", md: "360px" },
      }}
    >
      <Typography
        variant="h5"
        sx={{
          color: "#0b3a8c",
          fontWeight: 900,
          letterSpacing: 0.2,
          mb: 2,
          fontSize: { xs: 24, md: 28 },
          textAlign: "left",
        }}
      >
        {t("homepage.citizenServices")}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          mt: 1,
          flex: 1,
          p: { xs: 2, md: 2.5 },
          borderRadius: "14px",
          backgroundColor: "#ffffff",
          border: "1px solid #e6ecff",
          boxShadow: "0 10px 26px rgba(0,0,0,0.04)",
        }}
      >
        <List sx={{ m: 0, p: 0 }}>
          {CITIZEN_SERVICE.map((item) => (
            <ListItemButton
              key={item.titleKey}
              onClick={() => handleNavigate(item.href, item.requiresAuth)}
              sx={{
                mb: 2,
                borderRadius: "12px",
                backgroundColor: "#ffffff",
                border: "1px solid #eef2f7",
                boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
                px: 2.5,
                py: 2,
                "&:last-of-type": { mb: 0 },
                transition: "background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
                "& .MuiListItemText-primary": {
                  color: "#0b3a8c",
                  transition: "color 0.2s ease",
                },
                "&:hover": {
                  backgroundColor: "#0b3a8c",
                  transform: "translateY(-1px)",
                  boxShadow: "0 12px 26px rgba(0,0,0,0.08)",
                  "& .MuiListItemText-primary": {
                    color: "#ffffff",
                  },
                },
              }}
            >
              <ListItemText
                primary={t(item.titleKey)}
                primaryTypographyProps={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#0b3a8c",
                }}
              />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Paper>
  );
}