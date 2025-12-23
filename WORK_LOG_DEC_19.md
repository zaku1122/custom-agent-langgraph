# Work Log - December 19, 2025

## Work Done Today

### 🎯 Paragraph-Level Citations (Gemini-style)
- Implemented paragraph-level citations instead of page-level citations for more precise referencing
- Updated backend map-reduce summarization to use `[Source X]` format with full chunk text for highlighting
- Created `SummarySource` interface with `chunkIndex`, `text` (full chunk), and `preview` fields
- Frontend now displays numbered badges (①, ②, etc.) for each source reference

### 🔧 Frontend Citation Components
- Created `SourceRef` component for clickable numbered source badges (cyan styling)
- Created `TextWithSourceRefs` component to parse `[Source X]` patterns from LLM responses
- Fixed parsing issue where combined references like `[Source 5, Source 10]` were not being converted to clickable badges
- Updated regex to handle all source pattern variations: `[Source X]`, `[Source X, Source Y]`, etc.
- Added `PageRef` component (orange `p.X` badges) for page-level references when needed

### 📄 PDF Text Highlighting Improvements
- Added fuzzy matching algorithm for more reliable paragraph highlighting
- Implemented text normalization (remove punctuation, collapse whitespace)
- Added keyword extraction (15 significant words from target text)
- Implemented sliding window approach to search across multiple text spans
- Added `source-highlight` CSS class with pulsing cyan animation
- Increased highlight delay to 800ms for better page rendering

### 🎯 Page Proximity Boost for Selected Text Queries
- When user selects text on a specific page and asks a question, the system now prioritizes nearby chunks:
  - **+20 points** for chunks on the same page as selection
  - **+10 points** for chunks on adjacent pages (±1)
  - **+5 points** for chunks within 2 pages (±2)
  - **50% penalty** for chunks more than 3 pages away
- Added `selectedPage` state tracking in frontend (`ChatContainer.tsx`)
- Backend `findRelevantChunks` now accepts and uses `selectedPage` parameter

### 💬 Conversation Memory (Short-Term Memory)
- Added session management for PDF queries to maintain conversation context
- Implemented `ConversationSession` interface with messages, timestamps, and document info
- Sessions auto-expire after 30 minutes of inactivity
- Added session endpoints: `GET /pdf/sessions`, `GET /pdf/sessions/:id`, `DELETE /pdf/sessions/:id`
- LLM now receives conversation history to understand follow-up questions and pronouns

### 🐛 Bug Fixes
- Fixed nested `<button>` HTML error in `SourcesButton` component (hydration error)
- Fixed duplicate loading indicators (both "Uploading..." and "Processing..." showing)
- Modified `MessageList.tsx` to hide agent activity indicator when `currentAgent` is `'document'` or `'pdf'`

### ⚙️ Configuration & Infrastructure
- Added Azure embeddings client configuration (`text-embedding-ada-002`)
- Made chunking parameters configurable: `chunkSize`, `overlap`, `minChunkSize`
- Added `PATCH /pdf/config` endpoint for runtime configuration updates
- Added `GET /pdf/documents/:id/summary` endpoint

### 📦 Data Structure Updates
- `PdfDocument` now stores: `fullText`, `summary`, `chunkingConfig`
- `PdfChunk` now includes: `embedding[]`, `summary`
- `PdfQueryDto` now accepts: `selectedPage`, `useSummarization`, `sessionId`
- `PdfUploadResponse` now returns: `summary`, `summarySources`, `chunkingConfig`

---

## Plan for Tomorrow
- Continue testing and refining the highlighting accuracy across different PDF types
- Address any edge cases where highlighting doesn't match correctly (complex PDFs, tables, multi-column layouts)
- Test selected text + page context feature with various scenarios
- Consider adding visual feedback when page proximity boost is applied
- Test conversation memory across multiple follow-up questions

---

## Blockers
- None

---

## Files Modified
- `backend/src/pdf/pdf.service.ts` - Map-reduce summarization, page proximity boost, session management
- `backend/src/pdf/pdf.controller.ts` - New endpoints for summarization, config, sessions
- `backend/src/pdf/dto/pdf.dto.ts` - New DTOs for summarization, sessions, chunking config
- `backend/src/config/azure.ts` - Added embeddings client configuration
- `frontend/app/components/MessageBubble.tsx` - SourceRef, TextWithSourceRefs, SourcesButton components
- `frontend/app/components/MessageList.tsx` - onPageClick prop, loading indicator fix
- `frontend/app/components/ChatContainer.tsx` - selectedPage state, handlePageClick, highlightedText
- `frontend/app/components/pdf/PdfViewer.tsx` - Fuzzy matching highlight algorithm
- `frontend/app/hooks/useChat.ts` - selectedPage handling, clearCurrentDocument
- `frontend/app/types/chat.ts` - SummarySource interface
- `frontend/app/globals.css` - source-highlight CSS animation

