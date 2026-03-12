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
        subject: "รหัสเข้าสู่ระบบ MEDI-BUDDY",
        html: `
            <div style="max-width: 460px; margin: auto; padding: 24px; font-family: Arial, sans-serif; color: #222; background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0;">
                
                <div style="background: linear-gradient(135deg, #4da9ff, #2eccb0); padding: 18px; border-radius: 10px; text-align: center; color: white; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 22px;">MEDI-BUDDy</h2>
                    <p style="margin: 4px 0 0; font-size: 14px;">รหัสเข้าสู่ระบบแบบใช้ครั้งเดียว</p>
                </div>

                <p>สวัสดี,</p>

                <p>กรุณาใช้รหัสด้านล่างเพื่อเข้าสู่ระบบแอป MEDI-BUDDy</p>

                <div style="margin: 22px 0; padding: 16px 24px; background: #f0fbff; border-left: 6px solid #4da9ff; border-radius: 6px; font-size: 30px; font-weight: bold; letter-spacing: 6px; text-align: center;">
                    ${code}
                </div>

                <p style="color:#cc0000;">
                    รหัสนี้จะหมดอายุภายใน <b>5 นาที</b>
                </p>

                <p>หากคุณไม่ได้เป็นผู้ร้องขอรหัสนี้ สามารถละเลยอีเมลฉบับนี้ได้</p>

                <div style="margin-top: 25px; text-align: center; font-size: 12px; color: #888;">
                    © ${new Date().getFullYear()} MEDI-BUDDY — ผู้ช่วยแจ้งเตือน
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

/**
 * Send a Magic Link for password reset
 */
export async function sendPasswordResetEmail(email: string, resetLink: string) {
    const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: email,
        subject: "รีเซ็ตรหัสผ่าน MEDI-BUDDY",
        html: `
            <div style="max-width: 460px; margin: auto; padding: 24px; font-family: Arial, sans-serif; color: #222; background: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0;">
                
                <div style="background: linear-gradient(135deg, #4da9ff, #2eccb0); padding: 18px; border-radius: 10px; text-align: center; color: white; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 22px;">MEDI-BUDDy</h2>
                    <p style="margin: 4px 0 0; font-size: 14px;">คำขอรีเซ็ตรหัสผ่าน</p>
                </div>

                <p>สวัสดี,</p>

                <p>เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ</p>

                <p>กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #4da9ff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                        รีเซ็ตรหัสผ่าน
                    </a>
                </div>

                <p style="color:#cc0000;">
                    ลิงก์นี้จะหมดอายุภายใน <b>5 นาที</b>
                </p>

                <p style="margin-top: 30px;">
                    หากคุณไม่ได้เป็นผู้ร้องขอการรีเซ็ตรหัสผ่าน สามารถละเลยอีเมลฉบับนี้ได้
                </p>

                <div style="margin-top: 25px; text-align: center; font-size: 12px; color: #888;">
                    © ${new Date().getFullYear()} MEDI-BUDDY — ผู้ช่วยแจ้งเตือน
                </div>

            </div>
        `,
    });

    if (error) {
        console.error("[Resend] Failed to send Password Reset Email:", error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
    }

    return data;
}