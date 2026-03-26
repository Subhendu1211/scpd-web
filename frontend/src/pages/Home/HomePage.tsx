import React from "react";
import { Container, Grid } from "@mui/material";
import UseFullLinks from "@components/homepagecomponents/useFullLinks";
import AboutScpd from "@pages/CMS/aboutscpd/AboutScpd";
import HeroCarousel from "../../components/HeroCarousel";
import NewsTicker from "../../components/NewsTicker";
import GalleryHome from "@components/homepagecomponents/GalleryHome";
import EventsPage from "@components/homepagecomponents/EventPage";
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
        <section className="py-10" style={{ background: "#236EB9" }}>
          <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, md: 3 } }}>
            <Grid container spacing={3} alignItems="stretch">

              {/* LEFT - 2/3 width */}
              <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex" }}>
                <AboutScpd />
              </Grid>

              {/* RIGHT - 1/3 width */}
              <Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex" }}>
                <CitizenService />
              </Grid>

            </Grid>
          </Container>
        </section>

        {/* Other Components */}
        <div className="w-full">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div><TabComponents /></div>
            <div><SuccessStories /></div>
          </section>
        </div>

        <div>
          <GalleryHome />
          {/* <VideoGallery /> */}

         <section className="grid grid-cols-1 md:grid-cols-3 gap-0 items-start px-2 md:px-0">
  
  {/* 2/3 Width */}
  <div className="h-full md:col-span-1">
    <SocialMediaPage />
  </div>

  {/* 1/3 Width */}
  <div className="h-full md:col-span-2">
    <UseFullLinks />
  </div>

</section>

          <EventsPage />
        </div>
      </div>
    </>
  );
}
