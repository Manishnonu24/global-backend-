import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('Seeding OTP Account Verification Template...');

  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'AHP';

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Verification Code</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f7c85, #0a565c); padding: 36px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">{siteName}</h1>
              <p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 13px;">Security & Account Verification</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px; color: #334155;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Verify Your Account</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hi <strong>{name}</strong>,<br>
                Thank you for joining <strong>{siteName}</strong>. Please use the 6-digit verification code below to verify your email address and activate your account:
              </p>

              <!-- OTP Code Display -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #0f7c85; padding: 18px 42px; border-radius: 14px;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #0f7c85; display: block;">{otpCode}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; text-align: center; line-height: 1.5;">
                ⏱️ This verification code will expire in <strong>10 minutes</strong>.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

              <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
                If you did not initiate this account setup, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © {siteName} • All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Deactivate any existing active user_verification template for siteId
  await prisma.emailTemplate.updateMany({
    where: { siteId, triggerKey: 'user_verification', isActive: true },
    data: { isActive: false },
  });

  // Create new OTP template
  const created = await prisma.emailTemplate.create({
    data: {
      siteId,
      name: 'User Registration OTP Verification',
      triggerKey: 'user_verification',
      subject: 'Your Account Verification Code: {otpCode}',
      htmlContent,
      isActive: true,
    },
  });

  console.log(`✅ Successfully created OTP Verification template! ID: ${created.id}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding OTP template:', err);
    process.exit(1);
  });
