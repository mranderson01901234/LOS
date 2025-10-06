# New Chat Fix Test Plan

## Issue Fixed
The "New Chat" button was not properly clearing the current chat messages when creating a new conversation.

## Root Cause
The `startNewConversation` function had a race condition:
1. It would clear messages and set a new conversation ID
2. This triggered the `useEffect` which loaded messages from the database
3. But the welcome messages were added after the `useEffect` ran
4. So the `useEffect` would load empty messages, overriding the welcome messages

## Solution Implemented
1. **Added `isCreatingNew` flag** to prevent `useEffect` interference during new conversation creation
2. **Modified `startNewConversation`** to:
   - Set the `isCreatingNew` flag to `true`
   - Clear messages immediately
   - Create new conversation
   - Set conversation ID
   - Add welcome messages directly to state (bypassing `useEffect`)
   - Save welcome messages to database
   - Clear the `isCreatingNew` flag after a delay

## Test Steps
1. Open the app at `http://localhost:1420`
2. Send a message in the current conversation (e.g., "Test message 1")
3. Click the "New Chat" button
4. **Expected Result**: The chat should clear and show welcome messages
5. Send another message (e.g., "Test message 2")
6. Click on the previous conversation in the sidebar
7. **Expected Result**: Should show only "Test message 1"
8. Click on the new conversation in the sidebar
9. **Expected Result**: Should show welcome messages + "Test message 2"

## Debug Logs to Watch For
- `🔄 Starting new conversation - clearing messages`
- `✅ Created new conversation: [ID]`
- `✅ Conversation ID set to: [ID]`
- `📝 Adding welcome messages to new conversation`
- `✅ Welcome messages set in state`
- `✅ Welcome messages saved to database`
- `✅ isCreatingNew flag cleared`

## Expected Behavior
- ✅ New chat button clears current messages immediately
- ✅ New conversation shows welcome messages
- ✅ Each conversation maintains isolated message state
- ✅ No message duplication between conversations
- ✅ Switching between conversations works correctly
