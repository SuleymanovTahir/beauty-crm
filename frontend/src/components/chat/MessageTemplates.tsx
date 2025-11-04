import React from 'react';
import TemplatesPanel from './TemplatesPanel';

interface MessageTemplatesProps {
  onSelect: (content: string) => void;
}

export default function MessageTemplates({ onSelect }: MessageTemplatesProps) {
  return (
    <TemplatesPanel
      onSelect={onSelect}
      onClose={() => {}}
    />
  );
}
