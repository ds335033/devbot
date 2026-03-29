/**
 * DevBot AI — AI Agent Benchmarks Integration
 *
 * Indexes and serves evaluation data for 15 coding AI agents.
 * Provides comparisons, rankings, and AI-powered recommendations.
 *
 * Repo: https://github.com/The-Focus-AI/june-2025-coding-agent-report
 * Revenue tie-in: DevBot Academy content (stream #44)
 */

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Hardcoded Benchmark Data ──────────────────────────────────────────────
const AGENTS = [
  {
    name: 'cursor',
    displayName: 'Cursor',
    version: '0.45+',
    scores: { codeQuality: 92, speed: 88, accuracy: 90, ux: 94 },
    overall: 91,
    strengths: ['Excellent IDE integration', 'Fast multi-file editing', 'Strong context awareness', 'Tab completion is best-in-class'],
    weaknesses: ['Expensive at scale', 'Can be aggressive with changes', 'Occasional hallucinated imports'],
    bestFor: ['Full-stack development', 'Refactoring', 'Code navigation', 'Multi-file changes'],
    pricing: { free: true, pro: '$20/mo', business: '$40/mo/seat' },
    category: 'IDE-integrated',
  },
  {
    name: 'github-copilot',
    displayName: 'GitHub Copilot',
    version: '1.x',
    scores: { codeQuality: 85, speed: 90, accuracy: 83, ux: 88 },
    overall: 86.5,
    strengths: ['Ubiquitous IDE support', 'Fast inline suggestions', 'Good for boilerplate', 'Strong ecosystem'],
    weaknesses: ['Less context-aware than Cursor', 'Agent mode still maturing', 'Can be repetitive'],
    bestFor: ['Quick code completion', 'Boilerplate generation', 'Simple functions', 'Multi-IDE workflows'],
    pricing: { free: true, individual: '$10/mo', business: '$19/mo/seat', enterprise: '$39/mo/seat' },
    category: 'IDE-integrated',
  },
  {
    name: 'claude-code',
    displayName: 'Claude Code (Anthropic)',
    version: '1.x',
    scores: { codeQuality: 95, speed: 82, accuracy: 93, ux: 85 },
    overall: 88.75,
    strengths: ['Best code quality', 'Excellent reasoning', 'Strong at complex refactoring', 'Great at understanding large codebases'],
    weaknesses: ['Terminal-based (no GUI)', 'Can be slow on complex tasks', 'Requires API credits'],
    bestFor: ['Complex refactoring', 'Architecture decisions', 'Bug fixing', 'Code review', 'Large codebase navigation'],
    pricing: { free: false, api: 'Usage-based (Claude API)', maxPlan: '$100-200/mo typical' },
    category: 'CLI-agent',
  },
  {
    name: 'replit-agent',
    displayName: 'Replit Agent',
    version: '2.x',
    scores: { codeQuality: 78, speed: 85, accuracy: 76, ux: 92 },
    overall: 82.75,
    strengths: ['Zero setup required', 'Full deployment pipeline', 'Great for prototyping', 'Built-in hosting'],
    weaknesses: ['Limited language support', 'Code quality varies', 'Not ideal for large projects', 'Vendor lock-in'],
    bestFor: ['Rapid prototyping', 'Learning to code', 'Quick demos', 'Hackathons'],
    pricing: { free: true, core: '$25/mo', teams: '$40/mo/seat' },
    category: 'Cloud-IDE',
  },
  {
    name: 'v0',
    displayName: 'v0 by Vercel',
    version: '2.x',
    scores: { codeQuality: 88, speed: 91, accuracy: 85, ux: 93 },
    overall: 89.25,
    strengths: ['Best UI generation', 'Excellent React/Next.js output', 'Instant preview', 'Great design sense'],
    weaknesses: ['Frontend-focused only', 'Limited backend capabilities', 'Can over-engineer simple UIs'],
    bestFor: ['UI components', 'Landing pages', 'React components', 'Design-to-code', 'Next.js projects'],
    pricing: { free: true, premium: '$20/mo', team: '$30/mo/seat' },
    category: 'Specialized',
  },
  {
    name: 'warp',
    displayName: 'Warp AI',
    version: '2024.x',
    scores: { codeQuality: 75, speed: 88, accuracy: 78, ux: 90 },
    overall: 82.75,
    strengths: ['Best terminal experience', 'Excellent command suggestions', 'Good for DevOps tasks', 'Collaborative features'],
    weaknesses: ['Limited to terminal tasks', 'Mac/Linux only', 'Not a full coding agent'],
    bestFor: ['Terminal commands', 'DevOps workflows', 'Shell scripting', 'Server management'],
    pricing: { free: true, pro: '$18/mo', team: '$22/mo/seat' },
    category: 'Terminal',
  },
  {
    name: 'windsurf',
    displayName: 'Windsurf (Codeium)',
    version: '1.x',
    scores: { codeQuality: 87, speed: 86, accuracy: 84, ux: 89 },
    overall: 86.5,
    strengths: ['Good balance of features', 'Strong autocomplete', 'Cascade flow system', 'Competitive pricing'],
    weaknesses: ['Newer entrant — less proven', 'Occasional context confusion', 'Extension ecosystem smaller'],
    bestFor: ['General development', 'Web applications', 'Code completion', 'Budget-conscious teams'],
    pricing: { free: true, pro: '$15/mo', teams: '$35/mo/seat' },
    category: 'IDE-integrated',
  },
  {
    name: 'aider',
    displayName: 'Aider',
    version: '0.60+',
    scores: { codeQuality: 89, speed: 80, accuracy: 88, ux: 72 },
    overall: 82.25,
    strengths: ['Open source', 'Works with any LLM', 'Great git integration', 'Transparent diffs'],
    weaknesses: ['CLI only', 'Steeper learning curve', 'Requires own API keys', 'No GUI'],
    bestFor: ['Open source projects', 'Git-heavy workflows', 'Privacy-conscious teams', 'Multi-LLM experimentation'],
    pricing: { free: true, openSource: 'BYO API keys' },
    category: 'CLI-agent',
  },
  {
    name: 'cline',
    displayName: 'Cline',
    version: '3.x',
    scores: { codeQuality: 84, speed: 79, accuracy: 82, ux: 80 },
    overall: 81.25,
    strengths: ['VS Code native', 'Autonomous execution', 'Good tool use', 'Open source'],
    weaknesses: ['Can be slow', 'High token usage', 'Requires careful monitoring', 'BYO API key'],
    bestFor: ['Autonomous coding tasks', 'VS Code users', 'Complex multi-step tasks'],
    pricing: { free: true, openSource: 'BYO API keys' },
    category: 'IDE-integrated',
  },
  {
    name: 'codex-cli',
    displayName: 'OpenAI Codex CLI',
    version: '0.1+',
    scores: { codeQuality: 82, speed: 83, accuracy: 80, ux: 76 },
    overall: 80.25,
    strengths: ['OpenAI ecosystem', 'Simple interface', 'Good for quick tasks', 'Strong GPT-4o backing'],
    weaknesses: ['Early stage', 'Limited features vs competitors', 'Requires OpenAI API key'],
    bestFor: ['Quick code generation', 'OpenAI ecosystem users', 'Simple automation'],
    pricing: { free: false, api: 'Usage-based (OpenAI API)' },
    category: 'CLI-agent',
  },
  {
    name: 'devin',
    displayName: 'Devin (Cognition)',
    version: '1.x',
    scores: { codeQuality: 80, speed: 70, accuracy: 77, ux: 82 },
    overall: 77.25,
    strengths: ['Fully autonomous', 'Can handle full tasks end-to-end', 'Browser access', 'Multi-tool orchestration'],
    weaknesses: ['Expensive', 'Slow for simple tasks', 'Black box process', 'Limited transparency'],
    bestFor: ['Fully autonomous tasks', 'End-to-end feature implementation', 'Research tasks'],
    pricing: { free: false, pro: '$500/mo' },
    category: 'Autonomous',
  },
  {
    name: 'tabnine',
    displayName: 'Tabnine',
    version: '2024.x',
    scores: { codeQuality: 78, speed: 92, accuracy: 75, ux: 85 },
    overall: 82.5,
    strengths: ['Fastest completions', 'On-premise option', 'Good for enterprise', 'Privacy-focused'],
    weaknesses: ['Less capable than competitors', 'No agentic features', 'Focused on completion only'],
    bestFor: ['Enterprise environments', 'Privacy-sensitive orgs', 'Fast code completion'],
    pricing: { free: true, pro: '$12/mo', enterprise: 'Custom' },
    category: 'IDE-integrated',
  },
  {
    name: 'sourcegraph-cody',
    displayName: 'Sourcegraph Cody',
    version: '5.x',
    scores: { codeQuality: 86, speed: 81, accuracy: 85, ux: 83 },
    overall: 83.75,
    strengths: ['Best codebase search', 'Enterprise-grade context', 'Multi-repo support', 'Great for large codebases'],
    weaknesses: ['Requires Sourcegraph setup', 'Complex configuration', 'Not ideal for small projects'],
    bestFor: ['Large codebases', 'Enterprise search', 'Multi-repo projects', 'Code understanding'],
    pricing: { free: true, pro: '$9/mo', enterprise: 'Custom' },
    category: 'IDE-integrated',
  },
  {
    name: 'continue',
    displayName: 'Continue',
    version: '0.9+',
    scores: { codeQuality: 82, speed: 78, accuracy: 80, ux: 79 },
    overall: 79.75,
    strengths: ['Open source', 'Highly customizable', 'Works with any LLM', 'Good VS Code/JetBrains support'],
    weaknesses: ['Requires setup', 'Less polished UX', 'BYO API keys', 'Documentation gaps'],
    bestFor: ['Customizable workflows', 'Multi-LLM setups', 'Open source enthusiasts'],
    pricing: { free: true, openSource: 'BYO API keys' },
    category: 'IDE-integrated',
  },
  {
    name: 'bolt',
    displayName: 'Bolt.new (StackBlitz)',
    version: '2.x',
    scores: { codeQuality: 83, speed: 90, accuracy: 81, ux: 91 },
    overall: 86.25,
    strengths: ['Instant full-stack apps', 'Browser-based', 'Great for prototyping', 'Zero setup'],
    weaknesses: ['Limited to web apps', 'Code quality can vary', 'Limited customization', 'Browser constraints'],
    bestFor: ['Rapid prototyping', 'Web applications', 'Quick demos', 'Teaching/learning'],
    pricing: { free: true, pro: '$20/mo', teams: '$40/mo/seat' },
    category: 'Cloud-IDE',
  },
];

