export const getBlockchainState = async () => {
    try {
      const response = await window.chiaAPI.getBlockchainState();
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    } catch (err) {
      console.error('Error fetching blockchain state:', err);
      throw err;
    }
  };
  