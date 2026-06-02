# Infinite Scroll Pagination Implementation

## Overview
This document describes the complete infinite scroll (pagination) implementation for the Kanban leads board.

---

## Architecture

### Data Flow
```
API (/lids?page=1..N)
    ↓
apiLids.getList() - adds _ts cache buster
    ↓
useLeadsBoard hook - manages state & pagination
    ↓
LeadsBoard component - renders UI & triggers scroll
    ↓
LeadsKanbanBoard - displays columns with sentinel at bottom
    ↓
IntersectionObserver + Scroll event listeners - detect bottom
    ↓
loadMore() callback - increments page state
    ↓
useLeadsBoard page effect - calls loadPage({ append: true })
    ↓
mergeLidsGrouped - merges new lids with existing ones
```

---

## Core Components

### 1. useLeadsBoard Hook (`src/hooks/useLeadsBoard.js`)

**Responsibilities:**
- State management for lids, counts, loading states
- Page tracking and totalPages calculation
- Fetch lock to prevent concurrent requests
- Data merging for append operations

**Key Functions:**
- `loadPage({ pageNumber, append })` - Fetches lids and optionally merges with existing
- `loadMore()` - Called by UI when scroll reaches bottom; increments page
- Effects for filter changes and page state changes

**State Variables:**
```javascript
page              // Current page (1-based)
totalPages        // Calculated from API response
loading           // True during initial page 1 load
loadingMore       // True during page 2+ load
hasMore           // = page < totalPages
```

**Flow on Scroll:**
1. User scrolls to bottom
2. IntersectionObserver/scroll listener fires
3. `loadMore()` called → `setPage(p => p + 1)`
4. Page effect triggers → `loadPage({ pageNumber: 2, append: true })`
5. API response parsed → lids merged via `mergeLidsGrouped()`
6. UI re-renders with combined data

---

### 2. LeadsBoard Component (`src/components/leads/LeadsBoard.jsx`)

**Responsibilities:**
- Sets up IntersectionObserver on sentinel element
- Sets up scroll event listener as fallback
- Passes scroll refs to board and sentinel
- Renders spinner while loading more

**Scroll Detection Strategy (two-layer):**

**Layer 1: IntersectionObserver**
```javascript
new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) loadMore();
  },
  {
    root: rootEl || null,           // Container to observe within
    rootMargin: "400px 0px",        // Load before 400px to bottom
    threshold: 0.01                 // Minimal visibility threshold
  }
)
```

**Layer 2: Scroll Event Listener**
- Calculates `sentinel.top <= rootEl.bottom + 280px`
- Fires if sentinel becomes close to viewport bottom
- Guards against concurrent requests and restore progress

**Key Code:**
```javascript
useEffect(() => {
  const sentinel = scroll.sentinelRef.current;
  const rootEl = scroll.mainScrollRef.current;
  
  // IntersectionObserver
  const observer = new IntersectionObserver(...);
  observer.observe(sentinel);
  
  // Scroll event listener fallback
  const onScroll = () => {
    if (shouldLoadMore()) loadMore();
  };
  
  const targets = rootEl ? [rootEl, window] : [window];
  targets.forEach((t) => t.addEventListener("scroll", onScroll, { passive: true }));
  
  return () => {
    observer.disconnect();
    targets.forEach((t) => t.removeEventListener("scroll", onScroll));
  };
}, [hasMore, loading, loadingMore, loadMore, scroll]);
```

---

### 3. LeadsKanbanBoard Component (`src/components/leads/LeadsKanbanBoard.jsx`)

**Responsibilities:**
- Renders columns with lids
- Provides sentinel element at bottom for scroll detection

**Sentinel Placement:**
```javascript
<Box ref={sentinelRef} h="40px" w="full" />
```

The sentinel is placed after all columns and is used by IntersectionObserver to detect when user approaches the bottom.

---

### 4. useLeadsBoardScroll Hook (`src/hooks/useLeadsBoardScroll.js`)

**Responsibilities:**
- Persist scroll position to sessionStorage
- Restore scroll position when returning to page
- Prevent loading during restore to avoid UI flashing

**Refs:**
```javascript
mainScrollRef         // Vertical scroll container (LeadsBoard)
boardScrollRef        // Horizontal scroll container (LeadsKanbanBoard)
sentinelRef           // Bottom sentinel for intersection detection
sessionHydratedRef    // Indicates restore complete
restoreInProgressRef  // Guards against loading during restore
```

---

### 5. Response Parsing (`src/utils/lidBoard.js`)

**API Response Format:**
```json
{
  "page": 1,
  "limit": 20,
  "columns": [
    {
      "status_id": "uuid",
      "status_name": "YANGI",
      "status_color": "#888780",
      "status_order": 0,
      "total": 28,                 // ← Total items across ALL pages
      "data": [                    // ← Items for this page
        { "id": "...", "fio": "...", ... }
      ]
    }
  ]
}
```

**Parsing Functions:**

