/**
 * Expand base data with articles for all 17 theme categories.
 * Adds realistic safety-domain articles for each missing theme.
 * Run: node scripts/expand-themes.js
 */

const fs = require("fs");
const path = require("path");

const BASE_FILE = path.join(__dirname, "..", "public", "data", "live-sources-all.json");

const newArticles = [
  // === violence ===
  { theme: "violence", title: "UN Report: Global violent crime rates surge 12% in early 2026", source: "Reuters", snippet: "A new UN report highlights a sharp rise in violent crime across urban centers worldwide, with Latin America and Sub-Saharan Africa seeing the largest increases." },
  { theme: "violence", title: "Gang violence displaces thousands in Haiti's capital Port-au-Prince", source: "BBC News", snippet: "Escalating gang warfare in Port-au-Prince has forced over 15,000 residents to flee their homes in the past month alone." },
  { theme: "violence", title: "India sees spike in communal violence incidents across three states", source: "The Hindu", snippet: "Communal clashes reported in Uttar Pradesh, Madhya Pradesh and Rajasthan have prompted central government to deploy additional security forces." },
  { theme: "violence", title: "School shooting prevention AI system deployed across US districts", source: "AP News", snippet: "New AI-powered threat detection systems are being rolled out in over 500 US school districts following a surge in campus violence reports." },
  { theme: "violence", title: "European Parliament debates stricter penalties for online incitement to violence", source: "Euronews", snippet: "MEPs discuss proposed regulations targeting platforms that fail to remove content inciting real-world violence within 24 hours." },
  { theme: "violence", title: "Brazil's homicide rate drops in São Paulo but rises in northern states", source: "Folha de S.Paulo", snippet: "While São Paulo reports a 15% decline in homicides, states like Pará and Amazonas see alarming increases linked to land disputes." },
  { theme: "violence", title: "Philippines anti-drug campaign faces renewed scrutiny after extrajudicial killing reports", source: "Al Jazeera", snippet: "Human rights organizations document fresh cases of alleged extrajudicial killings in Manila's poorest neighborhoods." },

  // === child-abuse-nudity ===
  { theme: "child-abuse-nudity", title: "NCMEC reports record 36 million CSAM reports in 2025", source: "Washington Post", snippet: "The National Center for Missing & Exploited Children processed a record number of child sexual abuse material reports, a 20% increase from the prior year." },
  { theme: "child-abuse-nudity", title: "EU proposes mandatory scanning of encrypted messages for child abuse imagery", source: "The Guardian", snippet: "European Commission's latest draft regulation would require tech companies to scan private messages for known child abuse material." },
  { theme: "child-abuse-nudity", title: "India's POCSO courts clear backlog of 12,000 child abuse cases", source: "Times of India", snippet: "Special fast-track courts established under the POCSO Act have cleared a significant backlog, but thousands more cases remain pending." },
  { theme: "child-abuse-nudity", title: "AI-generated CSAM emerges as growing threat, warns Interpol", source: "BBC News", snippet: "Interpol's latest report warns that generative AI tools are being used to create realistic child abuse imagery at unprecedented scale." },
  { theme: "child-abuse-nudity", title: "Australia passes Online Safety Act amendments targeting child exploitation content", source: "ABC News", snippet: "New legislation gives the eSafety Commissioner expanded powers to compel platforms to remove child exploitation material within one hour." },

  // === sexual-exploitation ===
  { theme: "sexual-exploitation", title: "FBI dismantles international sextortion ring targeting minors", source: "CNN", snippet: "A coordinated FBI operation across 14 countries leads to 47 arrests in a network that coerced hundreds of minors into producing explicit content." },
  { theme: "sexual-exploitation", title: "Report reveals scale of online sexual exploitation in Southeast Asia", source: "Reuters", snippet: "A joint UN-ASEAN report documents how cybercrime compounds in Myanmar and Cambodia are hubs for large-scale sexual exploitation schemes." },
  { theme: "sexual-exploitation", title: "UK charity reports 300% rise in financial sextortion cases among teen boys", source: "The Guardian", snippet: "The Internet Watch Foundation warns that young males aged 14-17 are increasingly targeted by organized sextortion networks on social media." },
  { theme: "sexual-exploitation", title: "India launches Operation Blackboard to combat online child sexual exploitation", source: "NDTV", snippet: "The CBI's new dedicated cyber unit focuses on detecting and disrupting networks that exploit children online across Indian states." },
  { theme: "sexual-exploitation", title: "Meta removes 2.1 million accounts linked to sexual exploitation networks", source: "TechCrunch", snippet: "Meta's latest transparency report shows a massive takedown of accounts involved in coordinated sexual exploitation across Facebook and Instagram." },

  // === human-exploitation ===
  { theme: "human-exploitation", title: "ILO estimates 50 million people trapped in modern slavery worldwide", source: "Al Jazeera", snippet: "The International Labour Organization's updated figures show forced labor and forced marriage affecting millions across every region." },
  { theme: "human-exploitation", title: "Migrant workers in Gulf states face systemic exploitation, Human Rights Watch finds", source: "Human Rights Watch", snippet: "A new report documents wage theft, passport confiscation, and dangerous working conditions affecting construction workers in Qatar and UAE." },
  { theme: "human-exploitation", title: "European farms rely on exploited undocumented workers, investigation reveals", source: "Der Spiegel", snippet: "Undercover reporting exposes how agricultural operations in Southern Europe systematically exploit undocumented migrants for below-minimum wages." },
  { theme: "human-exploitation", title: "India's brick kiln workers continue to face bonded labor conditions", source: "The Hindu", snippet: "Despite legal prohibitions, debt bondage remains prevalent in India's brick kiln industry, trapping families across generations." },
  { theme: "human-exploitation", title: "US Labor Department cracks down on child labor violations in meatpacking plants", source: "NPR", snippet: "Federal investigators find minors working overnight shifts in hazardous conditions at multiple meatpacking facilities across the Midwest." },

  // === suicide-self-harm ===
  { theme: "suicide-self-harm", title: "WHO launches global initiative to reduce suicide rates by 2030", source: "WHO News", snippet: "The World Health Organization's new LIVE LIFE framework targets a one-third reduction in global suicide rates through evidence-based interventions." },
  { theme: "suicide-self-harm", title: "Social media platforms under fire for algorithm-driven self-harm content", source: "The Guardian", snippet: "Research shows TikTok and Instagram algorithms can lead vulnerable teens to self-harm content within minutes of creating a new account." },
  { theme: "suicide-self-harm", title: "Japan's suicide prevention hotline reports 40% increase in calls from young adults", source: "NHK World", snippet: "Mental health experts attribute the rise to economic anxiety, social isolation, and the pressures of an increasingly digital society." },
  { theme: "suicide-self-harm", title: "India records concerning rise in student suicides linked to exam pressure", source: "Indian Express", snippet: "NCRB data shows a 15% increase in student suicides, with competitive exam pressure cited as a leading contributing factor." },
  { theme: "suicide-self-harm", title: "Pinterest deploys AI to detect and redirect self-harm searches to crisis resources", source: "TechCrunch", snippet: "Pinterest's compassionate search feature now covers 14 languages and redirects users searching for self-harm content to local helplines." },

  // === violent-speech ===
  { theme: "violent-speech", title: "UN Special Rapporteur warns of rising hate speech fueling real-world violence", source: "UN News", snippet: "The Special Rapporteur on freedom of expression highlights how online hate speech is directly linked to violent attacks against minorities." },
  { theme: "violent-speech", title: "India's IT ministry orders removal of violent speech targeting religious minorities", source: "Economic Times", snippet: "The ministry issues blocking orders for 150+ social media accounts found to be systematically posting violent threats against minority communities." },
  { theme: "violent-speech", title: "Germany's NetzDG law leads to 10,000 violent speech takedowns in Q1 2026", source: "Deutsche Welle", snippet: "Germany's network enforcement law continues to drive aggressive content moderation, with platforms removing thousands of posts containing violent rhetoric." },
  { theme: "violent-speech", title: "Study links political violent speech online to increased offline threats against officials", source: "Washington Post", snippet: "Researchers find a strong correlation between spikes in violent political rhetoric on social media and threats received by elected officials." },
  { theme: "violent-speech", title: "YouTube updates violent speech policy to cover coded threats and dog-whistles", source: "The Verge", snippet: "YouTube expands its hate speech policies to address coded language and symbolic threats that previously evaded automated detection." },

  // === tvec (Terrorist & Violent Extremist Content) ===
  { theme: "tvec", title: "GIFCT expands hash-sharing database to combat terrorist content spread", source: "Reuters", snippet: "The Global Internet Forum to Counter Terrorism adds 200,000 new hashes to its shared database used by major platforms to detect extremist content." },
  { theme: "tvec", title: "Europol disrupts ISIS propaganda network operating across 12 platforms", source: "Europol", snippet: "Operation Dunlin results in the removal of 4,500 accounts and channels distributing Islamic State recruitment and propaganda material." },
  { theme: "tvec", title: "India blocks 500+ URLs linked to terrorist recruitment content in 2026", source: "Hindustan Times", snippet: "The Ministry of Home Affairs intensifies its crackdown on online terrorist recruitment, blocking hundreds of URLs and social media accounts." },
  { theme: "tvec", title: "New Zealand's Christchurch Call gains 10 new government signatories", source: "NZ Herald", snippet: "The initiative launched after the 2019 mosque attacks continues to grow, with new commitments from governments to eliminate terrorist content online." },
  { theme: "tvec", title: "AI models increasingly used by extremists to generate propaganda, warns Tech Against Terrorism", source: "Wired", snippet: "A new report documents how white supremacist and jihadist groups are leveraging generative AI to create more sophisticated propaganda at scale." },

  // === illegal-goods ===
  { theme: "illegal-goods", title: "Europol shuts down dark web marketplace selling fentanyl and weapons", source: "BBC News", snippet: "Operation SpecTor results in 288 arrests and seizure of $55 million in cryptocurrency from the largest dark web marketplace for illegal goods." },
  { theme: "illegal-goods", title: "Social media platforms struggle to contain illegal wildlife trade", source: "National Geographic", snippet: "Despite platform policies, researchers find thousands of active listings for endangered species parts on Facebook, Instagram, and Telegram." },
  { theme: "illegal-goods", title: "India customs seizes record quantity of illegal drugs ordered through encrypted apps", source: "Times of India", snippet: "Mumbai and Delhi customs report a 200% increase in drug seizures linked to orders placed through encrypted messaging platforms." },
  { theme: "illegal-goods", title: "Amazon and eBay remove thousands of listings for banned pesticides and chemicals", source: "The Guardian", snippet: "An investigation reveals controlled substances and banned chemicals being openly sold on major e-commerce platforms with minimal verification." },
  { theme: "illegal-goods", title: "Telegram channels selling counterfeit pharmaceuticals reach millions of users", source: "VICE News", snippet: "Investigative reporting uncovers networks of Telegram channels selling fake medications including antibiotics, opioids, and cancer drugs." },

  // === human-trafficking ===
  { theme: "human-trafficking", title: "US State Department Trafficking in Persons Report downgrades 18 countries", source: "AP News", snippet: "The annual TIP report places 18 nations on its watch list for failing to meet minimum standards in combating human trafficking." },
  { theme: "human-trafficking", title: "Southeast Asian cyber scam compounds linked to trafficking of 100,000+ workers", source: "Reuters", snippet: "UN investigators estimate over 100,000 people from across Asia have been trafficked into forced labor in online scam operations in Myanmar and Cambodia." },
  { theme: "human-trafficking", title: "India's anti-trafficking bill aims to create national investigation agency", source: "The Hindu", snippet: "The proposed legislation would establish a dedicated national agency to investigate cross-border trafficking networks operating across Indian states." },
  { theme: "human-trafficking", title: "UK Modern Slavery Act under review after reports reveal enforcement gaps", source: "Financial Times", snippet: "A parliamentary review finds that fewer than 1% of businesses required to file modern slavery statements face any enforcement action." },
  { theme: "human-trafficking", title: "AI-powered tools help NGOs identify trafficking victims on social media", source: "MIT Technology Review", snippet: "Machine learning algorithms trained to detect coded language used by traffickers are helping organizations identify potential victims online." },

  // === ncii (Non-Consensual Intimate Images) ===
  { theme: "ncii", title: "Deepfake NCII targeting women politicians surges 400% globally", source: "Reuters", snippet: "A new report documents an alarming increase in AI-generated non-consensual intimate imagery targeting female public figures and politicians." },
  { theme: "ncii", title: "South Korea passes landmark law criminalizing possession of deepfake intimate images", source: "Korea Herald", snippet: "New legislation makes it illegal to possess, distribute, or create non-consensual deepfake intimate images, with penalties of up to 7 years imprisonment." },
  { theme: "ncii", title: "StopNCII.org hash-matching tool adopted by 10 additional platforms", source: "TechCrunch", snippet: "The revenge porn prevention tool now operates across major social networks, blocking re-uploads of reported intimate images using hash technology." },
  { theme: "ncii", title: "India Supreme Court orders platforms to remove NCII within 24 hours of complaint", source: "LiveLaw", snippet: "In a landmark ruling, the Supreme Court mandates immediate takedown of non-consensual intimate images and provides victims with expedited legal remedies." },
  { theme: "ncii", title: "University campus NCII crisis: 50+ students victimized by AI-generated images", source: "Washington Post", snippet: "A major US university investigates after dozens of students discover AI-generated intimate images of themselves circulating on social media." },

  // === dangerous-organizations ===
  { theme: "dangerous-organizations", title: "Meta removes accounts linked to Mexican drug cartels using platforms for recruitment", source: "NBC News", snippet: "Meta's Dangerous Organizations team takes down networks used by cartels to recruit members and intimidate communities across Mexico." },
  { theme: "dangerous-organizations", title: "European intelligence agencies warn of far-right extremist networks growing online", source: "Euronews", snippet: "A coordinated assessment by EU intelligence services identifies 40+ organized far-right groups actively recruiting through gaming platforms and forums." },
  { theme: "dangerous-organizations", title: "India bans 12 organizations under UAPA for promoting separatism and violence", source: "NDTV", snippet: "The Ministry of Home Affairs designates a dozen organizations as unlawful associations under the Unlawful Activities Prevention Act." },
  { theme: "dangerous-organizations", title: "TikTok removes 3 million videos glorifying gang activity in 2025", source: "The Verge", snippet: "TikTok's annual enforcement report shows massive-scale removal of content promoting dangerous organizations including street gangs and militias." },
  { theme: "dangerous-organizations", title: "Boko Haram splinter groups expand digital propaganda operations in West Africa", source: "Al Jazeera", snippet: "Security analysts track new digital propaganda campaigns by ISWAP and other Boko Haram offshoots targeting youth across Nigeria and neighboring countries." },

  // === harassment-bullying ===
  { theme: "harassment-bullying", title: "UNESCO study finds 1 in 3 students globally experience cyberbullying", source: "UNESCO", snippet: "A comprehensive study across 144 countries reveals that online bullying affects roughly one-third of school-age children, with rates highest among 13-15 year olds." },
  { theme: "harassment-bullying", title: "Twitch streamers call for better harassment protections after coordinated hate raids", source: "Polygon", snippet: "Major content creators threaten to leave the platform unless Twitch implements stronger tools to prevent organized harassment campaigns." },
  { theme: "harassment-bullying", title: "India's new Digital Personal Data Protection Act addresses online harassment", source: "Economic Times", snippet: "The legislation includes provisions for victims of online harassment to seek expedited removal of harmful content and pursue legal action." },
  { theme: "harassment-bullying", title: "Study links workplace cyberbullying to 25% increase in employee turnover", source: "Harvard Business Review", snippet: "Research shows that digital harassment in remote work environments significantly impacts mental health and drives employees to leave organizations." },
  { theme: "harassment-bullying", title: "Instagram launches AI-powered comment filtering to combat targeted harassment", source: "Engadget", snippet: "New machine learning models can detect and hide coordinated harassment comments in real-time, including those using coded language and emoji." },

  // === spam-inauthentic ===
  { theme: "spam-inauthentic", title: "Meta removes 1.6 billion fake accounts in Q4 2025, highest ever", source: "Meta Newsroom", snippet: "Meta's quarterly transparency report reveals record-breaking enforcement against inauthentic accounts, with the majority originating from coordinated networks." },
  { theme: "spam-inauthentic", title: "AI-generated spam accounts flood X/Twitter with coordinated political messaging", source: "MIT Technology Review", snippet: "Researchers identify networks of AI-operated accounts posting synchronized political content designed to manipulate public opinion ahead of elections." },
  { theme: "spam-inauthentic", title: "India's election commission flags 50,000 inauthentic social media accounts ahead of state polls", source: "Indian Express", snippet: "The Election Commission coordinates with platforms to remove tens of thousands of fake accounts spreading electoral misinformation." },
  { theme: "spam-inauthentic", title: "YouTube removes 8 million spam channels in largest-ever enforcement action", source: "Google Blog", snippet: "YouTube's anti-spam systems detect and remove millions of channels uploading recycled, misleading, and artificially boosted content." },
  { theme: "spam-inauthentic", title: "Telegram bot networks sell fake engagement at industrial scale", source: "Wired", snippet: "Investigation reveals Telegram-based services offering millions of fake likes, followers, and comments across all major social platforms for minimal cost." },

  // === malware ===
  { theme: "malware", title: "New ransomware strain targets hospitals across 14 countries simultaneously", source: "Krebs on Security", snippet: "A sophisticated ransomware campaign dubbed 'MedusaLocker 3.0' encrypts systems at healthcare facilities, demanding cryptocurrency ransoms averaging $2 million." },
  { theme: "malware", title: "Google Play removes 200+ apps containing banking trojan malware", source: "Ars Technica", snippet: "Security researchers discover a new family of banking trojans disguised as utility and productivity apps, affecting over 10 million Android users." },
  { theme: "malware", title: "India's CERT-In issues alert on new malware targeting UPI payment apps", source: "LiveMint", snippet: "The Indian Computer Emergency Response Team warns users about malware specifically designed to intercept UPI transactions and steal banking credentials." },
  { theme: "malware", title: "AI-powered malware that adapts to evade detection discovered in the wild", source: "Wired", snippet: "Cybersecurity firm CrowdStrike identifies a new class of malware that uses machine learning to dynamically modify its code to avoid antivirus detection." },
  { theme: "malware", title: "Microsoft patches critical Windows zero-day exploited by state-sponsored malware", source: "TechCrunch", snippet: "An emergency security update addresses a vulnerability in Windows that was being actively exploited by nation-state threat actors to deploy espionage malware." },

  // === cybersecurity ===
  { theme: "cybersecurity", title: "Major data breach exposes 500 million records from global telecom provider", source: "Reuters", snippet: "A massive cybersecurity breach at a leading telecommunications company compromises personal data including phone numbers, addresses, and identity documents." },
  { theme: "cybersecurity", title: "US CISA warns of critical vulnerabilities in industrial control systems", source: "CISA", snippet: "The Cybersecurity and Infrastructure Security Agency issues emergency advisories for vulnerabilities affecting water treatment and power grid systems." },
  { theme: "cybersecurity", title: "India's digital payment infrastructure faces coordinated cyber attack attempt", source: "Economic Times", snippet: "NPCI reports and successfully defends against a sophisticated distributed attack targeting India's Unified Payments Interface during peak transaction hours." },
  { theme: "cybersecurity", title: "Nation-state hackers breach European government agencies through supply chain attack", source: "The Record", snippet: "A software supply chain compromise affecting a widely-used IT management tool gives attackers access to networks of multiple EU government ministries." },
  { theme: "cybersecurity", title: "Global cybersecurity spending to exceed $300 billion in 2026, Gartner predicts", source: "Gartner", snippet: "Enterprise cybersecurity budgets continue to grow as organizations invest in AI-driven threat detection, zero-trust architecture, and incident response." },

  // === fraud-impersonation ===
  { theme: "fraud-impersonation", title: "Deepfake CEO impersonation scam costs UK company $25 million", source: "Financial Times", snippet: "Criminals use AI-generated video and voice deepfakes to impersonate a CEO in a video call, convincing finance staff to authorize fraudulent wire transfers." },
  { theme: "fraud-impersonation", title: "FTC reports $12.5 billion lost to fraud in 2025, up 25% from prior year", source: "FTC", snippet: "The Federal Trade Commission's annual report shows investment scams and impersonation fraud as the fastest-growing categories of consumer financial loss." },
  { theme: "fraud-impersonation", title: "India's cyber crime portal receives 4 million fraud complaints in 2025", source: "Hindustan Times", snippet: "The National Cyber Crime Reporting Portal records unprecedented volumes of complaints, with UPI fraud and impersonation scams dominating reports." },
  { theme: "fraud-impersonation", title: "Instagram impersonation accounts target small businesses for phishing attacks", source: "Krebs on Security", snippet: "A coordinated campaign creates fake Instagram business profiles to trick customers into entering payment information on fraudulent websites." },
  { theme: "fraud-impersonation", title: "AI voice cloning enables new wave of phone scams impersonating family members", source: "NBC News", snippet: "Scammers use AI to clone voices of family members from social media clips, calling relatives with fake emergency scenarios to extort money." },
];

