---
description: Standard Filtering Strategy (Premium UX)
---

# Standard Filtering Strategy

When building or modifying filter functionality in this application, adhere to the following premium design patterns.

## Contextual Research

The goal is to create a filter that feels **premium**, **intelligent**, and **non-cluttered**.

---

### Step 1: Filter Bar Design

A high-performance filter bar should be easy to discover, yet subtle.

- **Placement**: Top-right or centered in a toolbar.
- **Micro-Copy**: Clear, descriptive placeholders like `Search students by name...`.
- **Iconography**: Use a modern "Filter" or "Search" icon.
- **Glassmorphism**: Subtle backgrounds with semi-transparency.

---

### Step 2: Interactive Filter Chips

When a filter is applied, it should generate a **dynamic chip** to provide visual status.

1.  **Selection**: Use dropdowns, date pickers, or categorical choices.
2.  **Display**: Show as a colored badge with an `(×)` to remove.
3.  **Persistence**: Ensure chips stay pinned even after multiple selections.

---

### Step 3: Global State Synchronization

The application's filters should sync with the URL and global state.

- **URL Reflection**: Users can bookmark a specific set of filtered results.
- **AppState**: Filter changes should propagate through `AppStateProvider`.
- **State Restoration**: If a user navigates away and back, the filters remain.

---

### Step 4: Logic Precedence

A logical hierarchy governs how inputs interact.

| Feature           | Input value type                                              | Logic behavior                    |
| ----------------- | ------------------------------------------------------------- | --------------------------------- |
| **Simple Search** | Case-insensitive string matching                              | Context-aware fuzzy search        |
| **Boolean**       | Exact match                                                   | `true`/`false` / checked/unchecked |
| **Date Ranges**   | Relative (`last 30 days`) or Fixed (`2024-01-01 / 2024-03-31`) | Intersection between time periods |
| **Categorical**   | Single or multiple selection                                  | Dynamic suggestion of attributes  |

---

### Step 5: Advanced Search Operators

To enable power users to execute performant queries, intuitive shorthand operators can be used within the text input field.

| Operator | Action       | Example                        |
| -------- | ------------ | ------------------------------ |
| `:`      | Field-scoped | `status:failed`                |
| `""`     | Exact phrase | `"system critical"`            |
| `!`      | Negation     | `type:admin`                  |
| `>`      | Greater than | `score:>80`                    |
| `*`      | Wildcard     | `user:admin*`                  |
| `OR`     | Alternation  | `cat:error OR cat:fatal`       |
| `(...)`  | Nesting      | `(a:1 AND b:2) OR (c:3 AND !d:4)` |

---

### Step 6: Query Logic Processing

The filter should follow standard precedence rules to determine how multiple criteria interact.

1.  **Implicit AND**: All disconnected terms (token and chips) are combined using a logical `AND`.
2.  **Explicit OR**: Specifically designated within a field chip or through the search bar.
3.  **Parenthetical Priority**: Explicitly forced logic grouping.

---

### Step 7: Zero-State & Partial Matches

If a filter returns no result, help the user recover instead of showing an empty wall.

- **"No records match these filters"** message.
- **Clear All Filters** action.
- **"Did you mean...?"** suggestions for small typos.

---

### Final Checklist

- [ ] Does the filter disappear on mobile? (It shouldn't—use a collapsible tray).
- [ ] Is input debounced to prevent flashing?
- [ ] Are active filters visible at a glance?
- [ ] Can filters be cleared with one click?
- [ ] Do the filters look like they belong in a "premium" app? (Consistent border-radius, shadows, transitions).


## Use as Documentation

This design guide specifically defines the **Standard Filtering Strategy** for our application. When building or modifying any list or search feature, adhere to these interaction patterns to ensure a high-end, cohesive user experience.
