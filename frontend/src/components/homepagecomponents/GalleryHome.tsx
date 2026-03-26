import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import { Box, Typography, IconButton, Button, Tabs, Tab } from "@mui/material";
import { useTranslation } from "react-i18next";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { fetchCmsMedia, CmsMediaItem } from "../../services/cms";

export default function GalleryHome() {
  const { t } = useTranslation();
  const sliderRef = useRef<any>(null);
  const [tab, setTab] = useState("photo");
  const [media, setMedia] = useState<{ [key: string]: any[] }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<{ [key: string]: string | null }>({});
  const navigate = useNavigate();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const tabToCategory: Record<string, "photo" | "video" | "newspaper"> = {
    photo: "photo",
    video: "video",
    news: "newspaper",
  };

  const settings = {
    dots: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 3000,
    speed: 800,
    slidesToShow: 4,
    slidesToScroll: 1,
    arrows: false,
    pauseOnHover: true,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 900, settings: { slidesToShow: 2 } },
      { breakpoint: 600, settings: { slidesToShow: 1 } },
    ],
  };

  useEffect(() => {
    const load = async () => {
      if (media[tab] || loading[tab]) return;
      setLoading((prev) => ({ ...prev, [tab]: true }));
      setError((prev) => ({ ...prev, [tab]: null }));
      try {
        const category = tabToCategory[tab];
        const items = await fetchCmsMedia(category);
        setMedia((prev) => ({ ...prev, [tab]: items }));
      } catch (err: any) {
        setError((prev) => ({ ...prev, [tab]: err?.message || "Failed to load media." }));
      } finally {
        setLoading((prev) => ({ ...prev, [tab]: false }));
      }
    };
    load();
  }, [tab, media, loading]);

  const photoItems = media.photo || [];
  const videoItems = media.video || [];
  const newsItems = media.news || [];
  const isLoading = loading[tab];
  const tabError = error[tab];

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const slides =
    tab === "photo"
      ? photoItems.map((item) => ({ src: item.url }))
      : newsItems.map((item) => ({ src: item.url }));

  return (
    <Box sx={{ width: "100%", padding: "40px 60px", backgroundColor: "#f5f7fb" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 600,
              fontSize: "30px",
              mt: 1,
              color: "#000680",
              borderBottom: "3px solid #000680",
              display: "inline-block",
            }}
          >
            {t("homepage.visualHighlights")}
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(e, val) => setTab(val)}
        sx={{
          mt: 4,
          background: "#e6ebfb",
          borderRadius: "10px",
          padding: "4px",
          "& .MuiTab-root": {
            fontWeight: 600,
            textTransform: "none",
            fontSize: "17px",
            px: 3,
            borderRadius: "8px",
          },
          "& .Mui-selected": {
            background: "#fff",
            boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
            color: "#000680",
          },
        }}
      >
        <Tab value="photo" label={t("homepage.photoGallery")} />
        <Tab value="video" label={t("homepage.videoGallery")} />
        <Tab value="news" label={t("homepage.newspaperClippings")} />
      </Tabs>

      <Box sx={{ mt: 5 }}>
        {tab === "photo" && (
          <>
            {tabError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {tabError}
              </Typography>
            )}
            {!tabError && (
              <>
                {photoItems.length === 0 && !isLoading ? (
                  <Typography sx={{ color: "#4b5563" }}>{t("homepage.noPhotos")}</Typography>
                ) : (
                  <>
                    <Slider ref={sliderRef} {...settings}>
                      {(isLoading ? Array.from({ length: 4 }) : photoItems).map((item: any, i) => (
                        <Box key={i} sx={{ px: 1, cursor: "pointer" }} onClick={() => handleImageClick(i)}>
                          <Box
                            component="img"
                            src={isLoading ? undefined : item?.url}
                            alt={isLoading ? "" : item?.altText || item?.originalName || "Photo"}
                            sx={{
                              width: "100%",
                              height: "330px",
                              borderRadius: "10px",
                              objectFit: "cover",
                              backgroundColor: "#e5e7eb",
                            }}
                          />
                        </Box>
                      ))}
                    </Slider>
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 4, flexWrap: "wrap" }}>
                      <IconButton
                        onClick={() => sliderRef.current?.slickPrev()}
                        sx={{
                          background: "#05245a",
                          color: "#fff",
                          width: 50,
                          height: 50,
                          "&:hover": { background: "#001e4a" },
                        }}
                      >
                        <ArrowBackIosNewIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => sliderRef.current?.slickNext()}
                        sx={{
                          background: "#05245a",
                          color: "#fff",
                          width: 50,
                          height: 50,
                          "&:hover": { background: "#001e4a" },
                        }}
                      >
                        <ArrowForwardIosIcon />
                      </IconButton>
                      <Button
                        variant="contained"
                        onClick={() => navigate("/media/photo-gallery")}
                        sx={{
                          bgcolor: "#1b3c73",
                          borderRadius: "30px",
                          px: 4,
                          py: 1.2,
                          fontSize: "16px",
                          "&:hover": { bgcolor: "#163159" },
                        }}
                      >
                        {t("homepage.viewMore")} →
                      </Button>
                    </Box>
                  </>
                )}
              </>
            )}
          </>
        )}

        {tab === "video" && (
          <Box sx={{ mt: 4 }}>
            {tabError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {tabError}
              </Typography>
            )}
            {!tabError && videoItems.length === 0 && !isLoading ? (
              <Typography sx={{ color: "#4b5563" }}>No videos available.</Typography>
            ) : null}
            {!tabError && (videoItems.length > 0 || isLoading) ? (
              <>
                <Slider ref={sliderRef} {...settings}>
                  {(isLoading ? Array.from({ length: 4 }) : videoItems).map((item: any, i) => (
                    <Box key={i} sx={{ px: 1 }}>
                      {isLoading ? (
                        <Box
                          sx={{
                            width: "100%",
                            height: "330px",
                            borderRadius: "10px",
                            backgroundColor: "#e5e7eb",
                          }}
                        />
                      ) : (
                        <Box
                          component="video"
                          src={item?.url}
                          title={item?.altText || item?.originalName || "Video"}
                          controls
                          preload="metadata"
                          playsInline
                          sx={{
                            width: "100%",
                            height: "330px",
                            borderRadius: "10px",
                            objectFit: "cover",
                            backgroundColor: "#000",
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Slider>
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 4, flexWrap: "wrap" }}>
                  <IconButton
                    onClick={() => sliderRef.current?.slickPrev()}
                    sx={{
                      background: "#05245a",
                      color: "#fff",
                      width: 50,
                      height: 50,
                      "&:hover": { background: "#001e4a" },
                    }}
                  >
                    <ArrowBackIosNewIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => sliderRef.current?.slickNext()}
                    sx={{
                      background: "#05245a",
                      color: "#fff",
                      width: 50,
                      height: 50,
                      "&:hover": { background: "#001e4a" },
                    }}
                  >
                    <ArrowForwardIosIcon />
                  </IconButton>
                  <Button
                    variant="contained"
                    onClick={() => navigate("/media/video-gallery")}
                    sx={{
                      bgcolor: "#1b3c73",
                      borderRadius: "30px",
                      px: 4,
                      py: 1.2,
                      fontSize: "16px",
                      "&:hover": { bgcolor: "#163159" },
                    }}
                  >
                    {t("homepage.viewMore")} →
                  </Button>
                </Box>
              </>
            ) : null}
          </Box>
        )}

        {tab === "news" && (
          <Box sx={{ mt: 4 }}>
            {tabError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {tabError}
              </Typography>
            )}
            {!tabError && newsItems.length === 0 && !isLoading && (
              <Typography sx={{ color: "#4b5563" }}>
                {t("homepage.noNewsClippings")}
              </Typography>
            )}
            {!tabError && (isLoading ? Array.from({ length: 4 }) : newsItems).length > 0 && (
              <>
                <Slider ref={sliderRef} {...settings}>
                  {(isLoading ? Array.from({ length: 4 }) : newsItems).map((item: any, i) => (
                    <Box key={i} sx={{ px: 1, cursor: "pointer" }} onClick={() => handleImageClick(i)}>
                      <Box
                        component="img"
                        src={isLoading ? undefined : item?.url}
                        alt={isLoading ? "" : item?.altText || item?.originalName || "News clipping"}
                        sx={{
                          width: "100%",
                          height: "330px",
                          borderRadius: "10px",
                          objectFit: "cover",
                          backgroundColor: "#e5e7eb",
                        }}
                      />
                    </Box>
                  ))}
                </Slider>
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 4, flexWrap: "wrap" }}>
                  <IconButton
                    onClick={() => sliderRef.current?.slickPrev()}
                    sx={{
                      background: "#05245a",
                      color: "#fff",
                      width: 50,
                      height: 50,
                      "&:hover": { background: "#001e4a" },
                    }}
                  >
                    <ArrowBackIosNewIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => sliderRef.current?.slickNext()}
                    sx={{
                      background: "#05245a",
                      color: "#fff",
                      width: 50,
                      height: 50,
                      "&:hover": { background: "#001e4a" },
                    }}
                  >
                    <ArrowForwardIosIcon />
                  </IconButton>
                  <Button
                    variant="contained"
                    onClick={() => navigate("/media/newspaper-clipping")}
                    sx={{
                      bgcolor: "#1b3c73",
                      borderRadius: "30px",
                      px: 4,
                      py: 1.2,
                      fontSize: "16px",
                      "&:hover": { bgcolor: "#163159" },
                    }}
                  >
                    {t("homepage.viewMore")} →
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={slides}
        index={lightboxIndex}
      />
    </Box>
  );
}
