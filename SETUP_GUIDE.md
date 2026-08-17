# Quick Setup Guide - AI Behavior System

## ✅ What's Been Done

Your rYuk.ai project now has a complete AI behavior system with:

1. **Core Configuration** (`src/config/ai-behaviors.ts`)
   - ChatGPT personalities (6 variants)
   - Claude behavior patterns
   - rYuk default behavior
   - Dynamic system prompt generation

2. **API Integration** (`src/routes/api/chat.ts`)
   - Modified to accept behavior configuration
   - Supports provider and personality selection
   - Works with reasoning models (R1, O1, O3)

3. **Storage System** (`src/lib/behavior-storage.ts`)
   - Persists settings in localStorage
   - Load/save/reset functions

4. **React Hook** (`src/hooks/use-behavior-settings.tsx`)
   - Easy state management
   - Automatic persistence

5. **UI Components**
   - `BehaviorSelector.tsx` - Full behavior selector UI
   - `ChatSettings.tsx` - Ready-to-use settings panel

## 🚀 Quick Start (3 Steps)

### Step 1: Install Missing UI Components (if needed)

Check if you have the Sheet component:

```bash
# If using shadcn/ui
npx shadcn-ui@latest add sheet
```

### Step 2: Add Settings to Your Chat Interface

Find your main chat component and add the settings button:

```tsx
// In your chat component file
import { ChatSettings } from "./components/ChatSettings";
import { useBehaviorSettings } from "./hooks/use-behavior-settings";

export function ChatInterface() {
  const { provider, personality } = useBehaviorSettings();

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>rYuk.ai</h1>
        <ChatSettings />  {/* Add this */}
      </div>
      {/* Your existing chat UI */}
    </div>
  );
}
```

### Step 3: Update Your Chat API Calls

Modify your message sending function:

```tsx
const { provider, personality } = useBehaviorSettings();

const sendMessage = async (message: string) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [...conversationHistory, { role: 'user', content: message }],
      model: selectedModel,
      behavior: {           // Add this
        provider,           
        personality        
      }                    
    })
  });
  
  // Handle response...
};
```

## 🎯 How to Use

1. **Click the Settings icon** (⚙️) in your chat interface
2. **Select an AI behavior style**:
   - rYuk Default (your current behavior)
   - ChatGPT Style (with 6 personalities)
   - Claude Style (thoughtful and balanced)
3. **If ChatGPT**: Choose a personality
4. **Click "Apply Behavior Settings"**
5. **Start chatting** - the AI will respond in the selected style

## 🧪 Testing

### Test 1: rYuk Default
```
Behavior: rYuk Default
Prompt: "Explain how React hooks work"
Expected: Direct, no-filler answer with code examples
```

### Test 2: ChatGPT Friendly
```
Behavior: ChatGPT → Friendly
Prompt: "Explain how React hooks work"
Expected: Warm, conversational explanation with examples
```

### Test 3: ChatGPT Professional
```
Behavior: ChatGPT → Professional
Prompt: "Explain how React hooks work"
Expected: Formal, comprehensive technical explanation
```

### Test 4: Claude Style
```
Behavior: Claude
Prompt: "Explain how React hooks work"
Expected: Thoughtful, concise explanation in prose
```

## 📁 File Structure

```
src/
├── config/
│   └── ai-behaviors.ts              ✅ Created
├── lib/
│   └── behavior-storage.ts          ✅ Created
├── hooks/
│   └── use-behavior-settings.tsx    ✅ Created
├── components/
│   ├── BehaviorSelector.tsx         ✅ Created
│   └── ChatSettings.tsx             ✅ Created
└── routes/api/
    └── chat.ts                      ✅ Modified
```

## 🎨 Customization

### Change Default Behavior

Edit `src/lib/behavior-storage.ts`:

```typescript
// Change this:
return {
  provider: "ryuk-default",  // Change to "chatgpt" or "claude"
  personality: undefined     // Or set "friendly", "professional", etc.
};
```

### Add Custom Personality

Edit `src/config/ai-behaviors.ts`:

```typescript
export const CHATGPT_PERSONALITIES = {
  // ... existing ones
  myCustom: `Your custom behavior prompt here...`
};
```

Then update the type and UI selector.

## 💡 Behavior Comparison

| Feature | rYuk Default | ChatGPT | Claude |
|---------|--------------|---------|--------|
| Tone | Direct | Varies by personality | Warm & thoughtful |
| Formatting | Minimal | Depends on personality | Prose-focused |
| Code | Complete, no placeholders | Complete | Complete with explanation |
| Lists/Bullets | Minimal use | Varies | Rarely uses |
| Emojis | Never | Sometimes (quirky) | Rarely |
| Safety | Standard | Strong | Very strong |

## 🔧 Common Issues

### Issue: Settings not saving
**Solution**: Check browser localStorage is enabled

### Issue: Behavior not changing
**Solution**: Verify the behavior object is in your API request payload

### Issue: UI component errors
**Solution**: Install missing shadcn/ui components:
```bash
npx shadcn-ui@latest add sheet select card label button
```

## 📚 Resources

- **Full Documentation**: See `BEHAVIOR_SYSTEM_DOCS.md`
- **System Prompts**: See `src/config/ai-behaviors.ts`
- **Example Integration**: See `src/components/ChatSettings.tsx`

## ✨ Features

- ✅ 3 AI behavior styles
- ✅ 6 ChatGPT personalities
- ✅ Persistent settings (localStorage)
- ✅ Easy React integration
- ✅ Works with all your existing models
- ✅ Compatible with reasoning models
- ✅ Type-safe TypeScript implementation
- ✅ Responsive UI components

## 🎉 You're Done!

Your AI behavior system is fully set up. Just add the `<ChatSettings />` component to your UI and start using it!

**Next Steps:**
1. Add `<ChatSettings />` to your chat interface
2. Test different behaviors
3. Customize to your preferences
4. Read full docs for advanced features

---

Need help? Check `BEHAVIOR_SYSTEM_DOCS.md` for detailed documentation.
