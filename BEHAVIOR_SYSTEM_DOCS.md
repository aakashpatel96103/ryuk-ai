# AI Behavior System Documentation

## Overview

Your rYuk.ai project now supports multiple AI behavior modes, allowing users to switch between ChatGPT-style, Claude-style, or your custom rYuk default behaviors. This system is fully integrated with your existing chat API.

## Features

### 1. **Three AI Behavior Providers**

- **rYuk Default**: Your custom balanced behavior - direct, minimal formatting, complete solutions
- **ChatGPT Style**: OpenAI ChatGPT-style interactions with 6 customizable personalities
- **Claude Style**: Anthropic Claude-style thoughtful, helpful, and harmless responses

### 2. **ChatGPT Personalities**

When using ChatGPT style, users can choose from 6 distinct personalities:

- **Professional**: Formal, comprehensive, business-focused communication
- **Friendly** (default): Warm, casual, empathetic conversational style
- **Candid**: Direct, plainspoken coaching with honest feedback
- **Quirky**: Playful, creative, imaginative with literary flair
- **Efficient**: Concise, direct, minimal conversational language
- **Cynical**: Sarcastic wit with hidden warmth and loyalty

## File Structure

```
src/
├── config/
│   └── ai-behaviors.ts          # Core behavior configurations and system prompts
├── lib/
│   └── behavior-storage.ts      # localStorage utilities for persisting settings
├── hooks/
│   └── use-behavior-settings.tsx # React hook for managing behavior state
├── components/
│   ├── BehaviorSelector.tsx     # UI component for selecting behaviors
│   └── ChatSettings.tsx         # Example integration component
└── routes/
    └── api/
        └── chat.ts              # Updated API with behavior support
```

## Quick Start

### 1. Add Settings Button to Your Chat Interface

```tsx
import { ChatSettings } from "../components/ChatSettings";

function YourChatComponent() {
  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>rYuk.ai Chat</h1>
        <ChatSettings />  {/* Add this */}
      </div>
      {/* Rest of your chat UI */}
    </div>
  );
}
```

### 2. Use Behavior Settings in API Calls

```tsx
import { useBehaviorSettings } from "../hooks/use-behavior-settings";

function YourChatComponent() {
  const { provider, personality } = useBehaviorSettings();

  const sendMessage = async (message: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        model: "deepseek/deepseek-chat",
        behavior: {
          provider: provider,      // "ryuk-default" | "chatgpt" | "claude"
          personality: personality // Only used when provider is "chatgpt"
        }
      })
    });
    
    // Handle streaming response
  };

  return (
    <div>
      <ChatSettings />
      {/* Your chat UI */}
    </div>
  );
}
```

## API Integration

### Request Format

The chat API now accepts an optional `behavior` parameter:

```typescript
POST /api/chat

{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "model": "deepseek/deepseek-chat",
  "behavior": {
    "provider": "chatgpt",      // "ryuk-default" | "chatgpt" | "claude"
    "personality": "friendly"    // Only for "chatgpt" provider
  }
}
```

### How It Works

1. **Request Processing**: The API receives the behavior configuration from the client
2. **System Prompt Generation**: Based on the provider and personality, the appropriate system prompt is dynamically generated
3. **Model Compatibility**: For reasoning models (R1, O1, O3), a minimal system prompt is used; for standard models, the full prompt is applied
4. **Response**: The AI responds according to the selected behavior configuration

## Behavior Details

### rYuk Default Behavior

Characteristics:
- Lead with the answer immediately
- No conversational filler
- Minimal formatting
- Complete, runnable code without placeholders
- Direct and precise

Best for: Developers, technical users, anyone wanting fast, no-nonsense responses

### ChatGPT Style Behaviors

#### Professional
- Formal business communication
- Comprehensive responses
- Technical jargon when appropriate
- No emojis or emoticons

#### Friendly
- Warm and conversational
- Empathetic acknowledgment
- Casual language
- Makes user feel heard

#### Candid
- Direct and plainspoken
- Honest feedback without sugarcoating
- Encouragement when struggling
- Thoughtful opinions

#### Quirky
- Creative and playful
- Uses metaphors and literary devices
- Fun and delightful responses
- Creative emojis
- Never mawkish or corny

#### Efficient
- Concise and direct
- No conversational fluff
- Perfunctory politeness
- No unsolicited greetings or closings

#### Cynical
- Sarcastic wit
- Hidden warmth and loyalty
- Genuine care on sensitive topics
- Bemused distance on emotional overtures

### Claude Style Behavior

