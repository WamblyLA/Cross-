import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { createRunId } from "./utils.js";

const STORE_FILE_NAME = "run-configurations.json";

const BUILTIN_PYTHON_FILE_ID = "builtin-python-file";
const BUILTIN_CPP_FILE_ID = "builtin-cpp-file";
const BUILTIN_PYTHON_PROJECT_ID = "builtin-python-project";

function buildBuiltinPythonFileConfiguration() {
  return {
    id: BUILTIN_PYTHON_FILE_ID,
    source: "builtin",
    kind: "python-file",
    language: "python",
    mode: "file",
    name: "Python: текущий файл",
    workingDirectoryMode: "file-dir",
    interpreterPath: "auto",
    argumentsText: "",
    environmentText: "",
    compilerArgumentsText: "",
    entrypoint: "",
  };
}

function buildBuiltinCppFileConfiguration() {
  return {
    id: BUILTIN_CPP_FILE_ID,
    source: "builtin",
    kind: "cpp-file",
    language: "cpp",
    mode: "file",
    name: "C++: текущий файл",
    workingDirectoryMode: "file-dir",
    compilerPath: "auto",
    argumentsText: "",
    environmentText: "",
    compilerArgumentsText: "",
    entrypoint: "",
  };
}

function buildBuiltinPythonProjectConfiguration() {
  return {
    id: BUILTIN_PYTHON_PROJECT_ID,
    source: "builtin",
    kind: "python-project",
    language: "python",
    mode: "project",
    name: "Python: проект",
    workingDirectoryMode: "project-root",
    interpreterPath: "auto",
    argumentsText: "",
    environmentText: "",
    compilerArgumentsText: "",
    entrypoint: "",
  };
}

function getDefaultConfigurations() {
  return [
    buildBuiltinPythonFileConfiguration(),
    buildBuiltinCppFileConfiguration(),
    buildBuiltinPythonProjectConfiguration(),
  ];
}

function resolveWorkspaceKey(workspaceDescriptor) {
  if (!workspaceDescriptor) {
    throw new Error(
      "Не удалось определить контекст workspace для конфигураций запуска.",
    );
  }

  if (workspaceDescriptor.scope === "local") {
    const rootPath = `${workspaceDescriptor.rootPath ?? ""}`.trim();

    if (!rootPath) {
      throw new Error("Не удалось определить корневую папку локального проекта.");
    }

    return `local:${path.resolve(rootPath)}`;
  }

  if (workspaceDescriptor.scope === "cloud") {
    const projectId = `${workspaceDescriptor.projectId ?? ""}`.trim();

    if (!projectId) {
      throw new Error("Не удалось определить облачный проект для конфигураций запуска.");
    }

    return `cloud:${projectId}`;
  }

  throw new Error("Неизвестный тип workspace для конфигураций запуска.");
}

function createWorkspaceState() {
  return {
    selectedConfigId: null,
    configurations: [],
  };
}

function sanitizeConfiguration(configuration, source) {
  const normalizedSource = source ?? configuration.source ?? "user";
  const isBuiltin = normalizedSource === "builtin";

  return {
    id: `${configuration.id ?? createRunId("run-config")}`.trim(),
    source: normalizedSource,
    kind: configuration.kind,
    language: configuration.language,
    mode: configuration.mode,
    name: `${configuration.name ?? ""}`.trim(),
    workingDirectoryMode: configuration.workingDirectoryMode,
    interpreterPath:
      configuration.interpreterPath === undefined
        ? undefined
        : `${configuration.interpreterPath ?? ""}`.trim() || "auto",
    compilerPath:
      configuration.compilerPath === undefined
        ? undefined
        : `${configuration.compilerPath ?? ""}`.trim() || "auto",
    argumentsText: `${configuration.argumentsText ?? ""}`,
    environmentText: `${configuration.environmentText ?? ""}`,
    compilerArgumentsText: `${configuration.compilerArgumentsText ?? ""}`,
    entrypoint: `${configuration.entrypoint ?? ""}`.trim(),
    createdAt: configuration.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEditable:
      !isBuiltin ||
      configuration.kind === "python-project" ||
      configuration.kind === "python-file" ||
      configuration.kind === "cpp-file",
  };
}

