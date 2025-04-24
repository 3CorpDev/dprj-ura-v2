'use client'

import { useRef } from 'react';

export default function IframeView() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="rounded-xl shadow-sm relative">
      <iframe
        ref={iframeRef}
        src="https://06.attimotelecom.com.br/webrtc"
        className="w-full h-[calc(100vh-8rem)] rounded-xl shadow-sm"
        title="Attimo POC"
        allow="microphone; camera"
      />
    </div>
  );
}
