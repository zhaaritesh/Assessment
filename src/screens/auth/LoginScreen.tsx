import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { COPY } from '@/constants/copy';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { supabase } from '@/lib/supabase/client';
import type { AppColors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';
import { tokens } from '@/theme/tokens';
import { rgbaFromHex } from '@/utils/color';

import { LoginIntroBackdrop } from './LoginIntroBackdrop';
import { loginSchema, type LoginValues } from './loginSchema';

export default function LoginScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const session = useAuthSession();
  const [formError, setFormError] = useState<string | null>(null);
  const [anonymousLoading, setAnonymousLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  if (session === undefined) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (session) {
    return <Redirect href={'/' as Href} />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    Keyboard.dismiss();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setFormError(error.message);
      return;
    }
    router.replace('/' as Href);
  });

  const onAnonymous = async () => {
    if (anonymousLoading || isSubmitting) return;
    setFormError(null);
    Keyboard.dismiss();
    setAnonymousLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    setAnonymousLoading(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    router.replace('/' as Href);
  };

  const busy = isSubmitting || anonymousLoading;

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      <LoginIntroBackdrop />
      <KeyboardAvoidingView
        style={styles.layer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollInner,
              {
                paddingTop: insets.top + tokens.space.xl,
                paddingBottom: insets.bottom + tokens.space.xl,
                paddingHorizontal: tokens.space.xl,
              },
            ]}
          >
            <Animated.View entering={FadeInDown.duration(420).delay(16)} style={styles.card}>
              <View style={styles.cardInner}>
                <Text style={styles.appTitle}>{COPY.common.appName}</Text>
                <Text style={styles.title}>
                  {COPY.login.title}
                </Text>

                <Text style={[styles.label, styles.labelFirst]}>{COPY.login.emailLabel}</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={() => {
                        setFocusedField((f) => (f === 'email' ? null : f));
                        onBlur();
                      }}
                      onFocus={() => setFocusedField('email')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoComplete="email"
                      placeholder={COPY.login.emailPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                      returnKeyType="next"
                    />
                  )}
                />
                {errors.email?.message ? (
                  <Text style={styles.fieldError}>{errors.email.message}</Text>
                ) : null}

                <Text style={styles.label}>{COPY.login.passwordLabel}</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={() => {
                        setFocusedField((f) => (f === 'password' ? null : f));
                        onBlur();
                      }}
                      onFocus={() => setFocusedField('password')}
                      secureTextEntry
                      textContentType="password"
                      autoComplete="password"
                      testID="password-input"
                      accessibilityLabel="password-input"
                      placeholder={COPY.login.passwordPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                      returnKeyType="go"
                      onSubmitEditing={onSubmit}
                    />
                  )}
                />
                {errors.password?.message ? (
                  <Text style={styles.fieldError}>{errors.password.message}</Text>
                ) : null}

                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                <AppButton
                  variant="primary"
                  onPress={onSubmit}
                  disabled={anonymousLoading}
                  loading={isSubmitting}
                  style={[styles.button, busy && !isSubmitting && styles.buttonDisabled]}
                >
                  {COPY.login.submit}
                </AppButton>

                <Pressable
                  onPress={onAnonymous}
                  disabled={busy}
                  hitSlop={14}
                  style={({ pressed }) => [styles.linkWrap, pressed && styles.linkPressed]}
                >
                  {anonymousLoading ? (
                    <ActivityIndicator color={colors.textMuted} style={styles.linkSpinner} />
                  ) : (
                    <Text style={styles.linkText}>{COPY.login.submitAnonymous}</Text>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(c: AppColors, isDark: boolean) {
  const glassSurface = rgbaFromHex(
    c.surface,
    isDark ? tokens.opacity.loginGlassSurfaceDark : tokens.opacity.loginGlassSurfaceLight
  );
  const glassFrameOuter = rgbaFromHex(
    c.text,
    isDark ? tokens.opacity.loginGlassFrameFromText.dark : tokens.opacity.loginGlassFrameFromText.light
  );
  const glassInnerStroke = rgbaFromHex(
    c.primary,
    isDark ? tokens.opacity.loginGlassInner.dark : tokens.opacity.loginGlassInner.light
  );

  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.loginShell },
    layer: { flex: 1, backgroundColor: 'transparent', zIndex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollInner: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    card: {
      maxWidth: 400,
      alignSelf: 'center',
      width: '100%',
      borderRadius: tokens.radius.xl,
      padding: 1,
      backgroundColor: glassFrameOuter,
      ...tokens.shadow.card,
      shadowOpacity: isDark ? 0.35 : tokens.shadow.card.shadowOpacity,
    },
    cardInner: {
      backgroundColor: glassSurface,
      borderRadius: tokens.radius.xl - 1,
      padding: tokens.space.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: glassInnerStroke,
    },
    appTitle: {
      fontSize: 14,
      fontFamily: fontFamily.bodyMedium,
      color: c.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: tokens.space.sm,
    },
    title: {
      fontSize: 26,
      color: c.text,
      fontFamily: fontFamily.displaySemiBold,
      letterSpacing: -0.65,
      lineHeight: 30,
      marginBottom: tokens.space.xl - 2,
    },
    label: {
      fontSize: 13,
      fontFamily: fontFamily.bodyMedium,
      color: c.textSecondary,
      marginTop: tokens.space.lg,
      marginBottom: 2,
    },
    labelFirst: {
      marginTop: 0,
    },
    input: {
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      borderRadius: 0,
      paddingHorizontal: 0,
      paddingVertical: tokens.space.sm + 4,
      fontSize: 17,
      color: c.text,
      backgroundColor: 'transparent',
      fontFamily: fontFamily.body,
    },
    inputFocused: {
      borderBottomColor: c.primary,
      borderBottomWidth: 2,
    },
    fieldError: {
      color: c.error,
      fontSize: 13,
      marginTop: 6,
      fontFamily: fontFamily.body,
    },
    formError: {
      color: c.error,
      fontSize: 14,
      marginTop: tokens.space.md,
      fontFamily: fontFamily.body,
    },
    button: {
      marginTop: tokens.space.xl,
      paddingVertical: tokens.space.md + 6,
      borderRadius: tokens.radius.md,
    },
    buttonDisabled: { opacity: 0.55 },
    linkWrap: {
      marginTop: tokens.space.lg,
      paddingVertical: tokens.space.sm,
      alignItems: 'center',
    },
    linkPressed: { opacity: 0.65 },
    linkSpinner: { paddingVertical: 4 },
    linkText: {
      fontSize: 15,
      fontFamily: fontFamily.body,
      color: c.textMuted,
      letterSpacing: -0.1,
    },
  });
}
