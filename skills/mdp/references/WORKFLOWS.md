# Workflow Patterns

Common multi-step workflows using the mdp CLI. All commands use `-p .` assuming you are in the project root.

## 1. Initialize a project

```bash
# Create a new project with the software preset
mdp project create -p . --preset software

# Verify the merged settings
mdp project settings -p .
```

Available presets: `software`, `marketing`, `design`, `product`, `social-media`, `generic`.

## 2. Create milestones

```bash
# Create milestones to group related work
mdp milestone create -p . -t "v1.0 — Core Features" --due-date 2025-06-01 --priority High
mdp milestone create -p . -t "v1.1 — Polish" --due-date 2025-08-01

# Verify milestones
mdp milestone list -p .
```

## 3. Create issues with full details

```bash
# Create a parent feature issue with estimate, milestone, labels, and assignee
mdp issue create -p . \
  -t "User authentication" \
  --type feature \
  --priority High \
  --labels "auth,backend" \
  --assignee agent-1 \
  --milestone M-001 \
  --estimate 13

# Create child task issues under the parent
mdp issue create -p . \
  -t "Implement JWT tokens" \
  --type task \
  --parent ISS-001 \
  --milestone M-001 \
  --estimate 5 \
  --assignee agent-1

mdp issue create -p . \
  -t "Write auth tests" \
  --type task \
  --parent ISS-001 \
  --blocked-by ISS-002 \
  --milestone M-001 \
  --estimate 3 \
  --assignee agent-1

# Create an issue with a checklist and due date
mdp issue create -p . \
  -t "Security audit" \
  --type task \
  --priority Critical \
  --due-date 2025-05-15 \
  --checklist "Review JWT expiry,Check token rotation,Validate CORS config"

# Verify all issues
mdp issue list -p .
```

## 4. Update issue lifecycle

```bash
# Start working on an issue
mdp issue update -p . --id ISS-002 -s "In Progress"

# Add a comment to log progress
mdp issue comment -p . --id ISS-002 -b "Starting implementation. Using JWT with refresh tokens." --author agent-1

# Add checklist items as acceptance criteria
mdp issue update -p . --id ISS-002 \
  --add-checklist "Access token generation,Refresh token rotation,Token revocation"

# Check off completed items
mdp issue update -p . --id ISS-002 --check "Access token generation,Refresh token rotation"

# Record effort spent
mdp issue update -p . --id ISS-002 --spent 4

# Log completion
mdp issue comment -p . --id ISS-002 -b "Implementation complete. All tests passing." --author agent-1

# Move to done
mdp issue update -p . --id ISS-002 -s "Done"

# Check milestone progress
mdp milestone progress -p . --id M-001
```

## 5. Query and filter

```bash
# List in-progress issues assigned to a specific person
mdp issue list -p . -s "In Progress" -a agent-1

# List high-priority bugs
mdp issue list -p . --type bug --priority High

# List blocked issues
mdp issue list -p . --blocked true

# List issues for a milestone sorted by priority
mdp issue list -p . -m M-001 --sort priority --order desc

# List overdue issues
mdp issue list -p . --due-before 2025-05-01

# List overdue milestones
mdp milestone list -p . --overdue true
```
