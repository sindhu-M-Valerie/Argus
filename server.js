const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Parser = require('rss-parser');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const parser = new Parser({
  requestOptions: {
    headers: {
      'User-Agent': 'Argus/1.0 (+https://localhost)'
    }
  }
});

// Helper function to add timeout to promises
function withTimeout(promise, timeoutMs = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const signals = [
  {
    id: 4,
    category: 'Suicide & Self-Harm',
    region: 'National',
    riskLevel: 'High',
    trend: 'Rising',
    summary: 'Self-harm related signals are surfacing more frequently in public conversations and media, including youth-oriented online communities.',
    trendStats: {
      shift24hPercent: 16,
      watchlistMentions: 920,
      verifiedReports: 6
    },
    links: [
      { label: 'Self-Harm Signal Brief', url: '/trend/4/self-harm-signal-brief' },
      { label: 'Prevention Resource Note', url: '/trend/4/prevention-resource-note' }
    ]
  },
  {
    id: 5,
    category: 'Violent Speech',
    region: 'National',
    riskLevel: 'Medium',
    trend: 'Rising',
    summary: 'Escalatory and violent rhetoric is increasing around polarizing events, with repeated language patterns across multiple channels.',
    trendStats: {
      shift24hPercent: 12,
      watchlistMentions: 870,
      verifiedReports: 5
    },
    links: [
      { label: 'Violent Speech Snapshot', url: '/trend/5/violent-speech-snapshot' },
      { label: 'Escalation Language Note', url: '/trend/5/escalation-language-note' }
    ]
  },
  {
    id: 6,
    category: 'TVEC (Terrorism)',
    region: 'National',
    riskLevel: 'High',
    trend: 'Elevated-Stable',
    summary: 'Extremist propaganda and recruitment-adjacent narratives continue to circulate in niche spaces with periodic amplification spikes.',
    trendStats: {
      shift24hPercent: 8,
      watchlistMentions: 640,
      verifiedReports: 7
    },
    links: [
      { label: 'TVEC Activity Brief', url: '/trend/6/tvec-activity-brief' },
      { label: 'Extremist Narrative Watch', url: '/trend/6/extremist-narrative-watch' }
    ]
  },
  {
    id: 7,
    category: 'Illegal Goods',
    region: 'National',
    riskLevel: 'Medium',
    trend: 'Rising',
    summary: 'Public listings and coded promotions related to illegal goods show continued activity across open and semi-closed channels.',
    trendStats: {
      shift24hPercent: 14,
      watchlistMentions: 710,
      verifiedReports: 6
    },
    links: [
      { label: 'Illegal Goods Pattern Brief', url: '/trend/7/illegal-goods-pattern-brief' },
      { label: 'Supply Signal Note', url: '/trend/7/supply-signal-note' }
    ]
  },
  {
    id: 8,
    category: 'Human Trafficking',
    region: 'South Asia',
    riskLevel: 'High',
    trend: 'Rising',
    summary: 'Trafficking-related recruitment signals and coercive transit narratives are increasing across public-facing digital channels.',
    trendStats: {
      shift24hPercent: 19,
      watchlistMentions: 830,
      verifiedReports: 9
    },
    links: [
      { label: 'Trafficking Signal Brief', url: '/trend/8/trafficking-signal-brief' },
      { label: 'Recruitment Pattern Note', url: '/trend/8/recruitment-pattern-note' }
    ]
  },
  {
    id: 9,
    category: 'Revenge Porn / NCII',
    region: 'APAC',
    riskLevel: 'High',
    trend: 'Rising',
    summary: 'Non-consensual intimate image circulation and extortion-linked threats are being reported with higher cross-platform spread.',
    trendStats: {
      shift24hPercent: 24,
      watchlistMentions: 760,
      verifiedReports: 10
    },
    links: [
      { label: 'NCII Incident Brief', url: '/trend/9/ncii-incident-brief' },
      { label: 'Image Abuse Response Note', url: '/trend/9/image-abuse-response-note' }
    ]
  },
  {
    id: 10,
    category: 'Dangerous & Criminal Organizations',
    region: 'Global',
    riskLevel: 'High',
    trend: 'Elevated-Stable',
    summary: 'Public content linked to extremist and organized criminal entities continues to surface with periodic amplification spikes.',
    trendStats: {
      shift24hPercent: 9,
      watchlistMentions: 520,
      verifiedReports: 7
    },
    links: [
      { label: 'Organization Risk Brief', url: '/trend/10/organization-risk-brief' },
      { label: 'Network Presence Note', url: '/trend/10/network-presence-note' }
    ]
  },
  {
    id: 11,
    category: 'Harassment & Bullying',
    region: 'Global',
    riskLevel: 'Medium',
    trend: 'Rising',
    summary: 'Targeted harassment and coordinated abuse behavior remain active, including pile-on patterns and intimidation language.',
    trendStats: {
      shift24hPercent: 13,
      watchlistMentions: 980,
      verifiedReports: 8
    },
    links: [
      { label: 'Harassment Pattern Brief', url: '/trend/11/harassment-pattern-brief' },
      { label: 'Dogpiling Incident Note', url: '/trend/11/dogpiling-incident-note' }
    ]
  },
  {
    id: 12,
    category: 'Dangerous Misinformation & Endangerment',
    region: 'Global',
    riskLevel: 'High',
    trend: 'Rising',
    summary: 'False safety and medical claims with potential real-world harm impact are being re-shared across high-reach channels.',
    trendStats: {
      shift24hPercent: 17,
      watchlistMentions: 1320,
      verifiedReports: 10
    },
    links: [
      { label: 'Endangerment Claim Brief', url: '/trend/12/endangerment-claim-brief' },
      { label: 'Safety Claim Verification Note', url: '/trend/12/safety-claim-verification-note' }
    ]
  },
  {
    id: 13,
    category: 'Spam & Inauthentic Behavior',
    region: 'Global',
    riskLevel: 'Medium',
    trend: 'Elevated-Stable',
    summary: 'Automated and coordinated fake-engagement behavior continues to drive low-trust amplification in monitored streams.',
    trendStats: {
      shift24hPercent: 6,
      watchlistMentions: 1110,
      verifiedReports: 6
    },
    links: [
      { label: 'Spam Network Snapshot', url: '/trend/13/spam-network-snapshot' },
      { label: 'Inauthentic Engagement Note', url: '/trend/13/inauthentic-engagement-note' }
    ]
  },
  {
    id: 14,
    category: 'Fraud & Impersonation',
    region: 'Global',
    riskLevel: 'High',
    trend: 'Rising',
    summary: 'Fraud attempts and impersonation narratives are increasing, with recurring scam templates and credential-harvest prompts.',
    trendStats: {
      shift24hPercent: 15,
      watchlistMentions: 890,
      verifiedReports: 9
    },
    links: [
      { label: 'Fraud Campaign Brief', url: '/trend/14/fraud-campaign-brief' },
      { label: 'Impersonation Alert Note', url: '/trend/14/impersonation-alert-note' }
    ]
  }
];

const trendDetails = {
  '1:narrative-cluster-brief': {
    title: 'Narrative Cluster Brief',
    sourceType: 'Behavioral Cluster Analysis',
    updatedAt: '2026-02-12T12:10:00.000Z',
    highlights: [
      'Top misinformation claim appeared in 1860 watchlist mentions across 24 hours, with the steepest lift between 19:00 and 22:00 IST.',
      'Fifteen high-volume relay accounts posted near-identical framing within a 12-minute window after a policy headline.',
      'Three high-reach node clusters match coordination fingerprints previously flagged in election-period disinformation monitoring.'
    ]
  },
  '1:verification-note': {
    title: 'Verification Note',
    sourceType: 'Analyst Verification Log',
    updatedAt: '2026-02-12T12:35:00.000Z',
    highlights: [
      'Eleven verified reports corroborate repeated circulation of unsupported claim variants across news-commentary spaces.',
      'Fact-check alignment confirms core narrative distortions in attribution, dates, and source authenticity.',
      'Escalation risk remains high due to rapid repost velocity and continuing cross-language propagation.'
    ]
  },
  '2:behavior-pattern-snapshot': {
    title: 'Behavioral Pattern Snapshot',
    sourceType: 'Coordination Pattern Snapshot',
    updatedAt: '2026-02-12T10:50:00.000Z',
    highlights: [
      'Conversation volume is elevated but stable, with a 5% day-over-day increase and no major virality breakout.',
      'Repeat contributors account for a majority share of hostile posts, indicating campaign persistence over spontaneous surge.',
      'Harmful framing appears in multiple regional-language variants, concentrated around known coordination hubs.'
    ]
  },
  '2:regional-monitoring-note': {
    title: 'Regional Monitoring Note',
    sourceType: 'Regional Signal Desk',
    updatedAt: '2026-02-12T11:15:00.000Z',
    highlights: [
      'Activity remains concentrated in South India regional clusters with recurring account overlap across daily monitoring windows.',
      'Eight verified reports indicate continued targeted hostility, though spread remains below high-risk escalation thresholds.',
      'Priority remains medium-to-high with active hourly review and de-escalation watch conditions.'
    ]
  },
  '3:escalation-timeline': {
    title: 'Escalation Timeline',
    sourceType: 'Risk Escalation Timeline',
    updatedAt: '2026-02-12T12:48:00.000Z',
    highlights: [
      'Exploitation-risk mentions rose 27% in 24 hours, with sharp increases during late-evening youth-traffic periods.',
      'Fourteen verified reports indicate grooming-pattern language and coercive engagement tactics in public-to-private migration paths.',
      'Escalation markers crossed high-risk thresholds, triggering priority triage and incident-review workflow.'
    ]
  },
  '3:cross-platform-alert': {
    title: 'Cross-platform Alert',
    sourceType: 'Cross-platform Risk Alert',
    updatedAt: '2026-02-12T13:00:00.000Z',
    highlights: [
      'Linked entities are moving conversations from mainstream public threads to lower-moderation channels with weaker reporting friction.',
      'Multi-platform posting signatures show coordinated seeding of recruitment-style prompts and contact redirection cues.',
      'Cross-platform alerting is active with continuous monitoring and harm-prevention escalation support.'
    ]
  },
  '4:self-harm-signal-brief': {
    title: 'Self-Harm Signal Brief',
    sourceType: 'Mental Health Risk Monitoring',
    updatedAt: '2026-02-12T14:00:00.000Z',
    highlights: [
      'Public discussions with self-harm references increased in youth-facing communities over the latest monitoring cycle.',
      'Signal concentration is highest in high-engagement discussion threads and repost clusters.',
      'Priority focus remains on early detection and safety-resource signposting.'
    ]
  },
  '4:prevention-resource-note': {
    title: 'Prevention Resource Note',
    sourceType: 'Safety Intervention Note',
    updatedAt: '2026-02-12T14:05:00.000Z',
    highlights: [
      'Escalation pathways now include guidance for immediate referral to crisis-support resources.',
      'Content moderation queues are prioritizing self-harm indication phrases for rapid response.',
      'Monitoring remains active with a prevention-first review protocol.'
    ]
  },
  '5:violent-speech-snapshot': {
    title: 'Violent Speech Snapshot',
    sourceType: 'Harmful Speech Monitoring',
    updatedAt: '2026-02-12T14:08:00.000Z',
    highlights: [
      'Violent rhetoric references are up in event-linked discussions and reaction threads.',
      'Repeated phrase patterns indicate coordinated language reuse in multiple channels.',
      'Escalation tracking remains focused on calls-to-harm and mobilization language.'
    ]
  },
  '5:escalation-language-note': {
    title: 'Escalation Language Note',
    sourceType: 'Language Risk Analysis',
    updatedAt: '2026-02-12T14:12:00.000Z',
    highlights: [
      'Analysts observed increased density of dehumanizing and threatening phrase variants.',
      'Cross-post timing indicates coordinated amplification windows around major updates.',
      'Risk level is rising with continued monitoring for actionable harm indicators.'
    ]
  },
  '6:tvec-activity-brief': {
    title: 'TVEC Activity Brief',
    sourceType: 'Extremism Risk Monitoring',
    updatedAt: '2026-02-12T14:16:00.000Z',
    highlights: [
      'Extremist narrative references persist in niche channels with intermittent public spillover.',
      'Propagation nodes show recurring accounts with prior high-risk thematic overlap.',
      'Current posture remains elevated with active watch for recruitment-style messaging.'
    ]
  },
  '6:extremist-narrative-watch': {
    title: 'Extremist Narrative Watch',
    sourceType: 'Narrative Threat Watch',
    updatedAt: '2026-02-12T14:19:00.000Z',
    highlights: [
      'Narrative clusters include coded ideological framing and symbolic references.',
      'Monitoring emphasizes detection of redirection paths into higher-risk spaces.',
      'Analyst queue keeps this category on elevated-stable review cadence.'
    ]
  },
  '7:illegal-goods-pattern-brief': {
    title: 'Illegal Goods Pattern Brief',
    sourceType: 'Illicit Trade Signal Monitoring',
    updatedAt: '2026-02-12T14:22:00.000Z',
    highlights: [
      'Coded product references and price-list style posts are trending upward in open listings.',
      'Network overlap indicates repeated seller-promotion behavior across related groups.',
      'Risk posture is medium-rising with focus on marketplace migration patterns.'
    ]
  },
  '7:supply-signal-note': {
    title: 'Supply Signal Note',
    sourceType: 'Market Signal Note',
    updatedAt: '2026-02-12T14:24:00.000Z',
    highlights: [
      'Supply-availability cues appear in recurring posts with short-cycle repost behavior.',
      'Cross-platform linking suggests channel-hopping for visibility and transaction handoff.',
      'Monitoring remains active for spikes in high-risk transaction indicators.'
    ]
  },
  '8:trafficking-signal-brief': {
    title: 'Trafficking Signal Brief',
    sourceType: 'Human Trafficking Risk Monitoring',
    updatedAt: '2026-02-12T15:08:00.000Z',
    highlights: [
      'Recruitment-style posts with suspicious migration and work offers increased in monitored channels.',
      'Network indicators show repeated account reuse across geographically distinct trafficking narratives.',
      'Risk posture remains high with active escalation watch for victim-targeting patterns.'
    ]
  },
  '8:recruitment-pattern-note': {
    title: 'Recruitment Pattern Note',
    sourceType: 'Recruitment Abuse Analysis',
    updatedAt: '2026-02-12T15:10:00.000Z',
    highlights: [
      'Suspicious solicitation language and off-platform contact redirects are appearing at higher frequency.',
      'Cross-region post similarities indicate coordinated messaging templates.',
      'Analyst queue prioritizes trafficking-linked recruitment cues for rapid review.'
    ]
  },
  '9:ncii-incident-brief': {
    title: 'NCII Incident Brief',
    sourceType: 'Image Abuse Risk Monitoring',
    updatedAt: '2026-02-12T15:12:00.000Z',
    highlights: [
      'NCII-linked extortion threats are rising in public complaint narratives and reported incident summaries.',
      'Image abuse references show repeat account behavior with multi-platform repost pathways.',
      'High-risk classification remains in place for rapid incident triage and safeguarding support.'
    ]
  },
  '9:image-abuse-response-note': {
    title: 'Image Abuse Response Note',
    sourceType: 'Safety Response Protocol',
    updatedAt: '2026-02-12T15:14:00.000Z',
    highlights: [
      'Monitoring includes immediate escalation pathways for non-consensual image distribution cues.',
      'Response guidance emphasizes takedown coordination and victim-support routing.',
      'Risk watch remains active due to continuing spread and extortion indicators.'
    ]
  },
  '10:organization-risk-brief': {
    title: 'Organization Risk Brief',
    sourceType: 'Criminal/Extremist Entity Monitoring',
    updatedAt: '2026-02-12T15:32:00.000Z',
    highlights: [
      'Known dangerous-entity references continue appearing in public channels with intermittent spikes.',
      'Content clusters show recurring cross-post patterns across affiliated account sets.',
      'Analyst watch remains elevated due to persistence of support-oriented narrative framing.'
    ]
  },
  '10:network-presence-note': {
    title: 'Network Presence Note',
    sourceType: 'Network Presence Analysis',
    updatedAt: '2026-02-12T15:34:00.000Z',
    highlights: [
      'Entity-related accounts demonstrate periodic reactivation after moderation actions.',
      'Network overlap indicates shared propagation nodes between multiple high-risk narratives.',
      'Monitoring prioritizes early detection of recruitment-style or glorification content.'
    ]
  },
  '11:harassment-pattern-brief': {
    title: 'Harassment Pattern Brief',
    sourceType: 'Harassment Behavior Monitoring',
    updatedAt: '2026-02-12T15:36:00.000Z',
    highlights: [
      'Targeted abuse language and repetitive intimidation markers continue to increase.',
      'Observed behavior includes coordinated dogpiling on individuals in high-visibility threads.',
      'Escalation workflow remains active for abuse intensity spikes.'
    ]
  },
  '11:dogpiling-incident-note': {
    title: 'Dogpiling Incident Note',
    sourceType: 'Coordinated Abuse Note',
    updatedAt: '2026-02-12T15:38:00.000Z',
    highlights: [
      'Group-targeted harassment bursts show synchronized posting windows and repeat actors.',
      'Abusive references spread across reply chains and repost ecosystems.',
      'Priority remains medium-high due to recurring attack-pattern signatures.'
    ]
  },
  '12:endangerment-claim-brief': {
    title: 'Endangerment Claim Brief',
    sourceType: 'Safety Harm Claim Analysis',
    updatedAt: '2026-02-12T15:40:00.000Z',
    highlights: [
      'False safety guidance and dangerous claims continue to circulate in public conversations.',
      'Claim variants show repeated semantic overlap indicating coordinated re-packaging.',
      'Risk posture remains high because of potential real-world harm outcomes.'
    ]
  },
  '12:safety-claim-verification-note': {
    title: 'Safety Claim Verification Note',
    sourceType: 'Verification Log',
    updatedAt: '2026-02-12T15:42:00.000Z',
    highlights: [
      'Verification checks identify recurring unsupported health and safety assertions.',
      'Fact-check sources indicate distortion of context, recommendations, and source attribution.',
      'Escalation remains active for high-reach misinformation packets.'
    ]
  },
  '13:spam-network-snapshot': {
    title: 'Spam Network Snapshot',
    sourceType: 'Scaled Abuse Monitoring',
    updatedAt: '2026-02-12T15:44:00.000Z',
    highlights: [
      'Mass low-quality posting and promotional duplication remain persistent in monitored streams.',
      'Network analysis identifies repetitive posting timing from linked account groups.',
      'Current trend is elevated-stable with frequent automated behavior signatures.'
    ]
  },
  '13:inauthentic-engagement-note': {
    title: 'Inauthentic Engagement Note',
    sourceType: 'Integrity Analysis Note',
    updatedAt: '2026-02-12T15:46:00.000Z',
    highlights: [
      'Fake engagement indicators include coordinated follows, likes, and interaction loops.',
      'Artificial amplification remains present in selected narratives and promotion clusters.',
      'Monitoring continues for manipulation tactics intended to inflate credibility signals.'
    ]
  },
  '14:fraud-campaign-brief': {
    title: 'Fraud Campaign Brief',
    sourceType: 'Fraud Risk Monitoring',
    updatedAt: '2026-02-12T15:48:00.000Z',
    highlights: [
      'Scam narratives and deceptive financial solicitations are rising in public channels.',
      'Fraud templates show recurring language patterns and account reuse markers.',
      'Risk remains high due to rapid spread and monetization intent.'
    ]
  },
  '14:impersonation-alert-note': {
    title: 'Impersonation Alert Note',
    sourceType: 'Identity Abuse Alert',
    updatedAt: '2026-02-12T15:50:00.000Z',
    highlights: [
      'Impersonation-linked accounts continue to mimic trusted identities and institutions.',
      'Credential-harvest and phishing-adjacent behaviors are present in associated content.',
      'Alert posture remains active for account takeover and identity deception pathways.'
    ]
  }
};

const liveSourceFeeds = [
  {
    label: 'Google News • Violence and Violent Crime',
    theme: 'violence',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=violent%20crime%20online%20incitement&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Child Abuse and Nudity Safety',
    theme: 'child-abuse-nudity',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=child%20abuse%20online%20child%20sexual%20abuse%20material%20platforms&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Sexual Exploitation Online',
    theme: 'sexual-exploitation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=online%20sexual%20exploitation%20platform%20abuse&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Human Exploitation Abuse',
    theme: 'human-exploitation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=human%20exploitation%20forced%20labor%20online%20abuse&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Misinformation (India)',
    theme: 'misinformation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20misinformation&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Fact Check (India)',
    theme: 'misinformation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20fact-check&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Online Hate (India)',
    theme: 'hate',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20online%20hate&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Online Exploitation (India)',
    theme: 'exploitation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20online%20exploitation%20grooming&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Suicide and Self-Harm (India)',
    theme: 'suicide-self-harm',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20suicide%20self-harm%20online&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Violent Speech (India)',
    theme: 'violent-speech',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20violent%20speech%20online&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • TVEC Terrorism (India)',
    theme: 'tvec',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20terrorism%20extremism%20online&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Illegal Goods (India)',
    theme: 'illegal-goods',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20illegal%20goods%20online%20trafficking&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Human Trafficking (South Asia)',
    theme: 'human-trafficking',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=South%20Asia%20human%20trafficking%20online&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • NCII / Revenge Porn (APAC)',
    theme: 'ncii',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=APAC%20NCII%20revenge%20porn%20online&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Dangerous Criminal Organizations',
    theme: 'dangerous-organizations',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=dangerous%20criminal%20organizations%20extremist%20groups%20online&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Harassment and Bullying',
    theme: 'harassment-bullying',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=online%20harassment%20bullying%20platform%20abuse&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Dangerous Misinformation Endangerment',
    theme: 'dangerous-misinformation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=dangerous%20misinformation%20false%20medical%20claims%20online&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Spam and Inauthentic Behavior',
    theme: 'spam-inauthentic',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=platform%20spam%20inauthentic%20behavior%20fake%20accounts&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Malware and Abuseware Campaigns',
    theme: 'malware',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=malware%20campaign%20mobile%20abuseware%20platform&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Cybersecurity Incidents',
    theme: 'cybersecurity',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=cybersecurity%20incident%20phishing%20data%20breach%20platforms&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Fraud and Impersonation',
    theme: 'fraud-impersonation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=online%20fraud%20impersonation%20phishing%20platforms&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'PIB Fact Check',
    theme: 'misinformation',
    type: 'News',
    url: 'https://factcheck.pib.gov.in/feed'
  },
  {
    label: 'BOOM Live • Fact Check',
    theme: 'misinformation',
    type: 'News',
    url: 'https://www.boomlive.in/rss'
  },
  {
    label: 'Google News • AI Safety Research Releases',
    theme: 'dangerous-misinformation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=AI%20safety%20research%20paper%20red%20team%20adversarial%20evaluation&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • AI Agent Launches',
    theme: 'spam-inauthentic',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=AI%20agent%20launch%20content%20moderation%20safety%20assistant&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Trust & Safety Startup Funding',
    theme: 'fraud-impersonation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=trust%20and%20safety%20startup%20funding%20round%20AI%20safety&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Platform Transparency Reports',
    theme: 'dangerous-misinformation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=platform%20transparency%20report%20enforcement%20AI%20content%20moderation&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'arXiv cs.AI Recent Papers',
    theme: 'dangerous-misinformation',
    type: 'News',
    url: 'http://export.arxiv.org/rss/cs.AI'
  },
  {
    label: 'Hugging Face Blog',
    theme: 'cybersecurity',
    type: 'News',
    url: 'https://huggingface.co/blog/feed.xml'
  }
];

const aiSafetyPulseTopics = [
  {
    title: '📰 New Tool Launch',
    category: 'New AI Moderation Tools',
    keywords: ['moderation tool', 'safety classifier', 'toxicity classifier', 'guardrail', 'content moderation model', 'deepfake detection']
  },
  {
    title: '💰 Startup Funding',
    category: 'Trust & Safety Startups',
    keywords: ['startup funding', 'funding round', 'series a', 'series b', 'seed funding', 'venture funding', 'trust and safety startup']
  },
  {
    title: '📄 Research Paper Release',
    category: 'Adversarial & Red-Team Research',
    keywords: ['research paper', 'preprint', 'arxiv', 'red team', 'red-teaming', 'adversarial evaluation', 'safety benchmark']
  },
  {
    title: '🤖 New Agent Deployment',
    category: 'New AI Agents',
    keywords: ['ai agent', 'safety agent', 'fact-checking bot', 'monitoring bot', 'risk scoring model', 'agent launch']
  },
  {
    title: '📊 Transparency Report',
    category: 'Platform Transparency Reports',
    keywords: ['transparency report', 'enforcement report', 'community standards report', 'bot detection stats', 'monthly enforcement']
  }
];

const aiSafetyFeedLabelMatchers = [
  'AI Safety Research Releases',
  'AI Agent Launches',
  'Trust & Safety Startup Funding',
  'Platform Transparency Reports',
  'arXiv',
  'Hugging Face',
  'PIB Fact Check',
  'BOOM Live'
];

const fallbackLiveSources = [
  {
    title: 'Live source feed is temporarily unavailable',
    link: 'https://news.google.com/',
    publishedAt: new Date().toISOString(),
    source: 'System Fallback',
    type: 'Notice'
  }
];

const themeFallbackSources = {
  violence: [
    {
      title: 'Google News: Violence and Violent Crime Coverage',
      link: 'https://news.google.com/search?q=violent%20crime%20online%20incitement',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'child-abuse-nudity': [
    {
      title: 'Google News: Child Abuse and Nudity Safety Coverage',
      link: 'https://news.google.com/search?q=child%20abuse%20online%20child%20sexual%20abuse%20material%20platforms',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'sexual-exploitation': [
    {
      title: 'Google News: Sexual Exploitation Coverage',
      link: 'https://news.google.com/search?q=online%20sexual%20exploitation%20platform%20abuse',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'human-exploitation': [
    {
      title: 'Google News: Human Exploitation Coverage',
      link: 'https://news.google.com/search?q=human%20exploitation%20forced%20labor%20online%20abuse',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'human-trafficking': [
    {
      title: 'Google News: South Asia Human Trafficking Coverage',
      link: 'https://news.google.com/search?q=South%20Asia%20human%20trafficking%20online',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  ncii: [
    {
      title: 'Google News: APAC NCII and Revenge Porn Coverage',
      link: 'https://news.google.com/search?q=APAC%20NCII%20revenge%20porn%20online',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'suicide-self-harm': [
    {
      title: 'Google News: India Suicide and Self-Harm Coverage',
      link: 'https://news.google.com/search?q=India%20suicide%20self-harm%20online',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'violent-speech': [
    {
      title: 'Google News: India Violent Speech Coverage',
      link: 'https://news.google.com/search?q=India%20violent%20speech%20online',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  tvec: [
    {
      title: 'Google News: India Terrorism and Extremism Coverage',
      link: 'https://news.google.com/search?q=India%20terrorism%20extremism%20online',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'illegal-goods': [
    {
      title: 'Google News: India Illegal Goods Coverage',
      link: 'https://news.google.com/search?q=India%20illegal%20goods%20online%20trafficking',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'dangerous-organizations': [
    {
      title: 'Google News: Dangerous and Criminal Organizations Coverage',
      link: 'https://news.google.com/search?q=dangerous%20criminal%20organizations%20extremist%20groups%20online',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'harassment-bullying': [
    {
      title: 'Google News: Harassment and Bullying Coverage',
      link: 'https://news.google.com/search?q=online%20harassment%20bullying%20platform%20abuse',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'dangerous-misinformation': [
    {
      title: 'Google News: Dangerous Misinformation Coverage',
      link: 'https://news.google.com/search?q=dangerous%20misinformation%20false%20medical%20claims%20online',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'spam-inauthentic': [
    {
      title: 'Google News: Spam and Inauthentic Behavior Coverage',
      link: 'https://news.google.com/search?q=platform%20spam%20inauthentic%20behavior%20fake%20accounts',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  malware: [
    {
      title: 'Google News: Malware and Abuseware Coverage',
      link: 'https://news.google.com/search?q=malware%20campaign%20mobile%20abuseware%20platform',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  cybersecurity: [
    {
      title: 'Google News: Cybersecurity Incident Coverage',
      link: 'https://news.google.com/search?q=cybersecurity%20incident%20phishing%20data%20breach%20platforms',
      source: 'Fallback News Index',
      type: 'News'
    }
  ],
  'fraud-impersonation': [
    {
      title: 'Google News: Fraud and Impersonation Coverage',
      link: 'https://news.google.com/search?q=online%20fraud%20impersonation%20phishing%20platforms',
      source: 'Fallback News Index',
      type: 'News'
    }
  ]
};

const liveRiskKeywords = [
  'misinformation',
  'disinformation',
  'deepfake',
  'fake news',
  'fact-check',
  'hate speech',
  'communal',
  'harassment',
  'exploitation',
  'grooming',
  'coercion',
  'trafficking',
  'cybercrime',
  'online safety',
  'child safety',
  'suicide',
  'self-harm',
  'violent speech',
  'violence',
  'violent crime',
  'terrorism',
  'extremism',
  'child abuse',
  'child nudity',
  'csam',
  'sexual exploitation',
  'human exploitation',
  'illegal goods',
  'illicit trade',
  'dark web',
  'human trafficking',
  'ncii',
  'revenge porn',
  'non-consensual intimate image',
  'sextortion',
  'criminal organization',
  'extremist group',
  'dangerous misinformation',
  'inauthentic behavior',
  'malware',
  'ransomware',
  'data breach',
  'cybersecurity',
  'fake accounts',
  'impersonation',
  'phishing',
  'ai safety',
  'model safety',
  'red team',
  'red-teaming',
  'adversarial evaluation',
  'ai agent',
  'safety agent',
  'fact-checking bot',
  'risk scoring model',
  'research paper',
  'preprint',
  'arxiv',
  'startup funding',
  'funding round',
  'transparency report',
  'enforcement report',
  'content moderation model',
  'toxicity classifier',
  'guardrail'
];

const blockedNoiseKeywords = [
  'assignment help',
  'course help',
  'homework help',
  'tutoring',
  'promo',
  'discount',
  'buy now',
  'sale'
];

const gdeltThemeQueries = {
  all: 'online safety OR abuse OR violence OR exploitation OR harassment OR fraud OR cybersecurity OR malware',
  misinformation: 'india misinformation OR disinformation OR deepfake OR fact-check',
  hate: 'india online hate OR communal hate speech OR targeted harassment',
  exploitation: 'india online exploitation OR grooming OR trafficking OR child safety',
  violence: 'online violence OR violent threats OR incitement OR violent crime on social platforms',
  'child-abuse-nudity': 'child abuse OR child sexual abuse material OR online child nudity safety',
  'sexual-exploitation': 'online sexual exploitation OR sexual coercion OR sextortion abuse',
  'human-exploitation': 'human exploitation OR forced labor recruitment OR coercive abuse online',
  'suicide-self-harm': 'india suicide OR self-harm OR mental health online risk',
  'violent-speech': 'india violent speech OR threats online OR incitement',
  tvec: 'india terrorism OR violent extremism OR extremist propaganda',
  'illegal-goods': 'india illegal goods OR illicit trade OR online trafficking',
  'human-trafficking': 'south asia human trafficking OR online recruitment exploitation',
  ncii: 'india OR apac NCII OR revenge porn OR image-based abuse OR sextortion',
  'dangerous-organizations': 'dangerous criminal organizations OR extremist groups online content',
  'harassment-bullying': 'online harassment OR bullying OR coordinated abuse on platforms',
  'dangerous-misinformation': 'dangerous misinformation OR false medical claims OR harmful safety misinformation',
  'spam-inauthentic': 'spam OR inauthentic behavior OR fake engagement OR fake accounts',
  malware: 'malware OR ransomware OR trojan campaign OR abuseware',
  cybersecurity: 'cybersecurity incident OR phishing OR data breach OR account takeover',
  'fraud-impersonation': 'online fraud OR impersonation OR phishing OR account takeover'
};

const themeKeywords = {
  violence: ['violence', 'violent crime', 'violent attack', 'incitement', 'threat'],
  'child-abuse-nudity': ['child abuse', 'child nudity', 'csam', 'child sexual abuse material'],
  'sexual-exploitation': ['sexual exploitation', 'sexual coercion', 'sextortion', 'abuse'],
  'human-exploitation': ['human exploitation', 'forced labor', 'coercion', 'abusive recruitment'],
  misinformation: ['misinformation', 'disinformation', 'fake news', 'deepfake', 'fact-check'],
  hate: ['hate speech', 'communal', 'targeted harassment', 'hostility'],
  exploitation: ['exploitation', 'grooming', 'coercion', 'trafficking', 'child safety'],
  'suicide-self-harm': ['suicide', 'self-harm', 'mental health crisis', 'suicidal'],
  'violent-speech': ['violent speech', 'threat', 'incitement', 'calls for violence'],
  tvec: ['terrorism', 'extremism', 'radicalization', 'extremist propaganda'],
  'illegal-goods': ['illegal goods', 'illicit trade', 'contraband', 'dark web', 'arms trafficking'],
  'human-trafficking': ['human trafficking', 'trafficking ring', 'forced labor', 'sex trafficking', 'trafficked'],
  ncii: ['ncii', 'revenge porn', 'non-consensual intimate image', 'image-based abuse', 'sextortion'],
  'dangerous-organizations': ['criminal organization', 'extremist group', 'dangerous organization', 'banned group'],
  'harassment-bullying': ['harassment', 'bullying', 'dogpiling', 'targeted abuse', 'intimidation'],
  'dangerous-misinformation': ['dangerous misinformation', 'false medical claims', 'false safety information', 'harmful misinformation'],
  'spam-inauthentic': ['spam', 'inauthentic behavior', 'fake accounts', 'fake engagement', 'bot network'],
  malware: ['malware', 'ransomware', 'trojan', 'spyware', 'abuseware'],
  cybersecurity: ['cybersecurity', 'phishing', 'data breach', 'account takeover', 'security incident'],
  'fraud-impersonation': ['fraud', 'impersonation', 'phishing', 'scam', 'account takeover']
};

function isRelevantLiveItem(item, requestedTheme) {
  const searchText = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
  const containsNoise = blockedNoiseKeywords.some((term) => searchText.includes(term));
  const containsRisk = liveRiskKeywords.some((term) => searchText.includes(term));
  const themeTerms = requestedTheme ? themeKeywords[requestedTheme] || [] : [];
  const containsTheme = !requestedTheme || themeTerms.some((term) => searchText.includes(term));

  return !containsNoise && containsRisk && containsTheme;
}

async function fetchGdeltArticles(theme, limit) {
  const gdeltQuery = gdeltThemeQueries[theme] || gdeltThemeQueries.misinformation;
  const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(gdeltQuery)}&mode=artlist&format=json&maxrecords=${limit}`;

  try {
    const response = await fetch(gdeltUrl, {
      headers: {
        'User-Agent': 'Argus/1.0 (+https://localhost)'
      }
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const articles = Array.isArray(payload.articles) ? payload.articles : [];

    return articles.map((article) => ({
      title: article.title || 'Untitled source',
      link: article.url,
      snippet: article.seendate || '',
      publishedAt: article.seendate ? new Date(article.seendate).toISOString() : new Date().toISOString(),
      source: article.domain ? `GDELT • ${article.domain}` : 'GDELT Public News API',
      theme,
      type: 'News'
    }));
  } catch (error) {
    return [];
  }
}

async function fetchGdeltAIPulseArticles(limit) {
  const query = 'AI safety OR model safety OR red team OR adversarial evaluation OR transparency report OR trust and safety startup OR AI agent launch';
  const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=${limit}`;

  try {
    const response = await fetch(gdeltUrl, {
      headers: {
        'User-Agent': 'Argus/1.0 (+https://localhost)'
      }
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const articles = Array.isArray(payload.articles) ? payload.articles : [];

    return articles.map((article) => ({
      title: article.title || 'Untitled source',
      link: article.url,
      snippet: article.seendate || '',
      publishedAt: article.seendate ? new Date(article.seendate).toISOString() : new Date().toISOString(),
      source: article.domain ? `GDELT • ${article.domain}` : 'GDELT Public News API',
      theme: 'dangerous-misinformation',
      type: 'News'
    }));
  } catch (error) {
    return [];
  }
}

function scoreAIPulseMatch(item, topic) {
  const text = `${item.title || ''} ${item.snippet || ''} ${item.source || ''}`.toLowerCase();
  let score = 0;

  topic.keywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += keyword.includes(' ') ? 2 : 1;
    }
  });

  const aiSignals = ['ai', 'safety', 'model', 'agent', 'research', 'transparency', 'moderation'];
  if (!aiSignals.some((term) => text.includes(term))) {
    return 0;
  }

  return score;
}

function buildAIPulseCards(items, generatedAt) {
  return aiSafetyPulseTopics.map((topic) => {
    const candidates = [];
    const seen = new Set();

    items.forEach((item) => {
      if (!item.link || seen.has(item.link)) {
        return;
      }

      const score = scoreAIPulseMatch(item, topic);
      if (score <= 0) {
        return;
      }

      seen.add(item.link);
      candidates.push({ item, score });
    });

    candidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(b.item.publishedAt) - new Date(a.item.publishedAt);
    });

    const leadCandidate = candidates[0] || null;
    const lead = leadCandidate && leadCandidate.score >= 2 ? leadCandidate.item : null;

    const summarySource = (
      lead?.snippet ||
      lead?.title ||
      `No verified match found in current scan for ${topic.category.toLowerCase()}.`
    ).trim();

    return {
      title: topic.title,
      category: topic.category,
      dateLabel: lead?.publishedAt ? new Date(lead.publishedAt).toLocaleDateString() : new Date(generatedAt).toLocaleDateString(),
      summary: summarySource.length > 180 ? `${summarySource.slice(0, 177)}...` : summarySource,
      sourceTitle: lead?.title || 'No direct source available',
      sourceLink: lead?.link || null
    };
  });
}

app.get('/api/ai-safety-pulse', async (req, res) => {
  const generatedAt = new Date().toISOString();

  try {
    const aiFeeds = liveSourceFeeds.filter((feed) =>
      aiSafetyFeedLabelMatchers.some((marker) => feed.label.includes(marker))
    );

    const [feedResults, gdeltItems] = await Promise.all([
      Promise.allSettled(aiFeeds.map((feed) => withTimeout(parser.parseURL(feed.url), 8000))),
      fetchGdeltAIPulseArticles(40)
    ]);

    const feedItems = feedResults.flatMap((result, index) => {
      if (result.status !== 'fulfilled') {
        return [];
      }

      const feed = aiFeeds[index];
      return result.value.items.map((item) => ({
        title: item.title || 'Untitled source',
        link: item.link,
        snippet: item.contentSnippet || item.content || '',
        publishedAt: item.isoDate || item.pubDate || generatedAt,
        source: feed.label,
        theme: feed.theme,
        type: feed.type
      }));
    });

    const normalized = [...feedItems, ...gdeltItems]
      .filter((item) => item.link && item.title)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const cards = buildAIPulseCards(normalized, generatedAt);

    return res.json({
      generatedAt,
      stats: {
        totalSources: aiFeeds.length + 1,
        totalItems: normalized.length,
        cardsWithLinks: cards.filter((card) => Boolean(card.sourceLink)).length
      },
      data: cards
    });
  } catch (error) {
    return res.json({
      generatedAt,
      stats: {
        totalSources: 0,
        totalItems: 0,
        cardsWithLinks: 0
      },
      data: buildAIPulseCards([], generatedAt)
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'argus-api', timestamp: new Date().toISOString() });
});

app.get('/api/signals', (req, res) => {
  const requestedRisk = (req.query.risk || '').toString().trim().toLowerCase();
  const requestedTrend = (req.query.trend || '').toString().trim().toLowerCase();

  let filteredSignals = [...signals];

  if (requestedRisk) {
    filteredSignals = filteredSignals.filter(
      (item) => item.riskLevel.toLowerCase() === requestedRisk
    );
  }

  if (requestedTrend) {
    if (requestedTrend === 'stable') {
      filteredSignals = filteredSignals.filter((item) =>
        item.trend.toLowerCase().includes('stable')
      );
    } else {
      filteredSignals = filteredSignals.filter(
        (item) => item.trend.toLowerCase() === requestedTrend
      );
    }
  }

  res.json({
    generatedAt: new Date().toISOString(),
    total: filteredSignals.length,
    filters: {
      risk: requestedRisk || null,
      trend: requestedTrend || null
    },
    data: filteredSignals
  });
});

app.get('/api/trend/:signalId/:slug', (req, res) => {
  const key = `${req.params.signalId}:${req.params.slug}`;
  const detail = trendDetails[key];

  if (!detail) {
    return res.status(404).json({ message: 'Trend detail not found.' });
  }

  return res.json({
    signalId: Number(req.params.signalId),
    slug: req.params.slug,
    ...detail
  });
});

// Load historical snapshot data for past dates
function loadHistoricalSnapshot(date, theme = 'all') {
  try {
    // Try to load a specific date file first (if it exists)
    const themePrefix = theme && theme !== 'all' ? `-theme-${theme}` : '';
    const snapshotPath = path.join(__dirname, 'public', 'data', `live-sources${themePrefix}-${date}.json`);
    
    if (fs.existsSync(snapshotPath)) {
      const data = fs.readFileSync(snapshotPath, 'utf8');
      console.log(`✓ Loaded dated snapshot: live-sources${themePrefix}-${date}.json`);
      return JSON.parse(data);
    }

    // Fallback to universal snapshot file if specific date doesn't exist
    const universalPath = path.join(__dirname, 'public', 'data', `live-sources${themePrefix}.json`);
    if (fs.existsSync(universalPath)) {
      const data = fs.readFileSync(universalPath, 'utf8');
      console.log(`✓ Loaded universal snapshot: live-sources${themePrefix}.json (will filter by date)`);
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn(`Could not load historical snapshot for ${date}:`, error.message);
  }
  return null;
}

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/live-sources', async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(requestedLimit) ? 24 : Math.min(Math.max(requestedLimit, 1), 120);
  const requestedTheme = (req.query.theme || '').toString().trim().toLowerCase();
  const requestedType = (req.query.type || '').toString().trim().toLowerCase();
  const fromDate = (req.query.from || '').toString().trim(); // YYYY-MM-DD format
  const toDate = (req.query.to || '').toString().trim(); // YYYY-MM-DD format

  try {
    const selectedTheme = requestedTheme || 'all';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Log request details
    console.log(`\n📰 /api/live-sources request:`);
    console.log(`   from: ${fromDate || 'not specified'}`);
    console.log(`   to: ${toDate || 'not specified'}`);
    console.log(`   theme: ${requestedTheme || 'all'}`);
    console.log(`   type: ${requestedType || 'all'}`);
    console.log(`   today: ${today}`);

    // Determine if we should use historical snapshots or live feeds
    // Extract just the date part if fromDate is ISO format
    const fromDateOnly = fromDate ? fromDate.split('T')[0] : null;
    const isHistoricalRequest = fromDateOnly && fromDateOnly < today;
    
    let feedResults, gdeltItems;

    if (isHistoricalRequest) {
      // For historical dates, try to load from snapshot files
      feedResults = [{ status: 'rejected' }]; // Don't fetch live feeds for old dates
      gdeltItems = [];
      console.log(`   → Using historical snapshot (date: ${fromDate})`);
    } else {
      // For today or future (shouldn't happen), fetch live data
      console.log(`   → Fetching live feeds (today's data)`);
      const results = await Promise.all([
        Promise.allSettled(liveSourceFeeds.map((feed) => withTimeout(parser.parseURL(feed.url), 8000))),
        fetchGdeltArticles(selectedTheme, Math.min(Math.max(limit, 8), 40))
      ]);
      feedResults = results[0];
      gdeltItems = results[1];
    }

    const sourceStatus = feedResults.map((result, index) => {
      const feed = liveSourceFeeds[index];
      if (result.status === 'fulfilled') {
        return {
          label: feed.label,
          theme: feed.theme,
          type: feed.type,
          status: 'online',
          itemCount: Array.isArray(result.value.items) ? result.value.items.length : 0
        };
      }

      return {
        label: feed.label,
        theme: feed.theme,
        type: feed.type,
        status: 'offline',
        itemCount: 0
      };
    });

    const items = feedResults.flatMap((result, index) => {
      if (result.status !== 'fulfilled') {
        return [];
      }

      const feed = liveSourceFeeds[index];

      return result.value.items.map((item) => ({
        title: item.title || 'Untitled source',
        link: item.link,
        snippet: item.contentSnippet || item.content || '',
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        source: feed.label,
        theme: feed.theme,
        type: feed.type
      }));
    });

    // For historical dates, load from snapshot file instead of live feeds
    let snapshotData = [];
    if (isHistoricalRequest) {
      const snapshot = loadHistoricalSnapshot(fromDateOnly, selectedTheme);
      if (snapshot && snapshot.data) {
        snapshotData = Array.isArray(snapshot.data) ? snapshot.data : [];
        console.log(`   → Loaded ${snapshotData.length} articles from snapshot`);
      } else {
        console.log(`   → Snapshot not found or empty`);
      }
    }

    const gdeltStatus = {
      label: 'GDELT Public News API',
      theme: selectedTheme,
      type: 'News',
      status: gdeltItems.length ? 'online' : 'offline',
      itemCount: gdeltItems.length
    };

    sourceStatus.push(gdeltStatus);

    // Use snapshot data for historical requests
    // For today, try live data first, but fallback to snapshot if empty
    let baseItems;
    if (isHistoricalRequest) {
      baseItems = snapshotData;
    } else {
      // Try live feeds first
      baseItems = [...items, ...gdeltItems];
      // If live feeds are empty for today, try to load snapshot as fallback
      if (baseItems.length === 0) {
        console.log(`   ⚠ Live feeds returned no data, trying snapshot fallback for ${today}`);
        const todaySnapshot = loadHistoricalSnapshot(today, selectedTheme);
        if (todaySnapshot && todaySnapshot.data) {
          baseItems = Array.isArray(todaySnapshot.data) ? todaySnapshot.data : [];
          console.log(`   ✓ Using snapshot fallback with ${baseItems.length} articles`);
        }
      }
    }
    
    let normalizedItems = baseItems
      .filter((item) => item.link && item.title);

    // Filter by date range if specified
    if (fromDate) {
      // Handle both YYYY-MM-DD and full ISO timestamp formats
      let fromDateTime, toDateTime;
      
      if (fromDate.includes('T')) {
        // Already in ISO format (e.g., 2026-02-13T00:00:00.000Z)
        fromDateTime = new Date(fromDate).getTime();
      } else {
        // Date-only format (e.g., 2026-02-13)
        fromDateTime = new Date(`${fromDate}T00:00:00Z`).getTime();
      }
      
      if (toDate && toDate.includes('T')) {
        // Already in ISO format
        toDateTime = new Date(toDate).getTime();
      } else if (toDate) {
        // Date-only format
        toDateTime = new Date(`${toDate}T23:59:59.999Z`).getTime();
      } else {
        // Default to end of today
        toDateTime = new Date(`${today}T23:59:59.999Z`).getTime();
      }
      
      const beforeFilter = normalizedItems.length;
      normalizedItems = normalizedItems.filter((item) => {
        const publishedTime = new Date(item.publishedAt).getTime();
        return publishedTime >= fromDateTime && publishedTime <= toDateTime;
      });
      const afterFilter = normalizedItems.length;
      console.log(`Date filter: ${fromDate} to ${toDate} - items: ${beforeFilter} → ${afterFilter}`);
    }

    if (requestedTheme) {
      normalizedItems = normalizedItems.filter((item) => item.theme === requestedTheme);
    }

    if (requestedType) {
      normalizedItems = normalizedItems.filter((item) => item.type.toLowerCase() === requestedType);
    }

    const relevantItems = normalizedItems.filter((item) => isRelevantLiveItem(item, requestedTheme));
    const itemsToUse = relevantItems.length
      ? relevantItems
      : normalizedItems.filter((item) => item.type === 'News');

    const filteredItems = itemsToUse
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, limit);

    const data = filteredItems.length
      ? filteredItems
      : (requestedTheme && themeFallbackSources[requestedTheme]
          ? themeFallbackSources[requestedTheme].map((item) => ({
              ...item,
              theme: requestedTheme,
              publishedAt: new Date().toISOString(),
              snippet: ''
            }))
          : fallbackLiveSources);

    const stats = data.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.type === 'News') {
          acc.news += 1;
        }
        if (item.type === 'Public Conversation') {
          acc.publicConversations += 1;
        }
        return acc;
      },
      { total: 0, news: 0, publicConversations: 0 }
    );

    console.log(`✓ Response: ${data.length} articles returned\n`);

    return res.json({
      generatedAt: new Date().toISOString(),
      filters: {
        theme: requestedTheme || null,
        type: requestedType || null
      },
      stats,
      sourceStatus,
      data
    });
  } catch (error) {
    return res.json({
      generatedAt: new Date().toISOString(),
      filters: {
        theme: requestedTheme || null,
        type: requestedType || null
      },
      stats: { total: fallbackLiveSources.length, news: 0, publicConversations: 0 },
      sourceStatus: liveSourceFeeds.map((feed) => ({
        label: feed.label,
        theme: feed.theme,
        type: feed.type,
        status: 'offline',
        itemCount: 0
      })),
      data: fallbackLiveSources
    });
  }
});

app.get('/trend/:signalId/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'trend.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Argus app is running on http://localhost:${port}`);
});
