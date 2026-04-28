import { useEffect, useMemo, useState } from "react";
import { normalizeCloudItemName, validateCloudItemName } from "../../lib/utils/cloudName";
import { AppModal } from "../common/AppModal";
import { AppTextField } from "../common/AppTextField";

type ProjectItemNameDialogProps = {
  visible: boolean;
  title: string;
  description?: string | null;
  confirmLabel: string;
  initialValue?: string;
  loading?: boolean;
  normalizeValue?: (value: string) => string;
  validateValue?: (value: string) => string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export function ProjectItemNameDialog({
  visible,
  title,
  description = null,
  confirmLabel,
  initialValue = "",
  loading = false,
  normalizeValue = normalizeCloudItemName,
  validateValue = validateCloudItemName,
  onClose,
  onSubmit,
}: ProjectItemNameDialogProps) {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (visible) {
      setName(initialValue);
    }
  }, [initialValue, visible]);

  const validationError = useMemo(() => validateValue(name), [name, validateValue]);

  return (
    <AppModal
      confirmDisabled={Boolean(validationError)}
      confirmLabel={confirmLabel}
      confirmLoading={loading}
      description={description}
      onClose={onClose}
      onConfirm={() => {
        const normalized = normalizeValue(name);
        const nextError = validateValue(normalized);

        if (nextError) {
          return;
        }

        onSubmit(normalized);
      }}
      title={title}
      visible={visible}
    >
      <AppTextField
        autoCapitalize="none"
        error={validationError}
        label="Имя"
        onChangeText={setName}
        placeholder="Введите имя"
        value={name}
      />
    </AppModal>
  );
}
