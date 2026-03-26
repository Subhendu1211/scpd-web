import React from "react";
import CmsContent from "../../components/common/CmsContent";
import { useCmsPage } from "../../hooks/useCmsPage";

export default function RegisterComplaint() {
	const state = useCmsPage();
	return <CmsContent {...state} />;
}