const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Parser = require('rss-parser');
const { buildThemeSignals } = require('./lib/theme-signals');

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

function isUsableArticleLink(link) {
  if (!link) return false;

  try {
    const url = new URL(link);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    return !['example.com', 'www.example.com', 'news.example.com'].includes(url.hostname);
  } catch (error) {
    return false;
  }
}

function dedupeArticles(items = []) {
  const map = new Map();

  items.forEach((item) => {
    const normalized = {
      ...item,
      link: item.link || item.url || '',
      title: (item.title || 'Untitled source').replace(/\s+/g, ' ').trim(),
      snippet: (item.snippet || item.contentSnippet || item.content || '').replace(/\s+/g, ' ').trim(),
      publishedAt: item.publishedAt || item.isoDate || item.pubDate || new Date().toISOString(),
      source: item.source || item.sourceTitle || 'Public Feed',
      type: item.type || 'News'
    };

    if (!isUsableArticleLink(normalized.link)) return;

    const current = map.get(normalized.link);
    if (!current || new Date(normalized.publishedAt) > new Date(current.publishedAt)) {
      map.set(normalized.link, normalized);
    }
  });

  return [...map.values()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    theme: 'dangerous-misinformation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20misinformation&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Fact Check (India)',
    theme: 'dangerous-misinformation',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20fact-check&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Online Hate (India)',
    theme: 'violent-speech',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=India%20online%20hate&hl=en-IN&gl=IN&ceid=IN:en'
  },
  {
    label: 'Google News • Online Exploitation (India)',
    theme: 'sexual-exploitation',
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
    theme: 'dangerous-misinformation',
    type: 'News',
    url: 'https://factcheck.pib.gov.in/feed'
  },
  {
    label: 'BOOM Live • Fact Check',
    theme: 'dangerous-misinformation',
    type: 'News',
    url: 'https://www.boomlive.in/rss'
  }
];

