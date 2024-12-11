export const readFile = async (filePath) => {
    return await window.electronAPI.readFile(filePath);
  };
  