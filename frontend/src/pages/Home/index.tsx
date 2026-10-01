import React from "react";
import { Container, Grid } from "@mui/material";
import UseFullLinks from "@components/homepagecomponents/useFullLinks";
import AboutScpd from "@pages/CMS/aboutscpd/AboutScpd";
import HeroCarousel from "../../components/HeroCarousel";
import NewsTicker from "../../components/NewsTicker";
import GalleryHome from "@components/homepagecomponents/GalleryHome";
import VideoGallery from "@components/homepagecomponents/VideoGallery";
import EventsPage from "@components/homepagecomponents/EventPage";
import Notification from "@components/homepagecomponents/Notification";
import SuccessStories from "@components/homepagecomponents/SuccessStories";
import SocialMediaPage from "@components/homepagecomponents/SocilaMediaPage";
import CitizenService from "@components/homepagecomponents/CitizenService";
import TabComponents from "@components/homepagecomponents/TabComponents";

export default function Home() {
  return (
    <>
      <div className="root-flex-container">
        <div className="full-bleed">
          <HeroCarousel />
        </div>

        <div className="full-bleed ">
          <NewsTicker />
        </div>

        {/* About + Citizen Service (Aligned using MUI) */}
        <section className=" py-10">
          <Container sx={{ px: 2 }}>
            <Grid container spacing={2} alignItems="stretch">
              {/* LEFT */}
              <Grid size={{ xs: 12, md: 6 }}>
                <AboutScpd />
              </Grid>

              {/* RIGHT */}
              <Grid size={{ xs: 12, md: 6 }}>
                <CitizenService />
              </Grid>
            </Grid>
          </Container>
        </section>

        {/* Other Components */}
        <div>
          <TabComponents />
          <Notification />
          <GalleryHome />
          <VideoGallery />
          <SocialMediaPage />
          <SuccessStories />
          <EventsPage />
          <UseFullLinks />
        </div>
      </div>
    </>
  );
}
