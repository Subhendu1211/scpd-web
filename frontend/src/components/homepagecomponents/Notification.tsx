import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Button,
  IconButton,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import DownloadIcon from "@mui/icons-material/Download";
import { Link as RouterLink } from "react-router-dom";
import { fetchWhatsNew } from "../../services/cms";

type WhatsNewItem = {
  id: number | string;
  title: string;
  publishedAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  link?: string | null;
  dateLabel?: string;
};

const FALLBACK_ITEMS: WhatsNewItem[] = [
  {
    id: 1,
    title:
      "Prime Minister Shri Narendra Modi presented with First set of SCPD Annual reports; Union Minister Ashwini Vaishnaw Calls It a Moment of Pride Thanking PM for his farsighted vision, strong will and decisive action",
    dateLabel: "02 Sep 2025",
  },
  {
    id: 2,
    title: "Prime Minister Shri Narendra Modi inaugurates SCPD India 2025 in New Delhi",
    dateLabel: "02 Sep 2025",
  },
  {
    id: 3,
    title: "English rendering of PM’s speech during SCPD India 2025 at Yashobhoomi, Delhi",
    dateLabel: "02 Sep 2025",
  },
  {
    id: 4,
    title:
      "Major Milestone in India’s SCPD Journey as one of India’s first end-to-end OSAT Pilot Line Facility Launched in Sanand, Gujarat",
    dateLabel: "28 Aug 2025",
  },
  {
    id: 5,
    title: "Prime Minister Narendra Modi to inaugurate fourth edition of SCPD India 2025",
    dateLabel: "22 Aug 2025",
  },
];

export default function Notification() {
  const [items, setItems] = useState<WhatsNewItem[]>(FALLBACK_ITEMS);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchWhatsNew(8);
        if (!cancelled && data?.length) {
          setItems(
            data.map((item, idx) => ({
              id: item.id ?? idx,
              title: item.title || `Update ${idx + 1}`,
              publishedAt: item.publishedAt,
              // support different naming conventions from backend
              startDate: (item as any).startDate ?? (item as any).start_date ?? (item as any).start_at ?? null,
              endDate: (item as any).endDate ?? (item as any).end_date ?? (item as any).end_at ?? null,
              link: item.link || undefined
            }))
          );
        }
      } catch {
        // fallback list remains
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (value?: string | null, fallback?: string) => {
    if (value) {
      const s = String(value).trim();

      // Try native parse first
      let parsed = new Date(s);
      if (Number.isNaN(parsed.valueOf())) {
        // support DD-MM-YYYY or DD/MM/YYYY
        const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[T\s].*)?$/);
        if (m) {
          const day = Number(m[1]);
          const month = Number(m[2]) - 1;
          const year = Number(m[3]);
          parsed = new Date(year, month, day);
        }
      }

      if (!Number.isNaN(parsed.valueOf())) {
        return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
      }
    }
    return fallback || "";
  };

  const formatRange = (start?: string | null, end?: string | null, fallback?: string) => {
    const s = start ? formatDate(start) : null;
    const e = end ? formatDate(end) : null;
    if (s && e) return `${s} - ${e}`;
    if (s) return s;
    if (e) return e;
    return fallback || "";
  };

  return (
    <Box sx={{ px: { xs: 2, md: 6 }, py: 5 }}>
      {/* HEADER */}
      <Grid container justifyContent="space-between" alignItems="center">
        <Grid>
          <Typography
            sx={{
              color: "#0b3a8c",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              mb: -1,
              fontSize: "18px",
            }}
          >
            <NotificationsNoneIcon sx={{ mr: 1, fontSize: "26px" }} />
            NOTIFICATIONS
          </Typography>

          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "30px",
              color: "#081c3d",
              mt: 1,
            }}
          >
            What’s New
          </Typography>

          {/* Underline */}
          <Box
            sx={{
              width: "210px",
              height: "4px",
              background: "#0b3a8c",
              borderRadius: "4px",
              mt: 1,
            }}
          />
        </Grid>

        {/* VIEW MORE BUTTON */}
        <Grid>
          <Button
            variant="contained"
            component={RouterLink}
            to="/notice-board"
            sx={{
              background: "#0b3a8c",
              borderRadius: "40px",
              px: 4,
              py: 1.5,
              fontSize: "16px",
              textTransform: "none",
              "&:hover": { background: "#0a3378" },
            }}
          >
            View More →
          </Button>
        </Grid>
      </Grid>

      {/* SCROLLABLE LIST */}
      <Box
        sx={{
          mt: 4,
          maxHeight: "420px",
          overflowY: "auto",
          pr: 1,
          //   Custom Scroll Styles
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#0b3a8c",
            borderRadius: "10px",
          },
        }}
      >
        {(items.length ? items : FALLBACK_ITEMS).map((item, index) => (
          <Paper
            key={item.id ?? index}
            elevation={0}
            sx={{
              p: 1,
              mb: 2,
              borderRadius: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#e9e9efff",
              border: "2px solid transparent",
              transition: "0.2s",
              cursor: "pointer",
              "&:hover": {
                border: "2px solid #0b3a8c",
              },
            }}
            component="div"
            onClick={() => {
              navigate("/notice-board");
            }}
            role="button"
            tabIndex={0}
          >
            <Typography sx={{ fontSize: "15px", color: "#333", flex: 1 }}>
              {item.title}
            </Typography>

            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                navigate("/notice-board");
              }}
              disabled={false}
            >
              <DownloadIcon sx={{ fontSize: "32px", color: item.link ? "#0b3a8c" : "#93a4c6" }} />
            </IconButton>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
