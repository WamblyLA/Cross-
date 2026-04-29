import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  submitBugReport,
  type BugReportPayload,
} from "../../features/bugReports/bugReportsApi";
import type { ApiError } from "../../types/api";
import { normalizeApiError } from "../../lib/errors/apiError";
import { AppButton } from "../common/AppButton";
import { AppModal } from "../common/AppModal";
import { AppTextField } from "../common/AppTextField";
import { Card } from "../common/Card";
import { InlineNotice } from "../common/InlineNotice";

function getApiErrorDetail(
  details: ApiError["details"] | undefined,
  path: string,
) {
  return details?.find((detail) => detail.path === path)?.message;
}

function validateField(
  value: string,
  options: { min: number; max: number; emptyMessage: string; minMessage: string; maxMessage: string },
) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return options.emptyMessage;
  }

  if (normalizedValue.length < options.min) {
    return options.minMessage;
  }

  if (normalizedValue.length > options.max) {
    return options.maxMessage;
  }

  return undefined;
}

export function BugReportCard() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [values, setValues] = useState<BugReportPayload>({
    title: "",
    description: "",
  });
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidationVisible, setIsValidationVisible] = useState(false);

  useEffect(() => {
    if (isDialogOpen) {
      return;
    }

    setValues({
      title: "",
      description: "",
    });
    setApiError(null);
    setIsSubmitting(false);
    setIsValidationVisible(false);
  }, [isDialogOpen]);

  const clientErrors = useMemo(
    () => ({
      title: validateField(values.title, {
        min: 3,
        max: 120,
        emptyMessage: "Введите тему сообщения.",
        minMessage: "Тема должна быть не короче 3 символов.",
        maxMessage: "Тема должна быть не длиннее 120 символов.",
      }),
      description: validateField(values.description, {
        min: 10,
        max: 4000,
        emptyMessage: "Опишите проблему подробнее.",
        minMessage: "Описание должно быть не короче 10 символов.",
        maxMessage: "Описание должно быть не длиннее 4000 символов.",
      }),
    }),
    [values.description, values.title],
  );

  const titleError =
    (isValidationVisible ? clientErrors.title : undefined) ??
    getApiErrorDetail(apiError?.details, "title");
  const descriptionError =
    (isValidationVisible ? clientErrors.description : undefined) ??
    getApiErrorDetail(apiError?.details, "description");
  const generalError =
    apiError && !titleError && !descriptionError ? apiError.message : null;

  const handleChange = (field: keyof BugReportPayload, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setApiError(null);
  };

  const handleSubmit = async () => {
    setIsValidationVisible(true);
    setApiError(null);

    if (clientErrors.title || clientErrors.description) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitBugReport({
        title: values.title.trim(),
        description: values.description.trim(),
      });
      setDialogOpen(false);
      Alert.alert("Спасибо", "Сообщение отправлено.");
    } catch (error) {
      setApiError(normalizeApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <View className="gap-4">
          <View className="gap-1">
            <Text className="will-change-variable text-xs font-bold uppercase tracking-[2.4px] text-muted">
              Помощь
            </Text>
            <Text className="will-change-variable text-sm leading-6 text-secondary">
              Если что-то сломалось или работает странно, отправьте сообщение об ошибке прямо из приложения.
            </Text>
          </View>

          <AppButton
            onPress={() => setDialogOpen(true)}
            title="Сообщить об ошибке"
            variant="secondary"
          />
        </View>
      </Card>

      <AppModal
        visible={isDialogOpen}
        title="Сообщить об ошибке"
        description="Сообщение уйдёт разработчику в Telegram. Если вы вошли в аккаунт, мы добавим данные вашего профиля."
        confirmLabel="Отправить"
        confirmLoading={isSubmitting}
        onConfirm={() => {
          void handleSubmit();
        }}
        onClose={() => setDialogOpen(false)}
      >
        <View className="gap-4">
          {generalError ? <InlineNotice text={generalError} tone="error" /> : null}

          <AppTextField
            label="Тема"
            value={values.title}
            onChangeText={(value) => handleChange("title", value)}
            placeholder="Например, не открывается локальный файл"
            error={titleError ?? null}
            autoCapitalize="sentences"
          />

          <AppTextField
            label="Описание"
            value={values.description}
            onChangeText={(value) => handleChange("description", value)}
            placeholder="Что произошло, как это воспроизвести и что вы ожидали увидеть?"
            error={descriptionError ?? null}
            autoCapitalize="sentences"
            multiline
          />
        </View>
      </AppModal>
    </>
  );
}