1. **extractLidsPagination(res)** - Calculates pagination metadata
   - **Priority**: Checks columns structure FIRST
   - Sums all column totals → total items
   - Calculates `totalPages = ceil(total / limit)`
   - Example: total=28, limit=20 → totalPages=2

2. **parseLidsBoardResponse(res, statusList, search)** - Extracts and normalizes lids
   - Reads `col.data` (not `col.items`)
   - Filters by search term
   - Returns `{ grouped, counts, allLids, pagination }`
   - `grouped` = { [status_id]: [lids] }

3. **mergeLidsGrouped(prev, next, statusList)** - Merges page 2 with page 1 data
   - Prevents duplicates using Set of IDs
   - Appends new lids to existing lids per status
   - Example: page1=[A,B] + page2=[C,D] → [A,B,C,D]

---

## Pagination Calculation

**Key Insight:** API returns `total` per column (total across ALL pages), not per-page count.

**Example with 28 total items:**
```
Response page 1 with limit=20:
- columns[0].total = 28 (total items in this status)
- columns[0].data.length = 20 (only page 1 items)

extractLidsPagination() logic:
- total = sum(col.total for all columns) = 28
- limit = 20
- totalPages = ceil(28 / 20) = 2 pages
- page 1 < 2 ✓ hasMore = true

User scrolls → loadMore() → page = 2
- totalPages = 2
- page 2 < 2 ✗ hasMore = false (stop loading after page 2)
```

---

## Filter Changes Reset

When user changes filter, search, role, or assigned user:

```javascript
// useLeadsBoard effect
useEffect(() => {
  setPage(1);                           // Reset to page 1
  loadPage({ pageNumber: 1, append: false });  // Replace all data
}, [search, statusFilter, assignedId, loadPage, role]);
```

This ensures:
1. Old lids are cleared
2. New filtered results start from page 1
3. Scroll position is reset in useLeadsBoardScroll

---

## Loading States & Guards

**Initial Load (page 1):**
- `loading = true` during fetch
- Shows spinner in center
- Prevents `loadMore()` from firing

**Append Load (page 2+):**
- `loadingMore = true` during fetch
- Shows small spinner at bottom
- Guards: `if (loading || loadingMore || !hasMore) return`

**Scroll Restore:**
- `restoreInProgressRef = true` during scroll restore
- Prevents `loadMore()` from firing (would interrupt restore)
- After restore completes, `sessionHydratedRef = true` allows pagination

---

## Fetch Lock Pattern

Prevents stale updates from concurrent requests:

```javascript
const fetchLock = useRef(0);

const loadPage = useCallback(async ({ pageNumber, append }) => {
  const fetchId = ++fetchLock.current;  // Get unique fetch ID
  
  try {
    const res = await apiLids.getList(params);
    
    if (fetchId !== fetchLock.current) return;  // Ignore if stale
    
    // Process response
  }
}, [...]
```

If filter changes while page 2 is loading, the older fetch ID is discarded.

---

## API Details

**Endpoint:** `GET /lids?page={page}&limit=20&_ts={timestamp}`

**Parameters:**
- `page` - 1-based page number (added by useLeadsBoard)
- `status_id` - Optional status filter
- `assigned_id` - Optional user filter
- `role` - Optional role filter
- `_ts` - Cache buster timestamp (added by apiLids.getList())

**Response Headers:**
- ✓ No custom cache headers (removed to avoid CORS)
- Uses standard HTTP cache directives

---

## Implementation Checklist

✓ `useLeadsBoard.js` - Pagination state & fetching
✓ `LeadsBoard.jsx` - IntersectionObserver + scroll listener
✓ `LeadsKanbanBoard.jsx` - Sentinel at bottom
✓ `useLeadsBoardScroll.js` - Scroll persistence
✓ `lidBoard.js` - Response parsing with `data` support
✓ `apiLids.js` - Cache-busting with `_ts` parameter

---

## Troubleshooting

**Page 2 not loading?**
1. Check `totalPages` calculation: should be 2 for 28 items
2. Verify `hasMore = page < totalPages`
3. Confirm `loadMore()` is called by console.log()
4. Check scroll distance: sentinel should be within 400px of viewport

**Duplicate lids appearing?**
1. Check `mergeLidsGrouped()` - should filter by ID
2. Verify API returns same lids on page 2 (shouldn't happen)
3. Check filter changes reset pagination

**Scroll position lost?**
1. Verify `scroll.mainScrollRef` is attached to LeadsBoard
2. Check sessionStorage has scroll data
3. Confirm `sessionHydratedRef` becomes true after restore

---

## Performance Notes

- **IntersectionObserver** is more efficient than scroll event listener
- Scroll listener is fallback for edge cases (horizontal scroll container)
- `_ts` cache buster adds ~10 bytes per request (acceptable)
- `mergeLidsGrouped()` O(n) complexity per page (acceptable for <1000 items)
- Session storage uses ~1KB per scroll state (acceptable)

