import React from "react";
import CmsContent from "../../components/common/CmsContent";
import { useCmsPage } from "../../hooks/useCmsPage";

const ADDRESS = "A1 Block, Ground Floor, Toshali Bhawan, Satyanagar, Bhubaneswar, Odisha, India";

export default function Contact() {
  const state = useCmsPage("/contact");
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
  const mapEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;

  return (
    <CmsContent {...state}>
      <div className="contact-extras">
        <address className="address-block">
          {ADDRESS}
          <br />
          <a href={mapHref} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
        </address>
        <div className="map-embed" aria-label="Office location map">
          <iframe
            src={mapEmbedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Office location map"
          />
        </div>
      </div>
    </CmsContent>
  );
}