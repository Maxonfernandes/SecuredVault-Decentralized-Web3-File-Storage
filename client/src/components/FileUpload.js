import { useState } from "react";
import axios from "axios";
import "./FileUpload.css";

const FileUpload = ({ contract, account, provider, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [status, setStatus] = useState({ stage: "idle", message: "" });
  const [isDragging, setIsDragging] = useState(false);

  // Pinata credentials from environment or fallback
  const PINATA_API_KEY =
    process.env.REACT_APP_PINATA_API_KEY || "88a84e8b9db776f4399f";
  const PINATA_SECRET_KEY =
    process.env.REACT_APP_PINATA_SECRET_API_KEY ||
    "56ad249a3d27ce0b9c3ed907d8d57c1421c3a7f666998346d786e37e7a6bdecc";
  const PINATA_GATEWAY =
    process.env.REACT_APP_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSelectedFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setFileName(selected.name);
    setFileSize(formatFileSize(selected.size));
    setStatus({ stage: "idle", message: "" });

    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  };

  const onFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setStatus({ stage: "error", message: "Please select a file first." });
      return;
    }

    if (!account) {
      setStatus({
        stage: "error",
        message: "Please connect your MetaMask wallet before uploading.",
      });
      return;
    }

    if (!contract) {
      setStatus({
        stage: "error",
        message: "Smart contract not initialized. Check your network.",
      });
      return;
    }

    try {
      // Step 1: Uploading to Pinata IPFS
      setStatus({
        stage: "uploading",
        message: "1/2 Uploading file to IPFS via Pinata...",
      });

      const formData = new FormData();
      formData.append("file", file);

      const metadata = JSON.stringify({
        name: file.name,
      });
      formData.append("pinataMetadata", metadata);

      const options = JSON.stringify({
        cidVersion: 0,
      });
      formData.append("pinataOptions", options);

      const resFile = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const ipfsHash = resFile.data.IpfsHash;
      const fileUrl = `${PINATA_GATEWAY.replace(/\/+$/, "")}/${ipfsHash}`;

      // Step 2: Storing hash in Ethereum Smart Contract
      setStatus({
        stage: "confirming",
        message: "2/2 Please approve the transaction in MetaMask...",
      });

      const tx = await contract.add(account, fileUrl);

      setStatus({
        stage: "mining",
        message: "Transaction broadcasted! Waiting for block confirmation...",
      });

      await tx.wait();

      setStatus({
        stage: "success",
        message: `File permanently recorded on blockchain! Hash: ${ipfsHash}`,
      });

      // Clear input state
      setFile(null);
      setFileName("");
      setFileSize("");
      setFilePreview(null);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Upload error:", error);
      let errMsg = "Upload failed. ";
      if (error.response && error.response.status === 401) {
        errMsg += "Invalid Pinata API credentials. Check your .env file.";
      } else if (error.code === 4001 || error.code === "ACTION_REJECTED") {
        errMsg += "Transaction was rejected in MetaMask.";
      } else if (error.reason) {
        errMsg += error.reason;
      } else {
        errMsg += error.message || "Unknown error occurred.";
      }
      setStatus({ stage: "error", message: errMsg });
    }
  };

  const isUploading =
    status.stage === "uploading" ||
    status.stage === "confirming" ||
    status.stage === "mining";

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>Secure File Upload</h2>
        <p>Encrypt & pin your files directly to decentralized IPFS and the blockchain</p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <div
          className={`dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input").click()}
        >
          <input
            id="file-input"
            type="file"
            className="file-hidden-input"
            onChange={onFileInputChange}
            disabled={!account || isUploading}
          />

          {filePreview ? (
            <div className="preview-container">
              <img src={filePreview} alt="Preview" className="image-preview" />
              <div className="file-info-badge">
                <span className="file-name">{fileName}</span>
                <span className="file-size">{fileSize}</span>
              </div>
            </div>
          ) : file ? (
            <div className="file-selected-box">
              <div className="file-icon">📄</div>
              <div className="file-details">
                <span className="file-name">{fileName}</span>
                <span className="file-size">{fileSize}</span>
              </div>
            </div>
          ) : (
            <div className="dropzone-content">
              <div className="upload-cloud-icon">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m16 16-4-4-4 4" />
                </svg>
              </div>
              <p className="dropzone-title">
                Drag & drop any file here, or <span className="highlight">browse</span>
              </p>
              <p className="dropzone-sub">
                Supports images, PDFs, archives, documents & media
              </p>
            </div>
          )}
        </div>

        {status.message && (
          <div className={`status-alert status-${status.stage}`}>
            {isUploading && <span className="spinner"></span>}
            <span>{status.message}</span>
          </div>
        )}

        <div className="upload-actions">
          {file && !isUploading && (
            <button
              type="button"
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setFileName("");
                setFileSize("");
                setFilePreview(null);
                setStatus({ stage: "idle", message: "" });
              }}
            >
              Clear Selection
            </button>
          )}

          <button
            type="submit"
            className="btn-primary upload-btn"
            disabled={!file || !account || isUploading}
          >
            {isUploading ? (
              <>
                <span className="spinner"></span> Processing...
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload to IPFS & Blockchain
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FileUpload;
