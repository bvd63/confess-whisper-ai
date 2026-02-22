export interface SupportEmailTemplateInput {
  language: string;
  userId: string;
  name: string;
  email: string;
  issue: string;
}

export const sanitizeSupportField = (value?: string, fallback = "-") => {
  if (!value) return fallback;
  return value.toString().replace(/[\r\n]+/g, " ").trim().slice(0, 2000) || fallback;
};

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildSupportEmailBodies = (input: SupportEmailTemplateInput) => {
  const escapedLanguage = escapeHtml(input.language);
  const escapedUserId = escapeHtml(input.userId);
  const escapedName = escapeHtml(input.name);
  const escapedEmail = escapeHtml(input.email);
  const escapedIssue = escapeHtml(input.issue);

  const subject = `Support request from ${input.name}`;
  const textBody = [
    `Language: ${input.language}`,
    `User ID: ${input.userId}`,
    `Email: ${input.email}`,
    `Name: ${input.name}`,
    `Issue:`,
    input.issue,
  ].join("\n\n");

  const htmlBody = `<!doctype html><html><body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin: 0 0 12px; font-size: 18px;">New ConfessAI support request</h2>
      <p><strong>Language:</strong> ${escapedLanguage}</p>
      <p><strong>User ID:</strong> ${escapedUserId}</p>
      <p><strong>Name:</strong> ${escapedName}</p>
      <p><strong>Email:</strong> ${escapedEmail}</p>
      <p><strong>Issue:</strong></p>
      <pre style="white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 8px;">${escapedIssue}</pre>
    </body></html>`;

  return {
    subject,
    textBody,
    htmlBody,
  };
};
