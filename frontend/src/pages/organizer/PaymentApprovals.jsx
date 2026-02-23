import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiImage, FiDollarSign, FiUser, FiCalendar } from 'react-icons/fi';
import { formatDateTime as formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './PaymentApprovals.css';

const PaymentApprovals = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      const response = await api.get('/organizer/payments/pending');
      if (response.data.success) {
        setPayments(response.data.data.pendingPayments);
      }
    } catch {
      toast.error('Failed to fetch pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      const response = await api.patch(`/organizer/payments/${id}/approve`);
      if (response.data.success) {
        toast.success('Payment approved!');
        setPayments(payments.filter(p => p._id !== id));
      }
    } catch {
      toast.error('Failed to approve payment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id, note) => {
    setProcessingId(id);
    try {
      const response = await api.patch(`/organizer/payments/${id}/reject`, { note });
      if (response.data.success) {
        toast.success('Payment rejected');
        setPayments(payments.filter(p => p._id !== id));
      }
    } catch {
      toast.error('Failed to reject payment');
    } finally {
      setProcessingId(null);
    }
  };



  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading pending payments...</p>
      </div>
    );
  }

  return (
    <div className="payment-approvals">
      <div className="page-header">
        <h1><FiDollarSign /> Payment Approvals</h1>
        <p>Review and approve merchandise payment proofs</p>
      </div>

      {payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h3>All Caught Up!</h3>
          <p>No pending payment approvals at the moment.</p>
        </div>
      ) : (
        <div className="payments-grid">
          {payments.map(payment => (
            <div key={payment._id} className="payment-card">
              <div className="payment-header">
                <span className="ticket-id">{payment.ticketId}</span>
                <span className="payment-amount">
                  ₹{payment.merchandiseOrder?.totalAmount || 0}
                </span>
              </div>

              <div className="payment-info">
                <div className="info-item">
                  <FiUser />
                  <span>
                    {payment.participantId?.firstName} {payment.participantId?.lastName}
                    <small>{payment.participantId?.email}</small>
                  </span>
                </div>
                <div className="info-item">
                  <FiCalendar />
                  <span>{payment.eventId?.name || 'Unknown Event'}</span>
                </div>
              </div>

              <div className="order-items">
                <h4>Order Items</h4>
                {payment.merchandiseOrder?.items?.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <span>{item.name}</span>
                    <span>x{item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="payment-proof-section">
                <button 
                  className="view-proof-btn"
                  onClick={() => setSelectedProof(payment.merchandiseOrder?.paymentProof)}
                >
                  <FiImage /> View Payment Proof
                </button>
              </div>

              <div className="payment-date">
                Submitted: {formatDate(payment.createdAt)}
              </div>

              <div className="payment-actions">
                <button
                  className="approve-btn"
                  onClick={() => handleApprove(payment._id)}
                  disabled={processingId === payment._id}
                >
                  <FiCheck /> Approve
                </button>
                <button
                  className="reject-btn"
                  onClick={() => {
                    const note = prompt('Reason for rejection (optional):');
                    handleReject(payment._id, note);
                  }}
                  disabled={processingId === payment._id}
                >
                  <FiX /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Proof Modal */}
      {selectedProof && (
        <div className="modal-overlay" onClick={() => setSelectedProof(null)}>
          <div className="modal-content proof-modal" onClick={e => e.stopPropagation()}>
            <h2>Payment Proof</h2>
            <img src={selectedProof} alt="Payment Proof" />
            <button className="close-btn" onClick={() => setSelectedProof(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentApprovals;
