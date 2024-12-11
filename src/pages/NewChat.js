import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';

const NewChat = () => {
    const { transactionDetails, setTransactionDetails } = useContext(AppContext);
    const [toAddress, setToAddress] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
  
    const handleSend = () => {

        const chatid = uuidv4();
        // Implement what should happen when the form is submitted
        // For now, just navigate back to the root URL
        navigate('/');
    };
  
    return (
        <div class="p-4 bg-white border-t border-gray-300">
        <div class="flex items-center space-x-3">
    
          <input
            type="text"
            value={toAddress}
            onChange={setToAddress}
            placeholder="Type a message to send..."
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSend}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Send
        </button>
      </div>
  );
};

export default NewChat;
