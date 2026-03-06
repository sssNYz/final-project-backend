
interface AbstractEmailValidationResponse {
    email_address: string;
    email_deliverability: {
        status: "deliverable" | "undeliverable" | "unknown";
        status_detail: string;
        is_format_valid: boolean;
        is_smtp_valid: boolean;
        is_mx_valid: boolean;
        mx_records: string[];
    };
    email_quality: {
        score: number;
        is_free_email: boolean;
        is_username_suspicious: boolean;
        is_disposable: boolean;
        is_catchall: boolean;
        is_subaddress: boolean;
        is_role: boolean;
        is_dmarc_enforced: boolean;
        is_spf_strict: boolean;
        minimum_age: number;
    };
    email_sender: {
        first_name: string | null;
        last_name: string | null;
        email_provider_name: string | null;
        organization_name: string | null;
        organization_type: string | null;
    };
    email_domain: {
        domain: string;
        domain_age: number | null;
        is_live_site: boolean;
        registrar: string | null;
        registrar_url: string | null;
        date_registered: string | null;
        date_last_renewed: string | null;
        date_expires: string | null;
        is_risky_tld: boolean;
    };
    email_risk: {
        address_risk_status: string;
        domain_risk_status: string;
    };
    email_breaches: {
        total_breaches: number;
        date_first_breached: string | null;
        date_last_breached: string | null;
        breached_domains: { domain: string; date_breached: string }[];
    };
}

export interface EmailValidationResult {
    isValid: boolean;
    message?: string;
}

export async function validateEmailWithAbstract(email: string): Promise<EmailValidationResult> {
    const apiKey = process.env.ABSTRACT_EMAIL_API_KEY;

    if (!apiKey) {
        // Fallback to true if API key is not configured to avoid blocking users
        console.warn("[Email Validation] ABSTRACT_EMAIL_API_KEY is not defined. Skipping validation.");
        return { isValid: true };
    }

    try {
        const url = `https://emailreputation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(
            email
        )}`;
        const response = await fetch(url, {
            method: "GET",
        });

        if (!response.ok) {
            // Rate limits, quota reached, or server errors
            console.warn(`[Email Validation] Abstract API returned status ${response.status}. Skipping validation to fail-open.`);
            return { isValid: true };
        }

        const data: AbstractEmailValidationResponse = await response.json();

        if (data.email_deliverability.status === "undeliverable") {
            return {
                isValid: false,
                message: "Email address is undeliverable. Please check for typos and try again.",
            };
        }

        if (data.email_quality.is_disposable) {
            return {
                isValid: false,
                message: "Disposable email addresses are not allowed.",
            };
        }

        return { isValid: true };
    } catch (error) {
        console.error("[Email Validation] Error during Abstract API call:", error);
        // Fail-open
        return { isValid: true };
    }
}
