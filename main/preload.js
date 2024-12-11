const { contextBridge,ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chiaAPI', {
  getMessages: async (walletId, from) => {
    try {
      return await ipcRenderer.invoke('get-messages', walletId, from);
    } catch (error) {
      console.error('Renderer Error:', error.message);
      throw error;
    }
  },
  getTransactions: async (walletId) => {
    try {
      return await ipcRenderer.invoke('fetch-transactions', walletId);
    } catch (error) {
      console.error('Renderer Error:', error.message);
      throw error;
    }
  },
    getTransaction: async (walletId, transactionId) => {
      try {
        return await ipcRenderer.invoke('get-transaction', walletId,transactionId);
      } catch (error) {
        console.error('Renderer Error:', error.message);
        throw error;
      }
    },
  sendMessage: async (walletId, message, to, chatid) => {
    console.log('pre-load ipc send message');
    try {
      return await ipcRenderer.invoke('send-message', walletId, message, to, chatid);
    } catch (error) {
      console.error('Renderer Error:', error.message);
      throw error;
    }
  },
  getTransactionMemo: async (walletId, transactionId) => {
    try {
      return await ipcRenderer.invoke('get-transaction-memo', walletId,transactionId);
    } catch (error) {
      console.error('Renderer Error:', error.message);
      throw error;
    }
  },
  getMessages: async (walletId) => {
    try {
      return await ipcRenderer.invoke('get-messages', walletId);
    } catch (error) {
      console.error('Renderer Error:', error.message);
      throw error;
    }
  },
});