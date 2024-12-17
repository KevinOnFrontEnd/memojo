const { app, BrowserWindow, ipcMain, electronPath, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const axios = require("axios");
const bech32 = require("bech32");

//pull config settings from config.json
const packageJson = require(path.join(__dirname, "../package.json"));
const config = packageJson.appConfig;

require("electron-reload")(__dirname, {
  electron: electronPath,
});

let mainWindow;

//ignore self signed certs messages
app.commandLine.appendSwitch("ignore-certificate-errors");
app.commandLine.appendSwitch("disable-web-security");
app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors");

function createMainWindow() {
  const isDev =
    process.env.NODE_ENV === "development" || process.argv.includes("--dev");
  const menuTemplate = [
    {
      label: "File",
      submenu: [{ role: "close" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    // Include more custom menu items as needed
  ];

  console.log(process.env.NODE_ENV);
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: isDev
        ? path.join(__dirname, "preload.js") // Development
        : path.join(__dirname, "preload.js"), // Productio
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  //Set the certificate verification procedure
  mainWindow.webContents.session.setCertificateVerifyProc(
    (request, callback) => {
      console.log("Certificate verification accepting:");
      callback(0); // 0 for success
    }
  );

  if (isDev) {
    console.log("loading dev from localhost:3000");
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    console.log("loading production build");
    mainWindow.loadFile(path.join(__dirname, "../build/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // const menu = Menu.buildFromTemplate(menuTemplate);
  // Menu.setApplicationMenu(menu);
}

app.on("ready", createMainWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.on(
  "certificate-error",
  (event, webContents, url, error, certificate, callback) => {
    if (
      url.startsWith($config.WalletRpcUrl) ||
      url.startsWith($config.FullNodeRpcUrl)
    ) {
      event.preventDefault();
      callback(true); // Allow
    } else {
      callback(false); // Reject
    }
  }
);

const CHIA_WALLET_SSL_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".chia",
  "mainnet",
  "config",
  "ssl",
  "wallet"
);
const CHIA_NODE_SSL_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".chia",
  "mainnet",
  "config",
  "ssl",
  "full_node"
);
const CHIA_CA_SSL_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".chia",
  "mainnet",
  "config",
  "ssl",
  "ca"
);
const walletCertPath = path.join(CHIA_WALLET_SSL_PATH, "private_wallet.crt");
const walletCertKeyPath = path.join(CHIA_WALLET_SSL_PATH, "private_wallet.key");
const fullNodeCertPath = path.join(CHIA_NODE_SSL_PATH, "private_full_node.crt");
const fullNodeKeyPath = path.join(CHIA_NODE_SSL_PATH, "private_full_node.key");
const caPath = path.join(CHIA_CA_SSL_PATH, "chia_ca.crt");
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

//function used to determine if a memo is a json object
function isJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

//chia-utils functions
const M = 0x2bc830a3;
const ONE_TRILLION = 1000000000000;
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function puzzle_hash_to_address(puzzle_hash, prefix = "xch") {
  if (puzzle_hash.indexOf("0x") == 0) {
    puzzle_hash = puzzle_hash.substring(2);
  }
  return encode_puzzle_hash(hex_to_bytes(puzzle_hash), prefix);
}

function encode_puzzle_hash(puzzle_hash, prefix) {
  encoded = bech32_encode(prefix, convertbits(puzzle_hash, 8, 5));
  return encoded;
}

function bech32_encode(hrp, data) {
  let combined = data.concat(bech32_create_checksum(hrp, data));
  let arr = [hrp, "1"];
  for (d in combined) {
    d = combined[d];
    arr.push(CHARSET[d]);
  }
  return arr.join("");
}

function bech32_hrp_expand(hrp) {
  let arr = [];
  for (x in hrp) {
    x = hrp[x];
    arr.push(ord(x) >> 5);
  }
  arr.push(0);
  for (x in hrp) {
    x = hrp[x];
    arr.push(ord(x) & 31);
  }
  return arr;
}

function ord(str) {
  return str.charCodeAt(0);
}

function bech32_polymod(values) {
  let generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (value in values) {
    value = values[value];
    let top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        chk ^= generator[i];
      } else {
        chk ^= 0;
      }
    }
  }
  return chk;
}

function bech32_create_checksum(hrp, data) {
  let values = bech32_hrp_expand(hrp).concat(data);
  let polymod = bech32_polymod(values.concat([0, 0, 0, 0, 0, 0])) ^ M;
  let arr = [];
  for (let i = 0; i < 6; i++) {
    arr.push((polymod >> (5 * (5 - i))) & 31);
  }
  return arr;
}

function hex_to_bytes(hex) {
  if (hex == null) {
    throw "Argument hex of method hex_to_bytes is required and does not have a default value.";
  }
  let bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function convertbits(data, frombits, tobits, pad = true) {
  let acc = 0;
  let bits = 0;
  let ret = [];
  let maxv = (1 << tobits) - 1;
  let max_acc = (1 << (frombits + tobits - 1)) - 1;
  for (value in data) {
    value = data[value];
    if (value < 0 || value >> frombits) {
      throw "Invalid Value";
    }
    acc = ((acc << frombits) | value) & max_acc;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits) {
      ret.push((acc << (tobits - bits)) & maxv);
    }
  } else if (bits >= frombits || (acc << (tobits - bits)) & maxv) {
    throw "Invalid bits";
  }
  return ret;
}

// Private methods so the IPC handlers can re-use them
const getTransactions = async (walletId) => {
  try {
    const response = await axios.post(
      `${config.WalletRpcUrl}/get_transactions`,
      { wallet_id: walletId, start: 0, end: 100, reverse: true },
      {
        httpsAgent,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return response.data; // Send the response back to the renderer
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    throw error;
  }
};

const getTransaction = async (walletId, transactionId) => {
  try {
    const response = await axios.post(
      `${config.WalletRpcUrl}/get_transaction`,
      { wallet_id: walletId, transaction_id: transactionId },
      {
        httpsAgent,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return response.data; // Send the response back to the renderer
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    throw error;
  }
};

const getTransactionMemo = async (walletId, transactionId) => {
  try {
    const response = await axios.post(
      `${config.WalletRpcUrl}/get_transaction_memo`,
      { wallet_id: walletId, transaction_id: transactionId },
      {
        httpsAgent,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    return response.data; // Send the response back to the renderer
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    throw error;
  }
};

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
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching parent coin:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

//send transaction with json memo attached
const sendMessage = async (walletId, message, to, chatid) => {
  try {
    const messageObj = {
      Chatid: chatid,
      Message: message,
    };
    const jsonString = JSON.stringify(messageObj);
    const payload = {
      wallet_id: walletId,
      amount: 100,
      address: to,
      fee: 6000,
      memos: [jsonString],
    };

    try {
      console.log("got to ipc handle send-mesage");
      const response = await axios.post(
        `${config.WalletRpcUrl}/send_transaction`,
        payload,
        {
          httpsAgent,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      console.log("Transaction sent:", response.data);
    } catch (error) {
      console.error(
        "Error sending transaction:",
        error.response ? error.response.data : error.message
      );
    }
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    throw error;
  }
};

// Add IPC handler for fetching transactions
ipcMain.handle("fetch-transactions", async (event, walletId) => {
  return getTransactions(walletId);
});

ipcMain.handle("get-transaction", async (event, walletId, transactionId) => {
  return getTransaction(walletId, transactionId);
});

ipcMain.handle("get-messages", async (event, walletId) => {
  console.log("calling get-messages in ipcMain");
  var transactions = await getTransactions(walletId);

  if (!transactions.transactions || transactions.transactions.length === 0) {
    return [];
  }

  // Process all transactions and fetch their memos
  const messages = await Promise.all(
    transactions.transactions.map(async (transaction) => {
      const trxMemo = await getTransactionMemo(walletId, transaction.name);
      // Access memo
      if (transaction.type == 0) {
        //received messages
        const topLevelKey = Object.keys(trxMemo).find(
          (key) => key !== "success"
        );
        const nestedObject = trxMemo[topLevelKey];
        const secondLevelKey = Object.keys(nestedObject)[0];
        const memoArray = nestedObject[secondLevelKey];

        if (memoArray) {
          let parentCoin = await getParentCoinByName(
            1,
            transaction.additions[0].parent_coin_info
          );

          if (parentCoin.coin_record && parentCoin.coin_record.coin) {
            var addressPuzzle = parentCoin.coin_record.coin.puzzle_hash;
            const fromAddress = puzzle_hash_to_address(addressPuzzle);

            // Transform the array of memos into objects
            return Object.values(memoArray)
              .map((memo1) => {
                if (memo1) {
                  const date = new Date(transaction.created_at_time * 1000);
                  const confirmedAtHeight = transaction.confirmed_at_height;
                  const type = transaction.type;
                  const message = decodeHex(memo1);

                  if (isJSON(message)) {
                    const jsonObject = JSON.parse(message);
                    if (!jsonObject.Chatid && !jsonObject.Message) return null;

                    return {
                      date: date,
                      confirmed_height: confirmedAtHeight,
                      type: type,
                      message: jsonObject.Message,
                      from: fromAddress,
                      to: null,
                      chatid: jsonObject.Chatid,
                    };
                  }

                  //not a json object - ignore
                  return null;
                }
                return null; // Skip invalid memos
              })
              .filter((item) => item !== null); // Filter out null values
          }
        }
      } else if (transaction.type == 1) {
        //sent messages
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

              if (isJSON(message)) {
                const jsonObject = JSON.parse(message);
                if (!jsonObject.Chatid && !jsonObject.Message) return null;

                return {
                  date: date,
                  confirmed_height: confirmedAtHeight,
                  type: type,
                  message: jsonObject.Message,
                  from: null,
                  to: transaction.to_address,
                  chatid: jsonObject.Chatid,
                };
              }

              //not a json object - ignore
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
    if (msg.chatid != null) {
      if (!groupedMessages[msg.chatid]) {
        groupedMessages[msg.chatid] = [];
      }
      groupedMessages[msg.chatid].push(msg);
    }
  });

  //sort transactions by date
  Object.keys(groupedMessages).forEach((partner) => {
    groupedMessages[partner].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  });

  return groupedMessages;
});

ipcMain.handle(
  "get-transaction-memo",
  async (event, walletId, transactionId) => {
    return getTransactionMemo(walletId, transactionId);
  }
);

ipcMain.handle("send-message", async (event, walletId, message, to, chatid) => {
  return sendMessage(walletId, message, to, chatid);
});
