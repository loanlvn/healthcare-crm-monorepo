import nodemailer from 'nodemailer';

const {
    MAILTRAP_HOST,
    MAILTRAP_PORT,
    MAILTRAP_USER,
    MAILTRAP_PASS,
    MAIL_FROM
} = process.env;

if (!MAILTRAP_HOST || !MAILTRAP_PORT || !MAILTRAP_USER || !MAILTRAP_PASS || !MAIL_FROM) {
    throw new Error('Missing required environment variables for mailer configuration');
}

export const mailer = nodemailer.createTransport({
    host: MAILTRAP_HOST,
    port: Number(MAILTRAP_PORT ?? 2525),
    auth: {
        user: MAILTRAP_USER!,
        pass: MAILTRAP_PASS!
    }
});

export async function sendResetCodeMail(to: string, code: string) {
    const html = `
    <h2>Password Reset Code</h2>
    <p>Your password reset code is:
    <p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p>
    <p>This code is valid for 15 minutes.</p>
    <p>If you did not request a password reset, please ignore this email.</p>
  `;
    await mailer.sendMail({
        from: MAIL_FROM!,
        to,
        subject: 'Password Reset Code',
        html
    });
};

export async function sendPasswordChangedMail(to: string) {
    const html = `
    <h2>Password Changed Successfully</h2>
    <p>Your password has been changed successfully.</p>
    <p>If you did not change your password, please contact support immediately at support@example.com.</p>
  `;
    await mailer.sendMail({
        from: MAIL_FROM!,
        to,
        subject: 'Password Changed Successfully',
        html
    });
}