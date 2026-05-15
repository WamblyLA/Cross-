-- CreateIndex
CREATE UNIQUE INDEX "Folder_projectId_parentId_name_key" ON "Folder"("projectId", "parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "File_projectId_folderId_name_key" ON "File"("projectId", "folderId", "name");
