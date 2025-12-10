export function getOtpEmailHtmlTemplate(otpCode: string): string {
  return `
  <!DOCTYPE html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <div style="background-color: #DCDADC; width: 100%;">
    <div style="margin: 0 auto; max-width: 600px; width: 100%;font-family: Helvetica, Arial, sans-serif; background-color: #FAF9FA;">
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <div
          style="width: 100%; height: 8px; background-color: #ff0088;"
        ></div>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <img style="width: 110px;" src="https://lootex-dev-s3-cdn.imgix.net/Lootex.png" alt=""/>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <div style="font-size: 40px; font-weight: 700; color: #191319;">Verify Your Email</div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <div style="color: #4D464D; font-size: 16px; line-height: 25px;">
            <div style="margin-bottom: 8px">Hi,</div>
            <div>
              You requested a one-time authorization code to log into your Lootex
              account. Enter the verification code below in the input field to
              complete this verification.
            </div>
          </div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td align="center"  style="padding-top: 48px; padding-left: 32px; padding-right: 32px">
          <div style="padding-top: 25px; padding-bottom: 25px; background-color: #DCDADC; color: #191319; font-size: 32px; font-weight: 700; border-radius: 16px; letter-spacing: 0.24em;">
              ${otpCode}
          </div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="font-size: 16px; line-height: 25px; padding-top: 8px; text-align: center; color: #191319;">
          Please note, this code will expire in 1 hour.
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <div style="font-weight: 700; color: #4D464D; font-size: 16px; line-height: 25px;">Lootex Customer Support Team</div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 8px; padding-left: 32px; padding-right: 32px;">
          <div style="color: #4D464D; font-size: 16px; line-height: 25px;">
            This is an automated email. Please do not reply directly to this email
            address.
          </div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 8px; padding-left: 32px; padding-right: 32px;">
          <div style="color: #4D464D; font-size: 16px; line-height: 25px;">
            If you didn’t attempt to sign up but received this email, and please ignore this email.
          </div>
          <div style="color: #4D464D; font-size: 16px; line-height: 25px;">
            If you encounter any issue, please submit a ticket here : <a href="https://portal.lootex.io/en/support/home">https://portal.lootex.io/en/support/home</a>
        </div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <hr style="width: 100%; border: 1px solid #C7C4C7" />
        </td>
      </table>
      <table align="center" width="240px" border="0" cellspacing="0" cellpadding="0" style="padding-top: 48px; border-spacing: 8px;">
          <td align="center"  style="border: 1px solid #C7C4C7; border-radius: 16px; padding: 12px;">
            <a style="display: block; line-height: 0;height: 24px;" href="https://twitter.com/LootexIO" >
              <img style="height: 24px; width: 24px; filter: invert(1);" src="https://lootex-dev-s3-cdn.imgix.net/twitter.png" alt=""/>
            </a>
          </td>
          <td align="center" style="border: 1px solid #C7C4C7; border-radius: 16px; padding: 12px;">
            <a style="display: block; line-height: 0;height: 24px;" href="https://www.facebook.com/lootexio/" >
              <img style="height: 24px; width: 24px; filter: invert(1);" src="https://lootex-dev-s3-cdn.imgix.net/facebook.png" alt=""/>
            </a>
          </td>
          <td align="center" style="border: 1px solid #C7C4C7; border-radius: 16px; padding: 12px;">
            <a style="display: block; line-height: 0;height: 24px;" href="https://medium.com/lootex" >
              <img style="height: 24px; width: 24px; filter: invert(1);" src="https://lootex-dev-s3-cdn.imgix.net/medium.png" alt=""/>
            </a>
          </td>
          <td align="center" style="border: 1px solid #C7C4C7; border-radius: 16px; padding: 12px;">
            <a style="display: block; line-height: 0;height: 24px;" href="https://discord.com/invite/n48APrVumK" >
              <img style="height: 24px; width: 24px; filter: invert(1);" src="https://lootex-dev-s3-cdn.imgix.net/discord.png" alt=""/>
            </a>
          </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <div style="color: #4D464D; font-size: 12px; line-height: 25px; text-align: center;">
            © 2023 Lootex. All rights reserved.
          </div>
        </td>
      </table>
    </div>
  </div>
</html>
`;
}
