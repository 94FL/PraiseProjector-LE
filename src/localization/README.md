# Localization System

This app uses a simple JSON-based localization system matching the structure of the C# app's .resx files.

## Structure

- `strings.en.json` - English translations (default)
- `strings.hu.json` - Hungarian translations
- `LocalizationContext.tsx` - Context provider and hook

## Usage

### 1. Wrap your app with LocalizationProvider

```tsx
import { LocalizationProvider } from './localization/LocalizationContext';

function App() {
  return (
    <LocalizationProvider>
      {/* Your app components */}
    </LocalizationProvider>
  );
}
```

### 2. Use the hook in components

```tsx
import { useLocalization } from '../localization/LocalizationContext';

function MyComponent() {
  const { t, language, setLanguage } = useLocalization();

  return (
    <div>
      <h1>{t('Settings')}</h1>
      <button onClick={() => setLanguage('hu')}>Magyar</button>
      <button onClick={() => setLanguage('en')}>English</button>
    </div>
  );
}
```

### 3. For class components

```tsx
import { LocalizationContext } from '../localization/LocalizationContext';

class MyClassComponent extends React.Component {
  static contextType = LocalizationContext;
  declare context: React.ContextType<typeof LocalizationContext>;

  render() {
    const { t } = this.context;
    return <h1>{t('Settings')}</h1>;
  }
}
```

## Adding new translations

1. Add the English string to `strings.en.json`
2. Add the corresponding translation to `strings.hu.json`
3. TypeScript will automatically provide autocomplete for the new keys

## Migration from C# resx files

To extract strings from C# .resx files:

```bash
# You can create a script to convert .resx to JSON
# For now, manually copy string values from:
# PraiseProjector/Properties/Strings.resx -> strings.en.json
# PraiseProjector/Properties/Strings.hu.resx -> strings.hu.json
```

## Features

- TypeScript type safety for string keys
- Automatic localStorage persistence of language preference
- Falls back to English if translation is missing
- Dispatches custom event when language changes for reactive updates
- Short `t()` alias for quick access (similar to i18next)
