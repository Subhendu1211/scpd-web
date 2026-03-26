import React, { useMemo } from "react";
import SideLayout from "@components/sidebar/SideLayout";
import { useCmsPage } from "@hooks/useCmsPage";
import { useCmsTable } from "@hooks/useCmsTable";
import { buildOrdersArchive } from "../../utils/ordersArchive";

const baseGrievanceMenu = [
  {
    label: "nav.grievances.howTo",
    to: "/grievances/how-to-register",
  },
  { label: "nav.grievances.register", to: "http://localhost:5173/login/citizen" },
  { label: "nav.grievances.orders", to: "/grievances/final-orders" },
  { label: "nav.grievances.interim", to: "/grievances/interim-orders" },
  { label: "nav.grievances.causeList", to: "/grievances/cause-list" },
  { label: "nav.grievances.pendency", to: "/grievances/pendency-status" },
  { label: "nav.grievances.suoMoto", to: "/grievances/suo-moto-cases" },
  {
    label: "nav.grievances.landmark",
    to: "/grievances/landmark-court-judgments",
  },

  { label: "nav.grievances.faqs", to: "/grievances/faqs" },
];

export default function GrievanceLayout({ children }) {
  const finalOrdersPage = useCmsPage("/grievances/final-orders");
  const interimOrdersPage = useCmsPage("/grievances/interim-orders");
  const suoMotoPage = useCmsPage("/grievances/suo-moto-cases");

  const { table: finalOrdersTable } = useCmsTable(finalOrdersPage.page?.dynamicTableName);
  const { table: interimOrdersTable } = useCmsTable(interimOrdersPage.page?.dynamicTableName);
  const { table: suoMotoTable } = useCmsTable(suoMotoPage.page?.dynamicTableName);

  const menuItems = useMemo(() => {
    const finalArchive = finalOrdersTable ? buildOrdersArchive(finalOrdersTable.rows, finalOrdersTable.columns) : [];
    const interimArchive = interimOrdersTable ? buildOrdersArchive(interimOrdersTable.rows, interimOrdersTable.columns) : [];
    const suoMotoArchive = suoMotoTable ? buildOrdersArchive(suoMotoTable.rows, suoMotoTable.columns) : [];

    return baseGrievanceMenu.map((item) => {
      if (item.label === "nav.grievances.orders" && finalArchive.length) {
        return {
          ...item,
          children: finalArchive.map((yearNode) => ({
            label: yearNode.label,
            to: `/grievances/final-orders?year=${yearNode.year}`,
            children: yearNode.months.map((monthNode) => ({
              label: monthNode.label,
              to: `/grievances/final-orders?year=${yearNode.year}&month=${monthNode.month}`,
            })),
          })),
        };
      }

      if (item.label === "nav.grievances.interim" && interimArchive.length) {
        return {
          ...item,
          children: interimArchive.map((yearNode) => ({
            label: `Interim ${yearNode.label}`,
            to: `/grievances/interim-orders?year=${yearNode.year}`,
            children: yearNode.months.map((monthNode) => ({
              label: monthNode.label.replace(/Orders$/i, "Interim Orders"),
              to: `/grievances/interim-orders?year=${yearNode.year}&month=${monthNode.month}`,
            })),
          })),
        };
      }

      if (item.label === "nav.grievances.suoMoto" && suoMotoArchive.length) {
        return {
          ...item,
          children: suoMotoArchive.map((yearNode) => ({
            label: `Suo-Moto ${yearNode.label}`,
            to: `/grievances/suo-moto-cases?year=${yearNode.year}`,
            children: yearNode.months.map((monthNode) => ({
              label: monthNode.label.replace(/Orders$/i, "Suo-Moto Cases"),
              to: `/grievances/suo-moto-cases?year=${yearNode.year}&month=${monthNode.month}`,
            })),
          })),
        };
      }

      return item;
    });
  }, [finalOrdersTable, interimOrdersTable, suoMotoTable]);

  return <SideLayout menuItems={menuItems}>{children}</SideLayout>;
}
