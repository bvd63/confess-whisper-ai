import { describe, expect, it } from "vitest";
import {
  buildSupportEmailBodies,
  sanitizeSupportField,
} from "../../supabase/functions/contact-support/utils";

describe("contact-support email sanitization", () => {
  it("escapes user-controlled HTML content in support email body", () => {
    const unsafeName = `<img src=x onerror="alert('xss')">`;
    const unsafeIssue = `<script>alert("pwned")</script>\nNeed help`;

    const { htmlBody } = buildSupportEmailBodies({
      language: "en",
      userId: "user-123",
      name: sanitizeSupportField(unsafeName),
      email: sanitizeSupportField("attacker@example.com"),
      issue: sanitizeSupportField(unsafeIssue, "(empty)"),
    });

    expect(htmlBody).toContain("&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;");
    expect(htmlBody).toContain("&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt; Need help");
    expect(htmlBody).not.toContain("<img");
    expect(htmlBody).not.toContain("<script>");
  });
});
