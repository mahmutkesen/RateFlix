import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Sil', cancelText = 'İptal', type = 'danger' }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="confirm-modal glass-panel animate-fade-in">
                <h2 className={type === 'danger' ? 'danger-text' : ''}>{title}</h2>
                <p>{message}</p>
                <div className="modal-actions">
                    <button className="btn-cancel" onClick={onCancel}>{cancelText}</button>
                    <button 
                        className={type === 'danger' ? 'btn-danger' : 'btn-primary'} 
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
