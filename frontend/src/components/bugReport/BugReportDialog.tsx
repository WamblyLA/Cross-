import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { VscChromeClose } from "react-icons/vsc";
import {
  submitBugReport,
  type BugReportPayload,
} from "../../features/bugReports/bugReportsApi";
import {
  getApiErrorDetail,
  normalizeApiError,
  type ApiError,
} from "../../lib/api/errorNormalization";
import PrimaryButton from "../../ui/PrimaryButton";

type BugReportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

function validateBugReportField(
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

export default function BugReportDialog({
  isOpen,
  onClose,
}: BugReportDialogProps) {
  const [values, setValues] = useState<BugReportPayload>({
    title: "",
    description: "",
  });
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidationVisible, setIsValidationVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setValues({
      title: "",
      description: "",
    });
    setApiError(null);
    setIsSubmitting(false);
    setIsValidationVisible(false);
    setSuccessMessage(null);
  }, [isOpen]);

  const clientErrors = useMemo(
    () => ({
      title: validateBugReportField(values.title, {
        min: 3,
        max: 120,
        emptyMessage: "Введите тему сообщения.",
        minMessage: "Тема должна быть не короче 3 символов.",
        maxMessage: "Тема должна быть не длиннее 120 символов.",
      }),
      description: validateBugReportField(values.description, {
        min: 10,
        max: 4000,
        emptyMessage: "Опишите, что пошло не так.",
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

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const handleChange = (field: keyof BugReportPayload, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setApiError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsValidationVisible(true);
    setApiError(null);
    setSuccessMessage(null);

    if (clientErrors.title || clientErrors.description) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitBugReport({
        title: values.title.trim(),
        description: values.description.trim(),
      });
      setValues({
        title: "",
        description: "",
      });
      setIsValidationVisible(false);
      setSuccessMessage("Спасибо, сообщение отправлено.");
    } catch (error) {
      setApiError(normalizeApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[185] flex items-center justify-center bg-black/45 px-4">
      <form
        onSubmit={handleSubmit}
        className="ui-dialog flex max-h-[88vh] w-[min(100%,640px)] min-w-0 flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-default px-5 py-4">
          <div>
            <div className="ui-eyebrow">Помощь</div>
            <div className="text-base text-primary">Сообщить об ошибке</div>
          </div>

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={onClose}
            title="Закрыть"
          >
            <VscChromeClose />
          </button>
        </div>

        <div className="ui-scrollbar-thin min-h-0 overflow-y-auto p-5">
          <div className="mb-4 text-sm leading-6 text-secondary">
            Опишите проблему кратко и по существу. Сообщение уйдёт разработчику в Telegram, а если вы вошли в аккаунт, мы добавим данные вашего профиля.
          </div>

          {successMessage ? (
            <div className="mb-4 rounded-[14px] border border-default bg-active px-4 py-3 text-sm text-primary">
              {successMessage}
            </div>
          ) : null}

          {generalError ? (
            <div className="mb-4 rounded-[14px] border border-[color:var(--error)] bg-[rgba(217,121,121,0.08)] px-4 py-3 text-sm text-error">
              {generalError}
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-secondary">Тема</span>
              <input
                type="text"
                value={values.title}
                onChange={(event) => handleChange("title", event.target.value)}
                className="ui-input px-3 py-2.5"
                placeholder="Например, не открывается локальная папка"
                maxLength={120}
              />
              {titleError ? <span className="text-xs text-error">{titleError}</span> : null}
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-secondary">Описание</span>
              <textarea
                value={values.description}
                onChange={(event) => handleChange("description", event.target.value)}
                className="ui-input min-h-36 resize-y px-3 py-2.5"
                placeholder="Что вы делали, что ожидали увидеть и что произошло на самом деле?"
                maxLength={4000}
              />
              {descriptionError ? (
                <span className="text-xs text-error">{descriptionError}</span>
              ) : null}
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-default px-5 py-4">
          <button
            type="button"
            className="ui-button-secondary ui-control h-11 px-4 text-sm"
            onClick={onClose}
          >
            Отмена
          </button>
          <PrimaryButton type="submit" disabled={isSubmitting} className="h-11 justify-center">
            {isSubmitting ? "Отправляем..." : "Отправить"}
          </PrimaryButton>
        </div>
      </form>
    </div>,
    document.body,
  );
}
