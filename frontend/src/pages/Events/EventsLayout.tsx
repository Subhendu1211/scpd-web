import SideLayout from "@components/sidebar/SideLayout";

const eventMenu = [
  { label: "nav.events.workshops", to: "/events/workshops-awareness" },
  { label: "nav.events.camp", to: "/events/camp-courts" },
  { label: "nav.events.quiz", to: "/events/quiz-competitions" },
  { label: "nav.events.sakhyama", to: "/events/sakhyama-ability-talk" },
  { label: "nav.events.campaign", to: "/events/disability-friendly-campaign" },
];

export default function EventLayout({ children }) {
  return <SideLayout menuItems={eventMenu}>{children}</SideLayout>;
}
