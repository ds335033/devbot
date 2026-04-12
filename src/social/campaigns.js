/**
 * @fileoverview Affiliate Marketing Campaign Generator
 * Generates social media posts, SEO articles, and campaign schedules
 * for affiliate program promotion across all major platforms.
 * @module social/campaigns
 */

// ---------------------------------------------------------------------------
// Sample Program Data
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} AffiliateProgram
 * @property {string} id           - Unique identifier
 * @property {string} name         - Product/service name
 * @property {string} category     - Category (e.g. "AI Tools", "SaaS")
 * @property {string} tagline      - One-line value proposition
 * @property {string} description  - Full description
 * @property {string[]} features   - Key features list
 * @property {string[]} pros       - Advantages
 * @property {string[]} cons       - Disadvantages
 * @property {string} pricing      - Pricing info (e.g. "From $29/mo")
 * @property {string} commission   - Commission rate (e.g. "30% recurring")
 * @property {string} affiliateUrl - Affiliate link placeholder
 * @property {string[]} hashtags   - Relevant hashtags (without #)
 * @property {string} emoji        - Representative emoji
 * @property {string} targetAudience - Primary audience description
 * @property {string} niche        - Content niche
 */

/** @type {AffiliateProgram[]} */
export const SAMPLE_PROGRAMS = [
  {
    id: 'devbot',
    name: 'DevBot',
    category: 'AI Developer Tools',
    tagline: 'Your AI-powered dev assistant that ships code, not excuses',
    description:
      'DevBot is an intelligent development assistant that integrates with GitHub, Slack, and your entire workflow to automate code reviews, generate PRs, and keep projects moving 24/7.',
    features: [
      'AI-powered code review',
      'Automated PR generation',
      'GitHub & Slack integration',
      'Real-time project analytics',
      'Multi-language support',
    ],
    pros: [
      'Saves 10+ hours/week on reviews',
      'Catches bugs before production',
      'Seamless team integration',
      'Continuously learning codebase context',
    ],
    cons: [
      'Requires initial setup time',
      'Best value on larger teams',
    ],
    pricing: 'From $29/mo',
    commission: '30% recurring',
    affiliateUrl: 'https://devbot.ai?ref=AFFILIATE_ID',
    hashtags: ['DevBot', 'AITools', 'DevTools', 'CodeReview', 'GitHub', 'Productivity', 'Developer', 'SoftwareEngineering'],
    emoji: '🤖',
    targetAudience: 'Software developers, engineering managers, dev teams',
    niche: 'Developer productivity',
  },
  {
    id: 'notion-ai',
    name: 'Notion AI',
    category: 'Productivity & AI Writing',
    tagline: 'Write, plan, and think better with AI built into your workspace',
    description:
      'Notion AI brings the power of large language models directly into your Notion workspace, helping you draft documents, summarise notes, generate action items, and brainstorm ideas without switching apps.',
    features: [
      'AI writing assistant',
      'Meeting note summarisation',
      'Action-item extraction',
      'Multi-language translation',
      'Q&A over your docs',
    ],
    pros: [
      'Already inside Notion — no context switching',
      'Understands your existing pages',
      'Great for teams and solo creators',
      'Affordable add-on pricing',
    ],
    cons: [
      'Requires existing Notion subscription',
      'AI quality varies by task complexity',
    ],
    pricing: '$10/mo add-on',
    commission: '20% first year',
    affiliateUrl: 'https://notion.so/ai?ref=AFFILIATE_ID',
    hashtags: ['NotionAI', 'Notion', 'ProductivityTools', 'AIWriting', 'RemoteWork', 'PKM', 'NotesTaking'],
    emoji: '📝',
    targetAudience: 'Knowledge workers, content creators, project managers',
    niche: 'Productivity',
  },
  {
    id: 'jasper',
    name: 'Jasper',
    category: 'AI Content Marketing',
    tagline: 'Create marketing content 10x faster with AI',
    description:
      'Jasper is an AI content platform purpose-built for marketing teams. It helps brands create on-brand blog posts, ad copy, emails, and social content at scale, with brand voice controls and team collaboration built in.',
    features: [
      'Brand Voice training',
      '50+ content templates',
      'SEO mode with Surfer integration',
      'Team collaboration',
      'Browser extension',
    ],
    pros: [
      'Maintains consistent brand voice',
      'Huge template library',
      'Strong SEO integrations',
      'Enterprise-ready',
    ],
    cons: [
      'Higher price point than competitors',
      'Learning curve for brand voice setup',
    ],
    pricing: 'From $49/mo',
    commission: '25% recurring',
    affiliateUrl: 'https://jasper.ai?ref=AFFILIATE_ID',
    hashtags: ['JasperAI', 'ContentMarketing', 'AIWriting', 'Copywriting', 'MarketingTools', 'ContentCreation', 'DigitalMarketing'],
    emoji: '✍️',
    targetAudience: 'Content marketers, copywriters, marketing agencies',
    niche: 'Content marketing',
  },
  {
    id: 'framer',
    name: 'Framer',
    category: 'No-Code Website Builder',
    tagline: 'Design and publish stunning websites without writing a line of code',
    description:
      'Framer is a modern no-code website builder that combines the design freedom of Figma with the interactivity of React. Build pixel-perfect, blazing-fast marketing sites and landing pages with zero code.',
    features: [
      'Drag-and-drop designer',
      'Built-in CMS',
      'React component support',
      'AI website generation',
      'Built-in analytics',
    ],
    pros: [
      'Designer-quality output',
      'Fast page loads',
      'Generous free tier',
      'AI-assisted design',
    ],
    cons: [
      'Steeper learning curve than Squarespace',
      'Limited e-commerce features',
    ],
    pricing: 'Free — Pro from $20/mo',
    commission: '40% first payment',
    affiliateUrl: 'https://framer.com?ref=AFFILIATE_ID',
    hashtags: ['Framer', 'NoCode', 'WebDesign', 'LandingPage', 'UIDesign', 'WebDev', 'StartupTools'],
    emoji: '🎨',
    targetAudience: 'Designers, startups, freelancers, marketing teams',
    niche: 'Web design & no-code',
  },
  {
    id: 'lemlist',
    name: 'lemlist',
    category: 'Email Outreach & Sales',
    tagline: 'Cold emails that actually get replies',
    description:
      'lemlist is a multi-channel sales engagement platform that lets you send hyper-personalised cold emails with images, videos, and dynamic content. Automate follow-ups and manage entire outbound campaigns from one place.',
    features: [
      'Personalised image & video in emails',
      'LinkedIn outreach automation',
      'Warm-up tool included',
      'Deliverability analytics',
      'CRM integrations',
    ],
    pros: [
      'Unique personalisation capabilities',
      'Built-in email warm-up',
      'Great deliverability rates',
      'Multi-channel sequences',
    ],
    cons: [
      'UI can feel complex initially',
      'Video personalisation takes prep time',
    ],
    pricing: 'From $59/mo',
    commission: '20% recurring',
    affiliateUrl: 'https://lemlist.com?ref=AFFILIATE_ID',
    hashtags: ['lemlist', 'ColdEmail', 'SalesTools', 'EmailMarketing', 'LeadGeneration', 'Outbound', 'SalesAutomation'],
    emoji: '📧',
    targetAudience: 'Sales reps, SDRs, agency owners, B2B founders',
    niche: 'Sales & outreach',
  },
];

// ---------------------------------------------------------------------------
// AffiliateMarketingCampaign
// ---------------------------------------------------------------------------

/**
 * Generates platform-specific social media posts and content for affiliate programs.
 */
export class AffiliateMarketingCampaign {
  /**
   * Truncates a string to a max byte length, appending ellipsis if needed.
   * @param {string} text
   * @param {number} max
   * @returns {string}
   */
  _truncate(text, max) {
    if (text.length <= max) return text;
    return text.slice(0, max - 3) + '...';
  }

  /**
   * Picks a random element from an array.
   * @template T
   * @param {T[]} arr
   * @returns {T}
   */
  _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // -------------------------------------------------------------------------
  // Platform Post Generators
  // -------------------------------------------------------------------------

  /**
   * Generates a Twitter/X post (280 character limit).
   * Includes hashtags, CTA, and affiliate link placeholder.
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  generateTwitterPost(program) {
    const hashtags = program.hashtags
      .slice(0, 3)
      .map((h) => `#${h}`)
      .join(' ');

    const ctas = [
      `Try it free →`,
      `Get started today →`,
      `See it in action →`,
      `Check it out →`,
    ];

    const hooks = [
      `${program.emoji} ${program.tagline}.`,
      `${program.emoji} Stop wasting time. ${program.tagline}.`,
      `${program.emoji} Game-changer alert: ${program.name}.`,
      `${program.emoji} Hot take: ${program.tagline}.`,
    ];

    const body = `${this._pick(hooks)}\n\n${this._pick(ctas)} ${program.affiliateUrl}\n\n${hashtags}`;
    return this._truncate(body, 280);
  }

  /**
   * Generates a LinkedIn post (professional tone, ~1300 characters).
   * Value-focused, story-driven format.
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  generateLinkedInPost(program) {
    const featuresText = program.features
      .slice(0, 4)
      .map((f) => `✅ ${f}`)
      .join('\n');

    const hashtags = program.hashtags
      .slice(0, 5)
      .map((h) => `#${h}`)
      .join(' ');

    const post = `I've been using ${program.name} for the past few weeks, and I have to share what I've found.

${program.description}

Here's what stood out to me:

${featuresText}

${program.pricing} — and honestly, it's paid for itself multiple times over.

If you're in ${program.targetAudience.split(',')[0].toLowerCase()}, this is worth a serious look.

${program.affiliateUrl}

${hashtags}`;

    return this._truncate(post, 1300);
  }

  /**
   * Generates an Instagram caption (emoji-rich, engaging, up to 2200 characters).
   * Includes a large hashtag block at the end.
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  generateInstagramCaption(program) {
    const bulletFeatures = program.features
      .map((f) => `${program.emoji} ${f}`)
      .join('\n');

    const hashtagBlock = program.hashtags
      .map((h) => `#${h}`)
      .concat([
        '#affiliate',
        '#sponsored',
        '#recommended',
        '#toolsoftheTrade',
        '#worksmarter',
      ])
      .join(' ');

    const caption = `✨ This tool has completely changed how I work ✨

${program.name} — ${program.tagline}

${program.description}

🔥 What you get:
${bulletFeatures}

💰 Pricing: ${program.pricing}
👇 Link in bio OR grab it here:
${program.affiliateUrl}

⚡️ Drop a comment below if you want a full walkthrough! 👇

.
.
.
${hashtagBlock}`;

    return this._truncate(caption, 2200);
  }

  /**
   * Generates a Facebook post (medium length, conversational, with CTA).
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  generateFacebookPost(program) {
    const prosText = program.pros
      .slice(0, 3)
      .map((p) => `👉 ${p}`)
      .join('\n');

    const hashtags = program.hashtags
      .slice(0, 4)
      .map((h) => `#${h}`)
      .join(' ');

    return `Hey everyone! ${program.emoji}

I wanted to share something that's been a huge help for me lately: ${program.name}.

${program.tagline}

${program.description}

A few things I really love about it:
${prosText}

It starts at ${program.pricing} and they have a free trial so you can test it with zero risk.

Click here to check it out: ${program.affiliateUrl}

Let me know in the comments if you have any questions — happy to help!

${hashtags}`;
  }

  /**
   * Generates a TikTok video script with hook, body, and CTA sections.
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  generateTikTokScript(program) {
    const featureHighlights = program.features
      .slice(0, 3)
      .map((f, i) => `  [${i + 1}] Show: ${f}`)
      .join('\n');

    return `=== TIKTOK VIDEO SCRIPT: ${program.name.toUpperCase()} ===
Duration: 45–60 seconds
Format: Screen record + talking head

--- HOOK (0–3 sec) ---
[ON CAMERA — excited energy]
"Wait, you're still doing that manually?! Let me show you ${program.name}."

--- BODY (4–40 sec) ---
[SCREEN RECORD — open ${program.name}]
VO: "${program.tagline}."

[Show the interface]
VO: "Here's what it can do..."

${featureHighlights}

[Reaction shot]
VO: "I used to spend hours on this. Now it takes minutes."

--- CTA (41–60 sec) ---
[ON CAMERA — point to screen]
"Link in bio to try it for free. It starts at ${program.pricing}."

[TEXT OVERLAY]: Try FREE → ${program.affiliateUrl}

#${program.hashtags.slice(0, 5).join(' #')} #fyp #foryou

=== END SCRIPT ===`;
  }

  /**
   * Generates a YouTube video description with SEO and timestamp placeholders.
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  generateYouTubeDescription(program) {
    const featuresSection = program.features
      .map((f) => `   • ${f}`)
      .join('\n');

    const hashtags = program.hashtags
      .slice(0, 8)
      .map((h) => `#${h}`)
      .join(' ');

    return `${program.name} Review ${new Date().getFullYear()} — ${program.tagline}

In this video, I do a deep dive into ${program.name} and show you exactly how it works, who it's best for, and whether it's worth the price.

🔗 LINKS MENTIONED:
→ Try ${program.name} (affiliate): ${program.affiliateUrl}
→ Pricing page: ${program.affiliateUrl}#pricing

⏱️ TIMESTAMPS:
00:00 — Intro & what we're covering
01:30 — What is ${program.name}?
03:00 — Key features walkthrough
${program.features.map((f, i) => `   ${String(3 + i * 2).padStart(2, '0')}:${String(i * 45).padStart(2, '0')} — ${f}`).join('\n')}
[TIMESTAMP] — Pricing breakdown
[TIMESTAMP] — Who it's best for
[TIMESTAMP] — Pros & cons
[TIMESTAMP] — Final verdict

📋 ABOUT ${program.name.toUpperCase()}:
${program.description}

KEY FEATURES:
${featuresSection}

PRICING: ${program.pricing}
COMMISSION NOTE: This video contains affiliate links. I earn a commission at no extra cost to you.

👍 If this helped, smash that like button and subscribe for more tool reviews!

${hashtags}

---
DISCLAIMER: This description contains affiliate links. I may earn a commission if you purchase through my link. I only recommend tools I genuinely use or have thoroughly reviewed.`;
  }

  /**
   * Generates a Reddit post — authentic, non-spammy, value-first format.
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  generateRedditPost(program) {
    const prosSection = program.pros
      .map((p) => `- ${p}`)
      .join('\n');

    const consSection = program.cons
      .map((c) => `- ${c}`)
      .join('\n');

    const featuresSection = program.features
      .map((f) => `- ${f}`)
      .join('\n');

    return `**[Review] ${program.name} — ${program.tagline}**

Hey r/[SUBREDDIT], long-time lurker here. Wanted to share my honest experience with ${program.name} since I've seen a few people asking about it lately.

**Background:** I'm a ${program.targetAudience.split(',')[0].toLowerCase()} and I've been using ${program.name} for about 3 months now.

---

**What it does:**

${program.description}

**Main features I've actually used:**

${featuresSection}

---

**Honest Pros:**

${prosSection}

**Honest Cons:**

${consSection}

---

**Pricing:** ${program.pricing}

**Bottom line:** If you're in ${program.niche}, I think it's worth trying out. They have a free trial so there's no risk to test it.

*(Full disclosure: the link below is an affiliate link — I get a small cut if you sign up, which helps me keep reviewing tools like this.)*

🔗 ${program.affiliateUrl}

Happy to answer any questions in the comments.`;
  }

  /**
   * Generates an HTML email newsletter featuring multiple affiliate programs.
   * @param {AffiliateProgram[]} programs - Array of programs to feature
   * @returns {string} HTML string
   */
  generateEmailNewsletter(programs) {
    const programCards = programs
      .map(
        (p) => `
      <!-- Program Card: ${p.name} -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#f9fafb;padding:20px 24px;border-bottom:1px solid #e5e7eb;">
            <h2 style="margin:0;font-size:20px;color:#111827;">${p.emoji} ${p.name}</h2>
            <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">${p.category}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">${p.description}</p>
            <ul style="margin:0 0 16px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
              ${p.features.map((f) => `<li>${f}</li>`).join('')}
            </ul>
            <p style="margin:0 0 16px;font-size:13px;color:#6b7280;"><strong>Pricing:</strong> ${p.pricing}</p>
            <a href="${p.affiliateUrl}"
               style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">
              Try ${p.name} →
            </a>
          </td>
        </tr>
      </table>`
      )
      .join('');

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Tools I'm Loving This Month — ${currentMonth}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#111827;border-radius:8px 8px 0 0;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:28px;">🛠️ Tools I'm Loving</h1>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:14px;">${currentMonth} Edition</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="background:#fff;padding:32px 40px 24px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">
                Hey there! This month I've been deep in testing mode, and I've found ${programs.length} tools
                that I think are genuinely worth your time. Here's my honest take on each.
              </p>
              <p style="margin:0;color:#6b7280;font-size:13px;">
                ⚡ Some links below are affiliate links — I earn a small fee at no cost to you.
              </p>
            </td>
          </tr>

          <!-- Program Cards -->
          <tr>
            <td style="background:#fff;padding:0 40px 32px;">
              ${programCards}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                You received this because you subscribed to our tools newsletter.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="[UNSUBSCRIBE_LINK]" style="color:#9ca3af;">Unsubscribe</a> ·
                <a href="[PRIVACY_LINK]" style="color:#9ca3af;">Privacy Policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}

// ---------------------------------------------------------------------------
// CampaignScheduler
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ScheduledPost
 * @property {string} date       - ISO date string
 * @property {string} platform   - Platform name
 * @property {string} programId  - Program ID
 * @property {string} content    - Generated post content
 * @property {string} theme      - Weekly/monthly theme
 */

/**
 * Schedules and rotates affiliate campaigns across platforms and time periods.
 */
export class CampaignScheduler {
  /** @type {string[]} */
  static PLATFORMS = [
    'Twitter',
    'LinkedIn',
    'Instagram',
    'Facebook',
    'TikTok',
    'YouTube',
    'Reddit',
  ];

  /** @type {string[]} */
  static WEEKLY_THEMES = [
    'Problem Awareness',
    'Feature Spotlight',
    'Social Proof',
    'Value & Savings',
    'Tutorial & How-To',
    'Comparison',
    'CTA & Conversion',
  ];

  /** @type {string[]} */
  static MONTHLY_THEMES = [
    'Month 1: Awareness & Education',
    'Month 2: Deep Dives & Comparisons',
    'Month 3: Case Studies & Social Proof',
    'Month 4: Conversion & Urgency',
  ];

  constructor() {
    this.campaign = new AffiliateMarketingCampaign();
  }

  /**
   * Adds N days to a date.
   * @param {Date} date
   * @param {number} days
   * @returns {Date}
   */
  _addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Formats a Date to YYYY-MM-DD.
   * @param {Date} date
   * @returns {string}
   */
  _formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Generates the post content for a given platform and program.
   * @param {string} platform
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  _generateContent(platform, program) {
    const gen = this.campaign;
    switch (platform) {
      case 'Twitter':    return gen.generateTwitterPost(program);
      case 'LinkedIn':   return gen.generateLinkedInPost(program);
      case 'Instagram':  return gen.generateInstagramCaption(program);
      case 'Facebook':   return gen.generateFacebookPost(program);
      case 'TikTok':     return gen.generateTikTokScript(program);
      case 'YouTube':    return gen.generateYouTubeDescription(program);
      case 'Reddit':     return gen.generateRedditPost(program);
      default:           return gen.generateTwitterPost(program);
    }
  }

  /**
   * Creates a 7-day posting schedule across all platforms.
   * Each day focuses on one platform + one program, cycling through both.
   * @param {AffiliateProgram[]} programs
   * @param {Date} [startDate=new Date()] - Start date for the schedule
   * @returns {ScheduledPost[]}
   */
  createWeeklyCampaign(programs, startDate = new Date()) {
    const schedule = [];
    const platforms = CampaignScheduler.PLATFORMS;

    for (let day = 0; day < 7; day++) {
      const platform = platforms[day % platforms.length];
      const program  = programs[day % programs.length];
      const theme    = CampaignScheduler.WEEKLY_THEMES[day];
      const date     = this._formatDate(this._addDays(startDate, day));

      schedule.push({
        date,
        platform,
        programId: program.id,
        content: this._generateContent(platform, program),
        theme,
      });
    }

    return schedule;
  }

  /**
   * Creates a 30-day content calendar with themed weeks.
   * @param {AffiliateProgram[]} programs
   * @param {Date} [startDate=new Date()]
   * @returns {{ week: number; theme: string; posts: ScheduledPost[] }[]}
   */
  createMonthlyCalendar(programs, startDate = new Date()) {
    const calendar = [];
    const platforms = CampaignScheduler.PLATFORMS;

    for (let week = 0; week < 4; week++) {
      const weekTheme = CampaignScheduler.MONTHLY_THEMES[week % CampaignScheduler.MONTHLY_THEMES.length];
      const weekPosts = [];

      for (let day = 0; day < 7; day++) {
        const dayIndex  = week * 7 + day;
        const platform  = platforms[dayIndex % platforms.length];
        const program   = programs[dayIndex % programs.length];
        const dayTheme  = `${weekTheme} — ${CampaignScheduler.WEEKLY_THEMES[day]}`;
        const date      = this._formatDate(this._addDays(startDate, dayIndex));

        weekPosts.push({
          date,
          platform,
          programId: program.id,
          content: this._generateContent(platform, program),
          theme: dayTheme,
        });
      }

      calendar.push({
        week: week + 1,
        theme: weekTheme,
        posts: weekPosts,
      });
    }

    // Add remaining 2 days to reach 30
    const extraPosts = [];
    for (let day = 0; day < 2; day++) {
      const dayIndex = 28 + day;
      const platform = platforms[dayIndex % platforms.length];
      const program  = programs[dayIndex % programs.length];
      const date     = this._formatDate(this._addDays(startDate, dayIndex));

      extraPosts.push({
        date,
        platform,
        programId: program.id,
        content: this._generateContent(platform, program),
        theme: 'Bonus Day',
      });
    }

    if (extraPosts.length > 0) {
      calendar.push({ week: 5, theme: 'Bonus Days', posts: extraPosts });
    }

    return calendar;
  }

  /**
   * Rotates program focus so all programs get equal exposure over time.
   * Returns an ordered array of programs for scheduling, cycling fairly.
   * @param {AffiliateProgram[]} programs
   * @param {number} [totalSlots=CampaignScheduler.PLATFORMS.length * 4] - How many slots to fill
   * @returns {{ slot: number; platform: string; program: AffiliateProgram }[]}
   */
  rotateProgramFocus(programs, totalSlots = CampaignScheduler.PLATFORMS.length * 4) {
    const rotation = [];
    const platforms = CampaignScheduler.PLATFORMS;

    for (let slot = 0; slot < totalSlots; slot++) {
      rotation.push({
        slot: slot + 1,
        platform: platforms[slot % platforms.length],
        program: programs[slot % programs.length],
      });
    }

    return rotation;
  }

  /**
   * Generates 3 A/B test variants of each platform post for a given program.
   * @param {AffiliateProgram} program
   * @returns {{ platform: string; variants: string[] }[]}
   */
  generateABVariants(program) {
    const gen = this.campaign;
    const variants = [];

    // We create 3 slightly differentiated variants by temporarily mutating the
    // program's tagline and top hashtag order, then restoring them.
    const originalTagline  = program.tagline;
    const originalHashtags = [...program.hashtags];

    const taglineVariants = [
      originalTagline,
      `${program.name}: ${originalTagline.toLowerCase()}`,
      `Why I switched to ${program.name} — ${originalTagline.toLowerCase()}`,
    ];

    for (const platform of CampaignScheduler.PLATFORMS) {
      const platformVariants = taglineVariants.map((tagline, idx) => {
        // Rotate hashtags for each variant
        program.tagline  = tagline;
        program.hashtags = [
          ...originalHashtags.slice(idx % originalHashtags.length),
          ...originalHashtags.slice(0, idx % originalHashtags.length),
        ];

        return gen._generateContent
          ? `[Variant ${idx + 1}]\n${this._generateContent(platform, program)}`
          : `[Variant ${idx + 1}]\n${this._generateContent(platform, program)}`;
      });

      variants.push({ platform, variants: platformVariants });
    }

    // Restore original values
    program.tagline  = originalTagline;
    program.hashtags = originalHashtags;

    return variants;
  }
}

// ---------------------------------------------------------------------------
// SEO Article Generator
// ---------------------------------------------------------------------------

/**
 * Generates SEO article templates for affiliate content marketing.
 */
export class SEOArticleGenerator {
  /**
   * Generates a "X vs Y" comparison article template.
   * @param {AffiliateProgram} program1
   * @param {AffiliateProgram} program2
   * @returns {string}
   */
  generateComparisonArticle(program1, program2) {
    const p1Features = program1.features.map((f) => `| ${f} | ✅ | — |`).join('\n');
    const p2Features = program2.features.map((f) => `| ${f} | — | ✅ |`).join('\n');

    return `# ${program1.name} vs ${program2.name}: Which Is Better in ${new Date().getFullYear()}?

**Meta Description:** Comparing ${program1.name} and ${program2.name} head-to-head. We break down features, pricing, and use cases to help you choose the right tool.

**Target Keywords:** ${program1.name} vs ${program2.name}, ${program1.name} review, ${program2.name} alternative, best ${program1.category.toLowerCase()} tools

---

## Quick Summary

If you're deciding between ${program1.name} and ${program2.name}, here's the short version:

- **Choose ${program1.name}** if: [PRIMARY USE CASE FOR P1]
- **Choose ${program2.name}** if: [PRIMARY USE CASE FOR P2]

---

## Overview

### What Is ${program1.name}?

${program1.description}

**Best for:** ${program1.targetAudience}
**Pricing:** ${program1.pricing}

### What Is ${program2.name}?

${program2.description}

**Best for:** ${program2.targetAudience}
**Pricing:** ${program2.pricing}

---

## Feature Comparison

| Feature | ${program1.name} | ${program2.name} |
|---------|${'-'.repeat(program1.name.length + 2)}|${'-'.repeat(program2.name.length + 2)}|
${p1Features}
${p2Features}

---

## Pricing Comparison

| Plan | ${program1.name} | ${program2.name} |
|------|${'-'.repeat(program1.name.length + 2)}|${'-'.repeat(program2.name.length + 2)}|
| Starting Price | ${program1.pricing} | ${program2.pricing} |
| Free Trial | ✅ | ✅ |
| Money-back Guarantee | [CHECK] | [CHECK] |

---

## Pros and Cons

### ${program1.name} Pros & Cons

**Pros:**
${program1.pros.map((p) => `- ${p}`).join('\n')}

**Cons:**
${program1.cons.map((c) => `- ${c}`).join('\n')}

### ${program2.name} Pros & Cons

**Pros:**
${program2.pros.map((p) => `- ${p}`).join('\n')}

**Cons:**
${program2.cons.map((c) => `- ${c}`).join('\n')}

---

## Use Case Scenarios

### Scenario 1: [SMALL TEAM / FREELANCER]

[DESCRIBE WHICH TOOL WINS AND WHY]

### Scenario 2: [ENTERPRISE / LARGE TEAM]

[DESCRIBE WHICH TOOL WINS AND WHY]

### Scenario 3: [BUDGET-CONSCIOUS USER]

[DESCRIBE WHICH TOOL WINS AND WHY]

---

## Final Verdict

Both ${program1.name} and ${program2.name} are excellent tools, but they serve different needs.

**Winner overall:** [TOOL NAME] — [ONE SENTENCE REASON]

👉 **Try ${program1.name}:** ${program1.affiliateUrl}
👉 **Try ${program2.name}:** ${program2.affiliateUrl}

---

*Disclosure: Some links in this article are affiliate links. We may earn a commission if you purchase through our link, at no additional cost to you.*`;
  }

  /**
   * Generates an in-depth review article template with pros/cons.
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  generateReviewArticle(program) {
    const featuresSection = program.features
      .map(
        (f, i) => `### Feature ${i + 1}: ${f}\n\n[DESCRIBE THIS FEATURE IN 2–3 SENTENCES. ADD SCREENSHOT PLACEHOLDER: ![${f} screenshot](IMAGE_URL)]\n`
      )
      .join('\n');

    return `# ${program.name} Review ${new Date().getFullYear()}: Is It Worth It?

**Meta Description:** An honest, in-depth review of ${program.name}. We cover features, pricing, pros, cons, and who it's best for.

**Target Keywords:** ${program.name} review, is ${program.name} worth it, ${program.name} pricing, ${program.name} features, ${program.name} alternative

**Word Count Target:** 2,000–3,000 words
**Last Updated:** ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

---

## Our Verdict

> **Rating: [X.X / 10]**
> ${program.name} is an excellent choice for ${program.targetAudience.split(',')[0].toLowerCase()}. ${program.tagline}. Starting at ${program.pricing}, it offers strong value for the right use case.

**[TRY ${program.name.toUpperCase()} FREE →](${program.affiliateUrl})**

---

## What Is ${program.name}?

${program.description}

${program.name} was built specifically for **${program.targetAudience}** who need to ${program.niche.toLowerCase()}.

---

## Key Features

${featuresSection}

---

## ${program.name} Pricing

| Plan | Price | Best For |
|------|-------|----------|
| [PLAN NAME] | [PRICE] | [USE CASE] |
| [PLAN NAME] | [PRICE] | [USE CASE] |
| [PLAN NAME] | [PRICE] | [USE CASE] |

**Starting price:** ${program.pricing}

[AFFILIATE CTA]: 👉 [Start your free trial of ${program.name}](${program.affiliateUrl})

---

## Pros and Cons

### ✅ What We Liked

${program.pros.map((p) => `**${p}**\n\n[EXPAND ON THIS WITH 1–2 SENTENCES]\n`).join('\n')}

### ❌ What Could Be Better

${program.cons.map((c) => `**${c}**\n\n[EXPAND ON THIS WITH 1–2 SENTENCES]\n`).join('\n')}

---

## Who Is ${program.name} Best For?

${program.name} is an excellent fit if you are:

- A ${program.targetAudience.split(',')[0].toLowerCase()} who needs [SPECIFIC PAIN POINT]
- A team in [INDUSTRY/NICHE] looking to [GOAL]
- Someone who has tried [ALTERNATIVE] but found [PROBLEM]

It may **not** be the best fit if you:

- [DESCRIBE WHO SHOULD NOT USE THIS TOOL]
- [ALTERNATIVE SCENARIO]

---

## ${program.name} Alternatives

| Tool | Best For | Starting Price |
|------|----------|----------------|
| [ALTERNATIVE 1] | [USE CASE] | [PRICE] |
| [ALTERNATIVE 2] | [USE CASE] | [PRICE] |
| [ALTERNATIVE 3] | [USE CASE] | [PRICE] |

---

## Frequently Asked Questions

**Is ${program.name} free?**
[ANSWER BASED ON PRICING: ${program.pricing}]

**Does ${program.name} offer a free trial?**
[ANSWER]

**What integrations does ${program.name} support?**
[LIST KEY INTEGRATIONS]

**Is ${program.name} worth it?**
For ${program.targetAudience.split(',')[0].toLowerCase()}, yes — ${program.tagline.toLowerCase()}.

---

## Final Thoughts

${program.name} is [SUMMARY STATEMENT]. If you're serious about ${program.niche.toLowerCase()}, it's well worth trying out — especially since they offer [FREE TRIAL / MONEY BACK GUARANTEE].

**[Try ${program.name} for free →](${program.affiliateUrl})**

---

*Disclosure: This review contains affiliate links. We may earn a commission if you sign up through our link, at no extra cost to you. We only recommend tools we genuinely believe in.*`;
  }

  /**
   * Generates a "Top N X tools" listicle article template.
   * @param {AffiliateProgram[]} programs
   * @param {string} category - Category label (e.g. "AI Developer Tools")
   * @returns {string}
   */
  generateListicleArticle(programs, category) {
    const year = new Date().getFullYear();
    const count = programs.length;

    const programEntries = programs
      .map(
        (p, i) => `## ${i + 1}. ${p.name} — ${p.tagline}

![${p.name} screenshot](IMAGE_URL_${p.id})

${p.description}

**Best for:** ${p.targetAudience}
**Pricing:** ${p.pricing}
**Commission:** ${p.commission}

**Key Features:**
${p.features.map((f) => `- ${f}`).join('\n')}

**Pros:** ${p.pros.slice(0, 2).join(' · ')}
**Cons:** ${p.cons.slice(0, 1).join(' · ')}

👉 [Try ${p.name} →](${p.affiliateUrl})

---`
      )
      .join('\n\n');

    return `# Best ${count} ${category} Tools in ${year} (Ranked & Reviewed)

**Meta Description:** We tested the top ${category.toLowerCase()} tools so you don't have to. Here are the ${count} best options in ${year}, ranked by features, value, and ease of use.

**Target Keywords:** best ${category.toLowerCase()} tools, top ${category.toLowerCase()} software ${year}, ${category.toLowerCase()} tools comparison

**Word Count Target:** ${count * 300}–${count * 500} words

---

## Quick Comparison Table

| # | Tool | Best For | Starting Price |
|---|------|----------|----------------|
${programs.map((p, i) => `| ${i + 1} | [${p.name}](${p.affiliateUrl}) | ${p.targetAudience.split(',')[0]} | ${p.pricing} |`).join('\n')}

---

## How We Chose These Tools

[DESCRIBE YOUR EVALUATION CRITERIA: e.g., We tested each tool over 30 days, evaluating feature depth, ease of use, pricing, support quality, and integration ecosystem.]

---

## The Best ${category} Tools

${programEntries}

---

## How to Choose the Right ${category} Tool

When evaluating ${category.toLowerCase()} options, consider:

1. **Your budget** — [GUIDANCE]
2. **Team size** — [GUIDANCE]
3. **Required integrations** — [GUIDANCE]
4. **Ease of onboarding** — [GUIDANCE]
5. **Support quality** — [GUIDANCE]

---

## Final Recommendations

- **Best overall:** ${programs[0].name} — [REASON]
- **Best for beginners:** [TOOL] — [REASON]
- **Best value:** [TOOL] — [REASON]
- **Best for enterprises:** [TOOL] — [REASON]

---

*Disclosure: Some links in this article are affiliate links. We receive a commission if you purchase through our links, at no extra cost to you.*`;
  }

  /**
   * Generates a tutorial-style "How To" article template.
   * @param {AffiliateProgram} program
   * @returns {string}
   */
  generateHowToArticle(program) {
    const steps = program.features.map(
      (f, i) => `## Step ${i + 1}: ${f}

![Step ${i + 1} screenshot](IMAGE_URL_STEP_${i + 1})

[EXPLAIN HOW TO USE THIS FEATURE IN 3–5 SENTENCES. BE SPECIFIC AND ACTIONABLE.]

**Pro Tip:** [ADD A HELPFUL TIP RELATED TO THIS STEP]

---`
    );

    return `# How to Use ${program.name}: A Step-by-Step Guide for ${program.targetAudience.split(',')[0]}

**Meta Description:** Learn how to use ${program.name} from scratch. This step-by-step guide covers everything from setup to advanced features for ${program.targetAudience.split(',')[0].toLowerCase()}.

**Target Keywords:** how to use ${program.name}, ${program.name} tutorial, ${program.name} guide, ${program.name} setup, getting started with ${program.name}

**Word Count Target:** 2,500–4,000 words
**Difficulty:** Beginner to Intermediate

---

## What You'll Learn

By the end of this guide you'll know how to:

${program.features.map((f) => `- ${f.toLowerCase()}`).join('\n')}

**Estimated time:** 15–30 minutes
**Prerequisites:** [LIST ANY REQUIREMENTS, e.g., "A ${program.name} account (free trial available)"]

---

## Why ${program.name}?

${program.description}

${program.tagline}.

👉 **[Start your free ${program.name} account →](${program.affiliateUrl})**

---

## Getting Started: Account Setup

### 1. Create Your Account

1. Go to [${program.name}](${program.affiliateUrl})
2. Click "Get Started" or "Sign Up Free"
3. Enter your email and create a password
4. [DESCRIBE ONBOARDING STEPS]

### 2. Complete Your Profile

[DESCRIBE INITIAL SETUP STEPS]

### 3. Connect Your Integrations

[DESCRIBE KEY INTEGRATION STEPS]

---

## Core Workflow

${steps.join('\n\n')}

---

## Advanced Tips & Tricks

### Tip 1: [ADVANCED FEATURE OR WORKFLOW]

[DESCRIPTION + INSTRUCTIONS]

### Tip 2: [AUTOMATION OR SHORTCUT]

[DESCRIPTION + INSTRUCTIONS]

### Tip 3: [TEAM COLLABORATION FEATURE]

[DESCRIPTION + INSTRUCTIONS]

---

## Common Mistakes to Avoid

1. **[MISTAKE 1]** — [HOW TO AVOID IT]
2. **[MISTAKE 2]** — [HOW TO AVOID IT]
3. **[MISTAKE 3]** — [HOW TO AVOID IT]

---

## Frequently Asked Questions

**How long does it take to get started with ${program.name}?**
Most users are up and running within 15–30 minutes. The onboarding wizard makes it straightforward.

**Is ${program.name} suitable for beginners?**
Yes. [ELABORATE ON EASE OF USE]

**Can I use ${program.name} for free?**
${program.pricing}. [DESCRIBE FREE TIER OR TRIAL]

---

## Summary

You now know how to use ${program.name} to ${program.niche.toLowerCase()}. Here's a quick recap:

${program.features.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Ready to get started?

**[Try ${program.name} for free →](${program.affiliateUrl})**

---

*This article contains affiliate links. We may earn a commission if you sign up through our link, at no extra cost to you.*`;
  }
}

// ---------------------------------------------------------------------------
// Default export convenience object
// ---------------------------------------------------------------------------

export default {
  AffiliateMarketingCampaign,
  CampaignScheduler,
  SEOArticleGenerator,
  SAMPLE_PROGRAMS,
};
