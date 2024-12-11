const { app, BrowserWindow,ipcMain, electronPath, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const axios = require('axios');


//pull config settings from config.json
const packageJson = require(path.join(__dirname, '../package.json'));
const config = packageJson.appConfig;

require('electron-reload')(__dirname, {
  electron: electronPath,
});

let mainWindow;

//ignore self signed certs messages
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');




function createMainWindow() {
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    // Include more custom menu items as needed
  ];

  console.log(process.env.NODE_ENV);
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: isDev
      ? path.join(__dirname, 'preload.js') // Development
      : path.join(__dirname, 'preload.js'), // Productio
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: true,
      webSecurity: false,
    allowRunningInsecureContent: true,
    },
  });

  //Set the certificate verification procedure
  mainWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    console.log('Certificate verification accepting:');
    // Example: Accept all certificates
    callback(0); // 0 for success
  });

  if (isDev) {
    console.log('loading dev from localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('loading production build');
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });  


  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

}

app.on('ready', createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith($config.WalletRpcUrl) || url.startsWith($config.FullNodeRpcUrl)) {
    event.preventDefault();
    callback(true); // Allow
  } else {
    callback(false); // Reject
  }
});

const CHIA_WALLET_SSL_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.chia', 'mainnet', 'config', 'ssl', 'wallet');
const CHIA_NODE_SSL_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.chia', 'mainnet', 'config', 'ssl', 'full_node');
const CHIA_CA_SSL_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.chia', 'mainnet', 'config', 'ssl', 'ca');
const walletCertPath = path.join(CHIA_WALLET_SSL_PATH, 'private_wallet.crt');
const walletCertKeyPath = path.join(CHIA_WALLET_SSL_PATH, 'private_wallet.key');
const fullNodeCertPath = path.join(CHIA_NODE_SSL_PATH, 'private_full_node.crt');
const fullNodeKeyPath = path.join(CHIA_NODE_SSL_PATH, 'private_full_node.key');

const caPath = path.join(CHIA_CA_SSL_PATH, 'chia_ca.crt');
const walletCert = fs.readFileSync(walletCertPath);
const walletKey = fs.readFileSync(walletCertKeyPath);
const fullNodeCert = fs.readFileSync(fullNodeCertPath);
const fullNodeKey = fs.readFileSync(fullNodeKeyPath);
const ca = fs.readFileSync(caPath);
const httpsAgent = new https.Agent({
  cert: walletCert,
  key: walletKey,
  ca: ca,
  rejectUnauthorized: false, // Disable only in development
});

const decodeHex = (hex) => {
  try {
    const hexStr = hex.replace(/^0x/, ""); // Remove "0x" prefix if present
    return decodeURIComponent(
      hexStr
        .match(/.{1,2}/g) // Split into pairs of two characters
        .map((byte) => `%${byte}`)
        .join("")
    );
  } catch (error) {
    console.error("Error decoding hex memo:", error);
    return "Invalid memo";
  }
};

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

// Constants used in checksum calculation
const M = 0x2BC830A3;

// Converts a puzzle hash to a readable address
function puzzle_hash_to_address(puzzle_hash, prefix = "xch") {
  if (puzzle_hash.startsWith("0x")) {
    puzzle_hash = puzzle_hash.slice(2); // Remove "0x" prefix if present
  }

  const puzzleBytes = hex_to_bytes(puzzle_hash);
  const encodedAddress = bech32_encode(prefix, convertbits(puzzleBytes, 8, 5));
  return encodedAddress;
}

