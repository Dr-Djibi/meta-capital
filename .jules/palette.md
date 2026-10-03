# Palette's Journal - Critical UX & Accessibility Learnings

## 2025-05-18 - Icon-Only Action Buttons in React Native / Expo
**Learning:** Icon-only floating action buttons (FAB) and header controls in Expo/React Native apps are unannounced by screen readers (VoiceOver / TalkBack) unless explicit `accessibilityLabel` and `accessibilityRole="button"` props are provided.
**Action:** Always attach `accessibilityLabel`, `accessibilityRole="button"`, and informative `accessibilityHint` attributes to icon-only `TouchableOpacity` and `Pressable` controls.
