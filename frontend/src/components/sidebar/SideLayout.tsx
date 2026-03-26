import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Paper,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export type MenuItem = {
  label: string;
  to: string;
  children?: MenuItem[];
};

export default function SideLayout({
  children,
  menuItems,
}: {
  children: React.ReactNode;
  menuItems: MenuItem[];
}) {
  const { t } = useTranslation();
  const CITIZEN_LOGIN_URL = "http://localhost:5173/login/citizen";
  const EXTERNAL_NOTIFICATIONS_URL = "https://ssepd.odisha.gov.in/en/notifications/notification";
  const EXTERNAL_DISABILITY_POLICIES_URL =
    "https://ssepd.odisha.gov.in/en/publication/ssedp-laws-policies-schemes";
  const SAME_TAB_EXTERNAL_URLS = new Set<string>([
    EXTERNAL_NOTIFICATIONS_URL,
    EXTERNAL_DISABILITY_POLICIES_URL,
  ]);

  const renderMenuItem = (item: MenuItem, nested = false) => {
    const isExternal = typeof item.to === "string" && /^https?:\/\//i.test(item.to);
    const hasChildren = !!item.children?.length;
    const isCitizenLoginTarget = /\/login\/citizen\/?$/i.test(item.to);
    const isSameTabExternalTarget = isExternal && SAME_TAB_EXTERNAL_URLS.has(item.to);

    const handleCitizenRedirect = (event: React.MouseEvent<HTMLElement>) => {
      if (!isCitizenLoginTarget) {
        if (isSameTabExternalTarget) {
          event.preventDefault();
          window.location.assign(item.to);
        }
        return;
      }

      event.preventDefault();
      window.location.assign(CITIZEN_LOGIN_URL);
    };

    const labelNode = (
      <>
        <ListItemText
          primary={t(item.label)}
          sx={{
            overflowWrap: "break-word",
            wordBreak: "normal",
            writingMode: "horizontal-tb",
            transform: "none",
            letterSpacing: "normal",
            flex: "1 1 auto",
            textAlign: "left",
          }}
          primaryTypographyProps={{
            fontSize: { xs: "14px", sm: nested ? "14px" : "15px" },
            fontWeight: nested ? 600 : 600,
            color: "#1d2d50",
            sx: {
              whiteSpace: "normal",
              lineHeight: 1.4,
              writingMode: "horizontal-tb",
              transform: "none",
              display: "block",
            },
          }}
        />
        <ArrowForwardIcon
          sx={{
            fontSize: 18,
            color: "#5070a5",
            ml: 1,
          }}
        />
      </>
    );

    const buttonSx = {
      px: 2,
      py: { xs: 1.1, sm: 1.3 },
      minHeight: { xs: 48, sm: nested ? 50 : 56 },
      borderBottom: nested ? "1px solid #d8e0ee" : "1px solid #d8e0ee",
      display: "flex",
      gap: 2,
      alignItems: "center",
      justifyContent: "space-between",
      bgcolor: "#fff",
      "&:hover": {
        bgcolor: "#02028C",
        "& .MuiListItemText-primary": { color: "#fff" },
        "& .MuiSvgIcon-root": { color: "#fff" },
      },
    } as const;

    return (
      <Box
        key={`${item.to}-${item.label}`}
        sx={{
          position: "relative",
          "&:hover > .scpd-flyout": { display: { md: "block" } },
          "&:focus-within > .scpd-flyout": { display: { md: "block" } },
        }}
      >
        {isExternal ? (
          <a
            href={item.to}
            target={isSameTabExternalTarget ? "_self" : "_blank"}
            rel="noopener noreferrer"
            style={{ textDecoration: "none", color: "inherit" }}
            onClick={handleCitizenRedirect}
          >
            <ListItemButton sx={buttonSx}>{labelNode}</ListItemButton>
          </a>
        ) : (
          <NavLink to={item.to} style={{ textDecoration: "none" }} onClick={handleCitizenRedirect}>
            {({ isActive }) => (
              <ListItemButton
                sx={{
                  ...buttonSx,
                  bgcolor: isActive && !nested ? "#8abff5" : buttonSx.bgcolor,
                  "& .MuiSvgIcon-root": {
                    color: isActive && !nested ? "#000680" : "#5070a5",
                  },
                  "& .MuiListItemText-primary": {
                    fontWeight: isActive && !nested ? 800 : 600,
                  },
                }}
              >
                {labelNode}
              </ListItemButton>
            )}
          </NavLink>
        )}

        {hasChildren ? (
          <Paper
            className="scpd-flyout"
            elevation={3}
            sx={{
              display: { xs: "none", md: "none" },
              position: "absolute",
              top: 0,
              left: "100%",
              minWidth: 280,
              zIndex: 20,
              borderRadius: 1,
              overflow: "visible",
            }}
          >
            <List sx={{ p: 0 }}>
              {item.children!.map((child) => renderMenuItem(child, true))}
            </List>
          </Paper>
        ) : null}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: { xs: 1.5, sm: 2, md: 3 },
        p: { xs: 1.5, sm: 2, md: 3 },
        mt: 1,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* LEFT SIDEBAR (Styled as per screenshot) */}
      <Paper
        elevation={1}
        sx={{
          width: { xs: "100%", md: 270 },
          minWidth: { xs: "100%", md: 240 }, /* ensure sidebar is not collapsed on desktop */
          maxWidth: { xs: "100%", md: 270 },
          flexShrink: 0, /* never shrink below minWidth */
          boxSizing: "border-box",
          bgcolor: "#fff",
          borderRadius: 0,
          p: 0,
          border: "1px solid #d0d7e2",
        }}
      >
          <List sx={{ p: 0 }}>
            {menuItems.map((item) => renderMenuItem(item))}
          </List>
      </Paper>

      {/* RIGHT CONTENT */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          p: { xs: 1.5, sm: 2, md: 3 },
          borderRadius: 1,
          background: "#fff",
          boxShadow: "0px 1px 3px rgba(0,0,0,0.1)",
          overflowX: "auto",
          boxSizing: "border-box",
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}