function hex_to_bytes(hex) {
  if (!hex) {
    throw new Error("Argument 'hex' is required.");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function convertbits(data, frombits, tobits, pad = true) {
  let acc = 0;
  let bits = 0;
  const result = [];
  const maxv = (1 << tobits) - 1;

  for (const value of data) {
    if (value < 0 || value >> frombits !== 0) {
      throw new Error("Invalid value.");
    }

    acc = (acc << frombits) | value;
    bits += frombits;

    while (bits >= tobits) {
      bits -= tobits;
      result.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((acc << (tobits - bits)) & maxv);
    }
  } else if (bits >= frombits || ((acc << (tobits - bits)) & maxv)) {
    throw new Error("Invalid padding.");
  }

  return result;
}

//function used to determine if a memo is a json object
function isJSON(str) {
  try {
      JSON.parse(str);
      return true;
  } catch (e) {
      return false;
  }
}

function bech32_encode(hrp, data) {
  const combined = data.concat(bech32_create_checksum(hrp, data));
  let result = hrp + "1";
  for (const value of combined) {
    result += CHARSET[value];
  }
  return result;
}

function bech32_create_checksum(hrp, data) {
  const values = bech32_hrp_expand(hrp).concat(data);
  const polymod = bech32_polymod(values.concat([0, 0, 0, 0, 0, 0])) ^ M;
  const checksum = [];
  for (let i = 0; i < 6; i++) {
    checksum.push((polymod >> (5 * (5 - i))) & 31);
  }
  return checksum;
}

function bech32_polymod(values) {
  const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;

  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;

    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        chk ^= GENERATOR[i];
      }
    }
  }

  return chk;
}

function bech32_hrp_expand(hrp) {
  const result = [];
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) >> 5);
  }
  result.push(0);
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) & 31);
  }
  return result;
}


