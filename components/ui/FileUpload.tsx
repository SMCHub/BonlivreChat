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
    <div className="flex items-center">
      <input
        type="file"
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="rounded-full" 
          disabled={disabled}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="h-4 w-4" />
        </Button>
      </label>
    </div>
  );
}
