import "server-only";
import nodemailer from "nodemailer";

// Без SMTP_URL письма не отправляются, а печатаются в лог (удобно для разработки).
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    console.log(`[mail] to=${to} subject=${subject}\n${text}`);
    return;
  }
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
