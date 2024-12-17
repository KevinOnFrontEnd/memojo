import React, { useEffect, useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";

const Chat = () => {
  const { transactionDetails, setTransactionDetails } = useContext(AppContext);
  const [newMessage, setNewMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [sendButtonDisabled, setSendButtonDisabled] = useState(true);

  // Get address from query parameters
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const address = queryParams.get("address");
  const chatId = queryParams.get("chatid");

  // Handle new message input
  const handleInputChange = (e) => {
    if (e.target.value.length == 0) setSendButtonDisabled(true);
    else {
      setSendButtonDisabled(false);
    }
    setNewMessage(e.target.value);
  };

  // Handle sending a message
  const handleSendMessage = () => {
    if (newMessage.trim() && address) {
      // sending a message payload
      const newTransaction = {
        type: 1,
        message: newMessage,
        confirmed_height: "0",
        to: address,
        from: "",
        chatid: chatId,
      };

      //use window api to send message
      window.chiaAPI.sendMessage(1, newMessage, address, chatId);

      //set local state to show new message, until
      //global state has re-called the chia wallet/node rpc
      //to fetch latest transactions
      setChatMessages([...chatMessages, newTransaction]);
      setNewMessage("");
    } else {
      alert("Cannot send empty messages!");
    }
  };

  useEffect(() => {
    const chatMessages = transactionDetails[chatId];
    setChatMessages([...chatMessages]);
  }, [chatId, transactionDetails]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        {/* <div className="bg-gray-500 shadow-md p-4 fixed top-0 left-0 right-0 z-10 text-center">
          <h1 className="text-lg font-semibold text-white">{address}</h1>
        </div> */}

        {chatMessages.map((item) => {
          if (item.type === 1) {
            //sent transactions with memos
            return (
              <div
                className="w-100 pb-2 pb-4 flex justify-end"
                key={item.confirmed_height}
              >
                <div className="min-w-[50%] max-w-[50%] flex flex-col">
                  <div
                    className={
                      item.confirmed_height == 0
                        ? "bg-pink-200 text-white p-3 rounded-2xl"
                        : "bg-blue-500 text-white p-3 rounded-2xl"
                    }
                  >
                    <span className="block text-gray-800">{item.message}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 self-end text-right">
                    <span>
                      Block Height:{" "}
                      {item.confirmed_height == 0
                        ? "Pending"
                        : item.confirmed_height}
                    </span>
                  </div>
                </div>
              </div>
            );
          } else if (item.type === 0) {
            //received transactions with memos
            return (
              <div className="w-100 pb-4" key={item.confirmed_height}>
                <div className="bg-gray-500 text-white p-3 rounded-2xl min-w-[50%] max-w-[50%]">
                  <span className="block text-gray-800">{item.message}</span>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  <div>Block Height: {item.confirmed_height}</div>
                </div>
              </div>
            );
          }
        })}
      </div>
      <div class="p-4 bg-white border-t border-gray-300">
        <div class="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message to send..."
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
          />
          <button
            disabled={sendButtonDisabled}
            onClick={handleSendMessage}
            class={
              sendButtonDisabled == false
                ? "bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                : "bg-gray-500 text-white px-4 py-2 rounded-lg"
            }
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