export class AgentBenchmarkService {
  /** @type {Object} */
  #engine;

  /**
   * @param {Object} [options]
   * @param {Object} [options.engine] - DevBot AI engine instance
   */
  constructor(options = {}) {
    this.#engine = options.engine || null;
    console.log(`[DevBot][AgentBenchmarks] Service initialized — ${AGENTS.length} agents indexed`);
  }

  /**
   * Get detailed report for a specific agent.
   * @param {string} agentName - Agent identifier (e.g., 'cursor', 'claude-code')
   * @returns {Object|null} Detailed agent report
   */
  getAgentReport(agentName) {
    if (!agentName) throw new Error('Agent name is required');

    const agent = AGENTS.find(a => a.name === agentName.toLowerCase());
    if (!agent) return null;

    return {
      ...agent,
      scoreBreakdown: {
        codeQuality: { score: agent.scores.codeQuality, weight: 0.30, description: 'Quality, correctness, and style of generated code' },
        speed: { score: agent.scores.speed, weight: 0.20, description: 'Response time and throughput' },
        accuracy: { score: agent.scores.accuracy, weight: 0.30, description: 'Task completion accuracy and correctness' },
        ux: { score: agent.scores.ux, weight: 0.20, description: 'User experience and ease of use' },
      },
      weightedScore: (
        agent.scores.codeQuality * 0.30 +
        agent.scores.speed * 0.20 +
        agent.scores.accuracy * 0.30 +
        agent.scores.ux * 0.20
      ).toFixed(1),
      rank: this.#getRank(agent.name),
    };
  }

