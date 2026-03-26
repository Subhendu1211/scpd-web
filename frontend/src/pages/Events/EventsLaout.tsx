import SideLayout from "@components/sidebar/SideLayout";

const eventMenu = [
  {
    label: "Workshops/Awareness Programmes",
    to: "/events/workshops-awareness",
  },
  { label: "Camp Courts", to: "/events/camp-courts" },
  { label: "Quiz Competitions", to: "/events/quiz-competitions" },
  {
    label: "Sakhyama – An Ability Talk",
    to: "/events/sakhyama-ability-talk",
  },
  {
    label: "Disability Friendly Campaign",
    to: "/events/disability-friendly-campaign",
  },
];

export default function EventLayout({ children }) {
  return <SideLayout menuItems={eventMenu}>{children}</SideLayout>;
}
