import { useState, useEffect, useCallback } from "react";
import "./Display.css";

const Display = ({ contract, account }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetAddress, setTargetAddress] = useState("");
  const [queriedAddress, setQueriedAddress] = useState("");
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Helper to test if URL or filename looks like an image
  const isImageFile = (url) => {
    return /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(url);
  };

  // Helper to extract IPFS CID
  const getIpfsHash = (url) => {
    if (!url) return "";
    const parts = url.split("/ipfs/");
    if (parts.length > 1) return parts[1].split("?")[0];
    return url.replace("ipfs://", "");
  };

  const fetchFiles = useCallback(async (addressToQuery) => {
    const addr = (addressToQuery || "").trim();
    if (!contract) {
      setError("Contract is not connected. Please connect your wallet.");
      return;
    }

    if (!addr && !account) {
      setError("Please connect your wallet or enter an Ethereum address.");
      return;
    }

    const finalAddress = addr || account;

    try {
      setLoading(true);
      setError("");
      setQueriedAddress(finalAddress);

      const files = await contract.display(finalAddress);
      setData(Array.isArray(files) ? files : []);
    } catch (err) {
      console.error("Fetch files error:", err);
      if (err.reason && err.reason.includes("You don't have access")) {
        setError(
          `🔒 Access Denied: Address ${finalAddress.slice(0, 6)}...${finalAddress.slice(-4)} has not granted you access to their vault.`
        );
      } else if (err.message && err.message.includes("You don't have access")) {
        setError(
          `🔒 Access Denied: You do not have permission to view files for this address.`
        );
      } else {
        setError("Error fetching files: " + (err.reason || err.message));
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [contract, account]);

  // Load user's own files initially when account is available
  useEffect(() => {
    if (account && contract) {
      fetchFiles(account);
    }
  }, [account, contract, fetchFiles]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFiles(targetAddress);
  };

  const handleResetToMyFiles = () => {
    setTargetAddress("");
    fetchFiles(account);
  };

  const handleDownload = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const hash = getIpfsHash(url);
      link.download = `file_${hash.slice(0, 8) || "download"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback: open URL in new tab
      window.open(url, "_blank");
    }
  };

  const handleCopyLink = (url, index) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="display-container">
      <div className="display-header">
        <div>
          <h2>Vault Storage Explorer</h2>
          <p>Browse decentralized files stored in your vault or shared with you</p>
        </div>

        <form className="search-bar" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            className="search-input"
            placeholder="Search address (0x...) or leave empty for your files"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
          />
          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? <span className="spinner"></span> : "Query Vault"}
          </button>
          {targetAddress && (
            <button
              type="button"
              className="reset-btn"
              onClick={handleResetToMyFiles}
              title="Return to your files"
            >
              My Files
            </button>
          )}
        </form>
      </div>

      {queriedAddress && (
        <div className="queried-banner">
          <span>Viewing Vault: </span>
          <code>
            {queriedAddress.toLowerCase() === (account || "").toLowerCase()
              ? `${queriedAddress} (Your Account)`
              : queriedAddress}
          </code>
        </div>
      )}

      {error && <div className="display-error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <span className="large-spinner"></span>
          <p>Querying smart contract and IPFS registry...</p>
        </div>
      ) : data.length > 0 ? (
        <div className="file-grid">
          {data.map((item, index) => {
            const isImg = isImageFile(item);
            const cid = getIpfsHash(item);

            return (
              <div key={index} className="file-card">
                <div className="card-preview">
                  {isImg ? (
                    <img
                      src={item}
                      alt={`Vault item ${index + 1}`}
                      className="card-image"
                      onError={(e) => {
                        // Fallback if image fails to render
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="card-file-fallback"
                    style={{ display: isImg ? "none" : "flex" }}
                  >
                    <span className="file-glyph">📁</span>
                    <span className="file-tag">IPFS File #{index + 1}</span>
                  </div>
                </div>

                <div className="card-info">
                  <div className="cid-row">
                    <span className="cid-label">CID:</span>
                    <span className="cid-value" title={cid}>
                      {cid ? `${cid.slice(0, 10)}...${cid.slice(-8)}` : "IPFS Link"}
                    </span>
                  </div>

                  <div className="card-actions">
                    <a
                      href={item}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-btn link-btn"
                      title="Open in IPFS Gateway"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Open
                    </a>

                    <button
                      type="button"
                      className="action-btn download-btn"
                      onClick={() => handleDownload(item)}
                      title="Download file"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </button>

                    <button
                      type="button"
                      className="action-btn copy-btn"
                      onClick={() => handleCopyLink(item, index)}
                      title="Copy URL"
                    >
                      {copiedIndex === index ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !error ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No files in this vault</h3>
          <p>
            {queriedAddress.toLowerCase() === (account || "").toLowerCase()
              ? "You haven't uploaded any files yet. Use the upload panel above to add files to your decentralized vault."
              : "This address has no files recorded in the smart contract yet."}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default Display;