function mergeConfigurations(defaultConfigurations, persistedConfigurations) {
  const persistedById = new Map(
    persistedConfigurations.map((configuration) => [configuration.id, configuration]),
  );
  const mergedConfigurations = defaultConfigurations.map((defaultConfiguration) => {
    const persistedConfiguration = persistedById.get(defaultConfiguration.id);

    if (!persistedConfiguration) {
      return sanitizeConfiguration(defaultConfiguration, "builtin");
    }

    persistedById.delete(defaultConfiguration.id);

    return sanitizeConfiguration(
      {
        ...defaultConfiguration,
        ...persistedConfiguration,
      },
      "builtin",
    );
  });

  const userConfigurations = [...persistedById.values()]
    .map((configuration) =>
      sanitizeConfiguration(configuration, configuration.source ?? "user"),
    )
    .filter((configuration) => configuration.source === "user");

  userConfigurations.sort((left, right) => left.name.localeCompare(right.name, "ru"));

  return [...mergedConfigurations, ...userConfigurations];
}

function resolveDefaultSelectedConfigId(configurations, workspaceDescriptor) {
  const activeExtension = `${workspaceDescriptor?.activeFileExtension ?? ""}`
    .trim()
    .toLowerCase();

  if (activeExtension === "py") {
    return BUILTIN_PYTHON_FILE_ID;
  }

  if (["cpp", "cc", "cxx", "hpp", "h"].includes(activeExtension)) {
    return BUILTIN_CPP_FILE_ID;
  }

  return BUILTIN_PYTHON_PROJECT_ID;
}