// AI ecosystem feeds feed ONLY the AI Safety Pulse panel. They are not risk
// signals and must never appear in the harm-theme stream.
const aiPulseFeeds = [
  {
    label: 'Google News • AI Safety Research Releases',
    theme: 'ai-pulse',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=AI%20safety%20research%20paper%20red%20team%20adversarial%20evaluation&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • AI Agent Launches',
    theme: 'ai-pulse',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=AI%20agent%20launch%20content%20moderation%20safety%20assistant&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Trust & Safety Startup Funding',
    theme: 'ai-pulse',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=trust%20and%20safety%20startup%20funding%20round%20AI%20safety&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'Google News • Platform Transparency Reports',
    theme: 'ai-pulse',
    type: 'News',
    url: 'https://news.google.com/rss/search?q=platform%20transparency%20report%20enforcement%20AI%20content%20moderation&hl=en-US&gl=US&ceid=US:en'
  },
  {
    label: 'arXiv cs.AI Recent Papers',
    theme: 'ai-pulse',
    type: 'News',
    url: 'http://export.arxiv.org/rss/cs.AI'
  },
  {
    label: 'Hugging Face Blog',
    theme: 'ai-pulse',
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

const trustedSourcePatterns = [
  /reuters/i,
  /ap news/i,
  /bbc/i,
  /the hindu/i,
  /times of india/i,
  /the guardian/i,
  /al jazeera/i,
  /npr/i,
  /gdealt|gdelt/i,
  /fact check|factcheck/i,
  /pib/i,
  /boom live/i,
  /google news/i
];

const sourceTrustWeights = {
  reuters: 5,
  'ap news': 5,
  bbc: 5,
  'the hindu': 5,
  'times of india': 5,
  'the guardian': 4,
  'al jazeera': 4,
  npr: 4,
  gdelt: 3,
  'fact check': 4,
  factcheck: 4,
  pib: 4,
  'boom live': 4,
  'google news': 2
};

const themeRiskWeights = {
  violence: 8,
  'child-abuse-nudity': 10,
  'sexual-exploitation': 10,
  'human-exploitation': 10,
  'suicide-self-harm': 9,
  'violent-speech': 8,
  tvec: 9,
  'illegal-goods': 7,
  'human-trafficking': 10,
  ncii: 10,
  'dangerous-organizations': 9,
  'harassment-bullying': 7,
  'dangerous-misinformation': 9,
  'spam-inauthentic': 6,
  malware: 7,
  cybersecurity: 7,
  'fraud-impersonation': 8,
  misinformation: 8,
  hate: 7,
  exploitation: 8
};

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

// Terms are matched at a word start (see matchesTerm), so 'hack' matches
// 'hacker' and 'hacked' but not 'shack'. Every dashboard theme needs explicit
// on-topic vocabulary: an article with zero hits for a theme is not shown there.
const DASHBOARD_THEMES = [
  'violence',
  'child-abuse-nudity',
  'sexual-exploitation',
  'human-exploitation',
  'suicide-self-harm',
  'violent-speech',
  'tvec',
  'illegal-goods',
  'human-trafficking',
  'ncii',
  'dangerous-organizations',
  'harassment-bullying',
  'dangerous-misinformation',
  'spam-inauthentic',
  'malware',
  'cybersecurity',
  'fraud-impersonation'
];

const themeKeywords = {
  violence: ['violence', 'violent crime', 'violent attack', 'riot', 'lynching', 'mob attack', 'incitement to violence', 'inciting violence', 'inciting'],
  'child-abuse-nudity': ['child abuse', 'child nudity', 'csam', 'child sexual abuse', 'child pornography', 'pocso', 'abuse material'],
  'sexual-exploitation': ['sexual exploitation', 'sexual coercion', 'sextortion', 'sexual abuse', 'grooming', 'groomer', 'online predator', 'child exploitation'],
  'human-exploitation': ['human exploitation', 'forced labor', 'forced labour', 'bonded labor', 'bonded labour', 'debt bondage', 'modern slavery', 'child labor', 'child labour', 'abusive recruitment', 'labour exploitation', 'labor exploitation', 'migrant workers', 'slavery', 'slaves'],
  'suicide-self-harm': ['suicide', 'self-harm', 'self harm', 'suicidal', 'mental health crisis'],
  'violent-speech': ['violent speech', 'hate speech', 'hateful', 'hate crime', 'communal', 'calls for violence', 'death threat', 'threatening', 'incitement', 'anti-muslim', 'islamophob', 'antisemit', 'casteist'],
  tvec: ['terrorism', 'terrorist', 'terror', 'extremism', 'extremist', 'radicalization', 'radicalisation', 'jihadist', 'militant propaganda', 'counterterror', 'counter-terror'],
  'illegal-goods': ['illegal goods', 'illicit trade', 'contraband', 'dark web', 'darknet', 'arms trafficking', 'drug trafficking', 'wildlife trafficking', 'narcotics', 'counterfeit', 'smuggling', 'wildlife trade', 'endangered wildlife', 'poaching'],
  'human-trafficking': ['human trafficking', 'trafficking ring', 'sex trafficking', 'trafficked', 'trafficking victims', 'trafficking in persons', 'scam compound'],
  ncii: ['ncii', 'revenge porn', 'non-consensual intimate', 'intimate images', 'image-based abuse', 'deepfake porn', 'nudify', 'morphed images', 'morphed photos', 'obscene video'],
  'dangerous-organizations': ['criminal organization', 'criminal organisation', 'organized crime', 'organised crime', 'extremist group', 'dangerous organization', 'banned group', 'banned outfit', 'cartel', 'gang'],
  'harassment-bullying': ['harassment', 'harassed', 'bullying', 'cyberbullying', 'cyberbully', 'trolling', 'doxxing', 'doxing', 'stalking', 'dogpiling', 'targeted abuse', 'intimidation', 'online abuse', 'abusive content'],
  'dangerous-misinformation': ['misinformation', 'disinformation', 'fake news', 'deepfake', 'fact-check', 'fact check', 'factcheck', 'false claim', 'hoax', 'debunk', 'misleading claim', 'false medical claims', 'false information', 'anti-vaccine', 'viral video'],
  'spam-inauthentic': ['spam', 'inauthentic', 'fake accounts', 'fake engagement', 'fake reviews', 'bot network', 'troll farm', 'coordinated campaign'],
  malware: ['malware', 'ransomware', 'trojan', 'spyware', 'stalkerware', 'abuseware', 'botnet', 'infostealer', 'backdoor', 'malicious app'],
  cybersecurity: ['cybersecurity', 'cyber security', 'cyberattack', 'cyber attack', 'data breach', 'data leak', 'hacker', 'hacked', 'hacking', 'vulnerability', 'zero-day', 'ddos', 'account takeover', 'security incident', 'cert-in'],
  'fraud-impersonation': ['fraud', 'impersonat', 'phishing', 'scam', 'scammer', 'digital arrest', 'fake profile', 'cheated', 'duped'],
  // Legacy themes kept only so old snapshot items still score.
  misinformation: ['misinformation', 'disinformation', 'fake news', 'deepfake', 'fact-check'],
  hate: ['hate speech', 'communal', 'targeted harassment', 'hostility'],
  exploitation: ['exploitation', 'grooming', 'coercion', 'trafficking', 'child safety']
};

const termPatternCache = new Map();

function matchesTerm(text, term) {
  if (!termPatternCache.has(term)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    termPatternCache.set(term, new RegExp(`(^|[^a-z0-9])${escaped}`, 'i'));
  }
  return termPatternCache.get(term).test(text);
}

function countThemeHits(text, theme) {
  return (themeKeywords[theme] || []).filter((term) => matchesTerm(text, term)).length;
}

/**
 * Assign an article to the dashboard theme its own text supports best.
 * The feed it came from only breaks ties; it never assigns a theme on its own.
 * Returns null when the article matches no harm theme at all.
 */
function classifyArticle(item = {}) {
  const text = `${item.title || ''} ${item.snippet || ''}`;
  if (blockedNoiseKeywords.some((term) => matchesTerm(text, term))) return null;

  const feedTheme = item.feedTheme || item.theme;
  let best = null;
  let bestScore = 0;

  for (const theme of DASHBOARD_THEMES) {
    const hits = countThemeHits(text, theme);
    if (!hits) continue;
    const score = hits * 10 + (theme === feedTheme ? 5 : 0);
    if (score > bestScore) {
      best = theme;
      bestScore = score;
    }
  }

  return best;
}

function getSourceTrustWeight(sourceLabel = '') {
  const normalized = sourceLabel.toLowerCase();
  for (const [pattern, weight] of Object.entries(sourceTrustWeights)) {
    if (normalized.includes(pattern)) {
      return weight;
    }
  }

  return trustedSourcePatterns.some((pattern) => pattern.test(sourceLabel)) ? 3 : 1;
}

function scoreLiveItem(item, requestedTheme) {
  const searchText = `${item.title || ''} ${item.snippet || ''} ${item.source || ''}`.toLowerCase();
  const noiseHits = blockedNoiseKeywords.filter((term) => matchesTerm(searchText, term)).length;
  const themeHits = countThemeHits(searchText, requestedTheme || item.theme);
  const riskHits = liveRiskKeywords.filter((term) => matchesTerm(searchText, term)).length;
  const sourceLabel = (item.source || '').toLowerCase();
  const sourceTrustWeight = getSourceTrustWeight(sourceLabel);
  const themeBoost = themeRiskWeights[requestedTheme || item.theme || 'misinformation'] || 5;

  let score = 0;
  score += themeHits * 5;
  score += riskHits * 2;
  score += sourceTrustWeight * 4;
  score += themeBoost;

  const publishedAt = new Date(item.publishedAt || item.isoDate || item.pubDate || Date.now());
  const ageHours = Number.isNaN(publishedAt.getTime()) ? 0 : (Date.now() - publishedAt.getTime()) / 3600000;
  if (ageHours >= 0 && ageHours <= 72) {
    score += Math.max(0, 12 - ageHours) * 0.5;
  }

  score -= noiseHits * 8;
  if (!searchText.trim()) score -= 10;

  return score;
}

function getStoryFingerprint(item) {
  return (item.title || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !['the', 'and', 'for', 'with', 'from', 'this', 'that'].includes(word))
    .slice(0, 12)
    .join(' ');
}

function getCorroborationCounts(items) {
  const sourcesByStory = new Map();

  items.forEach((item) => {
    const storyKey = getStoryFingerprint(item);
    if (!storyKey) return;

    if (!sourcesByStory.has(storyKey)) {
      sourcesByStory.set(storyKey, new Set());
    }

    sourcesByStory.get(storyKey).add((item.source || 'Unknown source').toLowerCase());
  });

  return sourcesByStory;
}

function getRiskBand(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

/**
 * Risk score (0-100) built from things that actually indicate risk:
 *   theme severity  24-40  (themeRiskWeights x 4)
 *   theme evidence   0-24  (distinct theme terms in the text, capped at 3)
 *   source trust     2-10
 *   corroboration    0-21  (independent sources on the same story, capped at 3 extra)
 * Recency is deliberately excluded: it decides sort order, not severity.
 * The old formula saturated at 100 for almost every article.
 */
function buildRiskMetadata(item, requestedTheme, corroborationCount = 1) {
  const theme = requestedTheme || item.theme;
  const text = `${item.title || ''} ${item.snippet || ''}`;
  const severity = (themeRiskWeights[theme] || 6) * 4;
  const evidence = Math.min(countThemeHits(text, theme), 3) * 8;
  const trust = getSourceTrustWeight((item.source || '').toLowerCase()) * 2;
  const corroboration = Math.min(Math.max(corroborationCount - 1, 0), 3) * 7;
  const score = Math.max(0, Math.min(100, Math.round(severity + evidence + trust + corroboration)));
  const confidence = corroborationCount >= 3 || (corroborationCount >= 2 && evidence >= 16) ? 'High' : corroborationCount >= 2 || evidence >= 16 ? 'Medium' : 'Low';

  return {
    riskScore: score,
    confidence,
    severity: getRiskBand(score),
    corroboratedBy: corroborationCount
  };
}

function isRelevantLiveItem(item, requestedTheme) {
  const searchText = `${item.title || ''} ${item.snippet || ''}`;
  if (blockedNoiseKeywords.some((term) => matchesTerm(searchText, term))) return false;

  if (!requestedTheme || requestedTheme === 'all') {
    return classifyArticle(item) !== null;
  }

  return countThemeHits(searchText, requestedTheme) > 0 && scoreLiveItem(item, requestedTheme) >= 6;
}

function rankLiveItems(items, requestedTheme, limit) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, limit) : 10;
  const sourcesByStory = getCorroborationCounts(items);

  return items
    .map((item) => ({
      ...item,
      ...buildRiskMetadata(
        item,
        requestedTheme,
        sourcesByStory.get(getStoryFingerprint(item))?.size || 1
      )
    }))
    .sort((a, b) => {
      const scoreDelta = (b.riskScore || 0) - (a.riskScore || 0);
      if (scoreDelta !== 0) return scoreDelta;
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    })
    .slice(0, safeLimit);
}

function parseGdeltDate(seendate) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(String(seendate || ''));
  if (!match) return null;
  const [, y, mo, d, h, mi, se] = match;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se)).toISOString();
}

