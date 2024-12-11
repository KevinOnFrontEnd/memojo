import React, { useContext } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Chat from './pages/Chat';
import NewChat from './pages/NewChat';
import { AppContext } from './context/AppContext';

const App = () => {
  const { transactionDetails } = useContext(AppContext);
  const address = ''; // Replace with the actual address value



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
            {
              Object.keys(transactionDetails).map((chat) => (
                  <li
                    className="text-white px-4 py-2 rounded-lg hover:bg-blue-600 overflow-hidden text-ellipsis whitespace-nowrap"
                    key={message}
                    title={message}
                  >
                    <Link to={`/?chatid=${chat}&address=${message}`}>{chat}</Link>
                  </li>
                ))
            }
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
