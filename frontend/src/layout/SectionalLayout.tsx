import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  IconButton,
  Toolbar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { NavLink } from "react-router-dom";

const drawerWidth = 260;

export default function SectionLayout({ menuItems, children }) {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div style={{ display: "flex" }}>
      {/* Mobile Menu Button */}
      <IconButton
        sx={{ display: { xs: "block", md: "none" }, m: 1 }}
        onClick={() => setOpenDrawer(true)}
      >
        <MenuIcon />
      </IconButton>

      {/* Sidebar Drawer */}
      <Drawer
        variant="temporary"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: drawerWidth },
        }}
      >
        <SidebarContent
          menuItems={menuItems}
          openIndex={openIndex}
          handleToggle={handleToggle}
          closeDrawer={() => setOpenDrawer(false)}
        />
      </Drawer>

      {/* Permanent Sidebar for Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": { width: drawerWidth, top: 0 },
        }}
        open
      >
        <Toolbar />
        <SidebarContent
          menuItems={menuItems}
          openIndex={openIndex}
          handleToggle={handleToggle}
        />
      </Drawer>

      {/* Page Content */}
      <main style={{ flexGrow: 1, padding: "20px", marginLeft: drawerWidth }}>
        {children}
      </main>
    </div>
  );
}

function SidebarContent({ menuItems, openIndex, handleToggle, closeDrawer }) {
  return (
    <List>
      {menuItems.map((item, idx) => {
        const hasSub = item.children?.length > 0;
        const isOpen = openIndex === idx;

        return (
          <div key={idx}>
            <ListItemButton onClick={() => hasSub && handleToggle(idx)}>
              <ListItemText primary={item.label} />
              {hasSub ? isOpen ? <ExpandLess /> : <ExpandMore /> : null}
            </ListItemButton>

            {hasSub && (
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      style={{ textDecoration: "none", color: "inherit" }}
                      onClick={closeDrawer}
                    >
                      <ListItemButton sx={{ pl: 4 }}>
                        <ListItemText primary={child.label} />
                      </ListItemButton>
                    </NavLink>
                  ))}
                </List>
              </Collapse>
            )}
          </div>
        );
      })}
    </List>
  );
}