  /**
   * Compare two agents side-by-side.
   * @param {string} agent1 - First agent name
   * @param {string} agent2 - Second agent name
   * @returns {Object|null} Comparison data
   */
  compareAgents(agent1, agent2) {
    if (!agent1 || !agent2) throw new Error('Two agent names are required');

    const a1 = AGENTS.find(a => a.name === agent1.toLowerCase());
    const a2 = AGENTS.find(a => a.name === agent2.toLowerCase());

    if (!a1 || !a2) {
      const missing = !a1 ? agent1 : agent2;
      throw new Error(`Agent not found: ${missing}. Available: ${AGENTS.map(a => a.name).join(', ')}`);
    }

    const categories = ['codeQuality', 'speed', 'accuracy', 'ux'];
    const comparison = {};
    for (const cat of categories) {
      comparison[cat] = {
        [a1.name]: a1.scores[cat],
        [a2.name]: a2.scores[cat],
        winner: a1.scores[cat] > a2.scores[cat] ? a1.name : a2.scores[cat] > a1.scores[cat] ? a2.name : 'tie',
        difference: Math.abs(a1.scores[cat] - a2.scores[cat]),
      };
    }

    return {
      agents: [
        { name: a1.name, displayName: a1.displayName, overall: a1.overall, rank: this.#getRank(a1.name) },
        { name: a2.name, displayName: a2.displayName, overall: a2.overall, rank: this.#getRank(a2.name) },
      ],
      comparison,
      overallWinner: a1.overall > a2.overall ? a1.name : a2.overall > a1.overall ? a2.name : 'tie',
      recommendation: a1.overall >= a2.overall
        ? `${a1.displayName} scores higher overall but ${a2.displayName} may be better for ${a2.bestFor[0]}.`
        : `${a2.displayName} scores higher overall but ${a1.displayName} may be better for ${a1.bestFor[0]}.`,
    };
  }

  /**
   * Recommend the best agent for a specific task type.
   * @param {string} taskType - Type of coding task
   * @returns {Object[]} Ranked recommendations
   */
  getBestForTask(taskType) {
    if (!taskType) throw new Error('Task type is required');

    const q = taskType.toLowerCase();
    const scored = AGENTS.map(agent => {
      let relevance = 0;
      for (const task of agent.bestFor) {
        if (task.toLowerCase().includes(q) || q.includes(task.toLowerCase())) {
          relevance += 10;
        }
      }
      for (const strength of agent.strengths) {
        if (strength.toLowerCase().includes(q)) {
          relevance += 5;
        }
      }
      return { ...agent, relevance };
    }).filter(a => a.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance || b.overall - a.overall);

    if (scored.length === 0) {
      // Fall back to top agents by overall score
      return AGENTS
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 3)
        .map(a => ({ name: a.name, displayName: a.displayName, overall: a.overall, bestFor: a.bestFor, relevance: 0, note: 'No exact task match — showing top-rated agents' }));
    }

    return scored.slice(0, 5).map(a => ({
      name: a.name,
      displayName: a.displayName,
      overall: a.overall,
      bestFor: a.bestFor,
      relevance: a.relevance,
    }));
  }

  /**
   * Get overall ranking of all agents.
   * @returns {Object[]} Ranked list of all agents with scores
   */
  getOverallRanking() {
    return AGENTS
      .sort((a, b) => b.overall - a.overall)
      .map((agent, index) => ({
        rank: index + 1,
        name: agent.name,
        displayName: agent.displayName,
        overall: agent.overall,
        scores: agent.scores,
        category: agent.category,
        pricing: agent.pricing,
      }));
  }

  /**
   * AI-powered recommendation of which agent to use for a project.
   * @param {string} projectDescription - Description of the project
   * @returns {Promise<Object>} Recommendation with reasoning
   */
  async generateRecommendation(projectDescription) {
    if (!projectDescription) throw new Error('Project description is required');

    const rankingContext = AGENTS.map(a =>
      `${a.displayName}: Overall=${a.overall}, Code=${a.scores.codeQuality}, Speed=${a.scores.speed}, Accuracy=${a.scores.accuracy}, UX=${a.scores.ux}. Best for: ${a.bestFor.join(', ')}. Pricing: ${JSON.stringify(a.pricing)}`
    ).join('\n');

    const prompt = `Based on these AI coding agent benchmarks:
${rankingContext}

Recommend the best AI coding agent for this project:
"${projectDescription}"

Provide:
1. Top 3 recommended agents with reasoning
2. Why each is suited for this project
3. Potential concerns with each choice
4. Final recommendation`;

    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const analysis = await this.#engine.generate(prompt);
        return {
          projectDescription,
          generatedAt: new Date().toISOString(),
          analysis,
          topAgents: this.getBestForTask(projectDescription).slice(0, 3),
          type: 'ai_recommendation',
        };
      } catch (err) {
        console.error('[DevBot][AgentBenchmarks] AI recommendation failed:', err.message);
      }
    }

