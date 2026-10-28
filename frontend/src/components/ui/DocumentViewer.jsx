import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Eye, AlertCircle, Loader2, FileText, Image } from 'lucide-react';
import { Button } from './Button';
import './ui.css';

const API_BASE_URL = `${new URL(import.meta.env.VITE_BACKEND_URL).origin}/api/v1`;

const getAuthToken = () => localStorage.getItem('medicare_token');

const previewEndpoint = (documentType, documentId) =>
  documentType === 'prescription'
    ? `/api/v1/prescriptions/${documentId}/preview`
    : `/api/v1/health-records/${documentId}/preview`;

const downloadEndpoint = (documentType, documentId) =>
  documentType === 'prescription'
    ? `/api/v1/prescriptions/${documentId}/download`
    : `/api/v1/health-records/${documentId}/download`;

export const DocumentViewer = ({
  isOpen,
  onClose,
  document,
  onDownload,
}) => {
  const [src, setSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const objectUrlRef = useRef(null);
  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, [revokeObjectUrl]);

  useEffect(() => {
    if (!isOpen || !document?._id) {
      setSrc(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadDocument = async () => {
      setIsLoading(true);
      setError(null);
      revokeObjectUrl();

      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}${previewEndpoint(document.documentType, document._id)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load document preview (${response.status}).`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          objectUrlRef.current = objectUrl;
          setSrc(objectUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load document preview.');
          setSrc(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadDocument();
    return () => {
      cancelled = true;
    };
  }, [isOpen, document, revokeObjectUrl]);

  const handleDownload = async () => {
    if (!document?._id) return;
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}${downloadEndpoint(document.documentType, document._id)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Download failed.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.fileName || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (onDownload) onDownload();
    } catch (err) {
      setError(err.message || 'Download failed.');
    }
  };

  if (!isOpen) return null;

  const isPdf = document?.fileType && document.fileType.includes('pdf');
  const isImage = document?.fileType && document.fileType.startsWith('image/');
  const uploadedAt = document.extractedAt || document.createdAt || document.uploadedAt;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container fade-in"
        style={{ maxWidth: 'min(850px, 100%)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              {isPdf ? <FileText size={18} style={{ marginRight: '0.5rem' }} /> : <Image size={18} style={{ marginRight: '0.5rem' }} />}
              {document.fileName || 'Document'}
            </h3>
            <p className="modal-subtitle">
              {document.fileType || 'Unknown type'} &bull; {uploadedAt ? new Date(uploadedAt).toLocaleDateString() : ''}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close document viewer">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          {isLoading && (
            <div className="loading-spinner-container">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p>Loading document...</p>
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: '#ffe4e6', border: '1px solid rgba(225, 29, 72, 0.3)', color: '#e11d48', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <AlertCircle size={20} style={{ marginRight: '0.5rem' }} />
              {error}
            </div>
          )}

          {src && (
            <div style={{ flex: 1, minHeight: '400px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
              {isPdf ? (
                <embed
                  src={src}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  style={{ borderRadius: 'var(--radius-md)' }}
                />
              ) : (
                <img src={src} alt="Document preview" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 'var(--radius-md)' }} />
              )}
            </div>
          )}

          {!src && !isLoading && !error && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <FileText size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <p>No preview available for this file type.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <Button variant="outline" onClick={handleDownload} disabled={isLoading || !src}>
            <Download size={16} />
            Download
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
