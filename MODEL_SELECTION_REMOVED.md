# Model Selection Removed - Single "rYuk.ai" Model

## ✅ Changes Applied

### 1. **Removed Model Selection UI**

**Files Modified:**
- `src/routes/index.tsx`

**Changes:**
1. ✅ Removed `ModelPicker` import
2. ✅ Removed `<ModelPicker value={model} onChange={setModel} />` from composer
3. ✅ Updated header subtitle to show only plugin name (removed model name)
4. ✅ Model state remains set to `MODELS[0]` (rYuk.ai Ensemble) but hidden from user

### 2. **What Users See Now**

**Before:**
```
Header: "Chat Name"
Subtitle: "Default chat · rYuk.ai Ensemble"
Composer: [Attach] [Plugin Picker] [Model Picker] [Send]
```

**After:**
```
Header: "Chat Name"  
Subtitle: "Default chat"
Composer: [Attach] [Plugin Picker] [Send]
```

### 3. **Backend Behavior**

- ✅ All requests still use `MODELS[0]` which is "rYuk.ai Ensemble"
- ✅ The model ID is still sent to the backend API
- ✅ Backend can route to multiple models as needed
- ✅ User experience is simplified - just one unified "rYuk.ai" model

### 4. **User Experience Improvements**

✅ **Simpler UI**: No confusing model selection
✅ **Cleaner composer**: More space for plugin selector
✅ **Unified branding**: Everything is just "rYuk.ai"
✅ **Less cognitive load**: Users don't need to understand models
✅ **Backend flexibility**: You can still use multiple models behind the scenes

### 5. **Technical Details**

The model state variable still exists internally:
```typescript
const [model, setModel] = useState(MODELS[0]!.id);
```

But it's:
- ✅ Never changed by the user
- ✅ Always set to rYuk.ai Ensemble
- ✅ Still passed to API calls
- ✅ Hidden from the UI completely

### 6. **What's Still Visible**

Users can still select:
- ✅ **Plugins**: Default chat, @image, @web, @doc, @pdf, @code
- ✅ **Thread title**: Name of the conversation
- ✅ **Attachments**: Files and images

But model selection is completely hidden.

---

## 🎯 Result

Your app now presents as a **single unified AI called "rYuk.ai"** while maintaining backend flexibility to use multiple models. The UI is cleaner and less intimidating for users.

**TypeScript: ✅ 0 errors**
**Production ready: ✅**
