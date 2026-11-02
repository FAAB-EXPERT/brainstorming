import React, { useState } from 'react';

interface AppLogoProps {
  className?: string;
  alt?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = 'w-12 h-12 object-contain shrink-0',
  alt = 'FAAB BRAINSTORMING Logo',
}) => {
  const baseUrl = import.meta.env.BASE_URL || './';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const sources = [
    '/assets/aistudio/logo_faab_brainstorming_e19b6c39.png?v=2',
    `${normalizedBase}assets/aistudio/logo_faab_brainstorming_e19b6c39.png?v=2`,
    './assets/aistudio/logo_faab_brainstorming_e19b6c39.png?v=2',
    `${normalizedBase}logo.png?v=2`,
    './logo.png?v=2',
    `${normalizedBase}favicon.png?v=2`,
    './favicon.png?v=2',
  ];

  const [sourceIndex, setSourceIndex] = useState(0);

  return (
    <img
      src={sources[sourceIndex]}
      alt={alt}
      className={className}
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex(sourceIndex + 1);
        }
      }}
    />
  );
};
