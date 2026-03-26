import React from "react";
import { useTranslation } from "react-i18next";

export default function UsefulLinks() {
  const { t } = useTranslation();

  const affiliates = [
    {
      name: "Prime Minister’s Office (Government of India)",
      href: "https://www.pmindia.gov.in/en/prime-ministers-office/",
      image: "/brand/Screenshot_1.png",
    },
    {
      name: "Chief Minister’s Office (Odisha)",
      href: "https://odisha.gov.in/about-us/whos-who/cm-office",
      image: "/brand/Screenshot_9.png",
    },
    {
      name: "Government of India",
      href: "https://www.india.gov.in/",
      image: "/brand/Screenshot_2.png",
    },
    {
      name: "Government of Odisha",
      href: "https://odisha.gov.in/",
      image: "/brand/Screenshot_7.png",
    },
    {
      name: "Swami Vivekanand National Institute of Rehabilitation Training and Research",
      href: "https://www.svnirtar.nic.in/",
      image: "/brand/Screenshot_3.png",
    },
    {
      name: "Social Security & Empowerment of Persons with Disabilities Department (Govt. of Odisha)",
      href: "https://ssepd.odisha.gov.in/",
      image: "/brand/Screenshot_8.png",
    },
    {
      name: "Department of Empowerment of Persons with Disabilities (Govt. of India)",
      href: "https://disabilityaffairs.gov.in/",
      image: "/brand/Screenshot_5.png",
    },
    {
      name: "MoSJ&E – Ministry of Social Justice & Empowerment (Govt. of India)",
      href: "https://socialjustice.nic.in/",
      image: "/brand/Screenshot_6.png",
    },
    {
      name: "Chief Commissioner for Persons with Disabilities (Government of India)",
      href: "https://ccpd.nic.in/",
      image: "/brand/Screenshot_4.png",
    },
  ]

  return (
    <section
      aria-labelledby="useful-links-heading"
      className="w-full px-6 md:px-12 py-8 bg-gradient-to-br from-[#eef3ff] to-[#f5f8ff]"
    >
      {/* Title */}
      <div className="mb-6">
        <h2 id="useful-links-heading" className="text-[20px] font-bold text-[#0b3a8c] flex items-center">
          {t("homepage.usefulLinksTitle")}
        </h2>
      </div>

      {/* Links Grid */}
      <div className="flex justify-center">
        <div className="w-full max-w-6xl md:min-h-[580px] bg-[#236EB9] rounded-xl shadow-md p-6 border border-slate-200 justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {affiliates.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${item.name} website (opens in a new tab)`}
                className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-lg bg-gradient-to-br from-[#fbfdff] to-[#eef3ff] shadow-sm transform transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <div className="w-full h-[90px] md:h-[110px] flex items-center justify-center mb-1">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = "/images/link1.png";
                    }}
                  />
                </div>
                <span className="sr-only">{item.name}</span>

              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
