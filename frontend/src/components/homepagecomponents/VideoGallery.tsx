import React, { useRef } from "react";
import Slider from "react-slick";
import { Box, IconButton } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function VideoGallery() {
  const sliderRef = useRef<any>(null);

  const images = [
    "/images/gallery1.jpg",
    "/images/gallery2.jpg",
    "/images/gallery3.jpg",
    "/images/gallery4.jpg",
    "/images/gallery5.jpg",
    "/images/gallery6.jpg",
    "/images/gallery1.jpg",
    "/images/gallery2.jpg",
  ];

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

  return (
    <Box
      sx={{ width: "100%", padding: "40px 60px", backgroundColor: "#f5f7fb" }}
    >
      {/* Carousel */}
      <Box sx={{ position: "relative" }}>
        <Slider ref={sliderRef} {...settings}>
          {images.map((img, i) => (
            <Box key={i} sx={{ px: 1 }}>
              <img
                src={img}
                alt=""
                style={{
                  width: "100%",
                  height: "330px",
                  borderRadius: "10px",
                  objectFit: "cover",
                }}
              />
            </Box>
          ))}
        </Slider>

        {/* NAVIGATION BUTTONS */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            mt: 4,
          }}
        >
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
        </Box>
      </Box>
    </Box>
  );
}
