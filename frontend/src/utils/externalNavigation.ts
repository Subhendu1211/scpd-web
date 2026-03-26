type CaseMgmtEnv = {
	// Optional escape hatch if case-management is hosted on a different origin.
	VITE_CASE_MGMT_DASHBOARD_URL?: string;
	// Optional same-origin path override (default: /dashboard/)
	VITE_CASE_MGMT_DASHBOARD_PATH?: string;

	// Optional login redirects (can be full URLs). If not provided,
	// the runtime will build a /login URL on the same origin.
	VITE_CASE_MGMT_BASE_URL?: string;
	VITE_CASE_MGMT_LOGIN_URL?: string;
	VITE_CASE_MGMT_LEGAL_LOGIN_URL?: string;
	VITE_CASE_MGMT_CITIZEN_LOGIN_URL?: string;
};

function normalizePath(input: string): string {
	let value = input.trim();
	if (!value) return "";
	if (!value.startsWith("/")) value = `/${value}`;
	// Ensure trailing slash for consistency
	if (!value.endsWith("/")) value = `${value}/`;
	return value;
}

export function getCaseManagementDashboardUrl(): string {
	const env = import.meta.env as unknown as CaseMgmtEnv;

	// If explicitly configured, use it as-is.
	if (env.VITE_CASE_MGMT_DASHBOARD_URL?.trim()) {
		return env.VITE_CASE_MGMT_DASHBOARD_URL.trim();
	}

	const base = normalizeBaseUrl(env.VITE_CASE_MGMT_BASE_URL) || window.location.origin;
	const path = normalizePath(env.VITE_CASE_MGMT_DASHBOARD_PATH ?? "") || "/";
	return new URL(path, base).toString();
}

export function redirectToCaseManagementDashboard(): void {
	window.location.assign(getCaseManagementDashboardUrl());
}

function normalizeBaseUrl(value?: string) {
	if (!value) return "";
	return value.replace(/\/+$/g, "");
}

export type CaseRole = "LEGAL_OFFICER" | "CITIZEN" | string;

export function getCaseManagementLoginUrl(role?: CaseRole): string {
	if (role === "CITIZEN") {
		return "http://localhost:5173/login/citizen";
	}

	const env = import.meta.env as unknown as CaseMgmtEnv & Record<string, any>;
	const base = normalizeBaseUrl(env.VITE_CASE_MGMT_BASE_URL) || window.location.origin;
	// Prefer explicit per-role override if present
	// Do NOT default to an external /login/citizen URL when no explicit
	// env var is provided. This prevents accidental redirects to
	// another origin. If a deploy wants an external redirect, set the
	// corresponding VITE_CASE_MGMT_*_LOGIN_URL env var explicitly.
	const overrides: Record<string, string | undefined> = {
		LEGAL_OFFICER: env.VITE_CASE_MGMT_LEGAL_LOGIN_URL,
		CITIZEN: env.VITE_CASE_MGMT_CITIZEN_LOGIN_URL,
	};

	const explicit = role && overrides[role as string]?.trim() ? overrides[role as string]!.trim() : undefined;
	const generic = env.VITE_CASE_MGMT_LOGIN_URL?.trim();

	// If no explicit login URL is configured, stay inside this frontend and
	// route to local role-specific login pages instead of guessing another origin.
	if (!explicit && !generic) {
		const localPath =
			role === "LEGAL_OFFICER"
				? "/legal-officer/login"
				: role === "CITIZEN"
					? "/login/citizen"
					: "/login";
		return new URL(localPath, window.location.origin).toString();
	}

	// Base to resolve relative paths against
	// Helper to build a URL object from a raw string (absolute or relative)
	const buildUrl = (raw?: string) => {
		if (!raw) return null;
		try {
			// If raw is absolute, this succeeds
			return new URL(raw);
		} catch (e) {
			// Otherwise resolve relative to base
			return new URL(raw, base);
		}
	};

	const chosenRaw = explicit || generic || "/login";
	const urlObj = buildUrl(chosenRaw) || new URL("/login", base);

	// Ensure role is passed as a query param so the target can select correct flow
	if (role) urlObj.searchParams.set("role", role);

	// Add a returnUrl so the case-management app can redirect back after auth
	// Use origin + trailing slash to represent the frontend root (e.g. http://localhost:5173/)
	try {
		const returnUrl = `${window.location.origin.replace(/\/$/, "")}/`;
		urlObj.searchParams.set("returnUrl", returnUrl);
	} catch (e) {
		// fallback: do nothing if window is unavailable (e.g. SSR)
	}

	return urlObj.toString();
}

export function redirectToCaseManagementLogin(role?: CaseRole): void {
	window.location.assign(getCaseManagementLoginUrl(role));
}