Characteristics:
- Warm, thoughtful tone
- Treats users with kindness
- Brief and concise responses
- Minimal formatting (prose over lists)
- Defaults to helping
- Strong safety guardrails
- Thoughtful on contested topics

Best for: Users wanting balanced, considerate responses with strong ethical grounding

## Customization

### Adding New Personalities

Edit `src/config/ai-behaviors.ts`:

```typescript
export const CHATGPT_PERSONALITIES: Record<ChatGPTPersonality, string> = {
  // ... existing personalities
  custom: `Your custom personality prompt here...`,
};
```

Then update the TypeScript type:

```typescript
export type ChatGPTPersonality = 
  | "professional" 
  | "friendly" 
  | "candid" 
  | "quirky" 
  | "efficient" 
  | "cynical"
  | "custom";  // Add your new personality
```

### Modifying Existing Behaviors

All system prompts are defined in `src/config/ai-behaviors.ts`. Edit the `CHATGPT_PERSONALITIES` object or `CLAUDE_BEHAVIOR` object to customize behaviors.

## Storage

Behavior settings are stored in localStorage under the key `ryuk-ai-behavior-settings`. Settings persist across browser sessions.

To clear settings:
```typescript
import { resetBehaviorSettings } from "../lib/behavior-storage";

resetBehaviorSettings();
```

## UI Components

### BehaviorSelector

Full-featured selector with descriptions:

```tsx
<BehaviorSelector
  currentProvider={provider}
  currentPersonality={personality}
  onBehaviorChange={(provider, personality) => {
    // Handle change
  }}
/>
```

### ChatSettings

Pre-built settings panel with sheet/drawer:

```tsx
<ChatSettings />
```

## Testing

### Test Different Behaviors

```typescript
// Test rYuk default
updateBehavior("ryuk-default");

// Test ChatGPT friendly
updateBehavior("chatgpt", "friendly");

// Test ChatGPT professional
updateBehavior("chatgpt", "professional");

// Test Claude style
updateBehavior("claude");
```

### Expected Differences

**rYuk Default**:
- Response: "The function iterates through the array and returns the sum."

**ChatGPT Friendly**:
- Response: "Hey! So this function is pretty straightforward - it takes an array and adds up all the numbers..."

**ChatGPT Professional**:
- Response: "This function implements array summation utilizing iterative accumulation..."

**Claude**:
- Response: "This function calculates the sum of an array. It starts with zero and adds each element..."

## Advanced Usage

### Conditional Behavior

```typescript
const { provider, personality, updateBehavior } = useBehaviorSettings();

// Switch to professional mode for business queries
if (userMessage.includes("business report")) {
  updateBehavior("chatgpt", "professional");
}

// Switch to friendly for casual chat
if (userMessage.includes("just chatting")) {
  updateBehavior("chatgpt", "friendly");
}
```

### Per-Conversation Behavior

```typescript
// Store behavior per conversation
const [conversationBehavior, setConversationBehavior] = useState({
  provider: "ryuk-default" as AIProvider,
  personality: undefined
});

// Use conversation-specific behavior instead of global
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: conversationHistory,
    behavior: conversationBehavior  // Use local state
  })
});
```

## Troubleshooting

### Settings Not Persisting
- Check localStorage is enabled
- Verify no browser extensions blocking localStorage
- Check browser console for errors

### Wrong Behavior Applied
- Verify the behavior object is included in API request
- Check network tab to confirm request payload
- Ensure `generateSystemPrompt` is being called correctly

### UI Not Updating
- Verify `useBehaviorSettings` hook is used correctly
- Check React DevTools for state updates
- Ensure `onBehaviorChange` callback is connected

## Performance

- System prompt generation is fast (< 1ms)
- localStorage operations are synchronous but negligible
- No network overhead - settings stored locally
- Dynamic prompt generation per request adds no noticeable latency

## Security

- No sensitive data in behavior configurations
- System prompts contain safety guardrails
- All providers include child safety protections
- No user data stored in behavior settings

## Future Enhancements

Potential additions:
- Import/export behavior presets
- Custom user-defined behaviors
- Behavior templates library
- A/B testing different behaviors
- Analytics on behavior preferences
- Voice/tone intensity slider
- Context-aware automatic behavior switching

## Support

For issues or questions:
1. Check this documentation
2. Review example implementations in `ChatSettings.tsx`
3. Inspect `ai-behaviors.ts` for prompt details
4. Check browser console for errors

---

**Version**: 1.0.0  
**Last Updated**: 2026-08-17  
**Compatibility**: React 18+, TypeScript 5+