export function createRunConfigurationStore({ app }) {
  const getStoreFilePath = () => path.join(app.getPath("userData"), STORE_FILE_NAME);

  async function readStore() {
    const storeFilePath = getStoreFilePath();

    if (!fsSync.existsSync(storeFilePath)) {
      return {
        version: 1,
        workspaces: {},
      };
    }

    try {
      const rawText = await fs.readFile(storeFilePath, "utf-8");
      const parsedStore = JSON.parse(rawText);

      return {
        version: 1,
        workspaces: parsedStore?.workspaces ?? {},
      };
    } catch {
      return {
        version: 1,
        workspaces: {},
      };
    }
  }

  async function writeStore(nextStore) {
    const storeFilePath = getStoreFilePath();
    await fs.writeFile(storeFilePath, JSON.stringify(nextStore, null, 2), "utf-8");
  }

  async function getWorkspaceState(workspaceDescriptor) {
    const workspaceKey = resolveWorkspaceKey(workspaceDescriptor);
    const store = await readStore();
    const workspaceState = store.workspaces[workspaceKey] ?? createWorkspaceState();

    return {
      store,
      workspaceKey,
      workspaceState,
    };
  }

  async function listConfigurations(workspaceDescriptor) {
    const { workspaceKey, workspaceState } = await getWorkspaceState(workspaceDescriptor);
    const configurations = mergeConfigurations(
      getDefaultConfigurations(),
      workspaceState.configurations ?? [],
    );
    const configurationIds = new Set(configurations.map((configuration) => configuration.id));
    const selectedConfigId =
      workspaceState.selectedConfigId && configurationIds.has(workspaceState.selectedConfigId)
        ? workspaceState.selectedConfigId
        : resolveDefaultSelectedConfigId(configurations, workspaceDescriptor);

    return {
      workspaceKey,
      selectedConfigId,
      configurations,
    };
  }

  async function createConfiguration(workspaceDescriptor, configurationInput) {
    const { store, workspaceKey, workspaceState } = await getWorkspaceState(workspaceDescriptor);
    const nextConfiguration = sanitizeConfiguration(
      {
        id: createRunId("run-config"),
        source: "user",
        kind: "python-project",
        language: "python",
        mode: "project",
        workingDirectoryMode: "project-root",
        interpreterPath: "auto",
        argumentsText: "",
        environmentText: "",
        compilerArgumentsText: "",
        entrypoint: "",
        name: "Python: проект",
        ...configurationInput,
      },
      "user",
    );

    workspaceState.configurations = [...(workspaceState.configurations ?? []), nextConfiguration];
    workspaceState.selectedConfigId = nextConfiguration.id;
    store.workspaces[workspaceKey] = workspaceState;

    await writeStore(store);

    return listConfigurations(workspaceDescriptor);
  }

  async function updateConfiguration(workspaceDescriptor, configurationInput) {
    const { store, workspaceKey, workspaceState } = await getWorkspaceState(workspaceDescriptor);
    const existingIndex = (workspaceState.configurations ?? []).findIndex(
      (configuration) => configuration.id === configurationInput.id,
    );
    const defaultConfiguration = getDefaultConfigurations().find(
      (configuration) => configuration.id === configurationInput.id,
    );
    const existingConfiguration =
      existingIndex === -1
        ? defaultConfiguration ?? null
        : workspaceState.configurations[existingIndex];

    if (!existingConfiguration) {
      throw new Error("Конфигурация запуска не найдена.");
    }

    const source = existingConfiguration.source ?? defaultConfiguration?.source ?? "user";
    const nextConfiguration = sanitizeConfiguration(
      {
        ...existingConfiguration,
        ...configurationInput,
        source,
      },
      source,
    );

    if (existingIndex === -1) {
      workspaceState.configurations = [...(workspaceState.configurations ?? []), nextConfiguration];
    } else {
      workspaceState.configurations = [...workspaceState.configurations];
      workspaceState.configurations[existingIndex] = nextConfiguration;
    }

    store.workspaces[workspaceKey] = workspaceState;
    await writeStore(store);

    return listConfigurations(workspaceDescriptor);
  }

  async function deleteConfiguration(workspaceDescriptor, configurationId) {
    const { store, workspaceKey, workspaceState } = await getWorkspaceState(workspaceDescriptor);
    const nextConfigurations = (workspaceState.configurations ?? []).filter(
      (configuration) =>
        configuration.id !== configurationId || configuration.source === "builtin",
    );

    if (nextConfigurations.length === (workspaceState.configurations ?? []).length) {
      throw new Error("Нельзя удалить встроенную конфигурацию запуска.");
    }

    workspaceState.configurations = nextConfigurations;

    if (workspaceState.selectedConfigId === configurationId) {
      workspaceState.selectedConfigId = null;
    }

    store.workspaces[workspaceKey] = workspaceState;
    await writeStore(store);

    return listConfigurations(workspaceDescriptor);
  }

  async function selectConfiguration(workspaceDescriptor, configurationId) {
    const { store, workspaceKey, workspaceState } = await getWorkspaceState(workspaceDescriptor);
    const listed = await listConfigurations(workspaceDescriptor);
    const configurationExists = listed.configurations.some(
      (configuration) => configuration.id === configurationId,
    );

    if (!configurationExists) {
      throw new Error("Выбранная конфигурация запуска не найдена.");
    }

    workspaceState.selectedConfigId = configurationId;
    store.workspaces[workspaceKey] = workspaceState;
    await writeStore(store);

    return listConfigurations(workspaceDescriptor);
  }

  async function getConfiguration(workspaceDescriptor, configurationId) {
    const listed = await listConfigurations(workspaceDescriptor);

    return (
      listed.configurations.find((configuration) => configuration.id === configurationId) ?? null
    );
  }

  return {
    listConfigurations,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    selectConfiguration,
    getConfiguration,
  };
}