// Private methods so the IPC handlers can re-use them
const getTransactions = async (walletId) => {

// let address = decode_puzzle_hash('0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef12345');
// console.log(address);
  console.log('fetching transactions');
  console.log(config);
  console.log(config.FullNodeRpcUrl);
  try {
    const response = await axios.post(
      `${config.WalletRpcUrl}/get_transactions`,
      { wallet_id: walletId, start:0, end:100, reverse: true },
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    return response.data; // Send the response back to the renderer
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    throw error;
  }
}

const getTransaction = async (walletId, transactionId) => {
  try {
    console.log(config.WalletRpcUr);
    const response = await axios.post(
      `${config.WalletRpcUrl}/get_transaction`,
      { wallet_id: walletId, transaction_id: transactionId },
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    return response.data; // Send the response back to the renderer
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    throw error;
  }
} 

const getTransactionMemo = async (walletId, transactionId) => {
  try {
    const response = await axios.post(
      `${config.WalletRpcUrl}/get_transaction_memo`,
      { wallet_id: walletId, transaction_id: transactionId },
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    return response.data; // Send the response back to the renderer
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    throw error;
  }
}

const getParentCoinByName = async (walletId, name) => {
  const agent = new https.Agent({
    cert: fullNodeCert,
    key: fullNodeKey,
    ca: ca,
    rejectUnauthorized: false, // Disable only in development
  });

  try {
    const payload = { name }; // Ensure `name` is passed as a parameter
    const response = await axios.post(
      `${config.FullNodeRpcUrl}/get_coin_record_by_name`,
      payload, // Correctly formatted payload
      {
        httpsAgent: agent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching parent coin:', error.response ? error.response.data : error.message);
    throw error;
  }
};

const sendMessage = async(walletId, message, to, chatid) => {
  try {
    const messageObj = {
      Chatid: chatid,
      Message: message
    }
    const jsonString = JSON.stringify(messageObj);
    const payload = {
      wallet_id: walletId, // Replace with your wallet ID
      amount: 100, 
      address: to, // Replace with the recipient's address
      fee: 6000, // Minimum fee in mojos
      memos: [jsonString], // Optional memo
    };

    try {
      console.log('got to ipc handle send-mesage');
      const response = await axios.post(`${config.WalletRpcUrl}/send_transaction`, payload,       {
        httpsAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      console.log('Transaction sent:', response.data);
    } catch (error) {
      console.error('Error sending transaction:', error.response ? error.response.data : error.message);
    }
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    throw error;
  }
};


// Add IPC handler for fetching transactions
ipcMain.handle('fetch-transactions', async (event, walletId) => {
  return getTransactions(walletId);
});

ipcMain.handle('get-transaction', async (event, walletId,transactionId) => {
  return getTransaction(walletId, transactionId);
});

ipcMain.handle('get-messages', async (event, walletId) => {
  console.log('calling get-messages in ipcMain');
  var transactions = await getTransactions(walletId);

  if (!transactions.transactions || transactions.transactions.length === 0) {
    return [];
  }

  const deriveFromConditions = async (coin_record) => {
    if (coin_record && coin_record.coin) {
      const puzzleHash = coin_record.coin.puzzle_hash;
      return puzzle_hash_to_address(puzzleHash);
    }
    console.error('Could not derive address from coin_record');
    return null;
  };

  // Process all transactions and fetch their memos
  const messages = await Promise.all(
    transactions.transactions.map(async (transaction) => {
      const trxMemo = await getTransactionMemo(walletId, transaction.name);
      // Access memo
      if (transaction.type == 0) { //received messages
        const topLevelKey = Object.keys(trxMemo).find(key => key !== "success");
        const nestedObject = trxMemo[topLevelKey];
        const secondLevelKey = Object.keys(nestedObject)[0];
        const memoArray = nestedObject[secondLevelKey];

        console.log(transaction);

        if (memoArray) {
          //console.log('Memo Array:', memoArray);
        
          let parentCoin = await getParentCoinByName(1, transaction.additions[0].parent_coin_info);
          //console.log('Parent Coin:', parentCoin);
        
          if (parentCoin.coin_record && parentCoin.coin_record.coin) {
            var addressPuzzle = parentCoin.coin_record.coin.puzzle_hash;
            let fromAddress = puzzle_hash_to_address(addressPuzzle, "xch");
        
            //Verify conditions if needed
            const conditionsAddress = await deriveFromConditions(parentCoin.coin_record);
            if (conditionsAddress) {
              fromAddress = conditionsAddress;
            }
        
            // Transform the array of memos into objects
            return Object.values(memoArray)
              .map((memo1) => {
                if (memo1) {
                  const date = new Date(transaction.created_at_time * 1000);
                  const confirmedAtHeight = transaction.confirmed_at_height;
                  const type = transaction.type;
                  const message = decodeHex(memo1);

                  if(isJSON(message)){
                    const jsonObject = JSON.parse(message);
                    return {
                      date: date,
                      confirmed_height: confirmedAtHeight,
                      type: type,
                      message: jsonObject.Message,
                      from: fromAddress,
                      to: null,
                      chatid: jsonObject.ChatId
                    };
                  }

                  //contains a memo but is not json
                  return null;
                }
                return null; // Skip invalid memos
              })
              .filter((item) => item !== null); // Filter out null values
          }
        }}
        
      else if(transaction.type == 1) //sent messages
      {
          const date = new Date(transaction.created_at_time * 1000);
          const confirmedAtHeight = transaction.confirmed_at_height;
          const type = transaction.type;

          return Object.values(transaction.memos)
          .map((memo1) => {
            if (memo1) {
              const date = new Date(transaction.created_at_time * 1000);
              const confirmedAtHeight = transaction.confirmed_at_height;
              const type = transaction.type;
              const message = decodeHex(memo1);
    
              if(isJSON(message)){
                const jsonObject = JSON.parse(message);
                return {
                  date: date,
                  confirmed_height: confirmedAtHeight,
                  type: type,
                  message: jsonObject.Message,
                  from: null,
                  to: transaction.to_address,
                  chatid: jsonObject.ChatId
                };
              }

              //not a json object ignore
              return null;
            }
            return null; // Skip invalid memos
          })
          .filter((item) => item !== null); // Filter out null values

      }
      return []; // Return an empty array for transactions without valid memos
    })
  );

  // Flatten the array of arrays
  const flattenedMessages = messages.flat();

  //group messages from different addresses sent to and from
  const groupedMessages = {};
  flattenedMessages.forEach((msg) => {

    if(msg.chatid != null)
    {
      if (!groupedMessages[msg.chatid]) {
        groupedMessages[msg.chatid] = [];
      }
      groupedMessages[msg.chatid].push(msg);
    }
  });

  Object.keys(groupedMessages).forEach((partner) => {
    groupedMessages[partner].sort((a, b) => new Date(a.date) - new Date(b.date));
  });
  return groupedMessages;
});


ipcMain.handle('get-transaction-memo', async (event, walletId,transactionId) => {
  return getTransactionMemo(walletId, transactionId);
});

ipcMain.handle('send-message', async (event, walletId, message, to) => {
  return sendMessage(walletId, message,to);
});