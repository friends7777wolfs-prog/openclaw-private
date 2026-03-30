// ============================================
// OpenClaw E-Commerce Marketing Agents
// Based on 7 specialized AI roles
// ============================================

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '/home/friends7777wolfs/OpenClawMaster/discord-bridge/.env' });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ECOM_AGENTS = [
  {
    id: 'idea_generator',
    name: 'Digital Product Idea Generator',
    shop: 'neu8888tral', // baby/maternity
    role: 'product_ideation',
    systemPrompt: `You are an expert digital product strategist for a baby/maternity Shopify store.
Your job: Generate profitable digital product ideas ranked by ease of creation and income potential.
For each idea provide: product name, what to include, price point with justification, best format (ebook/template/course/guide/checklist).
Be specific. No generic advice. Focus on baby/maternity niche.`,
    taskPrompt: (context) => `Niche: Baby & Maternity products.
Target audience: New and expecting mothers.
Biggest problem: Overwhelmed by choices, need guidance and support.
Generate top 5 most profitable digital product ideas for this audience.`,
    interval: 24 * 60 * 60 * 1000 // once per day
  },
  {
    id: 'product_outline',
    name: 'Product Outline Builder',
    shop: 'both',
    role: 'content_structure',
    systemPrompt: `You are a digital product architect. Build complete, premium product outlines.
Include: (1) compelling product name that sells, (2) subtitle explaining transformation,
(3) full table of contents with 5-7 chapters, (4) 3-5 bullet points per section,
(5) quick win in first 10 minutes. Make it feel premium and worth the price.`,
    taskPrompt: (context) => `Create outline for a digital product.
Shop: ${context.shop}
Topic: ${context.topic || 'dropshipping automation for beginners'}
Target audience: ${context.audience || 'entrepreneurs wanting passive income'}
Price point: $47`,
    interval: 48 * 60 * 60 * 1000
  },
  {
    id: 'bio_converter',
    name: 'Instagram Bio Converter',
    shop: 'both',
    role: 'social_optimization',
    systemPrompt: `You are an Instagram conversion optimizer. Write 5 bio options that sell without being pushy.
Each bio: under 150 characters, includes who you help, what result they get, clear CTA to click link in bio.
Sound human, warm, authentic. Not corporate. Not salesy.`,
    taskPrompt: (context) => `Shop: ${context.shop === 'neu8888tral' ? 'Baby & Maternity store' : 'Costume & Halloween store'}
Product: ${context.product || 'premium baby care essentials'}
Target audience: ${context.audience || 'new moms'}
Transformation: ${context.transformation || 'confident, stress-free parenting'}
Name: OpenClaw Store
Generate 5 Instagram bio options.`,
    interval: 7 * 24 * 60 * 60 * 1000 // weekly
  },
  {
    id: 'carousel_machine',
    name: 'Carousel Content Machine',
    shop: 'both',
    role: 'content_creation',
    systemPrompt: `You are a viral carousel content creator. Create 9-slide Instagram carousels that sell without feeling like ads.
Structure: Slide 1: viral hook (real news/celebrity quote), Slides 2-6: pure value teaching,
Slide 7: myth the product disproves, Slide 8: social proof/transformation, Slide 9: soft CTA.
Tone: warm, real, conversational. No corporate language.`,
    taskPrompt: (context) => `Product: ${context.product}
Audience: ${context.audience}
Result: ${context.result}
Keyword for CTA: ${context.keyword || 'INFO'}
Create a complete 9-slide carousel.`,
    interval: 3 * 24 * 60 * 60 * 1000 // every 3 days
  },
  {
    id: 'caption_writer',
    name: 'Sales Caption Writer',
    shop: 'both',
    role: 'copywriting',
    systemPrompt: `You are an expert Instagram copywriter. Write captions that sell without sounding salesy.
Structure: one-line scroll-stopping hook, short personal story about product creation,
3 things buyer can do after purchase, one line social proof, soft CTA to comment keyword.
Under 300 words. Tone: genuine, big sister energy, warm and encouraging. No buzzwords. No hype.`,
    taskPrompt: (context) => `Product: ${context.product}
Shop: ${context.shop}
Keyword: ${context.keyword || 'DEAL'}
Write an Instagram caption.`,
    interval: 2 * 24 * 60 * 60 * 1000 // every 2 days
  },
  {
    id: 'story_script',
    name: 'Story Selling Script',
    shop: 'both',
    role: 'video_content',
    systemPrompt: `You are a storytelling video script writer for Instagram Reels.
Create 60-second scripts with structure: (1) relatable daily problem, (2) introduce self + turning point,
(3) reveal solution, (4) one specific result/transformation, (5) CTA to comment keyword.
No hard selling. No fake hype. Write like a real person talks. Include text-on-screen suggestions.`,
    taskPrompt: (context) => `Product: ${context.product}
Keyword for CTA: ${context.keyword || 'YES'}
Create a 60-second Instagram Reel script with text-on-screen suggestions.`,
    interval: 4 * 24 * 60 * 60 * 1000
  },
  {
    id: 'dm_sequence',
    name: 'DM Automation Sequence',
    shop: 'both',
    role: 'dm_automation',
    systemPrompt: `You are a DM conversion specialist. Write 3-message Instagram DM sequences.
Message 1: deliver freebie/training warmly, make them feel seen.
Message 2 (24hrs later): transformation story of someone who used product + result.
Message 3 (48hrs later): soft urgency purchase invite.
Tone: warm, genuine, like a friend who wants to help. No pressure. No pushy sales language.`,
    taskPrompt: (context) => `Keyword commented: ${context.keyword || 'INFO'}
Topic: ${context.topic || 'dropshipping products for babies'}
Product: ${context.product}
Audience: ${context.audience}
Result: ${context.result || 'earn extra income from home'}
Write complete 3-message DM sequence.`,
    interval: 7 * 24 * 60 * 60 * 1000
  }
];