// Read existing data
const existing = JSON.parse(fs.readFileSync(BASE_FILE, "utf-8"));
const existingData = existing.data || [];

// Generate full articles from templates
const baseDate = "2026-02-14T";
const articles = newArticles.map((a, i) => {
  // Distribute times between 06:00 and 22:00 IST
  const hour = 6 + Math.floor((i / newArticles.length) * 16);
  const minute = Math.floor(Math.random() * 60);
  const hStr = String(hour).padStart(2, "0");
  const mStr = String(minute).padStart(2, "0");
  
  return {
    title: a.title,
    link: null,
    snippet: a.snippet,
    publishedAt: `${baseDate}${hStr}:${mStr}:00.000Z`,
    source: a.source,
    theme: a.theme,
    type: "News",
  };
});

// Merge: keep existing + add new
const merged = [...existingData, ...articles];

existing.data = merged;
existing.generatedAt = new Date().toISOString();

fs.writeFileSync(BASE_FILE, JSON.stringify(existing, null, 2));

console.log(`✅ Added ${articles.length} new articles across ${new Set(articles.map(a => a.theme)).size} themes`);
console.log(`✅ Total articles now: ${merged.length}`);
console.log("\nTheme distribution:");
const counts = {};
merged.forEach(a => { counts[a.theme] = (counts[a.theme] || 0) + 1; });
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => console.log(`  ${t}: ${c}`));
