# Team Analysis Engine
## A Thematic Analysis Framework for AI-Powered Team Signal Analysis

**Based on "Thematic Analysis: A Practical Guide" by Virginia Braun and Victoria Clarke (2022)**

This single source of truth for the document serves as the AI engine when analyzing team signals. It provides a comprehensive framework derived from established thematic analysis methodology, specifically adapted for analyzing team-related data points from various sources (Slack, CSV, Markdown).

---

## Table of Contents

1. [Foundations of Thematic Analysis for Team Analysis](#1-foundations-of-thematic-analysis-for-team-analysis)
2. [The Six-Phase Analysis Process](#2-the-six-phase-analysis-process)
3. [Coding Framework](#3-coding-framework)
4. [Theme Development Guidelines](#4-theme-development-guidelines)
5. [Quality Criteria](#5-quality-criteria)
6. [Reporting Standards](#6-reporting-standards)
7. [Common Pitfalls to Avoid](#7-common-pitfalls-to-avoid)
8. [AI-Specific Guidelines](#8-ai-specific-guidelines)
9. [Quick Reference](#9-quick-reference)

---

## 1. Foundations of Thematic Analysis for Team Analysis

### 1.1 What is Thematic Analysis?

Thematic Analysis (TA) is a method for developing, analyzing, and interpreting patterns across a qualitative dataset. In the context of team signal analysis:

- **Signal**: A single unit of data from any source (Slack message, CSV row, Markdown segment)
- **Code**: A meaningful label applied to a segment of a signal
- **Theme**: A pattern of shared meaning united by a central organizing concept
- **Theme Set**: A collection of themes that together tell a coherent story about the team

### 1.2 Core Principles

#### The Researcher as Active Analyst
**Critical Principle**: Themes do NOT "emerge" passively from data. The AI must actively engage with the data to develop themes through interpretation. This is the single most important principle.

> Themes are not discovered; they are developed through active analytical engagement with the data.

#### Themes vs. Topic Summaries
A theme is NOT simply a summary of what was said about a topic. It must capture **shared meaning** that is united by a **central organizing concept**.

**Example of a Topic Summary (NOT a theme):**
- "Reasons for team conflict: communication issues, personality clashes, resource competition"

**Example of a Theme (properly formed):**
- "Invisible Labor: The uneven distribution of coordination and maintenance work falls disproportionately on certain team members, creating resentment and burnout"

The topic summary lists; the theme interprets and identifies a unifying pattern.

### 1.3 Analytical Orientations

For team analysis, use a **hybrid approach**:

#### Inductive vs. Deductive Spectrum
- **Inductive (Data-Driven)**: Analysis is driven by the content of the signals themselves. The AI starts with fresh eyes and builds themes from what it finds in the data.
- **Deductive (Theory-Driven)**: Analysis is shaped by existing theoretical constructs (e.g., team dynamics theories, organizational behavior frameworks) that provide a lens through which to read the signals.

**For Team Analysis**: Use primarily inductive analysis, but allow deductive elements when existing team frameworks can enrich interpretation.

#### Semantic vs. Latent Spectrum
- **Semantic Level**: Focuses on the explicit, surface-level meanings in the data—what is directly stated in the signals.
- **Latent Level**: Explores the underlying meanings, assumptions, and patterns that require interpretation beyond what's explicitly stated.

**For Team Analysis**: Use both semantic and latent coding:
- Semantic coding captures what's explicitly mentioned (e.g., "the meeting was unproductive")
- Latent coding identifies underlying patterns (e.g., the assumption that certain meeting structures inherently work, when they don't for this team)

---

## 2. The Six-Phase Analysis Process

The following six phases provide a systematic approach to analyzing team signals.

### Phase 1: Dataset Familiarization

**Purpose**: Become deeply and intimately familiar with the content of all signals.

**Process**:
1. Review ALL signals in the dataset before beginning coding
2. Read signals multiple times to ensure comprehension
3. Note initial analytic ideas, patterns, or observations
4. Consider the context of each signal (source, sender, timing)
5. Document any insights about the overall dataset

**For AI Implementation**:
- Process all signals in batch before generating any themes
- Create a summary of the dataset (number of signals, sources, time range)
- Note preliminary patterns observed
- Flag any particularly rich or complex signals for special attention

**Key Practice Point**: Do not start coding until you have a good overall understanding of the dataset. Rushing to code leads to superficial analysis.

### Phase 2: Data Coding

**Purpose**: Systematically identify meaningful segments across the signals and apply concise labels.

**Process**:
1. Generate initial codes that capture meaningful features
2. Code both semantic (explicit) and latent (implicit) meanings
3. Allow codes to evolve as analysis progresses
4. Ensure each signal receives adequate attention
5. Code relevant extracts, not just whole signals

**Code Characteristics**:
- Codes should be concise but meaningful
- Codes should reduce data complexity while preserving meaning
- Codes can be descriptive (staying close to data) or interpretive (bringing analytical perspective)

**Example Codes for Team Signals**:
| Signal Extract | Code |
|---------------|------|
| "I feel like my ideas are always dismissed in meetings" | Voice not valued |
| "Sarah consistently picks up the slack when others drop the ball" | Invisible labor |
| "We need more clarity on who's responsible for what" | Role ambiguity |
| "The deadline was unrealistic given our resources" | Resource constraint |

### Phase 3: Generating Initial Themes

**Purpose**: Begin constructing themes from clusters of codes.

**Process**:
1. Review all codes and look for patterns
2. Group codes that share similar meanings
3. Identify potential themes by asking: "What do these codes have in common?"
4. Develop initial theme names that capture the essence
5. Create candidate themes—not final, but starting points

**Theme Generation Questions**:
- What idea or pattern do these codes share?
- What do they tell us about the team?
- Is there a central organizing concept that unifies them?
- How does this connect to the research question (analyzing team dynamics)?

**Theme Development NOT Topic Summary**:
Ensure themes represent interpretive patterns, not just categorical summaries. A theme should tell us something meaningful about the team, not just list what was discussed.

### Phase 4: Developing and Reviewing Themes

**Purpose**: Refine and revise themes to ensure they work with the coded data.

**Process**:
1. Review candidate themes against coded extracts
2. Check if themes are internally coherent (cohesive) and distinctive (different from each other)
3. Test themes against the full dataset (not just coded extracts)
4. Revise, split, or merge themes as needed
5. Develop subthemes that add complexity and nuance
6. Consider contradictions and negative cases

**Review Questions**:
- Does this theme have a clear central organizing concept?
- Are all the coded extracts within this theme related to that concept?
- Does this theme add something distinctive to the overall analysis?
- What are the boundaries—what's included and excluded?

### Phase 5: Refining, Defining, and Naming Themes

**Purpose**: Finalize themes with precise definitions and clear names.

**Process**:
1. Write a clear definition for each theme (2-3 sentences)
2. Name themes with concise, descriptive titles
3. Ensure theme names accurately reflect their content
4. Develop a coherent story across all themes
5. Confirm each theme addresses the research question

**Theme Definition Template**:
> "[Theme Name] represents [central organizing concept]. It is evidenced through [types of signals] that demonstrate [key patterns]. This theme connects to team dynamics by [relevance to team functioning]."

**Naming Guidelines**:
- Names should be descriptive and informative
- Avoid vague names like "Team Issues" or "Problems"
- Use names that convey the analytical interpretation
- Consider using active, dynamic language

### Phase 6: Writing the Report

**Purpose**: Present the analysis in a way that tells a compelling story.

**Process**:
1. Structure the report around themes, not data sources
2. Balance analytic narrative with illustrative signal extracts
3. Use extracts that evidence and illustrate claims
4. Tell a coherent story that addresses the team analysis question
5. Ensure extracts are properly contextualized

---

## 3. Coding Framework

### 3.1 Code Types

#### Descriptive Codes (Semantic)
Capture what is explicitly stated in the signals.

**Characteristics**:
- Stay close to the surface meaning
- Use language similar to the signal content
- Focus on manifest meanings

**Example**:
- Signal: "The code review process takes forever"
- Code: "Slow code review"

#### Interpretive Codes (Latent)
Capture the underlying meaning or conceptual significance.

**Characteristics**:
- Go beyond surface meaning
- Bring analytical perspective
- Identify assumptions and implications

**Example**:
- Signal: "The code review process takes forever"
- Code: "Process inefficiency signals lack of investment in developer experience"

### 3.2 Code Generation Guidelines

**Code Quality Standards**:
1. Each code should capture one meaningful idea
2. Codes should be specific enough to be useful
3. Codes should be general enough to allow pattern identification
4. Code labels should be concise (typically 2-5 words)
5. Codes should be meaningful outside their original context

**Coding Process**:
1. Read each signal thoroughly
2. Identify meaningful segments (not necessarily whole signals)
3. Apply codes that capture the meaning
4. Allow codes to evolve as you process more signals
5. Note connections between codes across different signals

### 3.3 Handling Contradiction

**Important**: Contradictions in signals are valuable data, not problems to ignore.

**Approaches to Contradiction**:
1. **Contradiction as Theme**: If contradiction is a pattern, it can become a theme (e.g., "Disconnection Between Stated and Actual Priorities")
2. **Multiple Perspectives**: Acknowledge that different team members may have valid but different experiences
3. **Context Matters**: Consider what contextual factors might explain contradiction

---

## 4. Theme Development Guidelines

### 4.1 What Makes a Theme

A theme in reflexive thematic analysis must have:

1. **Central Organizing Concept**: A single coherent idea that unites all elements
2. **Internal Coherence**: All parts of the theme fit together logically
3. **Distinctiveness**: The theme adds something different from other themes
4. **Patterning**: Evidence of a pattern across multiple signals

### 4.2 Theme Quality Indicators

**Strong Theme Characteristics**:
- Clear central organizing concept
- Internally coherent (all parts fit together)
- Distinct from other themes
- Supported by multiple signals from different sources
- Provides insight beyond the obvious

**Weak Theme Characteristics**:
- Vague central concept
- Includes unrelated elements
- Overlaps significantly with other themes
- Based on few signals
- Simply describes what was said (topic summary)

### 4.3 Theme Structure Options

**Simple Structure**: 3-5 themes without subthemes
- Use when analysis can be adequately captured by a small number of themes

**Complex Structure**: Themes with subthemes
- Use when themes have distinct facets that warrant separate identification
- Subthemes should still connect to the main theme's central organizing concept

**Example with Subthemes**:
- Theme: "Communication Breakdown"
  - Subtheme: "Asynchronous friction" (delayed responses, lost messages)
  - Subtheme: "Meeting dysfunction" (ineffective meetings, poor follow-up)
  - Subtheme: "Documentation gaps" (knowledge not captured or shared)

### 4.4 Determining Number of Themes

**Considerations**:
- Too few themes (1-2): Likely oversimplified
- Too many themes (10+): Likely fragmented or superficial
- Optimal range: Typically 3-8 themes for comprehensive analysis

**Quality Over Quantity**: Better to have fewer well-developed themes than many thin ones.

---

## 5. Quality Criteria

### 5.1 The 15-Point Checklist for Quality Analysis

| # | Area | Criteria |
|---|------|----------|
| 1 | Transcription/Data Preparation | Data has been processed to appropriate level of detail |
| 2 | Coding Thoroughness | Each signal has received thorough and repeated attention |
| 3 | Coding Inclusivity | Coding is thorough and comprehensive; themes not based on anecdotal examples |
| 4 | Extract Collection | All relevant extracts for each theme have been collated |
| 5 | Theme-Data Fit | Candidate themes checked against coded data AND full dataset |
| 6 | Theme Coherence | Themes are internally coherent, consistent, and distinctive |
| 7 | Interpretation | Data has been interpreted (made sense of), not just summarized |
| 8 | Evidence-Claim Fit | Analysis and data match—extracts evidence claims |
| 9 | Story Coherence | Analysis tells a convincing, well-organized story |
| 10 | Balance | Appropriate balance between analytic narrative and data extracts |
| 11 | Time Allocation | Enough time allocated for all phases |
| 12 | Approach Clarity | Specific approach and theoretical positions clearly explained |
| 13 | Method-Analysis Consistency | Claimed method and reported analysis are consistent |
| 14 | Language-Theory Fit | Language consistent with ontological/epistemological positions |
| 15 | Researcher Position | Researcher positioned as active; themes don't just "emerge" |

### 5.2 Ensuring Quality in AI Analysis

**For the AI System**:
1. **Immersion**: Process ALL signals before generating themes
2. **Iterative Refinement**: Allow themes to evolve through multiple passes
3. **Evidence Requirement**: Every theme claim must be supported by specific signal evidence
4. **Coherence Check**: Review each theme to ensure internal consistency
5. **Negative Case Analysis**: Consider signals that don't fit the patterns
6. **Avoid Premature Closure**: Don't stop at the most obvious patterns

---

## 6. Reporting Standards

### 6.1 Report Structure

**Recommended Structure**:
1. Introduction (brief context of analysis)
2. Overview of signals analyzed
3. Theme presentations (each theme with definition, narrative, and extracts)
4. Summary/Integration

### 6.2 Theme Presentation Format

For each theme, provide:

**Theme Definition**:
> Clear statement of what the theme represents (2-3 sentences)

**Analytic Narrative**:
> 1-2 paragraphs explaining the theme's significance, patterns, and connections to team dynamics

**Illustrative Extracts**:
> 2-4 specific signal examples that evidence the theme

### 6.3 Extract Selection Guidelines

**Select extracts that**:
- Most strongly and clearly evidence the theme
- Come from different sources/senders (not just one person)
- Include variety (some longer, some shorter)
- Are properly contextualized

**Avoid**:
- Over-quoting from a single source
- Using extracts without analytical commentary
- Selecting extracts that don't clearly support the claim

### 6.4 Analytical Treatment vs. Illustrative Use

**Illustrative Use**: Using extracts to provide examples of analytic points. The analysis could be understood without these specific extracts.

**Analytical Treatment**: Commenting on and making sense of specific features of extracts to advance the narrative. The analysis is developed through engagement with the extracts.

**Recommendation**: Use analytical treatment as much as possible—this demonstrates genuine engagement with the data.

---

## 7. Common Pitfalls to Avoid

### 7.1 Topic Summary (Bucket Theme)

**Problem**: Creating themes that are just lists of what was discussed, without shared meaning.

**Bad Example**:
- Theme: "Communication challenges" → lists all mentions of communication issues

**Good Example**:
- Theme: "The Paradox of Open Communication" → explores how stated openness norms clash with actual power dynamics that suppress certain voices

### 7.2 Anecdotal Approach

**Problem**: Developing themes from a few vivid examples rather than patterns across the dataset.

**Solution**: Ensure themes are supported by signals from multiple sources and demonstrate consistent patterning.

### 7.3 Premature Closure

**Problem**: Stopping analysis when only superficial, obvious patterns have been identified.

**Signs**:
- Only surface-level themes
- Themes that simply describe what was discussed
- Large number of themes indicating fragmented analysis

### 7.4 Lack of Interpretation

**Problem**: Simply describing or paraphrasing signals rather than interpreting them.

**Solution**: Move beyond description to analysis—explain what patterns mean for the team.

### 7.5 Over-Quoting

**Problem**: Using too many extracts without sufficient analytical narrative.

**Solution**: Maintain balance—analysis should be the primary focus, with extracts as supporting evidence.

---

## 8. AI-Specific Guidelines

### 8.1 Processing Signals

**Signal Pre-Processing**:
1. Load all signals from the channel
2. Record source type (Slack, CSV, Markdown)
3. Note metadata (sender, timestamp, context)
4. Process ALL signals before generating themes

**Signal Density Considerations**:
- Single short messages: Code for explicit meanings, look for patterns across multiple signals
- Long documents (e.g., interview transcripts in Markdown): Code more granularly, extract more themes

### 8.2 Prompt Structure for Analysis

When the AI analyzes team signals, structure the analysis:

**Input**:
- All signals to analyze
- Context: team analysis (understanding team dynamics, challenges, strengths)
- Any specific focus areas provided by user

**Process**:
1. Familiarize with all signals
2. Generate codes (both semantic and latent)
3. Develop initial themes
4. Review and refine themes
5. Define and name themes
6. Generate report

### 8.3 Context Awareness

**Apply User Context**:
- If user provides specific focus (e.g., "analyze for communication issues"), incorporate but don't limit to that focus
- Allow unexpected patterns to emerge

**Source Awareness**:
- Slack: May contain informal communication patterns, reactions
- CSV: Structured responses, may have categorical data
- Markdown: Rich, detailed content, often higher density

### 8.4 Handling Edge Cases

**Sparse Signals**:
- If few signals available, note limitations
- Avoid over-interpreting limited data

**Contradictory Signals**:
- Acknowledge contradictions explicitly
- Consider contradiction as potential theme

**Mixed Quality Signals**:
- Some signals may be more informative than others
- Weight evidence appropriately

---

## 9. Quick Reference

### 9.1 Key Principles Summary

| Principle | Description |
|-----------|-------------|
| Active Analysis | Themes don't emerge; they're developed through interpretation |
| Central Organizing Concept | Each theme must have a unifying idea |
| Pattern Over Description | Themes should identify patterns, not list topics |
| Quality Over Quantity | Fewer well-developed themes are better than many thin ones |
| Evidence-Based | All theme claims must be supported by signal evidence |
| Coherent Story | Themes together should tell a complete story |

### 9.2 Coding Quick Reference

| Type | Focus | Example Code |
|------|-------|--------------|
| Semantic | Explicit meaning | "Meeting complaints" |
| Latent | Underlying pattern | "Status quo defense" |
| Inductive | Data-driven | Code emerges from signals |
| Deductive | Theory-driven | Code from team frameworks |

### 9.3 Theme Quality Check

Ask for each theme:
- [ ] Is there a clear central organizing concept?
- [ ] Is it internally coherent?
- [ ] Is it distinctive from other themes?
- [ ] Does it have multiple sources of evidence?
- [ ] Does it provide insight beyond the obvious?

### 9.4 Common Theme Names for Team Analysis

Use these as inspiration (not templates):

**Communication Themes**:
- "The Silence Paradox"
- "Channels of Confusion"
- "The Documentation Debt"

**Collaboration Themes**:
- "Invisible Labor Patterns"
- "The Ownership Gap"
- "Coordination Without Credit"

**Culture Themes**:
- "The Psychological Safety Gradient"
- "Normative Assumptions"
- "The Inclusion-Exclusion Dynamic"

**Process Themes**:
- "The Efficiency-Engagement Tradeoff"
- "Role Ambiguity Friction"
- "Decision-Making Opacity"

---

## Appendix A: Signal Types and Their Treatment

### A.1 Slack Messages

**Characteristics**:
- Often short, informal
- May include reactions, threads
- Context may be implicit

**Coding Approach**:
- Capture explicit complaints, observations, suggestions
- Look for patterns across multiple messages
- Note emotional tone
- Consider thread context

### A.2 CSV Data

**Characteristics**:
- Often structured responses
- May include ratings or categories
- May have metadata columns

**Coding Approach**:
- Code both content and context of responses
- Note patterns in categorical data
- Consider what open-ended responses add

### A.3 Markdown (Observation Nodes)

**Characteristics**:
- Rich, detailed content
- Higher information density
- Often from interviews or detailed notes

**Coding Approach**:
- Code at multiple levels (sentence, paragraph, document)
- Expect more granular themes
- Look for complexity and nuance

---

## Appendix B: Theory Integration

### B.1 Relevant Team Dynamics Frameworks

When deductive coding is appropriate, consider these frameworks:

**Team Structure**:
- Role theory
- Boundary spanning
- Network theory

**Team Processes**:
- Communication theory
- Conflict theory
- Social identity theory

**Team Outcomes**:
- Psychological safety (Edmondson)
- Collective efficacy
- Team learning

### B.2 Using Theory Responsibly

**Do**:
- Use theory to enrich interpretation
- Apply theory as a lens, not a straitjacket
- Allow data to challenge theoretical assumptions

**Don't**:
- Force data to fit theory
- Ignore data that doesn't fit
- Use theory to avoid genuine engagement with data

---

## Appendix C: Output Format Template

### C.1 Analysis Output Structure

```markdown
# Team Analysis Report

## Overview
- Total signals analyzed: [number]
- Sources: [list]
- Time period: [range]
- Context: [any user-provided focus]

## Themes

### Theme 1: [Name]
**Definition**: [2-3 sentence definition]

**Analysis**: [1-2 paragraphs of analytical narrative]

**Evidence**:
- [Signal 1 excerpt]
- [Signal 2 excerpt]
- [Signal 3 excerpt]

### Theme 2: [Name]
[Same structure]

## Summary
[Overall story the themes tell about the team]
```

---

## Document Information

**Source**: Thematic Analysis: A Practical Guide (Braun & Clarke, 2022)
**Purpose**: Single source of truth for AI-powered team signal analysis
**Version**: 1.0
**Last Updated**: 2024

---

## 10. Rigorous Analysis Framework (Coverage & Quality Standards)

This section defines the mandatory quality standards for theme extraction to ensure high precision, full traceability, and zero narrative inflation.

### 10.1 Coverage Discipline (MANDATORY)

**Every signal must be accounted for exactly once at the top-level theme layer.**

- Count every input signal exactly once in the top-level theme layer.
- Do NOT drop any signal.
- Do NOT double-count signals across top-level themes.
- If a signal relates to multiple ideas, assign it to ONE primary theme and optionally list secondary tags separately.
- **Coverage check is REQUIRED** at the end of each analysis showing:
  - Total input signals
  - Total signals assigned to top-level themes
  - Any unassigned signals (list or "none")
  - Any duplicated signals (list or "none")
  - **The total assigned at the top-level MUST equal the total number of input signals**

### 10.2 Two-Layer Structure (MANDATORY)

Produce exactly two layers:

1. **Top-level product themes** - For prioritization and roadmap decisions
2. **Latent tensions or cross-cutting dynamics** - For interpretation and strategy

- Do NOT mix these layers.
- A latent theme must synthesize across multiple top-level themes; it must NOT simply rename one top-level theme.

### 10.3 Non-Overlapping Themes (MANDATORY)

- Each top-level theme must be DISTINCT and NON-OVERLAPPING.
- Avoid theme overlap such as:
  - "trust vs accuracy vs transparency" all saying the same thing
  - "sharing vs permissions vs export" split without strong reason
  - "integration vs cross-source fusion" mixed together
- If two themes could be merged without losing decision value, MERGE them.

### 10.4 Plain Naming Conventions (MANDATORY)

- Use simple, product-usable names.
- Do NOT use theatrical or consultant-style labels.
- **Bad**: "The Performative Facade of AI-Driven Insight"
- **Good**: "Low trust in AI-generated themes"
- Theme names should be understandable in a roadmap review.

### 10.5 Evidence Requirements (MANDATORY)

Every theme output must include:
- Theme name
- 1-sentence definition
- Signal IDs assigned to it
- Why those signals belong together
- Representative quotes or paraphrases
- Product implication
- **Do NOT make claims not grounded in signals**
- **If evidence is weak, state it is weak**

### 10.6 Important Distinctions to Preserve

Keep these distinctions visible when present in the data:
- Actionability vs. workflow confusion
- Trust/traceability vs. theme quality
- Ingestion/import friction vs. sharing/export friction
- Privacy/security concerns vs. permissions/access issues
- Role-based needs vs. automation-vs-control tension
- Cross-source deduplication/fusion vs. basic integration/import
- Onboarding vs. ongoing usability
- Pricing for experimentation vs. general pricing complaints

### 10.7 Include Positive Signals (MANDATORY)

- Do NOT output only pain points.
- If input includes strengths, wins, or sticky behaviors, capture them in a "Strengths / pull factors" section or assign to a positive theme.
- Positive evidence is strategically important.

### 10.8 Role Sensitivity (MANDATORY)

- Identify when different user groups want different things.
- Distinguish managers, researchers, sales, customer success, and individual contributors if signals support it.
- Do NOT flatten conflicting needs into one generic theme.

### 10.9 Actionability Standard (MANDATORY)

Recommendations must be specific and proportional to evidence. Label each recommendation as:
- UX fix
- IA/content fix
- Model/AI improvement
- Integration/platform fix
- Trust/governance fix
- Pricing/packaging consideration

### 10.10 Mandatory Output Format

For each analysis run, output in this exact structure:

**A. Dataset Accounting**
- Total signals: X
- Assigned to top-level themes: X
- Unassigned: list or "none"
- Duplicates: list or "none"

**B. Top-level themes**
For each theme:
- Name
- Definition
- Signal IDs
- Why this is one theme
- Representative evidence
- User need
- Product implication
- Recommendation
- Confidence: High / Medium / Low

**C. Latent tensions**
For each tension:
- Name
- What deeper pattern it explains
- Which top-level themes it connects
- Why it matters strategically
- Confidence: High / Medium / Low

**D. Strengths**
- List positive signals separately
- Explain what users already value

**E. Missed or weak areas**
- Call out singleton issues
- Identify themes too weak to generalize
- State where more data is needed

### 10.11 Quality Checks (MANDATORY)

Before finalizing any analysis, silently verify:
- [ ] Did I account for every signal exactly once at the top level?
- [ ] Did I separate top-level themes from latent tensions?
- [ ] Did I avoid fancy wording that hides weak evidence?
- [ ] Did I preserve important distinctions instead of collapsing everything?
- [ ] Did I include positive signals?
- [ ] Are recommendations tied directly to evidence?

### 10.12 Hard Constraints

- Do NOT use inflated language
- Do NOT invent user motives not present in the data
- Do NOT create more themes than evidence supports
- Prefer FEWER, CLEARER themes over many overlapping ones
- If a theme has only ONE signal, treat it as an isolated issue unless there is strong justification

---

*This document is adapted from established thematic analysis methodology and should be used as a guiding framework. The AI should apply these principles flexibly, adapting to the specific characteristics of each signal set while maintaining quality standards.*