async function fetchGdeltArticles(theme, limit, date = '') {
  const gdeltQuery = gdeltThemeQueries[theme] || gdeltThemeQueries.misinformation;
  const dateFilter = date
    ? `&startdatetime=${date.replace(/-/g, '')}000000&enddatetime=${date.replace(/-/g, '')}235959`
    : '';
  const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(gdeltQuery)}&mode=artlist&format=json&maxrecords=${limit}${dateFilter}`;

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
      snippet: '',
      publishedAt: parseGdeltDate(article.seendate),
      source: article.domain ? `GDELT • ${article.domain}` : 'GDELT Public News API',
      theme,
      type: 'News',
      provenance: date ? 'historical-gdelt' : 'live-gdelt'
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
      snippet: '',
      publishedAt: parseGdeltDate(article.seendate),
      source: article.domain ? `GDELT • ${article.domain}` : 'GDELT Public News API',
      theme: 'dangerous-misinformation',
      type: 'News',
      provenance: 'live-gdelt'
    }));
  } catch (error) {
    return [];
  }
}

function scoreAIPulseMatch(item, topic) {
  const text = `${item.title || ''} ${item.snippet || ''}`.toLowerCase();
  let score = 0;

  topic.keywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += keyword.includes(' ') ? 2 : 1;
    }
  });

  const aiSignals = /\b(ai|safety|model|models|agent|agents|llm|research|transparency|moderation)\b/;
  if (!aiSignals.test(text)) {
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Give each item a content-based theme; drop items that match no harm theme. */
function isAIPulseSource(item = {}) {
  return item.theme === 'ai-pulse' || aiPulseFeeds.some((feed) => feed.label === item.source);
}

function classifyItems(items = []) {
  return items
    .filter((item) => !isAIPulseSource(item))
    .map((item) => {
      const feedTheme = item.feedTheme || item.theme;
      const theme = classifyArticle({ ...item, feedTheme });
      return theme ? { ...item, feedTheme, theme } : null;
    })
    .filter(Boolean);
}

function normalizeFeedResults(feeds, results, provenance = 'live-feed') {
  return results.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return [];
    const feed = feeds[index];
    return (result.value.items || []).map((item) => ({
      title: item.title || 'Untitled source',
      link: item.link,
      snippet: item.contentSnippet || item.content || '',
      // No date means we cannot place it on the timeline; never default to "now".
      publishedAt: item.isoDate || (item.pubDate && !Number.isNaN(new Date(item.pubDate).getTime()) ? new Date(item.pubDate).toISOString() : null),
      source: feed.label,
      theme: feed.theme,
      type: feed.type,
      provenance
    }));
  });
}

function buildSourceStatus(feeds, results) {
  return results.map((result, index) => ({
    label: feeds[index].label,
    theme: feeds[index].theme,
    type: feeds[index].type,
    status: result.status === 'fulfilled' ? 'online' : 'offline',
    itemCount: result.status === 'fulfilled' && Array.isArray(result.value.items) ? result.value.items.length : 0
  }));
}

/**
 * Fetch every harm-theme feed plus one GDELT query per theme, then classify.
 * Used by the scheduled snapshot job (GitHub Pages has no server).
 * GDELT asks for at most one request every 5 seconds, hence the spacing.
 */
async function collectRiskItems({ includeGdelt = true, gdeltDelayMs = 5500 } = {}) {
  const feedResults = await Promise.allSettled(
    liveSourceFeeds.map((feed) => withTimeout(parser.parseURL(feed.url), 15000))
  );
  const items = normalizeFeedResults(liveSourceFeeds, feedResults);
  const sourceStatus = buildSourceStatus(liveSourceFeeds, feedResults);

  let gdeltCount = 0;
  if (includeGdelt) {
    for (const theme of DASHBOARD_THEMES) {
      const gdeltItems = await fetchGdeltArticles(theme, 40);
      gdeltCount += gdeltItems.length;
      items.push(...gdeltItems);
      await sleep(gdeltDelayMs);
    }
    sourceStatus.push({
      label: 'GDELT Public News API',
      theme: 'all',
      type: 'News',
      status: gdeltCount ? 'online' : 'offline',
      itemCount: gdeltCount
    });
  }

  const usable = items.filter((item) => item.title && item.publishedAt && isUsableArticleLink(item.link));
  return { items: classifyItems(dedupeArticles(usable)), sourceStatus };
}

async function collectAIPulseItems() {
  const [feedResults, gdeltItems] = await Promise.all([
    Promise.allSettled(aiPulseFeeds.map((feed) => withTimeout(parser.parseURL(feed.url), 15000))),
    fetchGdeltAIPulseArticles(40)
  ]);
  return [...normalizeFeedResults(aiPulseFeeds, feedResults), ...gdeltItems]
    .filter((item) => item.title && item.publishedAt && isUsableArticleLink(item.link))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

app.get('/api/ai-safety-pulse', async (req, res) => {
  const generatedAt = new Date().toISOString();

  try {
    const normalized = await collectAIPulseItems();

    const cards = buildAIPulseCards(normalized, generatedAt);

    return res.json({
      generatedAt,
      stats: {
        totalSources: aiPulseFeeds.length + 1,
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

// Theme signals are computed from archived daily snapshots (real, collected
// articles only). Optional filters: ?trend=rising|falling|stable, ?theme=<slug>,
// ?end=YYYY-MM-DD for a past 7-day window.
app.get('/api/signals', (req, res) => {
  const requestedTrend = (req.query.trend || '').toString().trim().toLowerCase();
  const requestedTheme = (req.query.theme || '').toString().trim().toLowerCase();
  const end = (req.query.end || '').toString().trim();
  const dataDir = path.join(__dirname, 'public', 'data');

  const payload = /^\d{4}-\d{2}-\d{2}$/.test(end)
    ? buildThemeSignals(dataDir, end)
    : buildThemeSignals(dataDir);

  let data = payload.data;
  if (requestedTheme) data = data.filter((item) => item.theme === requestedTheme);
  if (requestedTrend) data = data.filter((item) => item.trend.toLowerCase() === requestedTrend);

  res.json({ ...payload, total: data.length, filters: { trend: requestedTrend || null, theme: requestedTheme || null }, data });
});

// Load historical snapshot data for past dates
function loadHistoricalSnapshot(date, theme = 'all') {
  try {
    const themePrefix = theme && theme !== 'all' ? `-theme-${theme}` : '';
    const dataDirectory = path.join(__dirname, 'public', 'data');
    const candidates = [
      { path: path.join(dataDirectory, `live-sources${themePrefix}-${date}.json`), label: `live-sources${themePrefix}-${date}.json` }
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate.path)) {
        const data = fs.readFileSync(candidate.path, 'utf8');
        console.log(`✓ Loaded snapshot: ${candidate.label}`);
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.warn(`Could not load historical snapshot for ${date}:`, error.message);
  }
  return null;
}


// Health check endpoint for Render
function buildNoResultsMessage({ date, theme, hasHistoricalRecords = false } = {}) {
  const dateLabel = date || 'the selected date';
  const topicLabel = theme && theme !== 'all' ? theme : 'the selected topic';

  if (hasHistoricalRecords) {
    return `Historical reports exist for ${dateLabel} on ${topicLabel}, but no verified source links are available for that date and topic.`;
  }

  return `No verified news was found for ${dateLabel} on ${topicLabel}.`;
}

function buildProvenanceBadge(item = {}) {
  const provenance = String(item.provenance || 'unverified').toLowerCase();

  const labels = {
    'live-feed': 'Live feed',
    'live-gdelt': 'Live GDELT',
    'historical-archive': 'Historical archive',
    'historical-gdelt': 'Historical archive',
    'historical-record': 'Historical archive',
    fallback: 'Unverified',
    unverified: 'Unverified'
  };

  return labels[provenance] || 'Unverified';
}

function getISTDateRange(date) {
  return {
    from: new Date(`${date}T00:00:00+05:30`).getTime(),
    to: new Date(`${date}T23:59:59.999+05:30`).getTime()
  };
}

function getISTDateString(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getTodayIST() {
  return getISTDateString();
}

function sortRiskItems(items = [], mode = 'risk') {
  const normalized = [...items];

  return normalized.sort((a, b) => {
    if (mode === 'recent') {
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    }

    const riskDelta = (b.riskScore || 0) - (a.riskScore || 0);
    if (riskDelta !== 0) return riskDelta;
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  });
}

function filterRiskItems(items = [], query = '') {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return [...items];

  return items.filter((item) => {
    const text = `${item.title || ''} ${item.snippet || ''} ${item.source || ''} ${item.theme || ''}`.toLowerCase();
    return text.includes(normalizedQuery);
  });
}

function filterVerifiedItems(items = []) {
  return items.filter((item) => {
    const provenance = String(item.provenance || '').toLowerCase();
    return ['live-feed', 'live-gdelt', 'historical-archive', 'historical-gdelt', 'historical-record'].includes(provenance);
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/risk-score', async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(requestedLimit) ? 10 : Math.min(Math.max(requestedLimit, 1), 60);
  const requestedTheme = (req.query.theme || '').toString().trim().toLowerCase();
  const fromDate = (req.query.from || '').toString().trim();
  const toDate = (req.query.to || '').toString().trim();

  const payload = await loadLiveSourcesData({
    limit,
    requestedTheme,
    requestedType: 'news',
    fromDate,
    toDate
  });

  const data = rankLiveItems(Array.isArray(payload && payload.data) ? payload.data : [], requestedTheme, limit);

  return res.json({
    generatedAt: new Date().toISOString(),
    total: data.length,
    data
  });
});

async function loadLiveSourcesData({ limit, requestedTheme, requestedType, fromDate, toDate }) {
  try {
    const selectedTheme = requestedTheme || 'all';
    const today = getTodayIST();

    console.log(`\n📰 /api/live-sources request:`);
    console.log(`   from: ${fromDate || 'not specified'}`);
    console.log(`   to: ${toDate || 'not specified'}`);
    console.log(`   theme: ${requestedTheme || 'all'}`);
    console.log(`   type: ${requestedType || 'all'}`);
    console.log(`   today: ${today}`);

    const fromDateOnly = fromDate ? fromDate.split('T')[0] : null;
    const isHistoricalRequest = fromDateOnly && fromDateOnly < today;

    let feedResults, gdeltItems;

    if (isHistoricalRequest) {
      feedResults = [{ status: 'rejected' }];
      gdeltItems = await fetchGdeltArticles(selectedTheme, Math.min(Math.max(limit, 8), 40), fromDateOnly);
      console.log(`   → Using historical snapshot (date: ${fromDate})`);
    } else {
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

    const items = normalizeFeedResults(liveSourceFeeds, feedResults);

    let snapshotData = [];
    if (isHistoricalRequest) {
      const snapshot = loadHistoricalSnapshot(fromDateOnly, selectedTheme);
      if (snapshot && snapshot.data) {
        snapshotData = (Array.isArray(snapshot.data) ? snapshot.data : []).map((item) => ({
          ...item,
          provenance: item.provenance || 'historical-archive'
        }));
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

    let baseItems;
    if (isHistoricalRequest) {
      baseItems = [...snapshotData, ...gdeltItems];
    } else {
      baseItems = [...items, ...gdeltItems];
      if (baseItems.length === 0) {
        console.log(`   ⚠ Live feeds returned no data, trying snapshot fallback for ${today}`);
        const todaySnapshot = loadHistoricalSnapshot(today, selectedTheme);
        if (todaySnapshot && todaySnapshot.data) {
          baseItems = Array.isArray(todaySnapshot.data) ? todaySnapshot.data : [];
          console.log(`   ✓ Using snapshot fallback with ${baseItems.length} articles`);
        }
      }
    }

    let normalizedItems = classifyItems(
      baseItems.filter((item) => isUsableArticleLink(item.link) && item.title && item.publishedAt)
    );

    if (fromDate) {
      let fromDateTime, toDateTime;
      if (fromDate.includes('T')) {
        fromDateTime = new Date(fromDate).getTime();
      } else {
        fromDateTime = getISTDateRange(fromDate).from;
      }

      if (toDate && toDate.includes('T')) {
        toDateTime = new Date(toDate).getTime();
      } else if (toDate) {
        toDateTime = getISTDateRange(toDate).to;
      } else {
        toDateTime = getISTDateRange(today).to;
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
    const filteredItems = rankLiveItems(relevantItems, requestedTheme, limit);

    const hasDateFilter = Boolean(fromDate || toDate);
    const data = filteredItems.length
      ? filteredItems
      : hasDateFilter
        ? []
        : (requestedTheme && themeFallbackSources[requestedTheme]
            ? themeFallbackSources[requestedTheme].map((item) => ({
                ...item,
                theme: requestedTheme,
                publishedAt: new Date().toISOString(),
                snippet: '',
                provenance: 'unverified',
                ...buildRiskMetadata({ ...item, title: item.title, snippet: '', source: item.source }, requestedTheme)
              }))
            : fallbackLiveSources.map((item) => ({
                ...item,
                provenance: 'unverified',
                ...buildRiskMetadata({ title: item.title, snippet: '', source: item.source }, requestedTheme)
              })));

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

    const topicLabel = requestedTheme || 'the selected topic';
    const hasUnlinkedHistoricalRecords = isHistoricalRequest && snapshotData.length > 0 && data.length === 0;
    const message = hasUnlinkedHistoricalRecords
      ? buildNoResultsMessage({
          date: fromDate || toDate || 'the selected date',
          theme: requestedTheme || 'all',
          hasHistoricalRecords: true
        })
      : hasDateFilter && data.length === 0
        ? buildNoResultsMessage({
            date: fromDate || toDate || 'the selected date',
            theme: requestedTheme || 'all'
          })
        : null;

    console.log(`✓ Response: ${data.length} articles returned\n`);

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        theme: requestedTheme || null,
        type: requestedType || null
      },
      stats,
      message,
      sourceStatus,
      data
    };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      filters: {
        theme: requestedTheme || null,
        type: requestedType || null
      },
      stats: { total: fromDate || toDate ? 0 : fallbackLiveSources.length, news: 0, publicConversations: 0 },
      message: fromDate || toDate
        ? buildNoResultsMessage({
            date: fromDate || toDate,
            theme: requestedTheme || 'all'
          })
        : null,
      sourceStatus: liveSourceFeeds.map((feed) => ({
        label: feed.label,
        theme: feed.theme,
        type: feed.type,
        status: 'offline',
        itemCount: 0
      })),
      data: fromDate || toDate ? [] : fallbackLiveSources
    };
  }
}

app.get('/api/live-sources', async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(requestedLimit) ? 24 : Math.min(Math.max(requestedLimit, 1), 120);
  const requestedTheme = (req.query.theme || '').toString().trim().toLowerCase();
  const requestedType = (req.query.type || '').toString().trim().toLowerCase();
  const fromDate = (req.query.from || '').toString().trim();
  const toDate = (req.query.to || '').toString().trim();

  const payload = await loadLiveSourcesData({
    limit,
    requestedTheme,
    requestedType,
    fromDate,
    toDate
  });

  return res.json(payload);
});

// Old hardcoded trend-brief URLs now point at the real per-theme trend page.
app.get('/trend/:signalId/:slug', (req, res) => {
  res.redirect(301, '/trend.html');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Argus app is running on http://localhost:${port}`);
  });
}

module.exports = {
  app,
  DASHBOARD_THEMES,
  classifyArticle,
  classifyItems,
  collectRiskItems,
  collectAIPulseItems,
  buildAIPulseCards,
  parseGdeltDate,
  buildNoResultsMessage,
  buildProvenanceBadge,
  getISTDateRange,
  getISTDateString,
  getTodayIST,
  sortRiskItems,
  filterRiskItems,
  filterVerifiedItems,
  isRelevantLiveItem,
  dedupeArticles,
  rankLiveItems,
  isUsableArticleLink
};
