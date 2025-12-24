import React from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface CertViewerProps {
    securityState: any;
    onClose: () => void;
}

export function CertViewer({ securityState, onClose }: CertViewerProps) {
    if (!securityState || !securityState.visibleSecurityState) return null;

    const { securityState: state, certificateSecurityState, safetyTipInfo } = securityState.visibleSecurityState;
    const isSecure = state === 'secure';
    const cert = certificateSecurityState?.certificate; // Note: CDP might not return full cert details here without getCertificate, but let's see what we get.
    // Actually visibleSecurityStateChanged often gives high level info. 
    // If we need full chain, we might need to invoke a main process handler that calls Security.getCertificate?
    // For now, let's visualize what we have (protocol, cipher).

    const protocol = certificateSecurityState?.protocol || 'Unknown';
    const cipher = certificateSecurityState?.cipher || 'Unknown';
    const issuer = certificateSecurityState?.issuer || 'Unknown Issuer'; // If available?
    const subject = certificateSecurityState?.subjectName || 'Unknown Subject';

    return (
        <div className="absolute top-10 left-0 bg-[#1e1e24] border border-white/10 rounded-lg shadow-2xl p-4 w-[350px] z-50 text-xs font-mono">
            <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                    {isSecure ? <Lock size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-red-500" />}
                    <span className="font-bold text-lg text-white">{isSecure ? 'Connection Secure' : 'Not Secure'}</span>
                </div>
                <button onClick={onClose} className="text-white/50 hover:text-white">x</button>
            </div>

            <div className="flex flex-col gap-3">
                <div className="bg-white/5 p-2 rounded">
                    <div className="text-[10px] opacity-40 uppercase mb-1">Technical Details</div>
                    <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="opacity-50">Protocol:</span> <span className="text-green-400">{protocol}</span>
                        <span className="opacity-50">Cipher:</span> <span className="text-blue-400">{cipher}</span>
                        <span className="opacity-50">Key Exchange:</span> <span>{certificateSecurityState?.keyExchange || 'N/A'}</span>
                    </div>
                </div>

                {cert && (
                    <div className="bg-white/5 p-2 rounded">
                        <div className="text-[10px] opacity-40 uppercase mb-1">Certificate</div>
                        <div className="flex flex-col gap-1">
                            <div><span className="opacity-50">Subject:</span> {subject}</div>
                            <div><span className="opacity-50">Issuer:</span> {issuer}</div>
                            <div><span className="opacity-50">Valid Until:</span> {certificateSecurityState?.validTo ? new Date(certificateSecurityState.validTo * 1000).toLocaleDateString() : 'N/A'}</div>
                        </div>
                    </div>
                )}

                {!cert && (
                    <div className="italic text-white/30 text-center py-2">
                        {isSecure ? 'Valid Certificate (Details unavailable via simple CDP event)' : 'No valid certificate'}
                    </div>
                )}
            </div>

            <div className="mt-3 text-[10px] text-white/30 text-center">
                Verified by {issuer || 'System'}
            </div>
        </div>
    );
}
