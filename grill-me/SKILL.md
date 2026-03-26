---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

# Grill Me

Interview the user relentlessly about every aspect of a plan, design, or architecture until there is a shared understanding.

## Core behavior

- Ask questions **one at a time**.
- For each question, provide your **recommended answer**.
- Walk down each branch of the design tree and resolve dependencies in sequence.
- Do not jump ahead to implementation details before the underlying decision is clear.
- If a question can be answered by inspecting the codebase, **inspect the codebase instead of asking**.

## Use this when

- the user says "grill me"
- the user wants to stress-test a plan
- the user wants a design reviewed through questions
- a proposal has too many unstated assumptions
- architecture decisions are being made without enough clarity

## Workflow

### 1. Establish the proposal

Start by identifying:
- the plan being evaluated
- the desired end state
- the main constraint or motivation

If any of that is vague, ask for it first.

### 2. Resolve the decision tree

Ask the next most important unresolved question.

For each question:
1. ask it plainly
2. explain why it matters
3. give your recommended answer
4. wait for the user before moving on

### 3. Prefer evidence over interrogation

If the answer is available from:
- the repo
- current docs
- existing issues
- config files
- APIs or current runtime behavior

then inspect first and reduce unnecessary questioning.

### 4. Keep pressure on ambiguity

Push until these are explicit:
- goals
- non-goals
- ownership boundaries
- identity model
- data model
- failure modes
- rollout strategy
- verification strategy

## Output style

- direct
- technically rigorous
- no fluff
- one question at a time
- recommendation included with each question

## Anti-patterns

Do not:
- ask five questions at once
- accept vague answers without challenge
- skip dependency questions because the plan sounds plausible
- invent decisions that should be surfaced and agreed explicitly
