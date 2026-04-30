export function registerLinkingIpc({ ipcMain, linkBindingStore }) {
  ipcMain.handle("link:list-bindings", async () => {
    return {
      bindings: await linkBindingStore.listBindings(),
    };
  });

  ipcMain.handle("link:save-binding", async (_, binding) => {
    return {
      binding: await linkBindingStore.saveBinding(binding),
    };
  });

  ipcMain.handle("link:remove-binding", async (_, bindingId) => {
    await linkBindingStore.removeBinding(bindingId);
    return {
      success: true,
    };
  });
}
