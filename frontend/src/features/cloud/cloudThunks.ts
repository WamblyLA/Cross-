import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeApiError, type ApiError } from "../../lib/api/errorNormalization";
import type { StateType } from "../../store/store";
import * as cloudApi from "./cloudApi";
import type {
  CloudFile,
  CloudFileSummary,
  CloudFolderSummary,
  PendingProjectInvitation,
  ProjectMember,
  ProjectMemberRole,
  CloudProject,
  CloudProjectTree,
} from "./cloudTypes";

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

export const fetchProjectTree = createAsyncThunk<
  { projectId: string; tree: CloudProjectTree },
  { projectId: string },
  CloudThunkConfig
>("cloud/fetchProjectTree", async ({ projectId }, { rejectWithValue }) => {
  try {
    const response = await cloudApi.getProjectTree(projectId);
    return {
      projectId,
      tree: response.tree,
    };
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
  { projectId: string; name: string; content?: string; folderId?: string | null },
  CloudThunkConfig
>("cloud/createProjectFile", async ({ projectId, name, content, folderId }, { rejectWithValue }) => {
  try {
    return await cloudApi.createProjectFile(projectId, { name, content, folderId });
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

export const moveCloudProjectFile = createAsyncThunk<
  { file: CloudFile; sourceProjectId: string; targetProjectId: string },
  { projectId: string; fileId: string; targetProjectId: string; targetFolderId: string | null },
  CloudThunkConfig
>("cloud/moveProjectFile", async ({ projectId, fileId, targetProjectId, targetFolderId }, { rejectWithValue }) => {
  try {
    return await cloudApi.moveProjectFile(projectId, fileId, { targetProjectId, targetFolderId });
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const createCloudProjectFolder = createAsyncThunk<
  { folder: CloudFolderSummary },
  { projectId: string; name: string; parentId?: string | null },
  CloudThunkConfig
>("cloud/createProjectFolder", async ({ projectId, name, parentId }, { rejectWithValue }) => {
  try {
    return await cloudApi.createProjectFolder(projectId, { name, parentId });
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const renameCloudProjectFolder = createAsyncThunk<
  { folder: CloudFolderSummary },
  { projectId: string; folderId: string; name: string },
  CloudThunkConfig
>("cloud/renameProjectFolder", async ({ projectId, folderId, name }, { rejectWithValue }) => {
  try {
    return await cloudApi.updateProjectFolder(projectId, folderId, { name });
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const deleteCloudProjectFolder = createAsyncThunk<
  { projectId: string; folderId: string; deletedFileIds: string[] },
  { projectId: string; folderId: string },
  CloudThunkConfig
>("cloud/deleteProjectFolder", async ({ projectId, folderId }, { rejectWithValue }) => {
  try {
    const response = await cloudApi.deleteProjectFolder(projectId, folderId);
    return {
      projectId,
      folderId: response.folderId,
      deletedFileIds: response.deletedFileIds,
    };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const moveCloudProjectFolder = createAsyncThunk<
  {
    folder: CloudFolderSummary;
    sourceProjectId: string;
    targetProjectId: string;
    movedFiles: CloudFileSummary[];
  },
  { projectId: string; folderId: string; targetProjectId: string; targetParentId: string | null },
  CloudThunkConfig
>("cloud/moveProjectFolder", async ({ projectId, folderId, targetProjectId, targetParentId }, { rejectWithValue }) => {
  try {
    return await cloudApi.moveProjectFolder(projectId, folderId, {
      targetProjectId,
      targetParentId,
    });
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const fetchProjectMembers = createAsyncThunk<
  { projectId: string; members: ProjectMember[]; pendingInvitations: PendingProjectInvitation[] },
  { projectId: string },
  CloudThunkConfig
>("cloud/fetchProjectMembers", async ({ projectId }, { rejectWithValue }) => {
  try {
    const response = await cloudApi.listProjectMembers(projectId);
    return {
      projectId,
      members: response.members,
      pendingInvitations: response.pendingInvitations,
    };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const createCloudProjectInvitation = createAsyncThunk<
  { projectId: string; invitation: PendingProjectInvitation },
  { projectId: string; email: string; role: Extract<ProjectMemberRole, "editor" | "viewer"> },
  CloudThunkConfig
>("cloud/createProjectInvitation", async ({ projectId, email, role }, { rejectWithValue }) => {
  try {
    const response = await cloudApi.createProjectInvitation(projectId, { email, role });
    return {
      projectId,
      invitation: response.invitation,
    };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const revokeCloudProjectInvitation = createAsyncThunk<
  { projectId: string; invitationId: string },
  { projectId: string; invitationId: string },
  CloudThunkConfig
>("cloud/revokeProjectInvitation", async ({ projectId, invitationId }, { rejectWithValue }) => {
  try {
    await cloudApi.revokeProjectInvitation(projectId, invitationId);
    return {
      projectId,
      invitationId,
    };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const updateCloudProjectMemberRole = createAsyncThunk<
  { projectId: string; member: ProjectMember },
  { projectId: string; memberId: string; role: Extract<ProjectMemberRole, "editor" | "viewer"> },
  CloudThunkConfig
>("cloud/updateProjectMemberRole", async ({ projectId, memberId, role }, { rejectWithValue }) => {
  try {
    const response = await cloudApi.updateProjectMemberRole(projectId, memberId, { role });
    return {
      projectId,
      member: response.member,
    };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});

export const removeCloudProjectMember = createAsyncThunk<
  { projectId: string; memberId: string },
  { projectId: string; memberId: string },
  CloudThunkConfig
>("cloud/removeProjectMember", async ({ projectId, memberId }, { rejectWithValue }) => {
  try {
    await cloudApi.deleteProjectMember(projectId, memberId);
    return {
      projectId,
      memberId,
    };
  } catch (error) {
    return rejectWithValue(normalizeApiError(error));
  }
});
