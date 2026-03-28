import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeApiError, type ApiError } from "../../lib/api/errorNormalization";
import type { StateType } from "../../store/store";
import * as cloudApi from "./cloudApi";
import type { CloudFile, CloudFileSummary, CloudProject } from "./cloudTypes";

type CloudThunkConfig = {
  state: StateType;
  rejectValue: ApiError;
};

export const fetchProjects = createAsyncThunk<
  { projects: CloudProject[] },
  void,
  CloudThunkConfig
>("cloud/fetchProjects", async (_, { rejectWithValue }) => {
  try {
    return await cloudApi.listProjects();
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const fetchProject = createAsyncThunk<
  { project: CloudProject },
  { projectId: string },
  CloudThunkConfig
>("cloud/fetchProject", async ({ projectId }, { rejectWithValue }) => {
  try {
    return await cloudApi.getProject(projectId);
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const createCloudProject = createAsyncThunk<
  { project: CloudProject },
  { name: string },
  CloudThunkConfig
>("cloud/createProject", async ({ name }, { rejectWithValue }) => {
  try {
    return await cloudApi.createProject({ name });
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const renameCloudProject = createAsyncThunk<
  { project: CloudProject },
  { projectId: string; name: string },
  CloudThunkConfig
>("cloud/renameProject", async ({ projectId, name }, { rejectWithValue }) => {
  try {
    return await cloudApi.renameProject(projectId, { name });
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const deleteCloudProject = createAsyncThunk<
  { projectId: string },
  { projectId: string },
  CloudThunkConfig
>("cloud/deleteProject", async ({ projectId }, { rejectWithValue }) => {
  try {
    await cloudApi.deleteProject(projectId);
    return { projectId };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const fetchProjectFiles = createAsyncThunk<
  { projectId: string; files: CloudFileSummary[] },
  { projectId: string },
  CloudThunkConfig
>("cloud/fetchProjectFiles", async ({ projectId }, { rejectWithValue }) => {
  try {
    const response = await cloudApi.listProjectFiles(projectId);
    return {
      projectId,
      files: response.files,
    };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const fetchProjectFile = createAsyncThunk<
  { file: CloudFile },
  { projectId: string; fileId: string },
  CloudThunkConfig
>("cloud/fetchProjectFile", async ({ projectId, fileId }, { rejectWithValue }) => {
  try {
    return await cloudApi.getProjectFile(projectId, fileId);
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const createCloudProjectFile = createAsyncThunk<
  { file: CloudFile },
  { projectId: string; name: string; content?: string },
  CloudThunkConfig
>("cloud/createProjectFile", async ({ projectId, name, content }, { rejectWithValue }) => {
  try {
    return await cloudApi.createProjectFile(projectId, { name, content });
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const renameCloudProjectFile = createAsyncThunk<
  { file: CloudFile },
  { projectId: string; fileId: string; name: string },
  CloudThunkConfig
>("cloud/renameProjectFile", async ({ projectId, fileId, name }, { rejectWithValue }) => {
  try {
    return await cloudApi.updateProjectFile(projectId, fileId, { name });
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const saveCloudProjectFile = createAsyncThunk<
  { file: CloudFile },
  { projectId: string; fileId: string; content: string },
  CloudThunkConfig
>("cloud/saveProjectFile", async ({ projectId, fileId, content }, { rejectWithValue }) => {
  try {
    return await cloudApi.updateProjectFile(projectId, fileId, { content });
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const deleteCloudProjectFile = createAsyncThunk<
  { projectId: string; fileId: string },
  { projectId: string; fileId: string },
  CloudThunkConfig
>("cloud/deleteProjectFile", async ({ projectId, fileId }, { rejectWithValue }) => {
  try {
    await cloudApi.deleteProjectFile(projectId, fileId);
    return { projectId, fileId };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});
