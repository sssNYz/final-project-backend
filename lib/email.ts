import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

/**
 * Send a 6-digit OTP code to the given email
 */
export async function sendOtpEmail(email: string, code: string) {
    const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: email,
        subject: "Your Medi Buddy login code",
        html: `
            <div style="max-width: 460px; margin: auto; padding: 24px; font-family: Arial, sans-serif; color: #222; background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #4da9ff, #2eccb0); padding: 18px; border-radius: 10px; text-align: center; color: white; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 22px;">MEDI-BUDDy</h2>
                    <p style="margin: 4px 0 0; font-size: 14px;">One-Time Login Code</p>
                </div>

                <!-- Body -->
                <p>Hello,</p>

                <p>Please use this code to login your MEDI-BUDDy app:</p>

                <div style="margin: 22px 0; padding: 16px 24px; background: #f0fbff; border-left: 6px solid #4da9ff; border-radius: 6px; font-size: 30px; font-weight: bold; letter-spacing: 6px; text-align: center; color: #1a1a1a;">
                    ${code}
                </div>

                <p>This code works for a short time only.</p>
                <p>Thank you for using MEDI-BUDDy.</p>

                <!-- Footer -->
                <div style="margin-top: 25px; text-align: center; font-size: 12px; color: #888;">
                    © 2025 MEDI-BUDDy — Stay healthy.
                </div>
            </div>
        `,
    });

    if (error) {
        console.error("[Resend] Failed to send OTP:", error);
        throw new Error(`Failed to send OTP email: ${error.message}`);
    }

    return data;
}
