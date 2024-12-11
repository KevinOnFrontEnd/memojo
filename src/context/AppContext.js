import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [blockchainState, setBlockchainState] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState([]);
  const [messageToSend, setMessageToSend] = useState('');

  // Memoized initializeData function
  const initializeData = useCallback(async (chiaAPI) => {
    if (chiaAPI) {
      try {
        // Fetch initial messages
        const messages = await chiaAPI.getMessages(1);
        setTransactionDetails(messages);
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    } else {
      console.error('chiaAPI is not available.');
    }
  }, []);

  // Memoized startMessagePolling function
  const startMessagePolling = useCallback((chiaAPI, interval = 15000) => {
    if (chiaAPI) {
        const fetchMessages = async () => {
            try {
              const data = await chiaAPI.getMessages(1); // Fetch the messages object
              if (data && typeof data === 'object') {
                // Update state if there's a change
                setTransactionDetails((prevDetails) => {
                  if (JSON.stringify(prevDetails) !== JSON.stringify(data)) {
                    return { ...data }; // Replace with new object reference
                  }
                  return prevDetails; // No change, retain previous state
                });
              } else {
                console.error('Unexpected data structure:', data);
              }
            } catch (error) {
              console.error('Error fetching messages:', error);
            }
          };

      // Initial fetch
      fetchMessages();

      // Set up interval
      const intervalId = setInterval(fetchMessages, interval);

      // Clear interval when component unmounts
      return () => clearInterval(intervalId);
    }
    return null;
  }, []);

  // Poll messages when chiaAPI is available
  useEffect(() => {
    if (window.chiaAPI) {
      const stopPolling = startMessagePolling(window.chiaAPI);

      return () => {
        if (stopPolling) stopPolling();
      };
    }
  }, [startMessagePolling]);

  return (
    <AppContext.Provider
      value={{
        blockchainState,
        transactionDetails,
        messageToSend,
        setMessageToSend,
        setBlockchainState,
        setTransactionDetails,
        initializeData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
