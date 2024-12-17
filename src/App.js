import React, { useContext, useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import NewChat from "./pages/NewChat";
import { AppContext } from "./context/AppContext";

const App = () => {
  const { transactionDetails } = useContext(AppContext);
  const location = useLocation();

  const [queryStringChatId, setQueryStringChatId] = useState(null);

  // Rerun effect whenever the location changes
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    setQueryStringChatId(queryParams.get("chatid"));
  }, [location]);

  return (
    <div className="flex h-screen">
      <div className="w-64 bg-gray-800 text-white flex flex-col justify-between">
        <div>
          <div className="p-4 text-xl center text-center font-bold border-b border-gray-700">
            Memojo
          </div>
          <ul className="p-4 space-y-2">
            <li className="text-white px-4 py-2 rounded-lg hover:bg-blue-600 overflow-hidden text-ellipsis whitespace-nowrap">
              <Link to="/">Home</Link>
            </li>
            {Object.keys(transactionDetails).map((chat) => {
              const messages = transactionDetails[chat];
              const address = (
                messages.find(
                  (msg) =>
                    msg.from !== null &&
                    msg.from !== "" &&
                    msg.from !== undefined &&
                    msg.type == 0
                ) || {}
              ).from;
              return (
                <li
                  className={
                    "text-white px-4 py-2 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap " +
                    (queryStringChatId == chat ? "bg-blue-600" : "")
                  }
                  key={chat}
                  title={transactionDetails[chat].from}
                >
                  <Link to={`/chat?chatid=${chat}&address=${address}`}>
                    {chat}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="p-4">
          <Link to="/NewChat">
            <button
              onClick={() => console.log("New Chat Clicked")}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 overflow-hidden text-ellipsis whitespace-nowrap"
            >
              New Message
            </button>
          </Link>
        </div>
      </div>
      <div class="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/newchat" element={<NewChat />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
