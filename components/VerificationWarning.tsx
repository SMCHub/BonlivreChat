import React from 'react';

const VerificationWarning: React.FC = () => {
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
      <p className="font-bold">E-Mail nicht verifiziert</p>
      <p>Bitte verifizieren Sie Ihre E-Mail-Adresse, um Chats zu erstellen und Nachrichten zu senden.</p>
    </div>
  );
};

export default VerificationWarning;