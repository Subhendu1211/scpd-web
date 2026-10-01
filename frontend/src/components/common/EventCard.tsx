import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Link as MuiLink,
} from "@mui/material";
import { MdCalendarToday, MdLocationOn } from "react-icons/md";
import { Link } from "react-router-dom";

interface EventCardProps {
  title: string;
  image: string;
  date?: string;
  location?: string;
  description?: string;
  link?: string;
  fallbackImage?: string;
  galleryImages?: string[];
  galleryButtonLabel?: string;
  galleryExpanded?: boolean;
  onGalleryButtonClick?: () => void;
  onReadMore?: () => void;
  renderInlineGallery?: boolean;
  mediaHeight?: number;
}

const EventCard: React.FC<EventCardProps> = ({
  title,
  image,
  date,
  location,
  link,
  description,
  fallbackImage = "/placeholder-event.jpg",
  galleryImages = [],
  galleryButtonLabel = "View all photos",
  galleryExpanded,
  onGalleryButtonClick,
  onReadMore,
  renderInlineGallery = true,
  mediaHeight = 220,
}) => {
  const [internalGalleryExpanded, setInternalGalleryExpanded] = React.useState(false);

  const uniqueGalleryImages = React.useMemo(() => {
    const cleaned = galleryImages
      .map((url) => String(url || "").trim())
      .filter(Boolean);
    return Array.from(new Set(cleaned));
  }, [galleryImages]);

  const descriptionPreview = React.useMemo(() => {
    if (!description) return "";
    const trimmed = description.trim();
    if (trimmed.length <= 140) return trimmed;
    return trimmed.slice(0, 140).trimEnd() + "…";
  }, [description]);

  const showReadMore = Boolean(description && description.trim().length > 140);

  const showGalleryButton = !link && uniqueGalleryImages.length > 1;
  const isGalleryControlled = typeof onGalleryButtonClick === "function";
  const isGalleryOpen = isGalleryControlled
    ? Boolean(galleryExpanded)
    : internalGalleryExpanded;

  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (link) {
      if (link.startsWith("http")) {
        return (
          <MuiLink
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textDecoration: "none" }}
          >
            {children}
          </MuiLink>
        );
      }
      return (
        <MuiLink component={Link} to={link} sx={{ textDecoration: "none" }}>
          {children}
        </MuiLink>
      );
    }
    return <>{children}</>;
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        "&:hover": {
          transform: "translateY(-8px)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
        },
        bgcolor: "#ffffff",
      }}
    >
      <CardWrapper>
        <Box sx={{ position: "relative" }}>
          <CardMedia
            component="img"
            height={mediaHeight}
            image={image || fallbackImage}
            alt={title}
            sx={{
              objectFit: "cover",
            }}
            onError={(e: any) => {
              e.target.src = fallbackImage;
            }}
          />
        </Box>
        <CardContent
          sx={{
            p: 2.5,
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: "1.1rem",
              lineHeight: 1.4,
              color: "#1e293b",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "3.9em",
            }}
          >
            {title}
          </Typography>

          {description ? (
            <Box
              sx={{
                minHeight: "3.6em",
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "#475569",
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {descriptionPreview}
              </Typography>
              {showReadMore ? (
                <Button
                  variant="text"
                  size="small"
                  sx={{ p: 0, minWidth: 0, alignSelf: "flex-start" }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  onGalleryButtonClick?.();
                  onReadMore?.();
                }}
              >
                Read more
              </Button>
            ) : null}
            </Box>
          ) : null}

          <Box
            sx={{
              mt: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {date && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  color: "#475569",
                }}
              >
                <MdCalendarToday size={20} style={{ color: "#0f172a" }} />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, fontSize: "0.95rem" }}
                >
                  {date}
                </Typography>
              </Box>
            )}

            {location && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  color: "#475569",
                }}
              >
                <MdLocationOn size={22} style={{ color: "#0f172a" }} />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, fontSize: "0.95rem" }}
                >
                  {location}
                </Typography>
              </Box>
            )}

            {showGalleryButton ? (
              <Button
                variant="outlined"
                size="small"
                sx={{ alignSelf: "flex-start", mt: 0.5 }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (isGalleryControlled) {
                    onGalleryButtonClick();
                  } else {
                    setInternalGalleryExpanded((prev) => !prev);
                  }
                }}
              >
                {isGalleryOpen ? "Hide photos" : galleryButtonLabel}
              </Button>
            ) : null}
          </Box>
        </CardContent>
      </CardWrapper>

      {renderInlineGallery && showGalleryButton && isGalleryOpen ? (
        <Box
          sx={{
            px: 2.5,
            pb: 2.5,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: 1.5,
          }}
        >
          {uniqueGalleryImages.map((url, index) => (
            <Box
              key={`${url}-${index}`}
              component="img"
              src={url}
              alt={`${title} ${index + 1}`}
              sx={{
                width: "100%",
                height: 170,
                objectFit: "cover",
                borderRadius: 1.5,
                border: "1px solid #e2e8f0",
              }}
              onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
                event.currentTarget.src = fallbackImage;
              }}
            />
          ))}
        </Box>
      ) : null}
    </Card>
  );
};

export default EventCard;
