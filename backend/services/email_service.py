"""
Email Service for Postcards & Little Footnotes
Handles editorial paper-styled invitation emails and SMTP dispatching.
"""

import smtplib
import threading
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Optional, Tuple

from config import Config

logger = logging.getLogger(__name__)


class EmailService:
    """Service to construct and dispatch transactional emails via standard SMTP."""

    @classmethod
    def generate_invitation_content(
        cls,
        to_email: str,
        inviter_name: str,
        trip_name: str,
        trip_dates: Optional[str],
        invite_token: str,
        base_url: Optional[str] = None,
    ) -> Tuple[str, str, str]:
        """
        Generate subject, plaintext, and HTML body for trip invitations.
        Returns (subject, text_content, html_content).
        """
        app_url = (base_url or Config.APP_BASE_URL).rstrip("/")
        invite_url = f"{app_url}/#invite/{invite_token}"
        dates_display = f" ({trip_dates})" if trip_dates else ""
        inviter_display = inviter_name or "A fellow traveler"

        subject = f"{inviter_display} invited you to join \"{trip_name}\""

        # Plaintext version
        text_content = f"""Postcards & Little Footnotes
Journey Invitation

{inviter_display} has invited you to contribute memories to "{trip_name}"{dates_display}.

Postcards & Little Footnotes is a quiet, personal box for journey memories. You'll be able to view shared postcards and footnotes, and add your own moments to the timeline.

Accept this invitation to join the journey:
{invite_url}

— A quiet box for wandering souls.
"""

        # HTML version (styled with warm paper, Newsreader serif, Caveat script, terracotta buttons)
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f7f4ec; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2c2925; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto;">
    <tr>
      <td style="padding: 0;">
        <!-- Paper Envelope Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e5dfd3; border-radius: 6px; box-shadow: 0 4px 18px rgba(44, 41, 37, 0.04); overflow: hidden;">
          <!-- Top Header Stamp Tag -->
          <tr>
            <td style="padding: 24px 28px 12px 28px; text-align: center; border-bottom: 1px dashed #ede8df;">
              <span style="display: inline-block; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #9c9487;">Postcards &amp; Little Footnotes</span>
              <div style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 13px; color: #c2410c; margin-top: 4px;">journey invitation</div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 28px 28px 28px; text-align: center;">
              <h1 style="margin: 0 0 8px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: normal; color: #1c1a17; line-height: 1.3;">
                {trip_name}
              </h1>
              {f'<div style="font-size: 13px; color: #78716c; margin-bottom: 20px;">{trip_dates}</div>' if trip_dates else '<div style="margin-bottom: 16px;"></div>'}

              <p style="font-size: 15px; line-height: 1.55; color: #44403c; margin: 0 0 20px 0;">
                <strong style="color: #1c1a17;">{inviter_display}</strong> invited you to contribute memories to this shared journey collection.
              </p>

              <p style="font-size: 13px; line-height: 1.5; color: #78716c; margin: 0 0 28px 0; font-style: italic;">
                One trip. One chronological collection. Multiple people contributing memories.
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: #c2410c;">
                    <a href="{invite_url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 4px; border: 1px solid #c2410c;">
                      join this trip &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <div style="font-size: 11px; color: #a8a29e; word-break: break-all; line-height: 1.4;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="{invite_url}" style="color: #c2410c; text-decoration: underline;">{invite_url}</a>
              </div>
            </td>
          </tr>

          <!-- Paper Card Footer -->
          <tr>
            <td style="padding: 16px 28px; background-color: #faf8f5; border-top: 1px solid #f0ebe1; text-align: center; font-size: 12px; color: #a8a29e;">
              a quiet box for wandering souls
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return subject, text_content, html_content

    @classmethod
    def _dispatch_smtp_sync(cls, to_email: str, subject: str, text_content: str, html_content: str) -> bool:
        """Synchronously dispatch email through configured SMTP host."""
        if not Config.is_smtp_configured():
            logger.info("ℹ️ [Email] SMTP_HOST not configured. Email dispatch skipped.")
            return False

        try:
            from_email = Config.SMTP_FROM_EMAIL or Config.SMTP_USER or "no-reply@postcards.local"
            from_name = Config.SMTP_FROM_NAME or "Postcards & Little Footnotes"
            from_header = formataddr((from_name, from_email))

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_header
            msg["To"] = to_email

            part_text = MIMEText(text_content, "plain", "utf-8")
            part_html = MIMEText(html_content, "html", "utf-8")
            msg.attach(part_text)
            msg.attach(part_html)

            logger.info(f"📧 [Email] Connecting to SMTP server {Config.SMTP_HOST}:{Config.SMTP_PORT} for {to_email}...")

            if Config.SMTP_USE_SSL:
                server = smtplib.SMTP_SSL(Config.SMTP_HOST, Config.SMTP_PORT, timeout=Config.SMTP_TIMEOUT)
            else:
                server = smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=Config.SMTP_TIMEOUT)
                if Config.SMTP_USE_TLS:
                    server.starttls()

            if Config.SMTP_USER and Config.SMTP_PASSWORD:
                server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)

            server.sendmail(from_email, [to_email], msg.as_string())
            server.quit()

            logger.info(f"✨ [Email] Invitation email successfully sent to {to_email}!")
            return True
        except Exception as e:
            logger.error(f"❌ [Email] Failed to send email to {to_email}: {e}", exc_info=True)
            return False

    @classmethod
    def send_invitation_email(
        cls,
        to_email: str,
        inviter_name: str,
        trip_name: str,
        trip_dates: Optional[str],
        invite_token: str,
        base_url: Optional[str] = None,
        async_send: bool = True,
    ) -> bool:
        """
        Send a trip invitation email.
        If async_send is True, dispatches on a background thread to prevent HTTP blocking.
        """
        if not to_email:
            return False

        subject, text_content, html_content = cls.generate_invitation_content(
            to_email=to_email,
            inviter_name=inviter_name,
            trip_name=trip_name,
            trip_dates=trip_dates,
            invite_token=invite_token,
            base_url=base_url,
        )

        if not Config.is_smtp_configured():
            logger.info(f"ℹ️ [Email] SMTP not configured. Skipped sending email to {to_email} (Token: {invite_token[:8]}...)")
            return False

        if async_send:
            thread = threading.Thread(
                target=cls._dispatch_smtp_sync,
                args=(to_email, subject, text_content, html_content),
                daemon=True,
                name=f"email-dispatch-{invite_token[:6]}",
            )
            thread.start()
            return True
        else:
            return cls._dispatch_smtp_sync(to_email, subject, text_content, html_content)


email_service = EmailService()