    // Fallback: algorithmic recommendation
    const topPicks = this.getBestForTask(projectDescription).slice(0, 3);
    return {
      projectDescription,
      generatedAt: new Date().toISOString(),
      analysis: 'AI engine unavailable — algorithmic recommendation based on task matching.',
      topAgents: topPicks.length > 0 ? topPicks : this.getOverallRanking().slice(0, 3),
      type: 'algorithmic_recommendation',
    };
  }

  /**
   * List all indexed agents.
   * @returns {Object[]} Summary of all agents
   */
  listAgents() {
    return AGENTS.map(a => ({
      name: a.name,
      displayName: a.displayName,
      overall: a.overall,
      category: a.category,
      rank: this.#getRank(a.name),
    }));
  }

  /** Integration metadata for the registry. */
  static get registryEntry() {
    return {
      id: 'agent-benchmarks',
      name: 'AI Agent Benchmarks',
      repo_url: 'https://github.com/The-Focus-AI/june-2025-coding-agent-report',
      type: 'data',
      status: 'active',
      capabilities: [
        'agent_report', 'compare_agents', 'best_for_task',
        'overall_ranking', 'ai_recommendation',
      ],
      config: { agentCount: AGENTS.length, revenueStream: '#44' },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  #getRank(agentName) {
    const sorted = [...AGENTS].sort((a, b) => b.overall - a.overall);
    return sorted.findIndex(a => a.name === agentName) + 1;
  }
}

export default AgentBenchmarkService;
