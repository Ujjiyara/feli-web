import { useState, useRef, useCallback, useEffect } from 'react';
import { FiCamera, FiCheckCircle, FiXCircle, FiRefreshCw, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './QRScanner.css';

const QRScanner = ({ onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [manualTicketId, setManualTicketId] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Start camera for QR scanning
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
      }
    } catch {
      toast.error('Camera access denied. Please use manual entry.');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setScanning(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Mark attendance via API
  const markAttendance = async (ticketId) => {
    setProcessing(true);
    try {
      const response = await api.post('/organizer/attendance/mark', { ticketId });
      if (response.data.success) {
        setResult({
          success: true,
          data: response.data.data.registration
        });
        toast.success('Attendance marked!');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to mark attendance';
      setResult({
        success: false,
        error: message
      });
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle manual ticket entry
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualTicketId.trim()) {
      markAttendance(manualTicketId.trim().toUpperCase());
    }
  };

  // Reset for next scan
  const resetScanner = () => {
    setResult(null);
    setManualTicketId('');
  };

  return (
    <div className="qr-scanner-modal">
      <div className="scanner-content">
        <div className="scanner-header">
          <h2><FiCamera /> QR Scanner</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {!result ? (
          <>
            {/* Camera View */}
            {scanning ? (
              <div className="camera-view">
                <video ref={videoRef} autoPlay playsInline />
                <div className="scan-overlay">
                  <div className="scan-frame"></div>
                  <p>Point camera at participant's QR code</p>
                </div>
                <button className="stop-btn" onClick={stopCamera}>
                  Stop Camera
                </button>
              </div>
            ) : (
              <div className="scanner-options">
                <button className="start-camera-btn" onClick={startCamera}>
                  <FiCamera /> Start Camera
                </button>
                <div className="divider">
                  <span>OR</span>
                </div>
              </div>
            )}

            {/* Manual Entry */}
            <form className="manual-entry" onSubmit={handleManualSubmit}>
              <input
                type="text"
                placeholder="Enter Ticket ID (e.g., FEL-EVT-XXXXXX)"
                value={manualTicketId}
                onChange={(e) => setManualTicketId(e.target.value.toUpperCase())}
              />
              <button type="submit" disabled={processing || !manualTicketId.trim()}>
                {processing ? 'Checking...' : 'Check In'}
              </button>
            </form>
          </>
        ) : (
          /* Result Display */
          <div className={`scan-result ${result.success ? 'success' : 'error'}`}>
            <div className="result-icon">
              {result.success ? <FiCheckCircle /> : <FiXCircle />}
            </div>
            <h3>{result.success ? 'Check-In Successful!' : 'Check-In Failed'}</h3>
            
            {result.success && result.data && (
              <div className="participant-info">
                <div className="info-row">
                  <FiUser />
                  <span>
                    {result.data.participant?.firstName} {result.data.participant?.lastName}
                  </span>
                </div>
                <p className="ticket-id">{result.data.ticketId}</p>
                <p className="check-time">
                  Checked in at: {new Date(result.data.checkedInAt).toLocaleTimeString()}
                </p>
              </div>
            )}

            {!result.success && (
              <p className="error-message">{result.error}</p>
            )}

            <button className="reset-btn" onClick={resetScanner}>
              <FiRefreshCw /> Scan Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
