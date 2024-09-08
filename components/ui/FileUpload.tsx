import React from 'react';
import { Button } from './button';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex items-center relative group">
      <input
        type="file"
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        disabled={true}
      />
      <label htmlFor="file-upload" className="cursor-not-allowed">
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="rounded-full opacity-50"
          disabled={true}
        >
          <Upload className="h-4 w-4" />
        </Button>
      </label>
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        Bald verfügbar
      </span>
    </div>
  );
}