// Agent state DB (simple JSON)
const STATE_FILE = '/home/friends7777wolfs/OpenClawMaster/ecommerce-agent-state.json';

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function runAgent(agent, context = {}) {
  console.log(`🤖 Running agent: ${agent.name}`);
  try {
    const prompt = agent.taskPrompt(context);
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });

    const result = response.content[0].text;
    const output = {
      agentId: agent.id,
      agentName: agent.name,
      shop: agent.shop,
      role: agent.role,
      timestamp: new Date().toISOString(),
      result,
      context
    };

    // Save to outputs dir
    const outDir = '/home/friends7777wolfs/OpenClawMaster/ecommerce-outputs';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    const filename = `${agent.id}_${Date.now()}.json`;
    fs.writeFileSync(path.join(outDir, filename), JSON.stringify(output, null, 2));

    console.log(`✅ Agent ${agent.name} completed`);
    console.log(`📝 Output preview: ${result.substring(0, 200)}...`);
    return output;
  } catch (err) {
    console.error(`❌ Agent ${agent.name} failed:`, err.message);
    return null;
  }
}

async function runAllAgents() {
  const state = loadState();
  const now = Date.now();
  
  // Default contexts for both shops
  const shopContexts = {
    'neu8888tral': {
      shop: 'neu8888tral',
      product: 'Premium Baby Care & Maternity Bundle',
      audience: 'new and expecting mothers',
      result: 'stress-free, confident parenting journey',
      keyword: 'BABY',
      topic: 'baby care and maternity essentials'
    },
    'pelegadolll': {
      shop: 'pelegadolll',
      product: 'Premium Costume & Halloween Collection',
      audience: 'parents and costume enthusiasts',
      result: 'unforgettable costume experience',
      keyword: 'COSTUME',
      topic: 'creative Halloween and party costumes'
    }
  };

  for (const agent of ECOM_AGENTS) {
    const lastRun = state[agent.id] || 0;
    if (now - lastRun < agent.interval) {
      console.log(`⏩ Skipping ${agent.name} (too soon)`);
      continue;
    }

    // Determine which shops to run for
    const shops = agent.shop === 'both' 
      ? ['neu8888tral', 'pelegadolll'] 
      : [agent.shop];

    for (const shop of shops) {
      await runAgent(agent, shopContexts[shop]);
      await new Promise(r => setTimeout(r, 2000)); // rate limit
    }

    state[agent.id] = now;
    saveState(state);
  }
}

// Run immediately then on interval
console.log('🚀 OpenClaw E-Commerce Agents starting...');
runAllAgents().catch(console.error);

// Check every hour if any agent needs to run
setInterval(() => {
  console.log('⏰ Hourly agent check...');
  runAllAgents().catch(console.error);
}, 60 * 60 * 1000);

module.exports = { ECOM_AGENTS, runAgent, runAllAgents };
