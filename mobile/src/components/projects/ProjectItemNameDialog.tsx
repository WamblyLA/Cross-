import { useEffect, useMemo, useState } from "react";
import { AppModal } from "../common/AppModal";
import { AppTextField } from "../common/AppTextField";
import { normalizeCloudItemName, validateCloudItemName } from "../../lib/utils/cloudName";

type ProjectItemNameDialogProps = {
  visible: boolean;
  title: string;
  description?: string | null;
  confirmLabel: string;
  initialValue?: string;
  loading?: boolean;
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
  onClose,
  onSubmit,
}: ProjectItemNameDialogProps) {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (visible) {
      setName(initialValue);
    }
  }, [initialValue, visible]);

  const validationError = useMemo(() => validateCloudItemName(name), [name]);

  return (
    <AppModal
      confirmDisabled={Boolean(validationError)}
      confirmLabel={confirmLabel}
      confirmLoading={loading}
      description={description}
      onClose={onClose}
      onConfirm={() => {
        const normalized = normalizeCloudItemName(name);
        const nextError = validateCloudItemName(normalized);

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
