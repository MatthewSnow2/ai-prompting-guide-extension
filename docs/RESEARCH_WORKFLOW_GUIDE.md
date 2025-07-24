# Research & Analysis Coach – Workflow Guide  
*(File: `docs/RESEARCH_WORKFLOW_GUIDE.md`)*  

Welcome to the 🔬 **Research & Analysis Coach** – a specialist inside the AI Prompting Guide Chrome extension that walks you through a proven 7-step market-/technology-research process. Use this guide to master the workflow, issue interactive commands, and produce high-quality, data-backed insights.

---

## 1. 7-Step Process at a Glance

| # | Step | Purpose | Primary Tools / Models | Key Output |
|---|------|---------|------------------------|------------|
| 1 | **Define Research Scope & Questions** | Clarify what you’re investigating and why | ChatGPT, Claude | Research brief |
| 2 | **Gather Raw Data** | Collect information from the web & APIs | Perplexity AI, web scrapers, APIs | Raw text/data |
| 3 | **Summarize & Extract Key Insights** | Turn messy data into structured knowledge | ChatGPT, Claude | Insight summaries |
| 4 | **Analyze Competitors & Market Landscape** | Examine rivals & positioning | ChatGPT, spreadsheets | SWOT tables |
| 5 | **Identify Market Gaps & Opportunities** | Spot unmet needs & solutions | ChatGPT | Prioritised gap list |
| 6 | **Validate Findings with Data & Visualization** | Support ideas quantitatively | Python pandas, charts | Charts & metrics |
| 7 | **Compile Final Research Report** | Package everything into a polished document | ChatGPT, Docs/Notion | Professional report |

Each step builds on the previous one; completing them in order yields the best results.

---

## 2. Navigating the Workflow

The Coach accepts plain-language commands typed in the chat window. Core navigation commands:

* `Show all steps` – list the entire pipeline with brief descriptions.  
* `Start Step 1` – jump to the first step (use **Start Step X** for any other).  
* `Step 3` / `Go to Step 3` – open a specific stage you have reached.  
* `Next step` – advance when you’re ready.  
* `Previous step` – revisit the prior stage for refinements.

Progress is displayed as **Step X/7**; completed stages show ✓.

---

## 3. What to Expect in Each Step

1. **Define Research Scope & Questions**  
   • Coach suggests 5-7 research questions, scope boundaries, data types, and a deliverable outline.  
2. **Gather Raw Data**  
   • Offers copy-able Perplexity prompt and scraping pointers.  
   • Expects pasted raw notes or links back from you.  
3. **Summarize & Extract Key Insights**  
   • Provides LLM summarisation prompt; returns bullet-point insight scaffold.  
4. **Analyze Competitors & Market Landscape**  
   • Supplies SWOT prompt template; you feed competitor data → receives table.  
5. **Identify Market Gaps & Opportunities**  
   • Generates gap-analysis prompt; returns prioritised list with reasoning.  
6. **Validate Findings with Data & Visualization**  
   • Walks you through Python/pandas snippet + chart narrative.  
7. **Compile Final Research Report**  
   • Produces full report template (exec summary, trends, SWOT, gaps, visuals).  
   • Checklist appears to confirm every element is complete.

---

## 4. Interactive Commands Reference

| Command | Action |
|---------|--------|
| `Show all steps` | Display the seven-step map |
| `Start Step X` | Begin a specific step (1-7) |
| `Step X` / `Go to Step X` | Open an already-completed step for edits |
| `Next step` / `Previous step` | Linear navigation |
| `What should I research?` | Shortcut that triggers Step 1 help |
| `?` | Quick reminder of available commands |

---

## 5. Tips for Best Results

1. **Pick a narrow, actionable topic** – e.g., *“AI-powered invoice processing for SMBs”* beats *“AI in finance”*.  
2. **Paste real data** – after Step 2, drop ~1-2 K words of raw findings so the Coach can summarise effectively.  
3. **Iterate prompts** – tweak the provided templates with specific variables (dates, regions, customer segments).  
4. **Leverage multiple models** – run Step 1 in Claude for breadth, Step 3 in GPT-4o for concise summaries.  
5. **Validate with numbers** – in Step 6, link to CSVs or Google Sheets so charts are meaningful.  
6. **Reuse pieces** – you can export SWOTs or the gap list into other projects; the Coach encourages modular outputs.  

---

## 6. Practical Examples

### Example A – Rapid Market Scan (30-min Sprint)
1. `Start Step 1` → Topic *“Voice assistants for elderly care”*.  
2. Copy Perplexity prompt; paste summarized bullets back.  
3. Coach summarises; you `Next step`.  
4. Paste two competitor blurbs; SWOT appears.  
5. Coach produces three gaps (e.g., privacy-first assistant).  
6. Provide small CSV of adoption rates → chart returned.  
7. Coach compiles full report → export to Google Docs.  

### Example B – Deep-Dive with Multiple Iterations
*Run Steps 1-3 twice*: first for *global landscape*, second focusing on *EU regulation*. Merge insights before advancing.  
At Step 6, share Jupyter-generated graphs; Coach embeds them in the final Notion doc.

---

## 7. Troubleshooting & FAQs

* **Skipped a step by accident?**  
  Type `Step X` to reopen, complete outputs, then `Next step`.

* **Prompt feels generic?**  
  Add context: timeframe, geography, customer persona, KPIs.

* **Data volume overwhelming?**  
  Break Step 2 into multiple sub-searches; summarise each separately in Step 3.

* **Want to restart?**  
  Type `Restart workflow` (or simply deselect/select the specialist again).

---

## 8. Ready to Research?

Activate the 🔬 **Research & Analysis Coach**, type `Show all steps`, and embark on structured, efficient, and insight-rich research journeys — right from any webpage.
