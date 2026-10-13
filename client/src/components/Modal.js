import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import "./Modal.css";

const Modal = ({ setModalOpen, contract, account }) => {
  const [targetAddress, setTargetAddress] = useState("");
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const loadAccessList = useCallback(async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const list = await contract.shareAccess();
      // Formatted list: array of { user, access }
      const formatted = list.map((item) => ({
        user: item.user || item[0],
        access: Boolean(item.access !== undefined ? item.access : item[1]),
      }));
      setAccessList(formatted);
    } catch (err) {
      console.error("Error loading access list:", err);
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    loadAccessList();
  }, [loadAccessList]);

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    const addr = targetAddress.trim();

    if (!addr) {
      setStatusMessage({ type: "error", text: "Please enter a valid Ethereum address." });
      return;
    }

    if (!ethers.utils.isAddress(addr)) {
      setStatusMessage({ type: "error", text: "Invalid Ethereum address format (must be 0x...)." });
      return;
    }

    if (addr.toLowerCase() === (account || "").toLowerCase()) {
      setStatusMessage({ type: "error", text: "You cannot grant access to your own address." });
      return;
    }

    try {
      setActionLoading(true);
      setStatusMessage({ type: "info", text: "Approving access in MetaMask..." });

      const tx = await contract.allow(addr);
      setStatusMessage({ type: "info", text: "Transaction submitted! Waiting for confirmation..." });
      await tx.wait();

      setStatusMessage({ type: "success", text: `Successfully granted access to ${addr.slice(0, 6)}...${addr.slice(-4)}!` });
      setTargetAddress("");
      await loadAccessList();
    } catch (err) {
      console.error("Grant access error:", err);
      let msg = "Failed to grant access. ";
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        msg = "Transaction was rejected in MetaMask.";
      } else {
        msg += err.reason || err.message;
      }
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAccess = async (addr) => {
    try {
      setActionLoading(true);
      setStatusMessage({ type: "info", text: `Revoking access for ${addr.slice(0, 6)}... in MetaMask...` });

      const tx = await contract.disallow(addr);
      setStatusMessage({ type: "info", text: "Transaction submitted! Waiting for confirmation..." });
      await tx.wait();

      setStatusMessage({ type: "success", text: `Access revoked for ${addr.slice(0, 6)}...${addr.slice(-4)}` });
      await loadAccessList();
    } catch (err) {
      console.error("Revoke access error:", err);
      let msg = "Failed to revoke access. ";
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        msg = "Transaction was rejected in MetaMask.";
      } else {
        msg += err.reason || err.message;
      }
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div className="modal-heading">
            <h3>Access Control & Sharing</h3>
            <p>Grant or revoke permissions for other Ethereum addresses to view your files</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={() => setModalOpen(false)}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {statusMessage.text && (
          <div className={`modal-status modal-status-${statusMessage.type}`}>
            {actionLoading && <span className="spinner"></span>}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form className="grant-form" onSubmit={handleGrantAccess}>
          <label className="form-label" htmlFor="grant-address">
            Grant Access to Address
          </label>
          <div className="input-group">
            <input
              id="grant-address"
              type="text"
              className="modal-input"
              placeholder="Enter recipient's address (0x...)"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              disabled={actionLoading}
            />
            <button
              type="submit"
              className="grant-btn"
              disabled={actionLoading || !targetAddress.trim()}
            >
              {actionLoading ? "Processing..." : "Grant Access"}
            </button>
          </div>
        </form>

        <div className="access-section">
          <h4>Authorized Accounts Registry</h4>
          {loading ? (
            <div className="list-loading">Loading permissions registry...</div>
          ) : accessList.length > 0 ? (
            <div className="access-list">
              {accessList.map((item, index) => (
                <div key={index} className="access-item">
                  <div className="access-user-info">
                    <span className="user-icon">👤</span>
                    <div>
                      <span className="user-address">{item.user}</span>
                      <span className={`status-pill ${item.access ? "active" : "revoked"}`}>
                        {item.access ? "● Active Permission" : "○ Access Revoked"}
                      </span>
                    </div>
                  </div>

                  {item.access ? (
                    <button
                      type="button"
                      className="revoke-btn"
                      onClick={() => handleRevokeAccess(item.user)}
                      disabled={actionLoading}
                      title="Revoke access"
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="re-grant-btn"
                      onClick={async () => {
                        setTargetAddress(item.user);
                      }}
                      title="Re-grant access"
                    >
                      Select
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-access-users">
              No addresses have been granted access yet.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="modal-done-btn"
            onClick={() => setModalOpen(false)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
