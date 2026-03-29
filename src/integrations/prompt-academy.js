/**
 * DevBot AI — Prompt Engineering Academy Integration
 *
 * Interactive prompt engineering curriculum based on Anthropic's
 * prompt-eng-interactive-tutorial. 11 lessons from basic structure
 * to advanced chaining, tool use, and search/retrieval.
 *
 * Repo: https://github.com/anthropics/prompt-eng-interactive-tutorial
 * Revenue: $29/mo DevBot Academy (stream #44)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/academy');
const PROGRESS_PATH = resolve(DATA_DIR, 'progress.json');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Lesson Curriculum ─────────────────────────────────────────────────────
const LESSONS = [
  {
    id: 0,
    title: 'Tutorial How-To',
    description: 'Introduction to the prompt engineering tutorial — how to navigate lessons, complete exercises, and track your progress.',
    concepts: ['tutorial navigation', 'exercise format', 'evaluation criteria'],
    difficulty: 'beginner',
    exercises: [
      {
        id: 'ex-0-1',
        title: 'Your First Prompt',
        instruction: 'Write a prompt that asks Claude to explain what prompt engineering is in one paragraph.',
        hints: ['Be direct and specific about what you want', 'Specify the format (one paragraph)'],
        evaluationCriteria: ['Clear instruction', 'Specifies format', 'Focused topic'],
      },
    ],
  },
  {
    id: 1,
    title: 'Basic Prompt Structure',
    description: 'Learn the fundamental components of an effective prompt: task description, context, and expected output format.',
    concepts: ['task description', 'context setting', 'output format', 'system vs user messages'],
    difficulty: 'beginner',
    exercises: [
      {
        id: 'ex-1-1',
        title: 'Structured Task Prompt',
        instruction: 'Write a prompt that asks Claude to summarize a news article. Include: the task, context about the audience (5th graders), and specify bullet-point format.',
        hints: ['Start with what you want done', 'Mention the audience', 'Specify the output format explicitly'],
        evaluationCriteria: ['Has clear task', 'Specifies audience', 'Defines output format'],
      },
      {
        id: 'ex-1-2',
        title: 'System Message',
        instruction: 'Write a system message that sets Claude up as a helpful coding tutor who explains concepts simply.',
        hints: ['Define the role clearly', 'Specify the communication style', 'Set boundaries'],
        evaluationCriteria: ['Defines role', 'Sets tone', 'Provides behavioral guidelines'],
      },
    ],
  },
  {
    id: 2,
    title: 'Being Clear and Direct',
    description: 'Techniques for writing unambiguous prompts that minimize misinterpretation and maximize relevant output.',
    concepts: ['specificity', 'ambiguity reduction', 'explicit constraints', 'positive framing'],
    difficulty: 'beginner',
    exercises: [
      {
        id: 'ex-2-1',
        title: 'Remove Ambiguity',
        instruction: 'Rewrite this vague prompt to be clear and specific: "Tell me about dogs"',
        hints: ['What aspect of dogs?', 'For what audience?', 'How long should the response be?'],
        evaluationCriteria: ['Specifies topic aspect', 'Defines scope', 'Clear and unambiguous'],
      },
      {
        id: 'ex-2-2',
        title: 'Constraint Setting',
        instruction: 'Write a prompt asking Claude to write a poem with these constraints: exactly 4 lines, about the ocean, using iambic pentameter.',
        hints: ['List all constraints explicitly', 'Be specific about meter', 'Mention the topic directly'],
        evaluationCriteria: ['All constraints listed', 'Specific format', 'Clear topic'],
      },
    ],
  },
  {
    id: 3,
    title: 'Role Prompting',
    description: 'Assigning roles and personas to Claude to get specialized, domain-appropriate responses.',
    concepts: ['persona assignment', 'domain expertise', 'tone matching', 'role-based behavior'],
    difficulty: 'beginner',
    exercises: [
      {
        id: 'ex-3-1',
        title: 'Expert Persona',
        instruction: 'Write a prompt that assigns Claude the role of a senior database architect, then ask it to review a SQL query for performance issues.',
        hints: ['Set the role first', 'Give specific expertise level', 'Provide the task context'],
        evaluationCriteria: ['Clear role assignment', 'Relevant expertise', 'Specific task'],
      },
      {
        id: 'ex-3-2',
        title: 'Audience-Adapted Role',
        instruction: 'Write two versions of the same prompt: one where Claude is a professor explaining to grad students, and one where Claude is a children\'s science show host.',
        hints: ['Same topic, different roles', 'Match language to audience', 'Adjust complexity'],
        evaluationCriteria: ['Two distinct roles', 'Audience-appropriate language', 'Same core topic'],
      },
    ],
  },
  {
    id: 4,
    title: 'Separating Data and Instructions',
    description: 'Using delimiters, XML tags, and formatting to clearly separate input data from instructions.',
    concepts: ['XML tags', 'delimiters', 'data injection', 'template patterns', 'variable substitution'],
    difficulty: 'intermediate',
    exercises: [
      {
        id: 'ex-4-1',
        title: 'XML Tag Structure',
        instruction: 'Write a prompt that uses XML tags to separate: the instruction, the input text to analyze, and the desired output format.',
        hints: ['Use tags like <instruction>, <input>, <format>', 'Keep data clearly separated', 'Reference tags in instructions'],
        evaluationCriteria: ['Uses XML tags', 'Clear separation', 'Tags referenced in instructions'],
      },
    ],
  },
  {
    id: 5,
    title: 'Formatting Output',
    description: 'Controlling Claude\'s output format: JSON, markdown, tables, lists, and custom structures.',
    concepts: ['JSON output', 'markdown formatting', 'tables', 'structured data', 'output templates'],
    difficulty: 'intermediate',
    exercises: [
      {
        id: 'ex-5-1',
        title: 'JSON Output',
        instruction: 'Write a prompt that asks Claude to analyze a product review and return structured JSON with: sentiment (positive/negative/neutral), confidence (0-1), key_themes (array), and summary (string).',
        hints: ['Show the exact JSON schema you want', 'Be explicit about field types', 'Provide an example if needed'],
        evaluationCriteria: ['Specifies JSON format', 'Defines all fields', 'Clear data types'],
      },
      {
        id: 'ex-5-2',
        title: 'Markdown Table',
        instruction: 'Write a prompt asking Claude to compare 3 programming languages in a markdown table with columns: Language, Use Case, Learning Curve, Performance.',
        hints: ['Specify markdown table format', 'Define the columns', 'Mention how many rows'],
        evaluationCriteria: ['Requests table format', 'Specifies columns', 'Clear scope'],
      },
    ],
  },
  {
    id: 6,
    title: 'Chain of Thought (Step by Step)',
    description: 'Leveraging chain-of-thought prompting to improve reasoning, math, and complex problem-solving.',
    concepts: ['step-by-step reasoning', 'thinking tags', 'work showing', 'reasoning chains', 'self-verification'],
    difficulty: 'intermediate',
    exercises: [
      {
        id: 'ex-6-1',
        title: 'Math with Reasoning',
        instruction: 'Write a prompt that asks Claude to solve a word problem step by step, showing all work inside <thinking> tags before giving the final answer.',
        hints: ['Ask for step-by-step reasoning', 'Use thinking tags', 'Separate reasoning from answer'],
        evaluationCriteria: ['Requests step-by-step', 'Uses thinking tags', 'Separates reasoning from answer'],
      },
    ],
  },
  {
    id: 7,
    title: 'Few-Shot Prompting',
    description: 'Providing examples to guide Claude\'s behavior and output format through demonstration.',
    concepts: ['example-based learning', 'input/output pairs', 'pattern establishment', 'consistency'],
    difficulty: 'intermediate',
    exercises: [
      {
        id: 'ex-7-1',
        title: 'Classification with Examples',
        instruction: 'Write a prompt with 3 examples of sentiment classification (input text -> positive/negative/neutral), then ask Claude to classify a new text.',
        hints: ['Provide clear input/output examples', 'Use consistent formatting', 'Include variety in examples'],
        evaluationCriteria: ['3 examples provided', 'Consistent format', 'Clear classification task'],
      },
    ],
  },
  {
    id: 8,
    title: 'Avoiding Hallucinations',
    description: 'Techniques to reduce confabulation and ensure Claude admits uncertainty when appropriate.',
    concepts: ['grounding', 'source citation', 'uncertainty expression', 'knowledge boundaries', 'fact checking'],
    difficulty: 'advanced',
    exercises: [
      {
        id: 'ex-8-1',
        title: 'Grounded Response',
        instruction: 'Write a prompt that provides a short text passage, then asks Claude to answer a question ONLY using information from that passage. Include instructions for what to say if the answer is not in the passage.',
        hints: ['Provide the source text', 'Restrict to passage content only', 'Handle missing information explicitly'],
        evaluationCriteria: ['Provides source text', 'Restricts to source', 'Handles unknown cases'],
      },
    ],
  },
  {
    id: 9,
    title: 'Complex Prompts from Scratch',
    description: 'Building sophisticated multi-part prompts combining all previous techniques for real-world tasks.',
    concepts: ['prompt composition', 'multi-part tasks', 'technique combination', 'real-world applications'],
    difficulty: 'advanced',
    exercises: [
      {
        id: 'ex-9-1',
        title: 'Full Prompt Engineering',
        instruction: 'Build a complete prompt for a code review assistant that: has a role (senior engineer), uses XML tags for input code, provides structured JSON output with issues found, uses chain-of-thought for analysis, and includes 2 few-shot examples.',
        hints: ['Combine role + XML tags + JSON output + CoT + few-shot', 'Layer techniques naturally', 'Keep it coherent'],
        evaluationCriteria: ['Uses role prompting', 'XML tag structure', 'JSON output', 'Chain of thought', 'Few-shot examples'],
      },
    ],
  },
  {
    id: '10a',
    title: 'Chaining Prompts',
    description: 'Breaking complex tasks into sequential prompt chains where each step\'s output feeds the next.',
    concepts: ['prompt chaining', 'task decomposition', 'sequential processing', 'context passing'],
    difficulty: 'advanced',
    exercises: [
      {
        id: 'ex-10a-1',
        title: 'Three-Step Chain',
        instruction: 'Design a 3-step prompt chain for blog post creation: Step 1: Generate outline from topic. Step 2: Write first draft from outline. Step 3: Edit and polish the draft. Define the input/output for each step.',
        hints: ['Define each step clearly', 'Show how output feeds next step', 'Keep context flowing'],
        evaluationCriteria: ['3 clear steps', 'Output-to-input connections', 'Complete chain'],
      },
    ],
  },
  {
    id: '10b',
    title: 'Tool Use',
    description: 'Designing prompts for Claude\'s tool/function calling capabilities with proper schemas.',
    concepts: ['function calling', 'tool schemas', 'parameter design', 'result handling', 'multi-tool orchestration'],
    difficulty: 'advanced',
    exercises: [
      {
        id: 'ex-10b-1',
        title: 'Tool Definition',
        instruction: 'Define 2 tools for a weather assistant: get_weather(location, unit) and get_forecast(location, days). Write the tool descriptions and a prompt that makes Claude use them appropriately.',
        hints: ['Define clear tool schemas', 'Write good descriptions', 'Test with a user query'],
        evaluationCriteria: ['2 tool definitions', 'Clear schemas', 'Proper descriptions', 'Usage prompt'],
      },
    ],
  },
  {
    id: '10c',
    title: 'Search & Retrieval',
    description: 'Prompting techniques for RAG (Retrieval-Augmented Generation) and search-enhanced responses.',
    concepts: ['RAG patterns', 'context injection', 'source attribution', 'relevance filtering', 'document grounding'],
    difficulty: 'advanced',
    exercises: [
      {
        id: 'ex-10c-1',
        title: 'RAG Prompt',
        instruction: 'Write a RAG prompt that: takes a user question, includes 3 retrieved document chunks (use XML tags), instructs Claude to synthesize an answer from the chunks, cite sources by chunk number, and state if the chunks don\'t contain enough information.',
        hints: ['Use XML for document chunks', 'Request source citations', 'Handle insufficient info'],
        evaluationCriteria: ['Document chunks in XML', 'Citation instructions', 'Insufficiency handling', 'Synthesis instructions'],
      },
    ],
  },
];

export class PromptAcademyService {
  /** @type {Object} */
  #engine;
  /** @type {Object} */
  #progress;

  /**
   * @param {Object} [options]
   * @param {Object} [options.engine] - DevBot AI engine instance
   */
  constructor(options = {}) {
    this.#engine = options.engine || null;
    this.#progress = this.#loadProgress();
    console.log(`[DevBot][PromptAcademy] Service initialized — ${LESSONS.length} lessons available`);
  }

  /**
   * List all lessons.
   * @returns {Object[]} Lesson summaries
   */
  getLessons() {
    return LESSONS.map(l => ({
      id: l.id,
      title: l.title,
      description: l.description,
      difficulty: l.difficulty,
      exerciseCount: l.exercises.length,
      concepts: l.concepts,
    }));
  }

  /**
   * Get a specific lesson with full content and exercises.
   * @param {number|string} id - Lesson ID (0-10c)
   * @returns {Object|null} Full lesson content
   */
  getLesson(id) {
    const idStr = String(id);
    const lesson = LESSONS.find(l => String(l.id) === idStr);
    if (!lesson) return null;

    return {
      ...lesson,
      repo_url: `https://github.com/anthropics/prompt-eng-interactive-tutorial`,
      nextLesson: this.#getNextLessonId(idStr),
      previousLesson: this.#getPrevLessonId(idStr),
    };
  }

  /**
   * Generate a new practice exercise for a lesson using AI.
   * @param {number|string} lessonId - Lesson ID
   * @returns {Promise<Object>} Generated exercise
   */
  async generateExercise(lessonId) {
    const lesson = this.getLesson(lessonId);
    if (!lesson) throw new Error(`Lesson not found: ${lessonId}`);

    const prompt = `You are creating a practice exercise for a prompt engineering course.

Lesson: "${lesson.title}"
Concepts: ${lesson.concepts.join(', ')}
Difficulty: ${lesson.difficulty}

Generate a NEW exercise (different from existing ones) that tests the student's understanding of these concepts.

Provide:
1. Title (short, descriptive)
2. Instruction (clear task for the student to write a prompt)
3. Hints (2-3 helpful hints)
4. Evaluation criteria (3-5 specific things to look for in the student's prompt)

Format as JSON with keys: title, instruction, hints (array), evaluationCriteria (array).`;

    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const result = await this.#engine.generate(prompt);
        let exercise;
        try {
          exercise = typeof result === 'string' ? JSON.parse(result) : result;
        } catch {
          exercise = {
            title: `Practice: ${lesson.title}`,
            instruction: result,
            hints: ['Review the lesson concepts', 'Think about clarity and specificity'],
            evaluationCriteria: lesson.concepts.map(c => `Demonstrates understanding of ${c}`),
          };
        }
        return {
          id: `gen-${lessonId}-${Date.now()}`,
          lessonId,
          generated: true,
          generatedAt: new Date().toISOString(),
          ...exercise,
        };
      } catch (err) {
        console.error('[DevBot][PromptAcademy] Exercise generation failed:', err.message);
      }
    }

    // Fallback: return a template exercise
    return {
      id: `gen-${lessonId}-${Date.now()}`,
      lessonId,
      generated: true,
      generatedAt: new Date().toISOString(),
      title: `Practice: ${lesson.title}`,
      instruction: `Write a prompt that demonstrates your understanding of: ${lesson.concepts.join(', ')}. Apply the techniques from this lesson to a real-world scenario of your choice.`,
      hints: [
        'Review the lesson concepts before starting',
        'Think about how each concept improves your prompt',
        'Test your prompt mentally — would it produce the right output?',
      ],
      evaluationCriteria: lesson.concepts.map(c => `Correctly applies ${c}`),
    };
  }

  /**
   * AI-powered evaluation of a user's prompt attempt.
   * @param {string} prompt - The user's prompt to evaluate
   * @param {string[]} criteria - Evaluation criteria
   * @returns {Promise<Object>} Evaluation results
   */
  async evaluatePrompt(prompt, criteria) {
    if (!prompt) throw new Error('Prompt text is required');
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      throw new Error('Evaluation criteria array is required');
    }

    const evalPrompt = `You are an expert prompt engineering instructor. Evaluate this student's prompt:

<student_prompt>
${prompt}
</student_prompt>

Evaluate against these criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Provide:
1. Overall score (0-100)
2. Score for each criterion (0-100)
3. Specific feedback for each criterion
4. Strengths (what they did well)
5. Improvements (specific suggestions)
6. Revised prompt (your improved version)

Format as JSON with keys: overallScore, criteriaScores (array of {criterion, score, feedback}), strengths (array), improvements (array), revisedPrompt (string).`;

    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const result = await this.#engine.generate(evalPrompt);
        let evaluation;
        try {
          evaluation = typeof result === 'string' ? JSON.parse(result) : result;
        } catch {
          evaluation = {
            overallScore: 70,
            feedback: result,
            criteriaScores: criteria.map(c => ({ criterion: c, score: 70, feedback: 'See overall feedback' })),
            strengths: ['Attempted the exercise'],
            improvements: ['Review the lesson material for specific techniques'],
          };
        }
        return {
          evaluatedAt: new Date().toISOString(),
          prompt,
          criteria,
          ...evaluation,
          type: 'ai_evaluation',
        };
      } catch (err) {
        console.error('[DevBot][PromptAcademy] Prompt evaluation failed:', err.message);
      }
    }

    // Fallback: basic heuristic evaluation
    const wordCount = prompt.split(/\s+/).length;
    const hasXmlTags = /<\w+>/.test(prompt);
    const hasSpecificFormat = /json|markdown|table|list|bullet/i.test(prompt);
    const hasRole = /you are|act as|role|persona/i.test(prompt);
    const hasExamples = /example|for instance|e\.g\./i.test(prompt);

    const baseScore = Math.min(100, 40 + (wordCount > 10 ? 10 : 0) + (hasXmlTags ? 15 : 0) +
      (hasSpecificFormat ? 10 : 0) + (hasRole ? 10 : 0) + (hasExamples ? 15 : 0));

    return {
      evaluatedAt: new Date().toISOString(),
      prompt,
      criteria,
      overallScore: baseScore,
      criteriaScores: criteria.map(c => ({ criterion: c, score: baseScore, feedback: 'Heuristic evaluation — AI engine unavailable for detailed feedback.' })),
      strengths: [
        ...(wordCount > 20 ? ['Good level of detail'] : []),
        ...(hasXmlTags ? ['Uses XML tags for structure'] : []),
        ...(hasSpecificFormat ? ['Specifies output format'] : []),
        ...(hasRole ? ['Includes role assignment'] : []),
      ],
      improvements: [
        ...(wordCount < 20 ? ['Add more detail and specificity'] : []),
        ...(!hasXmlTags ? ['Consider using XML tags to separate data from instructions'] : []),
        ...(!hasSpecificFormat ? ['Specify the desired output format'] : []),
        ...(!hasRole ? ['Consider assigning a role for domain-specific responses'] : []),
      ],
      type: 'heuristic_evaluation',
    };
  }

  /**
   * Check completion status for a user.
   * @param {string} userId - User identifier
   * @returns {Object} Certification status
   */
  getCertification(userId) {
    if (!userId) throw new Error('User ID is required');

    const userProgress = this.#progress[userId] || {};
    const completedLessons = Object.keys(userProgress).filter(k => userProgress[k]?.completed);
    const totalLessons = LESSONS.length;
    const percentComplete = Math.round((completedLessons.length / totalLessons) * 100);

    return {
      userId,
      completedLessons: completedLessons.length,
      totalLessons,
      percentComplete,
      eligible: percentComplete >= 80,
      lessonsCompleted: completedLessons,
      lessonsRemaining: LESSONS.filter(l => !completedLessons.includes(String(l.id))).map(l => ({ id: l.id, title: l.title })),
    };
  }

  /**
   * Generate a completion certificate.
   * @param {string} userId - User identifier
   * @param {string} name - Certificate holder name
   * @returns {Object} Certificate data
   */
  generateCertificate(userId, name) {
    if (!userId) throw new Error('User ID is required');
    if (!name) throw new Error('Certificate holder name is required');

    const certification = this.getCertification(userId);
    if (!certification.eligible) {
      throw new Error(`Not eligible for certification. Complete at least 80% of lessons (currently ${certification.percentComplete}%).`);
    }

    return {
      certificateId: `DEVBOT-PA-${Date.now().toString(36).toUpperCase()}`,
      name,
      userId,
      title: 'DevBot Prompt Engineering Certification',
      description: 'Successfully completed the DevBot Prompt Engineering Academy curriculum covering fundamental to advanced prompt engineering techniques.',
      lessonsCompleted: certification.completedLessons,
      totalLessons: certification.totalLessons,
      percentComplete: certification.percentComplete,
      issuedAt: new Date().toISOString(),
      issuer: 'DevBot Academy (dwvbotai.store)',
      curriculum: 'Based on Anthropic Prompt Engineering Interactive Tutorial',
      skills: [
        'Basic Prompt Structure',
        'Clear and Direct Communication',
        'Role Prompting',
        'Data/Instruction Separation',
        'Output Formatting',
        'Chain of Thought Reasoning',
        'Few-Shot Prompting',
        'Hallucination Prevention',
        'Complex Prompt Composition',
        'Prompt Chaining',
        'Tool Use Prompting',
        'RAG/Search Prompting',
      ],
      revenue: { plan: 'DevBot Academy', pricePerMonth: 29, stream: '#44' },
    };
  }

  /**
   * Get user progress for a specific user.
   * @param {string} userId - User identifier
   * @returns {Object} Progress data
   */
  getProgress(userId) {
    if (!userId) throw new Error('User ID is required');
    return this.#progress[userId] || {};
  }

  /**
   * Update lesson progress for a user.
   * @param {string} userId - User identifier
   * @param {number|string} lessonId - Lesson ID
   * @param {Object} data - Progress data
   * @returns {Object} Updated progress
   */
  updateProgress(userId, lessonId, data = {}) {
    if (!userId) throw new Error('User ID is required');

    if (!this.#progress[userId]) {
      this.#progress[userId] = {};
    }

    this.#progress[userId][String(lessonId)] = {
      ...this.#progress[userId][String(lessonId)],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.#saveProgress();
    return this.#progress[userId];
  }

  /** Integration metadata for the registry. */
  static get registryEntry() {
    return {
      id: 'prompt-academy',
      name: 'Prompt Engineering Academy',
      repo_url: 'https://github.com/anthropics/prompt-eng-interactive-tutorial',
      type: 'tutorial',
      status: 'active',
      capabilities: [
        'lessons', 'exercises', 'prompt_evaluation',
        'progress_tracking', 'certification', 'ai_exercise_generation',
      ],
      config: {
        lessonCount: LESSONS.length,
        revenue: '$29/mo DevBot Academy',
        revenueStream: '#44',
      },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  #getNextLessonId(currentId) {
    const ids = LESSONS.map(l => String(l.id));
    const idx = ids.indexOf(currentId);
    return idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;
  }

  #getPrevLessonId(currentId) {
    const ids = LESSONS.map(l => String(l.id));
    const idx = ids.indexOf(currentId);
    return idx > 0 ? ids[idx - 1] : null;
  }

  #loadProgress() {
    try {
      if (existsSync(PROGRESS_PATH)) {
        return JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'));
      }
    } catch (err) {
      console.error('[DevBot][PromptAcademy] Failed to load progress:', err.message);
    }
    return {};
  }

  #saveProgress() {
    try {
      writeFileSync(PROGRESS_PATH, JSON.stringify(this.#progress, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DevBot][PromptAcademy] Failed to save progress:', err.message);
    }
  }
}

export default PromptAcademyService;
