import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import UploadArtifact from "./artifacts/contracts/Upload.sol/Upload.json";
import FileUpload from "./components/FileUpload";
import Display from "./components/Display";
import Modal from "./components/Modal";
import "./App.css";

// Try loading deployed address if available
let deployedAddressFallback = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
try {
  // eslint-disable-next-line
  const contractAddressJson = require("./artifacts/contract-address.json");
  if (contractAddressJson && contractAddressJson.address) {
    deployedAddressFallback = contractAddressJson.address;
  }
} catch (e) {
  // Use fallback if file doesn't exist yet
}

const CONTRACT_ADDRESS =
  process.env.REACT_APP_CONTRACT_ADDRESS || deployedAddressFallback;

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [networkName, setNetworkName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'upload', 'explorer'
  const [hasMetaMask, setHasMetaMask] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const initEthers = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setHasMetaMask(false);
      return;
    }

    try {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);

      const network = await web3Provider.getNetwork();
      let netDisplay = `Chain ID: ${network.chainId}`;
      if (network.chainId === 1337 || network.chainId === 31337) {
        netDisplay = "Hardhat Local (31337)";
      } else if (network.chainId === 11155111) {
        netDisplay = "Sepolia Testnet";
      } else if (network.name && network.name !== "unknown") {
        netDisplay = network.name;
      }
      setNetworkName(netDisplay);

      const accounts = await web3Provider.listAccounts();
      if (accounts.length > 0) {
        const signer = web3Provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);

        const uploadContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          UploadArtifact.abi,
          signer
        );
        setContract(uploadContract);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }, []);

  useEffect(() => {
    initEthers();

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          initEthers();
        } else {
          setAccount("");
          setContract(null);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [initEthers]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to continue.");
      return;
    }

    try {
      setIsConnecting(true);
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      await web3Provider.send("eth_requestAccounts", []);
      await initEthers();
    } catch (err) {
      console.error("Connect wallet error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleUploadSuccess = () => {
    // Increment trigger to signal Display component to refresh
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="App">
      {/* Background Decorative Mesh Elements */}
      <div className="glow-sphere glow-sphere-1"></div>
      <div className="glow-sphere glow-sphere-2"></div>

      {/* Navigation Header */}
      <header className="app-navbar">
        <div className="nav-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">SecuredVault</span>
            <span className="brand-badge">IPFS + Ethereum</span>
          </div>
        </div>

        <div className="nav-controls">
          {networkName && (
            <div className="network-pill" title="Connected Network">
              <span className="network-indicator"></span>
              {networkName}
            </div>
          )}

          {account ? (
            <>
              <button
                type="button"
                className="btn-share-access"
                onClick={() => setModalOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Manage Access
              </button>

              <div className="account-pill" title={account}>
                <span className="account-dot"></span>
                <span>{formatAddress(account)}</span>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="btn-connect"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {!hasMetaMask && (
          <div className="banner-alert">
            <div className="banner-icon">🦊</div>
            <div>
              <strong>MetaMask Not Detected!</strong> Please install the{" "}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="banner-link"
              >
                MetaMask browser extension
              </a>{" "}
              to connect with your Ethereum wallet and store files securely.
            </div>
          </div>
        )}

        <section className="hero-section">
          <h1>Decentralized File Storage & Vault</h1>
          <p>
            Upload files permanently to IPFS via Pinata. Control access with
            tamper-proof Ethereum smart contract permissions.
          </p>
          <div className="contract-tag" title={CONTRACT_ADDRESS}>
            <span>Contract: </span>
            <code>{CONTRACT_ADDRESS}</code>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            Dashboard
          </button>
          <button
            className={`tab-btn ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            Upload Files
          </button>
          <button
            className={`tab-btn ${activeTab === "explorer" ? "active" : ""}`}
            onClick={() => setActiveTab("explorer")}
          >
            Vault Explorer
          </button>
        </div>

        {/* Tab Content */}
        <div className="dashboard-grid">
          {(activeTab === "all" || activeTab === "upload") && (
            <FileUpload
              account={account}
              provider={provider}
              contract={contract}
              onUploadSuccess={handleUploadSuccess}
            />
          )}

          {(activeTab === "all" || activeTab === "explorer") && (
            <Display
              key={refreshTrigger}
              contract={contract}
              account={account}
            />
          )}
        </div>
      </main>

      {/* Share / Access Management Modal */}
      {modalOpen && (
        <Modal
          setModalOpen={setModalOpen}
          contract={contract}
          account={account}
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <p>
          SecuredVault &bull; Powered by Hardhat, Pinata Cloud IPFS & Ethereum
        </p>
      </footer>
    </div>
  );
}

export default App;
